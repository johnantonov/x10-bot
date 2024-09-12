"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv = __importStar(require("dotenv"));
const node_cron_1 = __importDefault(require("node-cron"));
dotenv.config();
class ReportService {
    constructor(pool) {
        this.pool = pool;
    }
    // Fetch users with type and matching notification_time
    getUsersForReport(hour, type) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM users 
      WHERE type = $2 AND notification_time = $1
    `;
            const result = yield this.pool.query(query, [hour, type]);
            return result.rows;
        });
    }
    // Send message to user
    sendMessage(chatId, message) {
        return __awaiter(this, void 0, void 0, function* () {
            const telegramApiUrl = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}/sendMessage`;
            try {
                yield axios_1.default.post(telegramApiUrl, {
                    chat_id: chatId,
                    text: message,
                    parse_mode: 'HTML',
                });
                console.log(`Report Service: Message sent to chatId: ${chatId}`);
            }
            catch (error) {
                console.error(`Report Service: Failed to send message to chatId: ${chatId}`, error);
            }
        });
    }
    fetchWbStatistics(data, startDate, endDate) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(data);
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
                const response = yield axios_1.default.post(url, requestData, {
                    headers: {
                        'Authorization': `${data[0].key}`,
                        'Content-Type': 'application/json'
                    }
                });
                return response.data;
            }
            catch (error) {
                console.error('Error fetching NM report statistics: ' + error);
                return false;
            }
        });
    }
    // Send SS values to Google Web App and receive report data
    getReportsFromWebApp(ssList) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post(process.env.SS_REPORTS_GETTER_URL, {
                    ssList: ssList
                });
                return response.data;
            }
            catch (error) {
                console.error('Error fetching reports from Web App:', error);
                throw error;
            }
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const currentHour = new Date().getHours() + 3;
                const oldUsers = yield this.getUsersForReport(currentHour, 'old_ss');
                const newUsers = yield this.getUsersForReport(currentHour, 'new_art');
                if (oldUsers.length > 0) {
                    const ssList = oldUsers.map(user => user.ss).filter(ss => typeof ss === 'string');
                    const reportData = yield this.getReportsFromWebApp(ssList);
                    for (const user of oldUsers) {
                        if (user.ss && reportData[user.ss]) {
                            const formattedMessage = formatReportMessage(reportData[user.ss]);
                            yield this.sendMessage(user.chat_id, formattedMessage);
                        }
                    }
                }
                else {
                    console.log('No old users to report for this hour: ' + currentHour);
                }
                if (newUsers.length > 0) {
                    const date = (0, dates_1.getYesterdayDate)();
                    for (const user of newUsers) {
                        if (user.wb_api_key && user.article) {
                            const report = yield this.fetchWbStatistics([{ article: user.article, key: user.wb_api_key }], date, date);
                            console.log(report);
                            const articleData = yield user_articles_1.user_articles_db.selectArticle(user.article);
                            if (report && articleData) {
                                console.log(report.data[0].history);
                                const data = report.data[0].history;
                                console.log(data);
                                const name = articleData.name ? articleData === null || articleData === void 0 ? void 0 : articleData.name : user.article;
                                let selfCost = 0;
                                if (articleData.self_cost) {
                                    selfCost = data[0].buyoutsCount * articleData.self_cost;
                                }
                                const rev = data[0].buyoutsSumRub - selfCost - articleData.marketing_cost;
                                let message = `
Заказы ${data[0].ordersCount} шт на ${data[0].ordersSumRub} руб
Выкупы ${data[0].buyoutsCount} шт на ${data[0].buyoutsSumRub} руб
Рекламный бюджет ${(_a = articleData === null || articleData === void 0 ? void 0 : articleData.marketing_cost) !== null && _a !== void 0 ? _a : 0}
<b>Прибыль: ${rev}</b>`;
                                this.sendMessage(user.chat_id, `<b>Отчет за ${date}: ${name}</b>\n\n${message}`);
                            }
                            else if (!report && articleData) {
                                this.sendMessage(user.chat_id, `К сожалению, нам не удалось получить отчета за ${date} по ${articleData === null || articleData === void 0 ? void 0 : articleData.name} ${user.article}`);
                            }
                            else {
                                console.log('no data for ' + user.article);
                            }
                        }
                    }
                }
                else {
                    console.log('No new users to report for this hour: ' + currentHour);
                }
            }
            catch (error) {
                console.error('Error in report service:', error);
            }
        });
    }
    // Schedule the report service to run every hour from 4 AM to 11 PM
    startCronJob() {
        node_cron_1.default.schedule('0 4-23 * * *', () => __awaiter(this, void 0, void 0, function* () {
            console.log('Running report service at:', new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }));
            yield this.run();
        }), {
            timezone: 'Europe/Moscow'
        });
    }
}
exports.ReportService = ReportService;
function formatReportMessage(data) {
    let message = '';
    data.forEach((row, i) => {
        if (i === 0) {
            message += `<b>${row[0]}</b>\n\n`;
        }
        else if (row[0].startsWith('ТОП')) {
            message += `\n<b>${row[0]}</b>\n`;
        }
        else if (row[0].startsWith('Товар')) {
            message += `${row[0]} ${row[1]}\n`;
        }
        else {
            message += `<b>${row[0]}</b> ${row[1]}\n`;
        }
    });
    return message.trim();
}
const db_1 = __importDefault(require("../../database/db"));
const dates_1 = require("../utils/dates");
const user_articles_1 = require("../../database/models/user_articles");
const reportService = new ReportService(db_1.default);
reportService.startCronJob();
