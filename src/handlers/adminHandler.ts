import TelegramBot from "node-telegram-bot-api"
import { ReportService } from "../services/reportService"
import * as dotenv from 'dotenv';
import pool from "../../database/db"

dotenv.config();

const helpInfo = `
/admin__run_report_service - запуск репорт сервиса на прошедший час
/admin__clean_db_{tableName} - очистить таблицу в базе данных
/admin__delete_user_{id} - удалить пользователя из таблицы users
/admin__get_marketing_costs - запуск сбора рекламных расходов
/admin__run_report_service - запуск репорт сервиса на прошедший час
`

export async function handleAdminCommand(chatId: number, command: string, bot: TelegramBot) {
  try {
    const adminChatId = process.env.ADMIN_CHAT
    if (!adminChatId || chatId !== +adminChatId) {
      return console.log(`Сhat id ${chatId} does not have access.`)
    }
    const action = command.split('__')[1]
    console.log(action)

    if (action === 'run_report_service') {
      console.log('admin started report serivce')
      const RS = new ReportService(pool);
      RS.run()
    }

    if (action.startsWith('clean_db')) {
      const db = action.split('db_')[1]; 
      if (db) {
        pool.query(`DELETE FROM ${db}`, (err, result) => {
          if (err) {
            console.error(`Failed to delete data from ${db}:`, err);
          } else {
            console.log(`All data deleted from ${db} by admin`);
          }
        });
      } else {
        console.error('No table specified for deletion.');
      }
    }

    if (action.startsWith('delete_user')) {
      const user = action.split('delete_user_')[1]; 
      if (user) {
        pool.query(`DELETE FROM users WHERE chat_id = ${user}`, (err, result) => {
          if (err) {
            console.error(`Failed to delete ${user}:`, err);
          } else {
            console.log(`delete ${user} by admin`);
          }
        });
      } else {
        console.error('No table specified for deletion.');
      }
    }

    if (action.startsWith('get_marketing_costs')) {
      console.log('admin started report serivce for marketing info')
      const RS = new ReportService(pool);
      RS.fetchAdvertisementData()
    }

    if (action.startsWith('help')) {
      await bot.sendMessage(chatId, helpInfo)
      console.log('admin started report serivce for marketing info')
      const RS = new ReportService(pool);
      RS.fetchAdvertisementData()
    }
    
  } catch (e) {
    console.error('error in admin handler: '+e)
  }
}