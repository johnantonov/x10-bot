import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { mainOptions, setBotCommands } from './components/buttons';
import { redis, waitingStates } from './redis';
import { getHelp, handleStartMenu } from './components/answers';
import { AwaitingAnswer, MessageMS, UserMsg } from './dto/msgData';
import { MessageService } from './services/messageService';
import { callbackHandler } from './handlers/callbackHandler';
import { awaitingHandler } from './handlers/awaitingHandler';
import { handleAdminCommand } from './handlers/adminHandler';

dotenv.config();
const token = process.env.TELEGRAM_TOKEN;

if (!token) {
  throw new Error('Token not found');
}

const bot = new TelegramBot(token, { polling: true });
export const RediceService = new redis();
const messageService = new MessageService(bot, RediceService.getClient());

setBotCommands(bot);

bot.on('callback_query', async (query: TelegramBot.CallbackQuery) => {
  if (!query.message?.chat.id) return;
  return callbackHandler(query, bot, RediceService, messageService);
});

bot.on('message', async (msg: TelegramBot.Message) => {
  const userMsg = new UserMsg(msg);
  const msgs: MessageMS[] = [];
  const { chatId, text, messageId } = userMsg;
  msgs.push(new MessageMS({ chatId, messageId, content: text }));
  let response;

  if (!text) {
    return;
  }

  // Обработка команды администратора
  if (text.startsWith('/admin__')) {
    return handleAdminCommand(chatId, text, bot);
  }

  // Обработка команд /start и /menu
  if (['/start', '/menu'].includes(text)) {
    await RediceService.deleteUserState(chatId);
    response = await handleStartMenu(bot, userMsg, text as '/start' | '/menu');
  }

  // Получаем состояние пользователя
  const userState = await RediceService.getUserState(chatId);

  if (userState && waitingStates.includes(userState)) {
    // Отправляем сообщение ожидания
    response = await bot.sendMessage(chatId, "Проверяем...⌛️");
    msgs.push({ chatId, messageId: response.message_id });

    // Обрабатываем ожидание
    const answer: AwaitingAnswer = await awaitingHandler(userMsg, userState, process.env);

    if (!answer.result) {
      // Сохраняем сообщение и изменяем его текст
      await messageService.saveMessages(msgs);
      await bot.editMessageText(answer.text, { chat_id: chatId, message_id: response.message_id });
    } else {
      // Обновляем текст и клавиатуру
      await bot.editMessageText(answer.text, { chat_id: chatId, message_id: response.message_id });
      await RediceService.deleteUserState(chatId);
      await bot.editMessageReplyMarkup(mainOptions(answer.type).reply_markup, { chat_id: chatId, message_id: response.message_id });
    }
  }

  // Обработка команды /help
  if (text === '/help') {
    response = await getHelp(bot, chatId);
  }

  // Если есть ответ, сохраняем его
  if (response && response.message_id) {
    msgs.push({ chatId, messageId: response.message_id });
  } else {
    const res = await bot.sendMessage(chatId, 'Я вас не понял. /menu.');
    msgs.push({ chatId, messageId: res.message_id });
  }

  // Добавляем новые сообщения и удаляем старые
  return messageService.addNewAndDelOld(msgs, chatId);
});

console.log('Bot started!');