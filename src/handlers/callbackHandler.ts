import TelegramBot from "node-telegram-bot-api";
import { MessageMS, UserCb } from "../dto/msgData";
import { cbs, generateReportTimeButtons, mainOptions, returnMenu,  yesNo, connectionOptions, generateConnectionsButtons, returnConnectionMenu } from "../components/buttons";
import { redis, rStates, ttls } from "../redis";
import { connections_db } from "../../database/models/connections";
import { handleStartMenu } from "../components/answers";
import { RediceService } from "../bot";
import { MessageService } from "../services/messageService";
import { runPersonReport } from "../services/reportService";
import { newConnectionData, parseConnectionData } from "../utils/parse";

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

//*********************** ONE CONNECTION ***********************//
  if (cb === cbs.setOldUserType) {
    await RS.setUserState(chatId, rStates.waitPremPass, ttls.usual)
    await MS.editMessage(chatId, messageId, '🔑 Введите ваш пароль :)', returnMenu(true).reply_markup);
  };

  if (cb === cbs.myConnections) {
    const buttons = await generateConnectionsButtons(chatId)
    await MS.editMessage(chatId, messageId, 
      'Выберите подключение:', 
      { inline_keyboard: buttons })
  }

  if (cb.startsWith(cbs.connectionBtn)) {
    const data = parseConnectionData(cb);
    const newCb = newConnectionData(data); 
    await MS.editMessage(chatId, messageId, ' ', connectionOptions(newCb, data.sts).reply_markup);
  }

  if (cb === cbs.newConnection) {
    await RS.setUserState(chatId, rStates.waitNewConnection, ttls.usual)
    await MS.editMessage(chatId, messageId, '🔑 Введите пароль от подключения', returnMenu(true).reply_markup);
  }

  if (cb.startsWith(cbs.getReportNow)) {
    const data = parseConnectionData(cb);
    const newCb = newConnectionData(data) 
    await bot.editMessageReplyMarkup(connectionOptions(newCb, data.sts, true).reply_markup, { chat_id: chatId, message_id: messageId })
    const reportMessageId = await runPersonReport(chatId, 'single', data.ss)
    await MS.delNewDelOld(msgs, chatId);
  }

  if (cb.startsWith(cbs.editReportProducts)) {
    const data = parseConnectionData(cb);
    const newCb = newConnectionData(data);
    await MS.editMessage(chatId, messageId, 
      `Настроить его можно в своей <a href="https://docs.google.com/spreadsheets/d/${data.ss}/edit">Системе 10X</a>, во вкладке <b>Отчёт Telegram</b>`, 
      connectionOptions(newCb, data.sts).reply_markup, 'editProducts.jpg');
  }
    
  if (cb.startsWith(cbs.editConnectionTitle)) {
    const data = parseConnectionData(cb);
    const newCb = newConnectionData(data);
    await RS.setUserState(chatId, rStates.waitConnectionTitle+data.ss, ttls.usual)
    await MS.editMessage(chatId, messageId, '✍️ Введите название подключения', returnConnectionMenu(newCb).reply_markup);
  }

  if (cb.startsWith(cbs.offConnection) || cb.startsWith(cbs.offTable)) {
    const data = parseConnectionData(cb);
    const newCb = newConnectionData(data);
    const text = cb.startsWith(cbs.offConnection) ? 'удалить таблицу из подключений?' : 'отключить ежедневную рассылку?' 
    const endText = cb.startsWith(cbs.offConnection) ? 'удалили таблицу. Вы сможете подключить ее повторно в меню "Подключения"' : 'отключили ежедневную рассылкую.' 
    const action = data.an
  
    if (!action) {
      return MS.editMessage(chatId, messageId, 
        'Вы уверены, что хотите ' + text, 
        yesNo(data.mn + "?" + newCb).reply_markup)
    } else if (cb.endsWith(cbs.yes)) {
      if (cb.startsWith(cbs.offConnection)) {
        await connections_db.removeConnection(chatId, data.ss) 
      } else {
        await connections_db.updateNotificationTime(chatId, 0)
      }
    } else {
      return MS.editMessage(chatId, messageId, ' ', connectionOptions(newCb, data.sts).reply_markup);
    }

    await MS.editMessage(chatId, messageId, 
      `✅ Вы успешно ` + endText, 
      mainOptions(false).reply_markup)
  }

 if (cb.startsWith(cbs.returnConnection)) {
  const data = parseConnectionData(cb);
  const newCb = newConnectionData(data); 
  await MS.editMessage(chatId, messageId, ' ', connectionOptions(newCb, data.sts).reply_markup);
 }  

//*********************** ALL CONNECTIONS ***********************//

  if (cb === cbs.getAllReportsNow) {
    await bot.editMessageReplyMarkup(mainOptions(true).reply_markup, { chat_id: chatId, message_id: messageId })
    await runPersonReport(chatId, 'all')
    await MS.delNewDelOld(msgs, chatId);
  }

// *********** REPORT TIME *************
  if (cb.startsWith(cbs.changeTime)) {
    const selectedTime = cb.split('?')[1]

    if (!selectedTime) {
      await MS.editMessage(chatId, messageId, 
        'Выберите время по МСК, когда вам будет удобно получать отчет:', 
        { inline_keyboard: generateReportTimeButtons(cb) })
    } else {
      await connections_db.updateNotificationTime(chatId, selectedTime)
      await MS.editMessage(chatId, messageId, 
        `✅ Вы будете получать отчёт ежедневно в ${selectedTime}:00`, 
        mainOptions().reply_markup)
    };

  }
    

  return bot.answerCallbackQuery(query.id);
}