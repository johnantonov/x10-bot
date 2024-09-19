import TelegramBot from "node-telegram-bot-api";
import { MessageMS, UserCb } from "../dto/msgData";
import { buttons, cbs, generateReportTimeButtons, mainOptions, Options, returnMenu, settingsArtOptions, yesNo } from "../components/buttons";
import { redis, rStates, ttls } from "../redis";
import { users_db } from "../../database/models/users";
import { handleStartMenu, sendImageWithText } from "../components/answers";
import { RediceService } from "../bot";
import { MessageService } from "../services/messageService";
import { runPersonReport } from "../services/reportService";
import { resolve } from "path";

export async function callbackHandler(query: TelegramBot.CallbackQuery, bot: TelegramBot, RS: redis, MS: MessageService) {
  const userCb = new UserCb(query);
  const { chatId, cb, messageId } = userCb;
  const msgs: MessageMS[] = []
  const editMsgs: MessageMS[] = [];

  if (!messageId) {
    return
  }

  if (cb.startsWith(cbs.menu)) {
    await RediceService.deleteUserState(chatId)
    if (cb === cbs.menuAndEdit) {
      await handleStartMenu(false, userCb, '/menu');
      // msgs.push({ chatId, messageId: response.message_id, special: 'edit' })
    } else {
      await handleStartMenu(true, userCb, '/menu');
    }
  }

//*********************** SHEETS ***********************//
  if (cb === cbs.setOldUserType) {
    await RS.setUserState(chatId, rStates.waitPremPass, ttls.usual)
    MS.editMessage(chatId, messageId, '🔑 Введите ваш пароль :)', returnMenu(true).reply_markup)
  };

  if (cb.startsWith(cbs.onTable)) {
    if (cb === cbs.onTable) {
      MS.editMessage(chatId, messageId, 'Выберите время, когда вам будет удобно получать отчет:', {
          inline_keyboard: generateReportTimeButtons(cbs.onTable)
      })
    } else {
      const selectedTime = cb.split(cbs.onTable)[1]; 
      await users_db.updateReportTime(chatId, selectedTime.split(':')[0]);
      MS.editMessage(chatId, messageId, 
        `Отчёт формируется всегда только за вчерашний день, когда Wildberries до конца присылает все данные.`, 
        mainOptions('old_ss').reply_markup)
    }
  };

  if (cb === cbs.getReportNow) {
    messageId ? msgs.push({ chatId, messageId }) : null
    await bot.editMessageReplyMarkup(mainOptions('old_ss', true).reply_markup, { chat_id: chatId, message_id: messageId })
    const reportMessageId = await runPersonReport(chatId)
    if (!reportMessageId) {
      MS.editMessage(chatId, messageId, 
        'Произошла ошибка при формировании отчета, попробуйте позже. 😢', 
        mainOptions('old_ss').reply_markup)
    } 
    await MS.addNewAndDelOld(msgs, chatId);
  }

  if (cb === cbs.editReportProducts) {
    const user = await users_db.getUserById(chatId);
    if (user) {
      MS.editMessage(chatId, messageId, 
        `Настроить его можно в своей <a href="https://docs.google.com/spreadsheets/d/${user.ss}/edit">Системе 10X</a>, во вкладке <b>Отчёт Telegram</b>`, 
        returnMenu(true).reply_markup, 'editProducts.jpg')
    } 
  }

  if (cb.startsWith(cbs.offTable)) {
    if (cb === cbs.offTable) {
      const response = await bot.sendMessage(chatId, 'Вы уверены, что хотите отключить ежедневную рассылку?', yesNo(cbs.offTable));
      msgs.push({ chatId, messageId: response.message_id });
      await MS.addNewAndDelOld(msgs, chatId);
    } else {
      let response;
      if (cb === cbs.offTable + cbs.yes) {
        await users_db.updateType(chatId, '', 'old');
        response = await sendImageWithText(bot, chatId, 'success.png' , 'Вы успешно отключили ежедневную рассылку', mainOptions('old'));
      } else {
        response = await handleStartMenu(false, userCb, '/menu');
      }

      msgs.push({ chatId, messageId: response.message_id });
      await MS.addNewAndDelOld(msgs, chatId);
    };
  };

// *********** REPORT TIME *************
  if (cb.startsWith(cbs.changeTime)) {
    if (cb === cbs.changeTime) {
      const response = await bot.sendMessage(chatId, 'Выберите время по МСК, когда вам будет удобно получать отчет:', {
        reply_markup: {
          inline_keyboard: generateReportTimeButtons(cbs.changeTime)
        }
      });
      msgs.push({chatId, messageId: response.message_id});
      await MS.addNewAndDelOld(msgs, chatId);
    } else {
      const selectedTime = cb.split(cbs.changeTime)[1]; 
      const type = await users_db.updateReportTime(chatId, selectedTime.split(':')[0]);
      const response = await bot.sendMessage(chatId!, `Вы будете получать отчёт ежедневно в ${selectedTime}:00`, mainOptions(type));
      msgs.push({chatId, messageId: response.message_id});
      await MS.addNewAndDelOld(msgs, chatId);
    }
  };

  return bot.answerCallbackQuery(query.id);
}