import TelegramBot, { ChatId } from "node-telegram-bot-api";
import { resolve } from 'path';
import { SendMessageOptions } from 'node-telegram-bot-api';
import { users_db } from "../../database/models/users";
import { UserCb, UserMsg } from "../dto/msgData";
import { mainOptions } from "./buttons";

export function getHelp(bot: TelegramBot, id: ChatId) {
  return bot.sendMessage(id, `/menu - Открыть меню бота` );
}

export async function handleStartMenu(bot: TelegramBot, msg: UserMsg | UserCb, command: '/menu' | '/start') {
  try {
    const userExists = await users_db.select({ chat_id: msg.chatId });
    const user = userExists.rows[0]
    const text = command === '/menu' ? ' ' : 'Привет!'
    const img = command === '/menu' ? 'menu.jpg' : 'hello.jpg'
    
    if (userExists.rows.length > 0) { // if user already exists
      return sendImageWithText(bot, msg.chatId, img, text, mainOptions(user.type));
    } else {
      await users_db.insert({ chat_id: msg.chatId, username: msg.username, notification_time: 19, });
      console.log('insert new user into db: '+msg.chatId+" "+msg.username)
      return sendImageWithText(bot, msg.chatId, img, text, mainOptions());
    }
  } catch (error) {
    console.error('error while processing the /start command', error);
    return bot.sendMessage(msg.chatId, 'Произошла ошибка. Попробуйте позже.');
  }
}

export function sendImageWithText(
  bot: TelegramBot,
  chatId: number,
  imageName: string,
  caption?: string,
  options?: SendMessageOptions
): Promise<any> {
  const imagePath = resolve(__dirname, `../../../public/messageImages/${imageName}`);
  return bot.sendPhoto(chatId, imagePath, { caption, ...options });
}