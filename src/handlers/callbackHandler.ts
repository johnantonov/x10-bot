import TelegramBot from "node-telegram-bot-api";
import { MessageMS, UserCb } from "../dto/msgData";
import { buttons, cbs, generateReportTimeButtons, mainOptions, Options, returnMenu, settingsArtOptions, yesNo } from "../components/buttons";
import { redis, rStates, ttls } from "../redis";
import { users_db } from "../../database/models/users";
import { handleStartMenu, sendImageWithText } from "../components/answers";
import { RediceService } from "../bot";
import { MessageService } from "../services/messageService";
import { runPersonReport } from "../services/reportService";

export async function callbackHandler(query: TelegramBot.CallbackQuery, bot: TelegramBot, RS: redis, MS: MessageService) {
  const userCb = new UserCb(query);
  const { chatId, cb, messageId } = userCb;
  const msgs: MessageMS[] = []

  if (cb.startsWith(cbs.menu)) {
    await RediceService.deleteUserState(chatId)
    const response = await handleStartMenu(bot, userCb, '/menu');
    msgs.push({ chatId, messageId: response.message_id })
    if (cb === cbs.menuAndClean) {
      await MS.addNewAndDelOld(msgs, chatId)
    } else {
      await MS.saveMessages(msgs)
    }
  }

//*********************** SHEETS ***********************//
  if (cb === cbs.setOldUserType || cb === cbs.goPrem) {
    await RS.setUserState(chatId, rStates.waitPremPass, ttls.usual)
    const response = await bot.sendMessage(chatId, '🔑 Введите ваш пароль :)', returnMenu(true));
    msgs.push({chatId, messageId: response.message_id, content: 'await_pass'})
    return MS.saveMessages(msgs)
  };

  if (cb.startsWith(cbs.onTable)) {
    if (cb === cbs.onTable) {
      const response = await bot.sendMessage(chatId, 'Выберите время, когда вам будет удобно получать отчет:', {
        reply_markup: {
          inline_keyboard: generateReportTimeButtons(cbs.onTable)
        }
      });
      msgs.push({chatId, messageId: response.message_id});
      await MS.addNewAndDelOld(msgs, chatId);
    } else {
      const selectedTime = cb.split(cbs.onTable)[1]; 
      await users_db.updateReportTime(chatId, selectedTime.split(':')[0]);
      const response = await bot.sendMessage(chatId!, `Отчёт формируется всегда только за вчерашний день, когда Wildberries до конца присылает все данные.`, mainOptions('old_ss'));
      msgs.push({ chatId, messageId: response.message_id });
      await MS.addNewAndDelOld(msgs, chatId);
    }
  };

  if (cb === cbs.getReportNow) {
    messageId ? msgs.push({ chatId, messageId }) : null
    await bot.editMessageReplyMarkup(mainOptions('old_ss', true).reply_markup, { chat_id: chatId, message_id: messageId })
    const reportMessageId = await runPersonReport(chatId)
    if (!reportMessageId) {
      const response = await bot.sendMessage(chatId, 'Произошла ошибка при формировании отчета, попробуйте позже. 😢', mainOptions('old_ss'))
      msgs.push({ chatId, messageId: response.message_id })
    } 
    await MS.addNewAndDelOld(msgs, chatId);
  }

  if (cb === cbs.editReportProducts) {
    messageId ? msgs.push({ chatId, messageId }) : null
    const user = await users_db.getUserById(chatId);
    if (user) {
      const response = await sendImageWithText(
        bot, chatId, 'editProducts.jpg', 
        `Настроить его можно в своей <a href="https://docs.google.com/spreadsheets/d/${user.ss}/edit">Системе 10X</a>, во вкладке <b>Отчёт Telegram</b>`, 
        { reply_markup: returnMenu(true).reply_markup, parse_mode: "HTML" }
      )
      msgs.push({ chatId, messageId: response.message_id })
    }

    await MS.addNewAndDelOld(msgs, chatId);
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
        response = await handleStartMenu(bot, userCb, '/menu');
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