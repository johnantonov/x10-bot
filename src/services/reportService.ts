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
  const { chat_id, type, ss } = req.body;
  try {
    const RS = new ReportService(pool);
    const user = await users_db.getUserById(chat_id);
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

/**
 * inner request to start personal report
 * @param {number} chat_id - user chat id
 * @param {'single' | 'all'} type - all connections reports or only one
 * @param {string} ss - spreadsheet id
 */
export async function runPersonReport(chat_id: number, type: 'single' | 'all', ss?: string ): Promise<number | null> {
  return await axios.post(`http://localhost:${process.env.BASE_PORT}/runReportForUser`, { chat_id, type, ss })
    .then(response => {
      console.log('Report initiated: ', response.data);
      return response.data; 
    })
    .catch(error => {
      formatError(error, 'Failed to initiate report: ')
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
  async sendMessage(chat_id: number, text: string, reply_markup?: Options['reply_markup'] ) {
    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;
  
    try {
      const res = await axios.post(telegramApiUrl, { chat_id, text, parse_mode: 'HTML', reply_markup: reply_markup ? reply_markup : undefined });
      console.log(`Report Service: Message sent to chatId: ${chat_id}`);
      return res.data.result.message_id;
    } catch (error) {
      formatError(error, `Report Service: Failed to send message to chatId: ${chat_id}`)
    }
  }

  async sendPhoto(chat_id: number, photo: any, caption?: string, reply_markup?: Options['reply_markup']): Promise<void> {    
    const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendPhoto`;
  
    try {
      await axios.post(telegramApiUrl, { chat_id, photo, caption, parse_mode: 'HTML', reply_markup });
      console.log(`Report Service: Photo sent to chatId: ${chat_id}`);
    } catch (error) {
      formatError(error, `Report Service: Failed to send photo to chatId: ${chat_id}`)
    }
  }

  // Send SS values to Google Web App and receive report data
  async getReportsFromWebApp(ssList: string[][] | string[], updated_now: false | number = false, titles?: []) {
    try {
      const date = getYesterdayDate()
      console.log(date)
      const url = updated_now ? process.env.SS_NOW_REPORTS_GETTER_URL : process.env.SS_REPORTS_GETTER_URL

      if (updated_now) {
        const response = axios.post(url!, { ssList, date, id: updated_now });      
        return null;
      }
      
      const response = await axios.post(url!, { ssList, date: date });      
      return response.data;
    } catch (error) {
      formatError(error, 'Error fetching reports from Web App:')
      throw error;
    }
  }

  async processReportForUser(chat_id: number, reportData: any) {
    if (reportData[0]) {
        const connection = await connections_db.getConnection(chat_id, reportData[0][0]);
        const title = connection.title;
        const header = title ? getFormatReportTitle(title) : getFormatReportTitle(reportData[0][1])
        const message =  header + '\n\n' + reportData[0][3]
        const message_id = await this.sendPhoto(chat_id, reportData[0][4] , message, returnMenu(false))
        return message_id
    } 
  }

  async run(): Promise<void> {
    try {
      const currentHour = new Date().getHours() + 3;
      const connections = await connections_db.getConnectionsByTime(currentHour);

      
      if (connections.length > 0 ) {
        const dataForReports = getFormatConnections(connections)
        const ssList = Object.keys(dataForReports)
        const reportData = await this.getReportsFromWebApp(ssList);

        for (const ss of ssList) {
          for (const chat_id of dataForReports[ss]) {
            await this.processReportForUser(chat_id, reportData[ss])
          }
        }
      } else {
        console.log('No connections to report for this hour: '+currentHour);
      }
    } catch (error) {
      formatError(error, 'Error in report service:')
    } 
  }

  async runForUser(user: User, type: 'single' | 'all', ss?: string) {
    try {
      if (type === 'single' && ss) {
        const row = await connections_db.getConnection(user.chat_id, ss) 
        const reportData = await this.getReportsFromWebApp([[ss, row.title]], user.chat_id);
        if (reportData) {
          await this.processReportForUser(user.chat_id, reportData[ss])
        }
      } else {
        const rows = await connections_db.getConnections(user.chat_id) 
        const ssList = rows.map(row => [row.ss, row.title])
        const reportData = await this.getReportsFromWebApp(ssList, user.chat_id);
        if (reportData) {
          for (const ss of Object.keys(reportData)) {
            await this.processReportForUser(user.chat_id, reportData[ss])
          }
        }
      }
    } catch (error) {
      formatError(error, 'Error running report for user:')
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
import { Options, returnMenu } from '../components/botButtons';
import { getYesterdayDate } from '../utils/dates';
import { connections_db } from '../../database/models/connections';
import { getFormatConnections } from '../utils/parse';
import { formatError, getFormatReportTitle } from '../utils/string';

export const reportService = new ReportService(pool);
reportService.startCronJob();