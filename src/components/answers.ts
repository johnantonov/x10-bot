import TelegramBot, { ChatId, Message } from "node-telegram-bot-api";
import { resolve } from 'path';
import { SendMessageOptions } from 'node-telegram-bot-api';
import { users_db } from "../../database/models/users";
import { UserCb, UserMsg } from "../dto/msgData";
import { mainOptions } from "./buttons";
import { bot, MS } from "../bot";
import { getPath } from "../utils/parse";

export function getHelp(bot: TelegramBot, id: ChatId) {
  return bot.sendMessage(id, `/menu - Открыть меню бота` );
}

export async function handleStartMenu(isNew: boolean = true, msg: UserMsg | UserCb, command: '/menu' | '/start', specialMsgId?: number ) {
  try {
    const userExists = await users_db.select({ chat_id: msg.chatId });
    const isUser = userExists.rows.length > 0
    const user = userExists.rows[0]
    const text = command === '/menu' ? ' ' : `Это телеграм бот для получения ежедневных отчетов по вашему кабинету из Системы 10X.\n\nДля начала работы зарегистрируйте вашу систему:`
    const img = command === '/menu' ? 'menu.jpg' : 'hello.jpg'
    
    if (isUser && !isNew && msg.messageId) { // if user already exists
      return MS.editMessage(msg.chatId, 
        specialMsgId ? specialMsgId : msg.messageId, 
        text,
        mainOptions().reply_markup, img )
    } else if (isUser && isNew) { 
      const newMenu = await sendImageWithText(bot, msg.chatId, img, text, mainOptions());
      await MS.saveMessage({ chatId: msg.chatId, messageId: newMenu.message_id, special: 'menu' })
    } else {
      await users_db.insert({ chat_id: msg.chatId, username: msg.username });
      console.log('insert new user into db: '+msg.chatId+" "+msg.username)
      const newMenu = await sendImageWithText(bot, msg.chatId, img, text, mainOptions(false, 'new'));
      await MS.saveMessage({ chatId: msg.chatId, messageId: newMenu.message_id, special: 'menu' })
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
): Promise<Message> {
  const imagePath = getPath(imageName);
  return bot.sendPhoto(chatId, imagePath, { caption, ...options, parse_mode: 'HTML' });
}