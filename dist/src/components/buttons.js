"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yesNo = exports.settingsArtOptions = exports.mainOptions = exports.wbOptions = exports.buttons = exports.cbs = exports.Options = void 0;
exports.generateReportTimeButtons = generateReportTimeButtons;
class Options {
    constructor(buttons) {
        this.reply_markup = {
            inline_keyboard: this.generateInlineKeyboard(buttons),
        };
    }
    generateInlineKeyboard(buttons) {
        return buttons.map((row) => row.map((button) => ({
            text: button.text,
            callback_data: button.callback_data,
        })));
    }
}
exports.Options = Options;
exports.cbs = {
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
    settingsArt: 'art_settings',
    cancelArt: 'art_setting_cancel',
    titleArt: 'art_setting_title',
    costArt: 'art_setting_cost',
    goPrem: 'go_prem',
};
exports.buttons = {
    setWbApiKey: { text: '➕ Привязать WB API ключ', callback_data: exports.cbs.wbkey },
    followArticle: { text: '👀 Отслеживать артикул', callback_data: exports.cbs.followArticle },
    yesReadyToFollow: { text: '✅ Да. Отслеживать новый артикул', callback_data: exports.cbs.yesFollow },
    changeTimeToReport: { text: '🕘 Настроить расписание отчетов', callback_data: exports.cbs.changeTime },
    returnMain: { text: '🔙 Вернуться в главное меню', callback_data: exports.cbs.returnMain },
    onTable: { text: '📂 Подключить отчет из Google Sheets', callback_data: exports.cbs.onTable },
    offTable: { text: '❌ Отключить отчет из Google Sheets', callback_data: exports.cbs.offTable },
    menu: { text: '↩️ Меню', callback_data: exports.cbs.menu },
    settingsArticleReport: { text: '⚙️ Настроить отчет', callback_data: exports.cbs.settingsArt },
    cancelArt: { text: '❌ Отменить отслеживание', callback_data: exports.cbs.cancelArt },
    titleArt: { text: '✍️ Ввести название товара', callback_data: exports.cbs.titleArt },
    costArt: { text: '💰 Ввести себестоимость товар', callback_data: exports.cbs.costArt },
    goPrem: { text: '👑 Перейти на премиум', callback_data: exports.cbs.goPrem },
};
exports.wbOptions = new Options([
    [{ text: '➕ Привязать WB API ключ', callback_data: exports.cbs.wbkey }],
    [{ text: '❌ Удалить артикул', callback_data: exports.cbs.deleteArticle }],
]);
const mainOptions = (type) => {
    if (type === null || type === void 0 ? void 0 : type.startsWith('old')) {
        if (type.endsWith('_ss')) {
            return new Options([
                [exports.buttons.changeTimeToReport],
                [exports.buttons.offTable],
            ]);
        }
        return new Options([
            [exports.buttons.onTable],
        ]);
    }
    if (type === 'new') {
        return new Options([
            [exports.buttons.goPrem],
            [exports.buttons.followArticle],
            [exports.buttons.setWbApiKey],
            [exports.buttons.changeTimeToReport],
        ]);
    }
    if (type === 'new_art') {
        return new Options([
            [exports.buttons.goPrem],
            [exports.buttons.settingsArticleReport],
            [exports.buttons.followArticle],
            [exports.buttons.setWbApiKey],
            [exports.buttons.changeTimeToReport],
        ]);
    }
    return startOptions;
};
exports.mainOptions = mainOptions;
const settingsArtOptions = () => {
    return new Options([
        [exports.buttons.titleArt],
        [exports.buttons.costArt],
        [exports.buttons.cancelArt],
    ]);
};
exports.settingsArtOptions = settingsArtOptions;
const yesNo = (cbPart) => {
    return new Options([
        [{ text: '✅ Да', callback_data: cbPart + exports.cbs.yes }],
        [{ text: '❌ Нет', callback_data: cbPart + exports.cbs.no }],
    ]);
};
exports.yesNo = yesNo;
const startOptions = new Options([
    [{ text: '✨ Попробовать', callback_data: exports.cbs.setNewUserType }],
    [{ text: '👑 Я премиум клиент', callback_data: exports.cbs.setOldUserType }],
]);
function generateReportTimeButtons(rep, page = 0) {
    const startTime = 5;
    const endTime = 24;
    const timesPerPage = 20;
    const times = [];
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
