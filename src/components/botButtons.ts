import TelegramBot, { CallbackQuery, InlineKeyboardButton, ReplyKeyboardMarkup } from "node-telegram-bot-api";
import { user_type } from "../dto/user";
import { Connection, ConnectionCallbackData, ConnectionStatus } from "../dto/connection";
import { newConnectionData } from "../utils/parse";
import { connections_db } from "../../database/models/connections";

/**
 * set bot commands (now using when bot starting)
 */
export async function setBotCommands(bot: TelegramBot) {
  try {
    await bot.setMyCommands([
      { command: '/menu', description: 'Главное меню' }
    ]);
    console.log('Commands set');
  } catch (error) {
    console.error('Error to set command', error);
  }
}

export class Options {
  reply_markup: { inline_keyboard: InlineKeyboardButton[][] };

  constructor(buttons: InlineKeyboardButton[][]) {
    this.reply_markup = {
      inline_keyboard: this.generateInlineKeyboard(buttons),
    };
  }

  generateInlineKeyboard(buttons: InlineKeyboardButton[][]): InlineKeyboardButton[][] {
    return buttons.map((row: InlineKeyboardButton[]) =>
      row.map((button: InlineKeyboardButton) => ({
        text: button.text,
        callback_data: button.callback_data,
      }))
    );
  }
}

export const CallbackData: Record<string, CallbackQuery['data']> = {
  returnMain: 'return_main',
  registrateUser: 'set_old_user_type',
  onTable: 'ton?',
  offTable: 'tof?',
  yes: '?yes',
  no: '?no',
  menu: 'menu',
  menuAndEdit: 'menu_edit',
  goPrem: 'go_prem',
  loading: 'loading',
  getAllReportsNow: 'get_all_report_now',
  connectionBtn: 'con?',
  myConnections: 'myc?',
  newConnection: 'onc?',
  getReportNow: 'grn?',
  changeTime: 'ct?',
  editReportProducts: 'erp?',
  editConnectionTitle: 'ecn?',
  offConnection: 'offc?',
  returnConnection: 'rc?',
  menuEditImg: 'edit_menu_img',
} as const;

export const mainButtons: Record<string, InlineKeyboardButton> = {
  returnMain: { text: '🔙 Вернуться в главное меню', callback_data: CallbackData.returnMain },
  onTable: { text: '📂 Подключить телеграм отчет', callback_data: CallbackData.onTable },
  menu: { text: '↩️ Меню', callback_data: CallbackData.menu },
  menuAndEdit: { text: '↩️ Меню', callback_data: CallbackData.menuAndEdit },
  changeTime: { text: '🕘 Настроить расписание отчетов', callback_data: CallbackData.changeTime },
  getAllReportsNow: { text: '📂 Сформировать отчеты сейчас', callback_data: CallbackData.getAllReportsNow } ,
  myConnections: { text: '📊 Подключенные таблицы', callback_data: CallbackData.myConnections } ,
  newConnection: { text: '➕ Новое подключение', callback_data: CallbackData.newConnection } ,
  loading: { text: '⏳ Загрузка...', callback_data: CallbackData.loading },
  registrateUser: { text: '➕ Новое подключение', callback_data: CallbackData.registrateUser },
} as const

export const connectionButtons: Record<string, ((connection: string) => TelegramBot.InlineKeyboardButton)> = {
  getReportNow: (connection: string) => { return { text: '📂 Сформировать отчет сейчас', callback_data: CallbackData.getReportNow + connection } },
  editReportProducts: (connection: string) => { return  { text: '⚙️ Настроить товары в отчете', callback_data: CallbackData.editReportProducts + connection } },
  editReportName: (connection: string) => { return  { text: '✏️ Переименовать подключение', callback_data: CallbackData.editConnectionTitle + connection } },
  offTable: (connection: string) => { return  { text: '❌  Отключить телеграм отчет', callback_data: CallbackData.offTable + connection } },
  offConnection: (connection: string) => { return  { text: '🛑 Удалить подключение', callback_data: CallbackData.offConnection + connection } },
  returnConnection: (connection: string) => { return  { text: '↩️ К подключению', callback_data: CallbackData.returnConnection + connection } },
  menuEditImg: (connection: string) => { return  { text: '↩️ К подключению', callback_data: CallbackData.menuEditImg + connection } },
}


/**
 * returns menu btn with 
 * @param {boolean} edit - the message or callback data
 */
