import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { mainOptions, setBotCommands } from './components/botButtons';
import { redis, waitingStates } from './redis';
import { handleStartMenu, sendImageWithText, } from './components/botAnswers';
import { AwaitingAnswer, MessageMS, UserMsg } from './dto/messages';
import { MessageService } from './services/messageService';
import { callbackHandler } from './handlers/callbackHandler';
import { awaitingHandler } from './handlers/awaitingHandler';
import { handleAdminCommand } from './handlers/adminHandler';
import { handleMenuCommand, handleUserState } from './handlers/textHandler';

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
  const UserTextMessage = new UserMsg(msg);
  const { chat_id, text, message_id } = UserTextMessage;

  if (!text) {
    return;
  };

  const msgs: MessageMS[] = [new MessageMS({ chat_id, message_id, content: text })];
  
  if (text.startsWith('/admin__')) {
    return handleAdminCommand(chat_id, text, bot)
  }
  
  if (['/start', '/menu'].includes(text)) {
    await handleMenuCommand(UserTextMessage, chat_id, text, msgs);
    return;
  }

  // if (['/start', '/menu'].includes(text)) {
  //   await RediceService.deleteUserState(chat_id)
  //   const menu = await MS.getSpecialMsg(chat_id, 'menu')
  //   await MS.delNewDelOld(msgs, chat_id, 'menu');
  //   // if (menu) {
  //     return handleStartMenu(UserTextMessage, text as '/start' | '/menu', menu ? false : true, menu.message_id)
  //     // } 
  //     // else {
  //       //   await handleStartMenu(UserTextMessage, text as '/start' | '/menu', true, menu.message_id)
  //       // }
  // };
      
  const userState = await RediceService.getUserState(chat_id);
  // let response;

  await handleUserState(chat_id, msgs, UserTextMessage);

  // if (userState && (waitingStates.includes(userState) || userState.startsWith(waitingStates[0]))) {
  //   response = await bot.sendMessage(chat_id, "Проверяем...⌛️");
  //   const answer: AwaitingAnswer = await awaitingHandler(UserTextMessage, userState)
  //   msgs.push({ chat_id, message_id: response.message_id, special: 'menu' })

  //   if (!answer.result) {
  //     await MS.saveMessages(msgs);
  //     return bot.editMessageText(answer.text, { chat_id: chat_id, message_id: response.message_id })
  //   } else {
  //     await MS.delNewDelOld(msgs, chat_id);
  //     await RediceService.deleteUserState(chat_id)
  //     let successResponse = await sendImageWithText(bot, chat_id, 'menu.jpg', answer.text, mainOptions().inline_keyboard)
  //     if (successResponse) {
  //       await MS.saveMessage({ chat_id, message_id: successResponse.message_id, special: "menu" })
  //     }
  //   }
  // };
});

console.log('Bot started!');