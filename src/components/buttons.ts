import TelegramBot from "node-telegram-bot-api";
import { user_type } from "../dto/user";
import { users_db } from "../../database/models/users";
import { ConnectionCallbackData } from "../dto/buttons";

interface btnData {
  text: string;
  callback_data: string;
}

export class Options {
  reply_markup: { inline_keyboard: btnData[][] };

  constructor(buttons: btnData[][]) {
    this.reply_markup = {
      inline_keyboard: this.generateInlineKeyboard(buttons),
    };
  }

  generateInlineKeyboard(buttons: btnData[][]): btnData[][] {
    return buttons.map((row: btnData[]) =>
      row.map((button: btnData) => ({
        text: button.text,
        callback_data: button.callback_data,
      }))
    );
  }
}

export async function setBotCommands(bot: TelegramBot) {
  try {
    await bot.setMyCommands([
      { command: '/menu', description: 'Главное меню' }
    ]);
    console.log('Команды установлены.');
  } catch (error) {
    console.error('Ошибка при установке команд:', error);
  }
}

export const cbs = {
  returnMain: 'return_main',
  setOldUserType: 'set_old_user_type',
  onTable: 'turn_on_ss',
  offTable: 'turn_off_ss',
  yes: '_yes',
  no: '_no',
  menu: 'menu',
  menuAndEdit: 'menu_edit',
  goPrem: 'go_prem',
  loading: 'loading',
  getAllReportsNow: 'get_all_report_now',
  connectionBtn: 'connectionBtn',
  myConnections: 'my_connections',
  newConnection: 'new_connection',
  getReportNow: 'getReportNow_',
  changeTime: 'changeTime_',
  editReportProducts: 'editReportProducts_',
  editReportName: 'editReportName_',
  offConnection: 'offConnection_',
}

export const buttons = {
  returnMain: { text: '🔙 Вернуться в главное меню', callback_data: cbs.returnMain },
  onTable: { text: '📂 Подключить телеграм отчет', callback_data: cbs.onTable },
  menu: { text: '↩️ Меню', callback_data: cbs.menu },
  menuAndEdit: { text: '↩️ Меню', callback_data: cbs.menuAndEdit },
  changeTime: (connection: string) => { return  { text: '🕘 Настроить расписание отчетов', callback_data: cbs.changeTime + connection } },
  getReportNow: (connection: string) => { return { text: '📂 Сформировать отчет сейчас', callback_data: cbs.getReportNow + connection } },
  editReportProducts: (connection: string) => { return  { text: '⚙️ Настроить товары в отчете', callback_data: cbs.editReportProducts + connection } },
  editReportName: (connection: string) => { return  { text: '✏️ Название подключения', callback_data: cbs.editReportName + connection } },
  offTable: (connection: string) => { return  { text: '❌  Отключить телеграм отчет', callback_data: cbs.offTable + connection } },
  offConnection: (connection: string) => { return  { text: '🛑 Удалить подключение', callback_data: cbs.offConnection + connection } },
  getAllReportsNow: { text: '📂 Сформировать отчеты сейчас', callback_data: cbs.getAllReportsNow } ,
  myConnections: { text: '📊 Подключения', callback_data: cbs.myConnections } ,
  newConnection: { text: '➕ Новое подключение', callback_data: cbs.newConnection } ,
  loading: { text: '⏳ Загрузка...', callback_data: cbs.loading },
  setOldUserType: { text: '👑 Зарегистрировать', callback_data: cbs.setOldUserType },
}



export const returnMenu = (edit: boolean = false) => {
  return new Options([
    [edit ? buttons.menuAndEdit : buttons.menu]
  ])
}

export const mainOptions = (waitReport?: boolean, type?: user_type) => {
  if (type?.startsWith('new')) {
    return startOptions
  } 

  const btns = [[buttons.getAllReportsNow], [buttons.myConnections]]
  if (waitReport) {
    btns[0] = [buttons.loading]
  }
  return new Options(btns);
} 

const startOptions = new Options([
  [buttons.setOldUserType],
])

export const connectionOptions = (connection: string, status: string) => {
    const connectionBtns = [
    [buttons.getReportNow(connection)],
    [buttons.editReportProducts(connection)],
    [buttons.changeTime(connection)],
    [buttons.editReportName(connection)]
  ]
  
  if (status === 'on') {
    connectionBtns.push([buttons.offTable(connection)])
  } else {
    connectionBtns.push([buttons.offConnection(connection)])
  }

  return new Options(connectionBtns);
}

export const yesNo = (cbPart: string) => {
  return new Options([
    [{ text: '✅ Да', callback_data: cbPart + cbs.yes }],
    [{ text: '❌ Нет', callback_data: cbPart + cbs.no }],
  ])
}

export async function generateConnectionsButtons(chat_id: number, page: number = 1): Promise<TelegramBot.InlineKeyboardButton[][]> {
  const connections = await users_db.getConnections(chat_id);
  const connectionButtons: TelegramBot.InlineKeyboardButton[][] = [[]];
  const conectionsPerPage = 12
  const pages = Math.round(connections.length / conectionsPerPage)

  console.log(connections)

  connections.forEach((conection, i) => {
    console.log(chat_id)

    const data: ConnectionCallbackData = {
      main: cbs.connectionBtn,
      ss: conection.ss,
      status: conection.status,
      action: ""
    }

    console.log(JSON.stringify(data))
    
    connectionButtons[0].push({ 
      text: `${conection.title ? conection.title : conection.ss}`, 
      callback_data: JSON.stringify(data), 
    })
  })

  console.log(1)
  connectionButtons.push([buttons.newConnection, buttons.menuAndEdit])
  console.log(2)

  return connectionButtons;
}

export function generateReportTimeButtons(changeTime: string, page: number = 0): TelegramBot.InlineKeyboardButton[][] {
  const startTime = 5;
  const endTime = 24;
  const timesPerPage = 20;
  const times: TelegramBot.InlineKeyboardButton[][] = [];

  for (let i = page * timesPerPage + startTime; i < Math.min((page + 1) * timesPerPage + startTime, endTime); i++) {
    const row = Math.floor((i - page * timesPerPage - startTime) / 4); 
    if (!times[row]) {
      times[row] = [];
    }
    times[row].push({ text: `${i}:00`, callback_data: `${changeTime}${i}` });
  }

  /*
  const navigationButtons: TelegramBot.InlineKeyboardButton[] = [];
  if (page > 0) {
    navigationButtons.push({ text: '⬅️ Назад', callback_data: `${rep}_time_prev_page_${page - 1}` });
  }
  if ((page + 1) * timesPerPage + startTime < endTime) {
    navigationButtons.push({ text: 'Вперед ➡️', callback_data: `${rep}_time_next_page_${page + 1}` });
  }

  if (navigationButtons.length > 0) {
    times.push(navigationButtons);
  }
  */

  return times;
}

