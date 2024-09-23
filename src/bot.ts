import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import { setBotCommands } from './components/botButtons';
import { redis } from './redis';
import { MessageMS, UserMsg } from './dto/messages';
import { MessageService } from './services/messageService';
import { callbackHandler } from './handlers/callbackHandler';
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

  await handleUserState(chat_id, msgs, UserTextMessage);
});

console.log('Bot started!');