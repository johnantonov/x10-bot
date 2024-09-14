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
    // if hour = 0, add all users for adv data
    getUsersForReport(hour, type) {
        return __awaiter(this, void 0, void 0, function* () {
            let query = '';
            let params = [type];
            if (hour > 0) {
                query = `SELECT * FROM users WHERE type = $2 AND notification_time = $1`;
                params = [hour, type]; // оба параметра используются
            }
            else {
                query = `SELECT * FROM users WHERE type = $1`;
            }
            const result = yield this.pool.query(query, params);
            return result.rows;
        });
    }
    // Get marketing info
    fetchAdvertisementData() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const users = yield this.getUsersForReport(0, 'new_art');
                if (users.length === 0) {
                    console.log('No users with type new_art to fetch advertisement data for.');
                    return;
                }
                for (const user of users) {
                    const wbKey = user.wb_api_key;
                    const article = user.article;
                    if (!wbKey || !article) {
                        console.log(`No recent campaigns found for user with chat ID: ${user.chat_id}`);
                        continue;
                    }
                    const campaignResponse = yield axios_1.default.get('https://advert-api.wildberries.ru/adv/v1/promotion/count', {
                        headers: {
                            'Authorization': wbKey,
                            'Content-Type': 'application/json'
                        }
                    });
                    const campaigns = campaignResponse.data.adverts || [];
                    if (campaigns.length === 0) {
                        console.log(`No recent campaigns found for user with chat ID: ${user.chat_id}`);
                        continue;
                    }
                    const now = new Date();
                    const thirtyDaysAgo = new Date();
                    thirtyDaysAgo.setDate(now.getDate() - 30);
                    const recentCampaigns = campaigns.flatMap((campaign) => campaign.advert_list.filter((advert) => {
                        const changeTime = new Date(advert.changeTime);
                        return changeTime >= thirtyDaysAgo && changeTime <= now;
                    }));
                    const last30DaysDates = (0, dates_1.getXdaysAgoArr)(10);
                    const advertIds = recentCampaigns.map((advert) => ({
                        id: advert.advertId,
                        dates: last30DaysDates
                    }));
                    if (advertIds.length === 0) {
                        console.log(`No recent campaigns found for user with chat ID: ${user.chat_id}`);
                        continue;
                    }
                    const advertDetailsResponse = yield axios_1.default.post('https://advert-api.wildberries.ru/adv/v2/fullstats', advertIds, {
                        headers: {
                            'Authorization': wbKey,
                            'Content-Type': 'application/json'
                        }
                    });
                    const result = (0, marketing_1.processCampaigns)(advertDetailsResponse.data, article);
                    user_articles_1.user_articles_db.addMarketingCost(user.chat_id, result);
                    console.log(`Advertisement details for user with chat ID: ${user.chat_id}:`, JSON.stringify(result));
                }
            }
            catch (error) {
                console.error('Error fetching advertisement data:', error);
            }
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
            const url = 'https://seller-analytics-api.wildberries.ru/api/v2/nm-report/detail/history';
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
            var _a, _b;
            try {
                const currentHour = new Date().getHours() + 3;
                const oldUsers = yield this.getUsersForReport(currentHour, 'old_ss');
                const newUsers = yield this.getUsersForReport(currentHour, 'new_art');
                if (oldUsers.length > 0) {
                    const ssList = oldUsers.map(user => user.ss).filter(ss => typeof ss === 'string');
                    const reportData = yield this.getReportsFromWebApp(ssList);
                    for (const user of oldUsers) {
                        if (user.ss && reportData[user.ss]) {
                            const formattedMessage = (0, text_1.formatReportMessage)(reportData[user.ss]);
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
                            const articleData = yield user_articles_1.user_articles_db.selectArticle(user.chat_id);
                            if (report) {
                                console.log(report.data[0].history);
                                const data = report.data[0].history;
                                console.log(data);
                                const name = (articleData === null || articleData === void 0 ? void 0 : articleData.name) ? articleData === null || articleData === void 0 ? void 0 : articleData.name : user.article;
                                let selfCost = 0;
                                if (articleData === null || articleData === void 0 ? void 0 : articleData.self_cost) {
                                    selfCost = data[0].buyoutsCount * articleData.self_cost;
                                }
                                const rev = data[0].buyoutsSumRub - selfCost - ((_a = articleData === null || articleData === void 0 ? void 0 : articleData.marketing_cost) !== null && _a !== void 0 ? _a : 0);
                                let message = `
Заказы ${data[0].ordersCount} шт на ${data[0].ordersSumRub} руб
Выкупы ${data[0].buyoutsCount} шт на ${data[0].buyoutsSumRub} руб
Рекламный бюджет ${(_b = articleData === null || articleData === void 0 ? void 0 : articleData.marketing_cost) !== null && _b !== void 0 ? _b : 0}
<b>Прибыль: ${rev}</b>`;
                                this.sendMessage(user.chat_id, `<b>Отчет за ${date}: ${name}</b>\n${message}`);
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
    // at 00 start to getting adv info
    startCronJob() {
        node_cron_1.default.schedule('0 4-23 * * *', () => __awaiter(this, void 0, void 0, function* () {
            console.log('Running report service at:', new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }));
            yield this.run();
        }), {
            timezone: 'Europe/Moscow'
        });
        node_cron_1.default.schedule('0 0 * * *', () => __awaiter(this, void 0, void 0, function* () {
            console.log('Running advertisement data fetch at 00:00:', new Date().toLocaleTimeString('ru-RU', { timeZone: 'Europe/Moscow' }));
            yield this.fetchAdvertisementData();
        }), {
            timezone: 'Europe/Moscow'
        });
    }
}
exports.ReportService = ReportService;
const db_1 = __importDefault(require("../../database/db"));
const dates_1 = require("../utils/dates");
const user_articles_1 = require("../../database/models/user_articles");
const text_1 = require("../utils/text");
const marketing_1 = require("../helpers/marketing");
const reportService = new ReportService(db_1.default);
reportService.startCronJob();
