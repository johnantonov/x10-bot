import TelegramBot, { ChatId, InlineKeyboardButton, InlineKeyboardMarkup, Message } from "node-telegram-bot-api";
import { SendMessageOptions } from 'node-telegram-bot-api';
import { users_db } from "../../database/models/users";
import { UserCallback, UserMsg } from "../dto/messages";
import { mainOptions } from "./botButtons";
import { bot, MS } from "../bot";
import { getPath } from "../utils/parse";
import { user_type } from "../dto/user";
import { images } from "../dto/images";

/**
 * sends a help message to the user
 * @param {TelegramBot} bot - the telegram bot instance
 * @param {ChatId} id - chat id to send the help message
 * @returns {Promise<Message>} - resolves with the message sent
 */
export function getHelp(bot: TelegramBot, id: ChatId) {
  return bot.sendMessage(id, `/menu - Открыть меню бота` );
};

/**
 * handles the /start or /menu commands and manages menu rendering
 * @param {UserMsg | UserCallback} msg - the message or callback data
 * @param {'/menu' | '/start'} command - the command that triggered the menu
 * @param {boolean} [isNewMsg=true] - flag to determine if it's a new message
 * @param {number} [menuId] - optional menu message id for editing, fill if isNewMsg = false
 * @returns {Promise<void>}
 */

export async function handleStartMenu(msg: UserMsg | UserCallback, command: '/menu' | '/start', isNewMsg: boolean = true, menuId?: number) {
  try {
    const users = await users_db.select({ chat_id: msg.chat_id });
    const isUser = users.rows.length > 0;
    const user = users.rows[0];
    const chat_id = msg.chat_id

    if (!chat_id) {
      return console.error('handleStartMenu: error to get chat id:', msg, command, isNewMsg, menuId)
    }

    const text = command === '/menu' ? ' ' : `Это телеграм бот для получения ежедневных отчетов по вашему кабинету из Системы 10X.\n\nДля начала работы зарегистрируйте вашу систему:`;
    const img = command === '/menu' ? images.menu : images.hello;
    
    if (isUser) { 
      if (!isNewMsg) {
        if (!menuId) {
          await sendNewMenu(chat_id, img, text, user.type)
          return console.error('handleStartMenu: error to get menu id:', msg, command, isNewMsg, menuId)
        }
        console.log(menuId)
        return MS.editMessage(chat_id, menuId, text, mainOptions(false, user.type))
      } else {
        await sendNewMenu(chat_id, img, text, user.type)
      }
    } else {
      await users_db.insert({ chat_id: chat_id, username: msg.username, type: 'new' });
      await sendNewMenu(chat_id, img, text, 'new')
      console.log('insert new user into db: ', chat_id, msg.username)
    }
  } catch (error) {
    console.error('error while processing the /start command', error);
    return bot.sendMessage(msg.chat_id, 'Произошла ошибка. Попробуйте позже.');
  }
}

/**
 * sends a photo with a caption to the user
 * @param {TelegramBot} bot - the telegram bot instance
 * @param {number} chat_id - the id of the chat to send the photo
 * @param {string} imageName - name of the image file to send
 * @param {string} [caption] - optional caption to accompany the image
 * @param {SendMessageOptions} [keyboard] 
 * @returns {Promise<Message>} 
 */
export async function sendImageWithText(bot: TelegramBot, chat_id: number, imageName: string, caption?: string, keyboard?: InlineKeyboardButton[][]): Promise<Message | void> {
  try {
    const imagePath = getPath(imageName);

    const options: SendMessageOptions = {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: keyboard || []
      }
    };
    
    return bot.sendPhoto(chat_id, imagePath, { caption, ...options, parse_mode: 'HTML' });
  } catch (e) {
    return console.error('error in sendImageWithText: ', e, chat_id, imageName, caption, keyboard)
  }
};

/**
 * sends a new menu to the user and saves the message in the message service
 * @param {number} chat_id - the id of the chat to send the menu
 * @param {string} img - the image file name to send with the menu
 * @param {string} caption - the caption to accompany the image
 * @param {user_type} userType - the type of user (used to determine button options)
 * @returns {Promise<void>}
 */
export async function sendNewMenu(chat_id: number, img: string, caption: string, userType: user_type) {
  const keyboard = mainOptions(false, userType).inline_keyboard
  const newMenu = await sendImageWithText(bot, chat_id, img, caption, keyboard);
  if (newMenu) {
    await MS.saveMessage({ chat_id, message_id: newMenu.message_id, special: 'menu' });
  }
}