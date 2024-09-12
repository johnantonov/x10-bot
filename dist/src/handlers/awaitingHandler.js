"use strict";
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
exports.awaitingHandler = awaitingHandler;
exports.isKey = isKey;
const axios_1 = __importDefault(require("axios"));
const msgData_1 = require("../dto/msgData");
const redis_1 = require("../redis");
const users_1 = require("../../database/models/users");
const user_articles_1 = require("../../database/models/user_articles");
function awaitingHandler(data, state, env) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!data.text) {
            return new msgData_1.AwaitingAnswer({ result: false, text: "Текст отсутствует." });
        }
        if (!isKey(data.text, state)) {
            return new msgData_1.AwaitingAnswer({ result: false, text: "Введенные данные не соответствуют ожидаемому формату." });
        }
        try {
            switch (state) {
                case redis_1.rStates.waitPremPass:
                    const response = yield axios_1.default.post(env.PASS_CHECKER_URL, { pass: data.text }, {
                        headers: {
                            'Content-Type': 'application/json'
                        }
                    });
                    const res = response.data;
                    console.log('pass checker result: ' + JSON.stringify(res));
                    if (res.error) {
                        return new msgData_1.AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." });
                    }
                    else if (res.status === false) {
                        return new msgData_1.AwaitingAnswer({ result: false, text: res.text });
                    }
                    yield users_1.users_db.updateType(data.chatId, data.text);
                    return new msgData_1.AwaitingAnswer({ result: true, text: "Спасибо. Проверка пройдена успешно.", type: 'old' });
                case redis_1.rStates.waitWbApiKey:
                    try {
                        yield users_1.users_db.updateWbApiKey(data.chatId, data.text);
                        return new msgData_1.AwaitingAnswer({ result: true, text: "Ваш ключ добавлен.", type: 'new' });
                    }
                    catch (e) {
                        console.error('awaiting handler: error with set wb api key - ' + e);
                        return new msgData_1.AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." });
                    }
                case redis_1.rStates.waitArticle:
                    try {
                        yield users_1.users_db.updateArticle(data.chatId, +data.text);
                        yield user_articles_1.user_articles_db.updateArticle(data.chatId, data.text);
                        return new msgData_1.AwaitingAnswer({ result: true, text: "Ваш артикул добавлен. В меню вы можете внести дополнительные настройки для получения более точного отчета.", type: 'new_art' });
                    }
                    catch (e) {
                        console.error('awaiting handler: error to set article - ' + e);
                        return new msgData_1.AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." });
                    }
                case redis_1.rStates.waitCostArt:
                    try {
                        yield user_articles_1.user_articles_db.updateField(data.chatId, 'self_cost', data.text);
                        return new msgData_1.AwaitingAnswer({ result: true, text: "Спасибо. Себестоимость будет учтена.", type: 'new_art' });
                    }
                    catch (e) {
                        console.error('awaiting handler: error to set cost - ' + e);
                        return new msgData_1.AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." });
                    }
                case redis_1.rStates.waitTitleArt:
                    try {
                        yield user_articles_1.user_articles_db.updateField(data.chatId, 'name', data.text);
                        return new msgData_1.AwaitingAnswer({ result: true, text: "Название товара сохранено.", type: 'new_art' });
                    }
                    catch (e) {
                        console.error('awaiting handler: error to set name - ' + e);
                        return new msgData_1.AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." });
                    }
                default:
                    return new msgData_1.AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." });
            }
        }
        catch (e) {
            console.error('Error in awaiting handler: ' + e);
            return new msgData_1.AwaitingAnswer({ result: false, text: "Возникла ошибка, попробуйте еще раз." });
        }
    });
}
function isKey(text, state) {
    if (state === redis_1.rStates.waitPremPass) {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[A-Za-z\d_-]{20,}$/.test(text);
    }
    if (state === redis_1.rStates.waitWbApiKey) {
        return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[\W_]).{50,}$/.test(text);
    }
    if (state === redis_1.rStates.waitArticle) {
        return /^\d{6,}$/.test(text);
    }
    if (state === redis_1.rStates.waitCostArt) {
        return /^\d+$/.test(text);
    }
    return true;
}
