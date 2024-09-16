import { Pool } from 'pg';
import axios from 'axios';
import * as dotenv from 'dotenv';
import cron from 'node-cron';
import express from 'express';
const app = express();

app.use(express.json());
dotenv.config();
const port = process.env.BASE_PORT;

app.post('/runReportForUser', async (req, res) => {
  const { chatId } = req.body;
  try {
    const RS = new ReportService(pool);
    const user = await users_db.getUserById(chatId);
    if (user) {
      await RS.runForUser(user);
      res.status(200).send('Report run successfully for user.');
    } else {
      res.status(404).send('User not found.');
    }
  } catch (error) {
    res.status(500).send('Error running report for user.');
  }
});

app.listen(port, () => {
  console.log(`API Server running on port ${port}`);
});

export function runPersonReport(chat_id: number) {
  axios.post(`http://localhost:${process.env.BASE_PORT}/runReportForUser`, { chatId: chat_id })
  .then(response => console.log('Report initiated: ', response.data))
  .catch(error => console.error('Failed to initiate report: ', error));
}

export class ReportService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Fetch users with type and matching notification_time
  // if hour = 0, add all users for adv data
  async getUsersForReport(hour: number, type: user_type): Promise<User[]> {
    let query = '';
    let params: (number | user_type)[] = [type];

    if (hour > 0) {
      query = `SELECT * FROM users WHERE type = $2 AND notification_time = $1`;
      params = [hour, type]; // оба параметра используются
    } else {
      query = `SELECT * FROM users WHERE type = $1`;
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // Get marketing info
  async fetchAdvertisementData(): Promise<void> {
    try {
      const users = await this.getUsersForReport(0, 'new_art');
      
      if (users.length === 0) {
        console.log('No users with type new_art to fetch advertisement data for.');
        return;
      }

      for (const user of users) {
        const wbKey = user.wb_api_key;
        const article = user.article

        if (!wbKey || !article) {
          console.log(`No recent campaigns found for user with chat ID: ${user.chat_id}`);
          continue;
        }

        const campaignResponse = await axios.get('https://advert-api.wildberries.ru/adv/v1/promotion/count', {
          headers: {
            'Authorization': wbKey,
            'Content-Type': 'application/json'
          }
        });

        const campaigns = campaignResponse.data.adverts || [];

        if (campaigns.length === 0) {
          console.log(`No recent campaigns found for user with chat ID: ${user.chat_id}`);
          continue;
        }

        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);

        const recentCampaigns = campaigns.flatMap((campaign: any) => 
          campaign.advert_list.filter((advert: any) => {
            const changeTime = new Date(advert.changeTime);
            return changeTime >= thirtyDaysAgo && changeTime <= now;
          })
        );

        const last30DaysDates = getXdaysAgoArr(10);
        const advertIds = recentCampaigns.map((advert: any) => ({ 
          id: advert.advertId, 
          dates: last30DaysDates 
        }));
        
        if (advertIds.length === 0) {
          console.log(`No recent campaigns found for user with chat ID: ${user.chat_id}`);
          continue;
        }

        const advertDetailsResponse = await axios.post('https://advert-api.wildberries.ru/adv/v2/fullstats', advertIds, {
          headers: {
            'Authorization': wbKey,
            'Content-Type': 'application/json'
          }
        });

        const result = processCampaigns(advertDetailsResponse.data, article)
        user_articles_db.addMarketingCost(user.chat_id, result)
        console.log(`Advertisement details for user with chat ID: ${user.chat_id}:`, JSON.stringify(result));
      }

    } catch (error) {
      console.error('Error fetching advertisement data:', error);
    }
  }

  // Send message to user
  async sendMessage(chatId: number, message: string): Promise<void> {
    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;
  
    try {
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML', 
      });
      console.log(`Report Service: Message sent to chatId: ${chatId}`);
    } catch (error) {
      console.error(`Report Service: Failed to send message to chatId: ${chatId}`, error);
    }
  }

  async sendPhoto(chatId: number, image: any): Promise<void> {    
    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`;
  
    try {
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        photo: image,
      });
      console.log(`Report Service: Photo sent to chatId: ${chatId}`);
    } catch (error) {
      console.error(`Report Service: Failed to send photo to chatId: ${chatId}`, error);
    }
  }

  async fetchWbStatistics(data: [{ article: number, key: string }], startDate: string, endDate: string) {
    const url = 'https://seller-analytics-api.wildberries.ru/api/v2/nm-report/detail/history';

    const requestData = {
      nmIDs: [+data[0].article],
      period: {
        begin: startDate,
        end: endDate,
      },
      timezone: 'Europe/Moscow',
      aggregationLevel: 'day',  
    };

    try {
      const response = await axios.post(url, requestData, {
        headers: {
          'Authorization': `${data[0].key}`, 
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching NM report statistics: '+error);
      return false
    }
  }

  // Send SS values to Google Web App and receive report data
  async getReportsFromWebApp(ssList: string[]): Promise<Record<string, string[]>> {
    try {
      const response = await axios.post(process.env.SS_REPORTS_GETTER_URL!, {
        ssList: ssList
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching reports from Web App:', error);
      throw error;
    }
  }

  async run(): Promise<void> {
    try {
      const currentHour = new Date().getHours() + 3;
      const oldUsers = await this.getUsersForReport(currentHour, 'old_ss');
      const newUsers = await this.getUsersForReport(currentHour, 'new_art')

      if (oldUsers.length > 0 ) {
        const ssList = oldUsers.map(user => user.ss).filter(ss => typeof ss === 'string');
        const reportData = await this.getReportsFromWebApp(ssList);
        for (const user of oldUsers) {
          if (user.ss && reportData[user.ss]) {
            const formattedMessage = formatReportMessage(reportData[user.ss]);
            await this.sendMessage(user.chat_id, formattedMessage);
          }
        }
      } else {
        console.log('No old users to report for this hour: '+currentHour);
      }

      if (newUsers.length > 0 ) {
        const date = getYesterdayDate();

        for (const user of newUsers) {
          if (user.wb_api_key && user.article) {
            const report = await this.fetchWbStatistics([{ article: user.article, key: user.wb_api_key}], date, date)
            const articleData = await user_articles_db.selectArticle(user.chat_id)
            
            if (report) {
              const data = report.data[0].history;
              const message = formatReportArticleMessage(data, articleData, user, date)
              const marketingChart = createMarketingChart(articleData?.marketing_cost)
              this.sendMessage(user.chat_id, message)
              if (marketingChart) {
                return this.sendPhoto(user.chat_id, marketingChart)
              }
            } else if (!report && articleData) {
              this.sendMessage(user.chat_id, `К сожалению, нам не удалось получить отчета за ${date} по ${articleData?.name} ${user.article}`)
            } else {
              console.log('no data for '+user.article)
            }
          }
        }
      } else {
        console.log('No new users to report for this hour: '+currentHour);
      }
    } catch (error) {
      console.error('Error in report service:', error);
    } 
  }

  async runForUser(user: User): Promise<void> {
    try {
      if (user.type === 'old_ss' && user.ss) {
        const reportData = await this.getReportsFromWebApp([user.ss]);
        if (reportData[user.ss]) {
          const formattedMessage = formatReportMessage(reportData[user.ss]);
          await this.sendMessage(user.chat_id, formattedMessage);
        }
      } else if (user.type === 'new_art' && user.article && user.wb_api_key) {
        const date = getYesterdayDate();
        const report = await this.fetchWbStatistics([{ article: user.article, key: user.wb_api_key}], date, date);
        if (report) {
          const articleData = await user_articles_db.selectArticle(user.chat_id);
          const data = report.data[0].history;
          const message = formatReportArticleMessage(data, articleData, user, date); 
          const marketingChart = createMarketingChart(articleData?.marketing_cost)
          await this.sendMessage(user.chat_id, message);
          if (marketingChart) {
            return this.sendPhoto(user.chat_id, marketingChart)
          }
        }
      }
    } catch (error) {
      console.error('Error running report for user:', error);
    }
  }

  // Schedule the report service to run every hour from 4 AM to 11 PM
  // at 00 start to getting adv info
  startCronJob() {
    cron.schedule('0 4-23 * * *', async () => {
      console.log('Running report service at:', new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }));
      await this.run();
    }, {
      timezone: 'Europe/Moscow'
    });

    cron.schedule('0 0 * * *', async () => {
      console.log('Running advertisement data fetch at 00:00:', new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }));
      await this.fetchAdvertisementData();
    }, {
      timezone: 'Europe/Moscow'
    });
  }
}


import pool from '../../database/db';
import { User, user_type } from '../dto/user';
import { getXdaysAgoArr, getYesterdayDate } from '../utils/dates';
import { user_articles_db } from '../../database/models/user_articles';
import { formatReportArticleMessage, formatReportMessage } from '../utils/text';
import { processCampaigns } from '../helpers/marketing';
import { users_db } from '../../database/models/users';
import { sendImageWithText } from '../components/answers';
import { createMarketingChart } from '../utils/charts';

const reportService = new ReportService(pool);
reportService.startCronJob();