import TelegramBot from "node-telegram-bot-api"
import { ReportService, runPersonReport } from "../services/reportService"
import * as dotenv from 'dotenv';
import pool from "../../database/db"
import { sortObjDatesEntries } from "../utils/dates";
import axios from "axios";
import { migrations } from "../helpers/wip-quick-fix-migration";

dotenv.config();

const helpInfo = `
/admin__run_report_service - запуск репорт сервиса на прошедший час
/admin__clean_db_{tableName} - очистить таблицу в базе данных
/admin__delete_user_{id} - удалить пользователя из таблицы users
/admin__get_marketing_costs - запуск сбора рекламных расходов
/admin__marketing_{id} - получение текущей маркетинговой информации по пользователю
/admin__send_report_{id} - отправить отчет пользователю внеочереди
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

    if (action.startsWith('send_report')) {
      try {
        const userId = action.split('report_')[1];
        if (userId) {
          runPersonReport(chatId)
          // await bot.sendMessage(chatId, "Функция временно недоступна")
        } else {
          console.error('Error: No user specified for report service');
        }
      } catch (e) {
        console.error('Error to start report service personally: ' + e);
      }
    }
    
    if (action.startsWith('help')) {
      await bot.sendMessage(chatId, helpInfo)
    }

    if (action.startsWith('marketing')) {
      const user = action.split('marketing_')[1]
      if (user) {
        pool.query('SELECT * FROM user_articles WHERE user_id = $1', [user], async (err, result) => {
          if (err) {
            await bot.sendMessage(chatId, 'error to get marketing info')
          } else {
            const answer = result.rows[0]?.marketing_cost || {}
            await bot.sendMessage(chatId, JSON.stringify(sortObjDatesEntries(answer)))
          }
        });
      } else {
        await bot.sendMessage(chatId, 'error to get marketing info')
      }
    }

    if (action.startsWith('db_migrate')) {
      const step = +action.split('migrate_')[1]
      try {
        migrations[step].forEach(m => pool.query(m))
      } catch (e) {
        console.error('error during migration process')
      }

    }
    
  } catch (e) {
    console.error('error in admin handler: '+e)
  }
}