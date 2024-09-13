import { Pool } from 'pg';
import axios from 'axios';
import * as dotenv from 'dotenv';
import cron from 'node-cron';
dotenv.config();

export class ReportService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Fetch users with type and matching notification_time
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
        console.log(wbKey)

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

        const advertIds = recentCampaigns.map((advert: any) => ({ id: advert.advertId }));
        
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

        console.log(`Advertisement details for user with chat ID: ${user.chat_id}:`, advertDetailsResponse.data);
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
            console.log(report)
            const articleData = await user_articles_db.selectArticle(user.article)

            if (report) {
              console.log(report.data[0].history)
              const data = report.data[0].history
              console.log(data)
              const name = articleData?.name ? articleData?.name : user.article
              let selfCost = 0
              if (articleData?.self_cost) {
                selfCost = data[0].buyoutsCount * articleData.self_cost
              }
              const rev = data[0].buyoutsSumRub - selfCost - (articleData?.marketing_cost ?? 0)
              let message = `
Заказы ${data[0].ordersCount} шт на ${data[0].ordersSumRub} руб
Выкупы ${data[0].buyoutsCount} шт на ${data[0].buyoutsSumRub} руб
Рекламный бюджет ${articleData?.marketing_cost ?? 0}
<b>Прибыль: ${rev}</b>`;
              this.sendMessage(user.chat_id, `<b>Отчет за ${date}: ${name}</b>\n${message}`)
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

  // Schedule the report service to run every hour from 4 AM to 11 PM
  startCronJob() {
    cron.schedule('0 4-23 * * *', async () => {
      console.log('Running report service at:', new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }));
      await this.run();
    }, {
      timezone: 'Europe/Moscow'
    });
  }
}

function formatReportMessage(data: string[]): string {
  let message = '';

  data.forEach((row, i) => {
    if (i === 0) {
      message += `<b>${row[0]}</b>\n`;
    } else if (row[0].startsWith('ТОП')) {
      message += `\n<b>${row[0]}</b>\n`;
    } else if (row[0].startsWith('Товар')) {
      message += `${row[0]} ${row[1]}\n`;
    } else {
      message += `<b>${row[0]}</b> ${row[1]}\n`;
    }
  });

  return message.trim();
}




import pool from '../../database/db';
import { User, user_type } from '../dto/user';
import { getYesterdayDate } from '../utils/dates';
import { user_articles_db } from '../../database/models/user_articles';

const reportService = new ReportService(pool);
reportService.startCronJob();