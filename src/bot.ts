import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { buttons, mainOptions, Options } from './components/buttons';
import { redis, rStates, ttls, waitingStates } from './redis';
import { getHelp, handleStartMenu, sendImageWithText } from './components/answers';
import { AwaitingAnswer, MessageMService, UserCb, UserMsg } from './dto/msgData';
import { MessageService } from './services/messageService';
import { callbackHandler } from './handlers/callbackHandler';
import { awaitingHandler } from './handlers/awaitingHandler';
import { handleAdminCommand } from './handlers/adminHandler';
import { createChartURL } from './utils/charts';

dotenv.config();
const token = process.env.TELEGRAM_TOKEN;

if (!token) {
  throw new Error('Token not found');
};

const bot = new TelegramBot(token, { polling: true });
export const RediceService = new redis();
const messageService = new MessageService(bot, RediceService.getClient());

bot.on('callback_query', async (query: TelegramBot.CallbackQuery) => {
  if (!query.message?.chat.id) return
  return callbackHandler(query, bot, RediceService, messageService);
});

bot.on('message', async (msg: TelegramBot.Message) => { 
  const userMsg = new UserMsg(msg);
  const msgs: MessageMService[] = [];
  const { chatId, text, user_id, username, messageId } = userMsg;
  msgs.push({ chatId, messageId, direction: 'incoming', content: text });
  let answer;
  

  // if (text === '/get_chart') {
  //   const labels = Array.from({ length: 30 }, (_, i) => `Артикул ${i + 1}`);
  //   const datasets = [
  //     {
  //       label: 'Заказы',
  //       data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10) + 1),
  //       backgroundColor: 'blue',
  //       borderColor: 'blue',
  //     },
  //     // {
  //     //   label: 'Выкупы',
  //     //   data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10) + 1),
  //     //   backgroundColor: 'orange',
  //     //   borderColor: 'orange',
  //     // },
  //     // {
  //     //   label: 'ДРР',
  //     //   data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 10) + 1),
  //     //   borderColor: 'red',
  //     //   backgroundColor: 'rgba(255, 0, 0, 0)', // Линия, без заливки
  //     //   type: 'line',
  //     // },
  //     // {
  //     //   label: 'Прибыль',
  //     //   data: Array.from({ length: 30 }, () => Math.floor(Math.random() * 20) - 10), // Допустимы отрицательные значения
  //     //   backgroundColor: 'green',
  //     //   borderColor: 'green',
  //     // },
  //   ];
  
  //   const chartUrl = createChartURL(labels, datasets);

  //   return bot.sendPhoto(chatId, chartUrl)
  //   .then(() => console.log('chart ok!'))
  //   .catch(console.error);
  // }



  if (!text) {
    return;
  };

  if (text.startsWith('/admin__')) {
    return handleAdminCommand(chatId, text, bot)
  }
  
  if (['/start', '/menu'].includes(text)) {
    await RediceService.deleteUserState(chatId)
    answer = await handleStartMenu(bot, userMsg, text as '/start' | '/menu');
  };

  const userState = await RediceService.getUserState(chatId);

  if (userState && waitingStates.includes(userState)) {
    answer = await bot.sendMessage(chatId, "Проверяем...⌛️");
    const response: AwaitingAnswer = await awaitingHandler(userMsg, userState, process.env)
    msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' })

    if (!response.result) {
      await messageService.saveMessages(msgs);
      return bot.editMessageText(response.text, { chat_id: chatId, message_id: answer.message_id })
    } else {
      await bot.editMessageText(response.text, { chat_id: chatId, message_id: answer.message_id })
      msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' })
      await RediceService.deleteUserState(chatId)
      await bot.editMessageReplyMarkup(mainOptions(response.type).reply_markup, { chat_id: chatId, message_id: answer.message_id })
    }
  };

  
  if (text === '/help') {
    answer = await getHelp(bot, chatId);
  };
  
  if (answer && answer.message_id) {
    msgs.push({ chatId, messageId: answer.message_id, direction: 'outgoing' })
  } else {
    const res = await bot.sendMessage(chatId, 'Я вас не понял. /menu.');
    msgs.push({ chatId, messageId: res.message_id, direction: 'outgoing' });
  }
  
  return messageService.addNewAndDelOld(msgs, chatId);
});

console.log('Bot started!');