export const returnMenu = (edit: boolean = false) => {
  return new Options([[edit ? mainButtons.menuAndEdit : mainButtons.menu]]).reply_markup
}

export const returnMenuWithImg = (connection: string) => {
  return new Options([[connectionButtons.menuEditImg(connection)]]).reply_markup
}

/**
 * returns main options for new or registred user
 * @param {boolean} waitReport - if user wait all reports change btn to loading text
 * @param {boolean} type - current type of user
 */
export const mainOptions = (waitReport?: boolean, type?: user_type) => {
  if (type?.startsWith('new')) {
    return new Options([[mainButtons.registrateUser]]).reply_markup
  } 

  const btns = [
    [mainButtons.getAllReportsNow], 
    [mainButtons.myConnections],
    [mainButtons.changeTime]
  ]

  if (waitReport) {
    btns[0] = [mainButtons.loading]
  }

  return new Options(btns).reply_markup;
} 

/**
 * returns connection menu
 * @param {string} connection - connection data, add to the callback btn (action+connection)
 * @param {string} status - status of the waiting report in connection (on|off)
 * @param {boolean} waitReport - if user wait the single report change btn to loading text 
 */
export const connectionOptions = (connection: string, status: ConnectionStatus, waitReport?: boolean): Options['reply_markup'] => {
    const connectionBtns = [
    [connectionButtons.getReportNow(connection)],
    [connectionButtons.editReportProducts(connection)],
    [connectionButtons.editReportName(connection)],
  ]
  
  if (status === 'on') {
    connectionBtns.push([connectionButtons.offTable(connection)])
  } else {
    connectionBtns.push([connectionButtons.offConnection(connection)])
  }
  
  connectionBtns.push([mainButtons.menuAndEdit])

  if (waitReport) {
    connectionBtns[0] = [mainButtons.loading]
  }

  return new Options(connectionBtns).reply_markup;
}

/**
 * returns the button to return on connection menu
 * @param {string} connection - connection data, add to the callback btn (action+connection)
 */
export const returnConnectionMenu = (connection: string) => {
  const btn = connectionButtons.returnConnection(connection)
  return new Options([[btn]]).reply_markup
}

/**
 * create yes|no choice 
 * @param {string} cbPart - part of button`s callback 
 */
export const yesNo = (cbPart: string) => {
  return new Options([
    [{ text: '✅ Да', callback_data: cbPart + CallbackData.yes }],
    [{ text: '❌ Нет', callback_data: cbPart + CallbackData.no }],
  ]).reply_markup
}

/**
 * generate and return connections keyboard
 * @param {number} chat_id - user chat id
 */
export async function generateConnectionsButtons(chat_id: number, page: number = 1): Promise<TelegramBot.InlineKeyboardButton[][]> {
  const connections = await connections_db.getConnections(chat_id);
  const connectionButtons: TelegramBot.InlineKeyboardButton[][] = [];
  const connectionsPerPage = 12; 
  const pages = Math.ceil(connections.length / connectionsPerPage); 

  // use little keys because btn callback limit is 64 bytes and we have a large string ss id
  connections.forEach((connection, i) => {
    const data: ConnectionCallbackData = {
      mn: CallbackData.connectionBtn,
      ss: connection.ss,
      sts: connection.status,
      an: "",
    };

    const rowIndex = Math.floor(i / 3);

    if (!connectionButtons[rowIndex]) {
      connectionButtons[rowIndex] = [];
    }

    connectionButtons[rowIndex].push({
      text: `${connection.title ? connection.title : connection.ss}`,
      callback_data: data.mn + newConnectionData(data),
    });
  });

  connectionButtons.push([mainButtons.newConnection, { text: '↩️ Меню', callback_data: CallbackData.menuAndEdit }]);

  return connectionButtons;
}

/**
 * generate and return time keyboard
 * @param {string} callback - the callback to be handled by the callback handler
 */
export function generateReportTimeButtons(callback: string, page: number = 0): TelegramBot.InlineKeyboardButton[][] {
  const startTime = 5;
  const endTime = 24;
  const timesPerPage = 20;
  const times: TelegramBot.InlineKeyboardButton[][] = [];

  for (let i = page * timesPerPage + startTime; i < Math.min((page + 1) * timesPerPage + startTime, endTime); i++) {
    const row = Math.floor((i - page * timesPerPage - startTime) / 4); 
    if (!times[row]) {
      times[row] = [];
    }
    times[row].push({ text: `${i}:00`, callback_data: `${callback}${i}` });
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
  times.push([mainButtons.menu])
  return times;
}

