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
    const query = `
      SELECT * FROM users 
      WHERE type = $2 AND notification_time = $1
    `;
    const result = await this.pool.query(query, [hour, type]);
    return result.rows;
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
    console.log(data)
    const url = 'https://seller-analytics-api.wildberries.ru/api/v2/nm-report/detail/history';
// 220177186
// 220197677
// 220197678
// 226261465
// 226261548
// 226261467
// 226261466
// 226261464
// 169935551
// 197620771
// 197620772
// 208988521
// 94215475
// 208989627
// 210222532
// 244951686

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

            if (report && articleData) {
              console.log(report.data[0].history)
              const data = report.data[0].history
              console.log(data)
              const name = articleData.name ? articleData?.name : user.article
              let selfCost = 0
              if (articleData.self_cost) {
                selfCost = data[0].buyoutsCount * articleData.self_cost
              }
              const rev = data[0].buyoutsSumRub - selfCost - articleData.marketing_cost
              let message = `
Заказы ${data[0].ordersCount} шт на ${data[0].ordersSumRub} руб
Выкупы ${data[0].buyoutsCount} шт на ${data[0].buyoutsSumRub} руб
Рекламный бюджет ${articleData?.marketing_cost ?? 0}
<b>Прибыль: ${rev}</b>`;
              this.sendMessage(user.chat_id, `<b>Отчет за ${date}: ${name}</b>\n\n${message}`)
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
      message += `<b>${row[0]}</b>\n\n`;
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