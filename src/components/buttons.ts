import TelegramBot from "node-telegram-bot-api";
import { user_type } from "../dto/user";

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
  wbkey: 'wb_api_key',
  followArticle: 'track',
  yesFollow: 'yes_track',
  changeTime: 'change_time',
  returnMain: 'return_main',
  deleteArticle: 'delete',
  setNewUserType: 'set_new_user_type',
  setOldUserType: 'set_old_user_type',
  onTable: 'turn_on_ss',
  offTable: 'turn_off_ss',
  yes: '_yes',
  no: '_no',
  menu: 'menu',
  menuAndClean: 'menu_clean',
  settingsArt: 'art_settings',
  cancelArt: 'art_setting_cancel',
  titleArt: 'art_setting_title',
  costArt: 'art_setting_cost',
  goPrem: 'go_prem',
  getReportNow: 'get_report_now',
  loading: 'loading',
  editReportProducts: 'edit_report_products',
}

export const buttons = {
  setWbApiKey: { text: '➕ Привязать WB API ключ', callback_data: cbs.wbkey },
  followArticle: { text: '👀 Отслеживать артикул', callback_data: cbs.followArticle },
  yesReadyToFollow: { text: '✅ Да. Отслеживать новый артикул', callback_data: cbs.yesFollow },
  changeTimeToReport: { text: '🕘 Настроить расписание отчетов', callback_data: cbs.changeTime },
  returnMain: { text: '🔙 Вернуться в главное меню', callback_data: cbs.returnMain },
  onTable: { text: '📂 Подключить телеграм отчет', callback_data: cbs.onTable },
  offTable: { text: '❌  Отключить телеграм отчет', callback_data: cbs.offTable },
  menu: { text: '↩️ Меню', callback_data: cbs.menu },
  menuAndClean: { text: '↩️ Меню', callback_data: cbs.menuAndClean },
  settingsArticleReport: { text: '⚙️ Настроить отчет', callback_data: cbs.settingsArt },
  cancelArt: { text: '❌ Отменить отслеживание', callback_data: cbs.cancelArt },
  titleArt: { text: '✍️ Ввести название товара', callback_data: cbs.titleArt },
  costArt: { text: '💰 Ввести себестоимость товар', callback_data: cbs.costArt },
  getReportNow: { text: '📂 Сформировать отчет сейчас', callback_data: cbs.getReportNow },
  editReportProducts: { text: '⚙️ Настроить товары в отчете', callback_data: cbs.editReportProducts },
  loading: { text: '⏳ Загрузка...', callback_data: cbs.loading },
  setOldUserType: { text: '👑 Зарегистрировать', callback_data: cbs.setOldUserType },
}

export const wbOptions = new Options([
  [{ text: '➕ Привязать WB API ключ', callback_data: cbs.wbkey }],
  [{ text: '❌ Удалить артикул', callback_data: cbs.deleteArticle }],
]);

export const returnMenu = (clean: boolean = false) => {
  return new Options([
    [clean ? buttons.menuAndClean : buttons.menu]
  ])
}

export const mainOptions = (type?: user_type, waitReport?: boolean) => {
  if (type?.startsWith('old')) {
    if (type.endsWith('_ss')) {
      const btns = [
        [buttons.getReportNow],
        [buttons.editReportProducts],
        [buttons.changeTimeToReport],
        [buttons.offTable],
      ]
      if (waitReport) {
        btns[0] = [buttons.loading]
      }
      return new Options(btns);
    }
    return new Options([
        [buttons.onTable],
        [buttons.editReportProducts],
        [buttons.changeTimeToReport],
        [buttons.offTable],
      ]);
    }
  
  return startOptions
} 

export const settingsArtOptions = () => {
  return new Options([
    [buttons.titleArt],
    [buttons.costArt],
    [buttons.cancelArt],
  ])
}

export const yesNo = (cbPart: string) => {
  return new Options([
    [{ text: '✅ Да', callback_data: cbPart + cbs.yes }],
    [{ text: '❌ Нет', callback_data: cbPart + cbs.no }],
  ])
}

const startOptions = new Options([
  [buttons.setOldUserType],
])

export function generateReportTimeButtons(rep: string, page: number = 0): TelegramBot.InlineKeyboardButton[][] {
  const startTime = 5;
  const endTime = 24;
  const timesPerPage = 20;
  const times: TelegramBot.InlineKeyboardButton[][] = [];

  for (let i = page * timesPerPage + startTime; i < Math.min((page + 1) * timesPerPage + startTime, endTime); i++) {
    const row = Math.floor((i - page * timesPerPage - startTime) / 4); 
    if (!times[row]) {
      times[row] = [];
    }
    times[row].push({ text: `${i}:00`, callback_data: `${rep}${i}` });
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

