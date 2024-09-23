import TelegramBot from "node-telegram-bot-api"
import { reportService } from "../services/reportService"
import * as dotenv from 'dotenv';
import pool from "../../database/db"
import { migrations } from "../helpers/wip-quick-fix-migration";

dotenv.config();

const helpInfo = `
/admin__run_report_service - запуск репорт сервиса на прошедший час
/admin__clean_db_{tableName} - очистить таблицу в базе данных
/admin__delete_user_{id} - удалить пользователя из таблицы users
`

export async function handleAdminCommand(chat_id: number, command: string, bot: TelegramBot) {
  try {

    const adminChatIds = process.env.ADMIN_CHAT ? process.env.ADMIN_CHAT.split(',').map(Number) : [];

    if (!process.env.ADMIN_CHAT) {
      return console.log(`Error to getting admins from the env`)
    }

    if (!adminChatIds.includes(chat_id)) {
      return console.log(`Chat id ${chat_id} does not have access.`);
    }

    const action = command.split('__')[1]
    console.log('admin handler action: ', action)

    if (action === 'run_report_service') {
      console.log('admin started report serivce')
      if (reportService) {
        reportService.run()
      }
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
    
    if (action.startsWith('help')) {
      await bot.sendMessage(chat_id, helpInfo)
    }

    // work in progress, now all migrations are added to the folder sql migrations and helpers/wip 
    if (action.startsWith('db_migrate')) {
      const step = +action.split('migrate_')[1]
      try {
        migrations[step].forEach(m => pool.query(m))
      } catch (e) {
        console.error('error during migration process')
      }

    }

    // send all data to spreadsheet db
    
  } catch (e) {
    console.error('error in admin handler: '+e)
  }
}