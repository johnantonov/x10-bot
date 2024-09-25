import TelegramBot, { InlineKeyboardButton } from "node-telegram-bot-api";
import { MessageMS, UserCallback } from "../dto/messages";
import { CallbackData, generateReportTimeButtons, mainOptions, returnMenu,  yesNo, connectionOptions, generateConnectionsButtons, returnConnectionMenu, Options, returnMenuWithImg, connectionButtons } from "../components/botButtons";
import { redis, rStates, ttls } from "../redis";
import { connections_db } from "../../database/models/connections";
import { handleStartMenu } from "../components/botAnswers";
import { RediceService } from "../bot";
import { createEditData, MessageService } from "../services/messageService";
import { runPersonReport } from "../services/reportService";
import { newConnectionData, parseConnectionData } from "../utils/parse";
import { images } from "../dto/images";
import { CallbackProcessor } from "../utils/CallbackProcessor";

/**
 * handler that starting if user send button callback
 */
export async function callbackHandler(query: TelegramBot.CallbackQuery, bot: TelegramBot, RS: redis, MS: MessageService) {
  const userCallback = new UserCallback(query);
  const { chat_id, userCallbackData, message_id } = userCallback;
  const returnBtn = returnMenu(true);
  const mainBtn = mainOptions()
  const msgs: MessageMS[] = [];

  if (!message_id) {
    return console.error('message_id not found')
  }

  if (!userCallbackData) {
    return console.error('error to getting')
  }

  const processor = new CallbackProcessor(userCallbackData);
  const action = processor.getAction();
  let data: any;
  let newButtonCallback: string;
  let buttons: InlineKeyboardButton[][];
  let editData: { text: string; options: Options['reply_markup']; image?: string } | null = null;
  
  switch (action) {
    case 'menu':
      await RediceService.deleteUserState(chat_id)
      const menu = await MS.getSpecialMsg(chat_id, 'menu');
      if (userCallbackData === CallbackData.menuAndEdit) {
        await handleStartMenu(userCallback, '/menu', false, menu.message_id)
      } else {
        await handleStartMenu(userCallback, '/menu', true)
      }
      break;

    case 'new user': 
      await RS.setUserState(chat_id, rStates.waitPremPass, ttls.usual)
      editData = createEditData('🔑 Введите код подключения :)', returnBtn);
      break;

    case 'my connection': 
      buttons = await generateConnectionsButtons(chat_id)
      editData = createEditData('Выберите подключение:', { inline_keyboard: buttons });
    break;

    case 'open connection': 
      data = parseConnectionData(userCallbackData);
      newButtonCallback = newConnectionData(data); 
      editData = createEditData(' ', connectionOptions(newButtonCallback, data.sts));
    break;

    case 'new connection': 
      await RS.setUserState(chat_id, rStates.waitNewConnection, ttls.usual)
      editData = createEditData('🔑 Введите код подключения', returnBtn);
    break;

    case 'report now': 
      data = parseConnectionData(userCallbackData);
      newButtonCallback = newConnectionData(data) 
      await bot.editMessageReplyMarkup(connectionOptions(newButtonCallback, data.sts, true), { chat_id: chat_id, message_id })
      await runPersonReport(chat_id, 'single', data.ss)
      await MS.deleteAllMessages(chat_id);
      await MS.deleteAllNewMessages(msgs, chat_id);
    break;

    case 'edit products': 
      data = parseConnectionData(userCallbackData);
      newButtonCallback = newConnectionData(data);
      editData = createEditData(
        `Настроить его можно в своей <a href="https://docs.google.com/spreadsheets/d/${data.ss}/edit">Системе 10X</a>, во вкладке <b>Отчёт Telegram</b>`, 
        returnMenuWithImg(newButtonCallback),
        images.editProducts
      );
    break;

    case 'off': 
      data = parseConnectionData(userCallbackData);
      newButtonCallback = newConnectionData(data);
      const text = userCallbackData.startsWith(CallbackData.offConnection as string) ? 'удалить таблицу из подключений?' : 'отключить ежедневную рассылку?' 
      const endText = userCallbackData.startsWith(CallbackData.offConnection as string) ? 'удалили таблицу. Вы сможете подключить ее повторно в меню "Подключения"' : 'отключили ежедневную рассылкую.' 
      const action = data.an;
      if (!action) {
        return MS.editMessage(chat_id, message_id, 'Вы уверены, что хотите ' + text, yesNo(data.mn + "?" + newButtonCallback))
      } else if (userCallbackData.endsWith(CallbackData.yes as string)) {
        if (userCallbackData.startsWith(CallbackData.offConnection as string)) {
          await connections_db.removeConnection(chat_id, data.ss) 
        } else {
          await connections_db.updateNotificationTime(chat_id, 0, data.ss)
        }
      } else {
        return MS.editMessage(chat_id, message_id, ' ', connectionOptions(newButtonCallback, data.sts));
      }
      editData = createEditData(`✅ Вы успешно ` + endText, mainBtn);
    break;

    case 'return connection menu': 
      data = parseConnectionData(userCallbackData);
      newButtonCallback = newConnectionData(data); 
      editData = createEditData(' ', connectionOptions(newButtonCallback, data.sts));
    break;

    case 'get all reports': 
      await bot.editMessageReplyMarkup(mainOptions(true), { chat_id, message_id })
      await runPersonReport(chat_id, 'all')
      await MS.deleteAllMessages(chat_id);
    break;

    case 'change title':
      data = parseConnectionData(userCallbackData);
      newButtonCallback = newConnectionData(data);;
      await RS.setUserState(chat_id, rStates.waitConnectionTitle+data.ss, ttls.usual)
      await MS.editMessage(chat_id, message_id, '✍️ Введите название подключения', returnConnectionMenu(newButtonCallback));
    break;

    case "img menu":
      data = parseConnectionData(userCallbackData);
      newButtonCallback = newConnectionData(data); 
      editData = createEditData(' ', connectionOptions(newButtonCallback, data.sts), images.menu);
    break;

    case 'change time': 
      const selectedTime = +userCallbackData.split('?')[1]
      if (!selectedTime) {
        editData = { text: 'Выберите время по МСК, когда вам будет удобно получать отчет:', options: { inline_keyboard: generateReportTimeButtons(userCallbackData) } }
      } else {
        await connections_db.updateNotificationTime(chat_id, selectedTime);
        editData = createEditData(`✅ Вы будете получать отчёт ежедневно в ${selectedTime}:00`, mainBtn)
      };
    break;
    
    default:
      await bot.sendMessage(chat_id, 'Возникла ошибка при обработке ответа!', { reply_markup: mainBtn })
      console.error('Error processing callback')
      break;
  }

  if (editData) {
    await MS.editMessage(chat_id, message_id, editData?.text, editData?.options, editData?.image)
  } 

  return bot.answerCallbackQuery(query.id);
}
