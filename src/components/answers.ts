import TelegramBot, { ChatId, Message } from "node-telegram-bot-api";
import { resolve } from 'path';
import { SendMessageOptions } from 'node-telegram-bot-api';
import { users_db } from "../../database/models/users";
import { UserCb, UserMsg } from "../dto/msgData";
import { mainOptions } from "./buttons";
import { bot, MS } from "../bot";

export function getHelp(bot: TelegramBot, id: ChatId) {
  return bot.sendMessage(id, `/menu - Открыть меню бота` );
}

const helloNewUserText = `Это телеграм бот для получения ежедневных отчетов по вашему кабинету из Системы 10X.

Для начала работы зарегистрируйте вашу систему:`

export async function handleStartMenu(isNew: boolean = true, msg: UserMsg | UserCb, command: '/menu' | '/start', specialMsgId?: number ) {
  try {
    const userExists = await users_db.select({ chat_id: msg.chatId });
    const isUser = userExists.rows.length > 0
    const user = userExists.rows[0]
    const text = command === '/menu' ? ' ' : helloNewUserText
    const img = command === '/menu' ? 'menu.jpg' : 'hello.jpg'
    
    if (isUser && !isNew && msg.messageId) { // if user already exists
      return MS.editMessage(msg.chatId, 
        specialMsgId ? specialMsgId : msg.messageId, 
        text, 
        mainOptions(user.type).reply_markup )
    } else if (isUser && isNew) { 
      const newMenu = await sendImageWithText(bot, msg.chatId, img, text, mainOptions(user.type));
      await MS.saveMessage({ chatId: msg.chatId, messageId: newMenu.message_id, special: 'menu' })
    } else {
      await users_db.insert({ chat_id: msg.chatId, username: msg.username, notification_time: 19, });
      console.log('insert new user into db: '+msg.chatId+" "+msg.username)
      const newMenu = await  sendImageWithText(bot, msg.chatId, img, text, mainOptions());
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
  const imagePath = resolve(__dirname, `../../../public/messageImages/${imageName}`);
  return bot.sendPhoto(chatId, imagePath, { caption, ...options });
}