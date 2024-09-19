import { Pool } from 'pg';
import axios from 'axios';
import * as dotenv from 'dotenv';
import cron from 'node-cron';
import express from 'express';
const app = express();

dotenv.config();

const isReportService = process.env.SERVICE_TYPE === 'report';

app.use(express.json());
dotenv.config();
const port = process.env.BASE_PORT;

app.post('/runReportForUser', async (req, res) => {
  const { chatId, type, ss } = req.body;
  try {
    const RS = new ReportService(pool);
    const user = await users_db.getUserById(chatId);
    if (user) {
      const id = await RS.runForUser(user, type, ss);
      res.status(200).send('Report run successfully for user.');
      return id
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

export async function runPersonReport(chat_id: number, type: 'single' | 'all', ss?: string ): Promise<number | null> {
  return await axios.post(`http://localhost:${process.env.BASE_PORT}/runReportForUser`, { chatId: chat_id, type: type, ss: ss })
    .then(response => {
      console.log('Report initiated: ', response.data);
      return response.data; 
    })
    .catch(error => {
      console.error('Failed to initiate report: ', error);
      return null;  
    });
}

export class ReportService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // Fetch users with type and matching notification_time
  async getUsersForReport(hour: number, type: user_type): Promise<User[]> {
    let query = '';
    let params: (number | user_type)[] = [type, hour];
    query = `SELECT * FROM users WHERE type = $1 AND notification_time = $2`;

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  // Send message to user
  async sendMessage(chatId: number, message: string, reply_markup?: Options['reply_markup'] ) {
    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;
  
    try {
      const res = await axios.post(telegramApiUrl, {
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
        reply_markup: reply_markup ? reply_markup : undefined
      });
      console.log(`Report Service: Message sent to chatId: ${chatId}`);
      return res.data.result.message_id;
    } catch (error) {
      console.error(`Report Service: Failed to send message to chatId: ${chatId}`, error);
    }
  }

  async sendPhoto(chatId: number, image: any, caption?: string, reply_markup?: Options['reply_markup']): Promise<void> {    
    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`;
  
    try {
      await axios.post(telegramApiUrl, {
        chat_id: chatId,
        photo: image,
        caption: caption,
        parse_mode: 'HTML', 
        reply_markup: reply_markup
      });
      console.log(`Report Service: Photo sent to chatId: ${chatId}`);
    } catch (error) {
      console.error(`Report Service: Failed to send photo to chatId: ${chatId}`, error);
    }
  }

  // Send SS values to Google Web App and receive report data
  async getReportsFromWebApp(ssList: string[]): Promise<Record<string, string>> {
    try {
      console.log('webapp', ssList)
      const response = await axios.post(process.env.SS_REPORTS_GETTER_URL!, {
        ssList: ssList,
        date: getYesterdayDate(),
      });
      console.log('webapp res', response.data)
      return response.data;
    } catch (error) {
      console.error('Error fetching reports from Web App:', error);
      throw error;
    }
  }

  async processReportForUser(user: User, reportData: any) {
    if (user.type === 'registered' && reportData[0]) {
        const message_id = await this.sendPhoto(user.chat_id, reportData[0][3], reportData[0][2], returnMenu(false).reply_markup)
        return message_id
    } 
  }

  async run(): Promise<void> {
    try {
      const currentHour = new Date().getHours() + 3;
      const users = await this.getUsersForReport(currentHour, 'registered');

      if (users.length > 0 ) {
        const ssList = users.map(user => user.ss).filter(ss => typeof ss === 'string');
        const reportData = await this.getReportsFromWebApp(ssList);
        for (const user of users) {
          await this.processReportForUser(user, reportData)
        }
      } else {
        console.log('No old users to report for this hour: '+currentHour);
      }
    } catch (error) {
      console.error('Error in report service:', error);
    } 
  }

  async runForUser(user: User, type: 'single' | 'all', ss?: string) {
    try {
      if (type === 'single' && ss) {
        console.log(ss)
        const reportData = await this.getReportsFromWebApp([ss]);
        await this.processReportForUser(user, reportData)
      } else {
        const rows = await users_db.getConnections(user.chat_id) 
        console.log(rows)
        const ssList = rows.map(row => row.ss)
        console.log(ssList)
        const reportData = await this.getReportsFromWebApp(ssList);
        for (const ss of Object.keys(reportData)) {
          await this.processReportForUser(user, reportData[ss] )
        }
      }
    } catch (error) {
      console.error('Error running report for user:', error);
    }
  }

  // Schedule the report service to run every hour from 4 AM to 11 PM
  // at 00 start to getting adv info
  startCronJob() {
    if (isReportService) {
      cron.schedule('0 4-23 * * *', async () => {
        console.log('Running report service at:', new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }));
        await this.run();
      }, {
        timezone: 'Europe/Moscow'
      });
    }
  }
}

import pool from '../../database/db';
import { User, user_type } from '../dto/user';
import { users_db } from '../../database/models/users';
import { mainOptions, Options, returnMenu } from '../components/buttons';
import { getYesterdayDate } from '../utils/dates';

export const reportService = new ReportService(pool);
reportService.startCronJob();