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
Object.defineProperty(exports, "__esModule", { value: true });
exports.callbackHandler = callbackHandler;
const msgData_1 = require("../dto/msgData");
const buttons_1 = require("../components/buttons");
const redis_1 = require("../redis");
const users_1 = require("../../database/models/users");
const answers_1 = require("../components/answers");
const bot_1 = require("../bot");
function callbackHandler(query, bot, RS, MS) {
    return __awaiter(this, void 0, void 0, function* () {
        const userCb = new msgData_1.UserCb(query);
        const { chatId, cb, user_id, username, messageId } = userCb;
        const msgs = [];
        if (cb === buttons_1.cbs.menu) {
            yield bot_1.RediceService.deleteUserState(chatId);
            const answer = yield (0, answers_1.handleStartMenu)(bot, userCb, '/menu');
            msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
            return MS.addNewAndDelOld(msgs, chatId);
        }
        //*********************** ARTICLE NEW ***********************//
        if (cb === buttons_1.cbs.setNewUserType) {
            yield users_1.users_db.updateType(chatId);
            const answer = yield (0, answers_1.handleStartMenu)(bot, userCb, '/menu');
            msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
            return MS.addNewAndDelOld(msgs, chatId);
        }
        if (cb === buttons_1.buttons.followArticle.callback_data) {
            const [wbKey, isTrackedYet] = yield users_1.users_db.checkWbApiKeyAndTrack(chatId);
            if (!wbKey) {
                yield RS.setUserState(chatId, redis_1.rStates.waitWbApiKey, redis_1.ttls.usual);
                const answer = yield bot.sendMessage(chatId, '🔑 Сначала нужно добавить ключ от WB API. Введите его в ответном сообщении.', new buttons_1.Options([[buttons_1.buttons.menu]]));
                msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
                return MS.addNewAndDelOld(msgs, chatId);
            }
            if (!isTrackedYet) {
                yield RS.setUserState(chatId, redis_1.rStates.waitArticle, redis_1.ttls.usual);
                const answer = yield bot.sendMessage(chatId, 'Введите артикул 🔢', new buttons_1.Options([[buttons_1.buttons.menu]]));
                msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
                return MS.addNewAndDelOld(msgs, chatId);
            }
            else {
                const answer = yield bot.sendMessage(chatId, 'Вы перестанете отслеживать текущий артикул. Вы уверены?', new buttons_1.Options([[buttons_1.buttons.yesReadyToFollow], [buttons_1.buttons.menu]]));
                msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
                return MS.addNewAndDelOld(msgs, chatId);
            }
        }
        if (cb === buttons_1.buttons.yesReadyToFollow.callback_data) {
            yield RS.setUserState(chatId, redis_1.rStates.waitArticle, redis_1.ttls.usual);
            const answer = yield bot.sendMessage(chatId, 'Введите артикул 🔢', new buttons_1.Options([[buttons_1.buttons.menu]]));
            msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
            return MS.addNewAndDelOld(msgs, chatId);
        }
        ;
        if (cb === buttons_1.buttons.setWbApiKey.callback_data) {
            yield RS.setUserState(chatId, redis_1.rStates.waitWbApiKey, redis_1.ttls.usual);
            const answer = yield bot.sendMessage(chatId, '🔑 Введите ключ от WB API :)', new buttons_1.Options([[buttons_1.buttons.menu]]));
            msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
            return MS.addNewAndDelOld(msgs, chatId);
        }
        //*********************** SHEETS OLD ***********************//
        if (cb === buttons_1.cbs.setOldUserType || cb === buttons_1.cbs.goPrem) {
            yield RS.setUserState(chatId, redis_1.rStates.waitPremPass, redis_1.ttls.usual);
            const answer = yield bot.sendMessage(chatId, '🔑 Введите ваш пароль :)', new buttons_1.Options([[buttons_1.buttons.menu]]));
            msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing', content: 'await_pass' });
            return MS.saveMessages(msgs);
        }
        ;
        if (cb.startsWith(buttons_1.cbs.onTable)) {
            if (cb === buttons_1.cbs.onTable) {
                const answer = yield bot.sendMessage(chatId, 'Выберите время, когда вам будет удобно получать отчет:', {
                    reply_markup: {
                        inline_keyboard: (0, buttons_1.generateReportTimeButtons)(buttons_1.cbs.onTable)
                    }
                });
                msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
                yield MS.addNewAndDelOld(msgs, chatId);
            }
            else {
                const selectedTime = cb.split(buttons_1.cbs.onTable)[1];
                yield users_1.users_db.updateReportTime(chatId, selectedTime.split(':')[0]);
                const answer = yield bot.sendMessage(chatId, `Вы будете получать отчёт из Google Sheets ежедневно в ${selectedTime}:00`, (0, buttons_1.mainOptions)('old_ss'));
                msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
                yield MS.addNewAndDelOld(msgs, chatId);
            }
        }
        ;
        if (cb.startsWith(buttons_1.cbs.offTable)) {
            if (cb === buttons_1.cbs.offTable) {
                const answer = yield bot.sendMessage(chatId, 'Вы уверены, что хотите отключить ежедневную рассылку?', (0, buttons_1.yesNo)(buttons_1.cbs.offTable));
                msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
                yield MS.addNewAndDelOld(msgs, chatId);
            }
            else {
                let answer;
                if (cb === buttons_1.cbs.offTable + buttons_1.cbs.yes) {
                    yield users_1.users_db.updateType(chatId, undefined, 'old');
                    answer = yield (0, answers_1.sendImageWithText)(bot, chatId, 'success.png', 'Вы успешно отключили ежедневную рассылку', (0, buttons_1.mainOptions)('old'));
                }
                else {
                    answer = yield (0, answers_1.handleStartMenu)(bot, userCb, '/menu');
                }
                msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
                yield MS.addNewAndDelOld(msgs, chatId);
            }
            ;
        }
        ;
        // *********** REPORT TIME FOR NEW|OLD *************
        if (cb.startsWith(buttons_1.cbs.changeTime)) {
            if (cb === buttons_1.cbs.changeTime) {
                const answer = yield bot.sendMessage(chatId, 'Выберите время, когда вам будет удобно получать отчет:', {
                    reply_markup: {
                        inline_keyboard: (0, buttons_1.generateReportTimeButtons)(buttons_1.cbs.changeTime)
                    }
                });
                msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
                yield MS.addNewAndDelOld(msgs, chatId);
            }
            else {
                const selectedTime = cb.split(buttons_1.cbs.changeTime)[1];
                const type = yield users_1.users_db.updateReportTime(chatId, selectedTime.split(':')[0]);
                const answer = yield bot.sendMessage(chatId, `Вы будете получать отчёт ежедневно в ${selectedTime}:00`, (0, buttons_1.mainOptions)(type));
                msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
                yield MS.addNewAndDelOld(msgs, chatId);
            }
        }
        ;
        //*********************** ARTICLE SETTINGS ***********************//
        if (cb === buttons_1.cbs.settingsArt) {
            const answer = yield (0, answers_1.sendImageWithText)(bot, chatId, 'settings.jpg', " ", (0, buttons_1.settingsArtOptions)());
            msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
            yield MS.addNewAndDelOld(msgs, chatId);
        }
        if (cb === buttons_1.cbs.cancelArt) {
            const answer = yield (0, answers_1.handleCancelArticle)(bot, userCb);
            msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
            yield MS.addNewAndDelOld(msgs, chatId);
        }
        if (cb === buttons_1.cbs.costArt) {
            yield RS.setUserState(chatId, redis_1.rStates.waitCostArt, redis_1.ttls.usual);
            const answer = yield bot.sendMessage(chatId, 'Введите себестоимость товара 💵', new buttons_1.Options([[buttons_1.buttons.menu]]));
            msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
            return MS.addNewAndDelOld(msgs, chatId);
        }
        if (cb === buttons_1.cbs.titleArt) {
            yield RS.setUserState(chatId, redis_1.rStates.waitTitleArt, redis_1.ttls.usual);
            const answer = yield bot.sendMessage(chatId, 'Введите название товара', new buttons_1.Options([[buttons_1.buttons.menu]]));
            msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' });
            return MS.addNewAndDelOld(msgs, chatId);
        }
        return bot.answerCallbackQuery(query.id);
    });
}
