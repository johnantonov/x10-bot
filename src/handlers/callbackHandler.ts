import TelegramBot from "node-telegram-bot-api";
import { MessageMS, UserCb } from "../dto/msgData";
import { cbs, generateReportTimeButtons, mainOptions, returnMenu,  yesNo, connectionOptions } from "../components/buttons";
import { redis, rStates, ttls } from "../redis";
import { users_db } from "../../database/models/users";
import { connections_db } from "../../database/models/connections";
import { handleStartMenu } from "../components/answers";
import { RediceService } from "../bot";
import { MessageService } from "../services/messageService";
import { runPersonReport } from "../services/reportService";
import { parseCallbackData } from "../utils/parse";

export async function callbackHandler(query: TelegramBot.CallbackQuery, bot: TelegramBot, RS: redis, MS: MessageService) {
  const userCb = new UserCb(query);
  const { chatId, cb, messageId } = userCb;
  const msgs: MessageMS[] = []
  let response: MessageMS;

  if (!messageId) {
    return
  }

  if (cb.startsWith(cbs.menu)) {
    await RediceService.deleteUserState(chatId)
    if (cb === cbs.menuAndEdit) {
      await handleStartMenu(false, userCb, '/menu');
    } else {
      await handleStartMenu(true, userCb, '/menu');
    }
  }

//*********************** SHEETS ***********************//
  if (cb === cbs.setOldUserType) {
    await RS.setUserState(chatId, rStates.waitPremPass, ttls.usual)
    await MS.editMessage(chatId, messageId, '🔑 Введите ваш пароль :)', returnMenu(true).reply_markup);
  };

  if (cb === cbs.getAllReportsNow) {
    await bot.editMessageReplyMarkup(mainOptions('old_ss', true).reply_markup, { chat_id: chatId, message_id: messageId })
    const reportMessageId = await runPersonReport(chatId)
    if (!reportMessageId) {
      await MS.editMessage(chatId, messageId, 
        'Произошла ошибка при формировании отчета, попробуйте позже. 😢', 
        mainOptions('old_ss').reply_markup)
    } 
    await MS.delNewDelOld(msgs, chatId);
  }

  if (cb === cbs.editReportProducts) {
    const user = await users_db.getUserById(chatId);
    if (user) {
      await MS.editMessage(chatId, messageId, 
        `Настроить его можно в своей <a href="https://docs.google.com/spreadsheets/d/${user.ss}/edit">Системе 10X</a>, во вкладке <b>Отчёт Telegram</b>`, 
        returnMenu(true).reply_markup, 'editProducts.jpg')
    } 
  }

  if (cb.startsWith(cbs.offTable)) {
    if (cb === cbs.offTable) {
      await MS.editMessage(chatId, messageId, 
        'Вы уверены, что хотите отключить ежедневную рассылку?', 
        yesNo(cbs.offTable).reply_markup)
    } else {
      let response;
      if (cb === cbs.offTable + cbs.yes) {
        await users_db.updateType(chatId, '', 'old');
        await MS.editMessage(chatId, messageId, 
          'Вы успешно отключили ежедневную рассылку', 
          mainOptions('old').reply_markup, 'success.png')
      } else {
        await handleStartMenu(false, userCb, '/menu');
      }
    };
  };

// *********** REPORT TIME *************

  if (cb.startsWith(cbs.changeTime)) {
    if (cb === cbs.changeTime) {
      await MS.editMessage(chatId, messageId, 
        'Выберите время по МСК, когда вам будет удобно получать отчет:', 
        { inline_keyboard: generateReportTimeButtons(cbs.changeTime) })
    } else {
      const [ selectedTime, ss ] = parseCallbackData(cb, 'report_time')
      const connection_callback = ss + chatId
      // await connections_db.updateReportTime(chatId, ss, selectedTime)
      await MS.editMessage(chatId, messageId, 
        `Вы будете получать отчёт ежедневно в ${selectedTime}:00`, 
        connectionOptions(connection_callback).reply_markup)
    }
  };

  return bot.answerCallbackQuery(query.id);
}