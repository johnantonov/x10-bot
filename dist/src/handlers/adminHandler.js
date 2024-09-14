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
exports.handleAdminCommand = handleAdminCommand;
const reportService_1 = require("../services/reportService");
const dotenv = __importStar(require("dotenv"));
const db_1 = __importDefault(require("../../database/db"));
dotenv.config();
const helpInfo = `
/admin__run_report_service - запуск репорт сервиса на прошедший час
/admin__clean_db_{tableName} - очистить таблицу в базе данных
/admin__delete_user_{id} - удалить пользователя из таблицы users
/admin__get_marketing_costs - запуск сбора рекламных расходов
/admin__marketing_{id} - получение текущей маркетинговой информации по пользователю
`;
function handleAdminCommand(chatId, command, bot) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const adminChatId = process.env.ADMIN_CHAT;
            if (!adminChatId || chatId !== +adminChatId) {
                return console.log(`Сhat id ${chatId} does not have access.`);
            }
            const action = command.split('__')[1];
            console.log(action);
            if (action === 'run_report_service') {
                console.log('admin started report serivce');
                const RS = new reportService_1.ReportService(db_1.default);
                RS.run();
            }
            if (action.startsWith('clean_db')) {
                const db = action.split('db_')[1];
                if (db) {
                    db_1.default.query(`DELETE FROM ${db}`, (err, result) => {
                        if (err) {
                            console.error(`Failed to delete data from ${db}:`, err);
                        }
                        else {
                            console.log(`All data deleted from ${db} by admin`);
                        }
                    });
                }
                else {
                    console.error('No table specified for deletion.');
                }
            }
            if (action.startsWith('delete_user')) {
                const user = action.split('delete_user_')[1];
                if (user) {
                    db_1.default.query(`DELETE FROM users WHERE chat_id = ${user}`, (err, result) => {
                        if (err) {
                            console.error(`Failed to delete ${user}:`, err);
                        }
                        else {
                            console.log(`delete ${user} by admin`);
                        }
                    });
                }
                else {
                    console.error('No table specified for deletion.');
                }
            }
            if (action.startsWith('get_marketing_costs')) {
                console.log('admin started report serivce for marketing info');
                const RS = new reportService_1.ReportService(db_1.default);
                RS.fetchAdvertisementData();
            }
            if (action.startsWith('help')) {
                yield bot.sendMessage(chatId, helpInfo);
                console.log('admin started report serivce for marketing info');
                const RS = new reportService_1.ReportService(db_1.default);
                RS.fetchAdvertisementData();
            }
            if (action.startsWith('marketing')) {
                const user = action.split('marketing_')[1];
                if (user) {
                    if (user) {
                        db_1.default.query(`SELECT * FROM users_articles WHERE chat_id = ${user}`, (err, result) => __awaiter(this, void 0, void 0, function* () {
                            var _a;
                            if (err) {
                                yield bot.sendMessage(chatId, 'error to get marketing info');
                            }
                            else {
                                const answer = ((_a = result.rows[0]) === null || _a === void 0 ? void 0 : _a.marketing_cost) || {};
                                yield bot.sendMessage(chatId, JSON.stringify(answer));
                            }
                        }));
                    }
                    else {
                        yield bot.sendMessage(chatId, 'error to get marketing info');
                    }
                }
            }
        }
        catch (e) {
            console.error('error in admin handler: ' + e);
        }
    });
}
