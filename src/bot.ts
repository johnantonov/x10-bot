import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { mainOptions, setBotCommands } from './components/buttons';
import { redis,  waitingStates } from './redis';
import { getHelp, handleStartMenu, sendImageWithText, } from './components/answers';
import { AwaitingAnswer, MessageMS, UserMsg } from './dto/msgData';
import { MessageService } from './services/messageService';
import { callbackHandler } from './handlers/callbackHandler';
import { awaitingHandler } from './handlers/awaitingHandler';
import { handleAdminCommand } from './handlers/adminHandler';

dotenv.config();
const token = process.env.TELEGRAM_TOKEN;

if (!token) {
  throw new Error('Token not found');
};

export const bot = new TelegramBot(token, { polling: true });
export const RediceService = new redis();
export const MS = new MessageService(bot, RediceService.getClient());

setBotCommands(bot)

bot.on('callback_query', async (query: TelegramBot.CallbackQuery) => {
  if (!query.message?.chat.id) return
  return callbackHandler(query, bot, RediceService, MS);
});

bot.on('message', async (msg: TelegramBot.Message) => { 
  const userMsg = new UserMsg(msg);
  const msgs: MessageMS[] = [];
  const { chatId, text, messageId } = userMsg;
  msgs.push(new MessageMS({ chatId, messageId, content: text }));
  let response;

  if (!text) {
    return;
  };

  if (text.startsWith('/admin__')) {
    return handleAdminCommand(chatId, text, bot)
  }
  
  if (['/start', '/menu'].includes(text)) {
    const menu = await MS.getSpecialMsg(chatId, 'menu')
    await MS.delNewDelOld(msgs, chatId, 'menu');
    await RediceService.deleteUserState(chatId)
    if (menu) {
      return handleStartMenu(false, userMsg, text as '/start' | '/menu', menu.messageId);
    }
    return handleStartMenu(true, userMsg, text as '/start' | '/menu');
  };

  const userState = await RediceService.getUserState(chatId);

  if (userState && waitingStates.includes(userState)) {
    response = await bot.sendMessage(chatId, "Проверяем...⌛️");
    const answer: AwaitingAnswer = await awaitingHandler(userMsg, userState, process.env)
    msgs.push({ chatId, messageId: response.message_id, special: 'menu' })

    if (!answer.result) {
      await MS.saveMessages(msgs);
      return bot.editMessageText(answer.text, { chat_id: chatId, message_id: response.message_id })
    } else {
      await MS.delNewDelOld(msgs, chatId);
      await RediceService.deleteUserState(chatId)
      const successResponse = await sendImageWithText(bot, chatId, 'menu.jpg', answer.text, mainOptions('old'))
      await MS.saveMessage({ chatId, messageId: successResponse.message_id, special: "menu" })
    }
  };

  // if (response && response.message_id) {
  //   msgs.push({ chatId, messageId: response.message_id })
  // } else {
  //   const res = await bot.sendMessage(chatId, 'Я вас не понял. /menu.');
  //   msgs.push({ chatId, messageId: res.message_id });
  // }
  
  // return MS.addNewAndDelOld(msgs, chatId);
});

console.log('Bot started!');