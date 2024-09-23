import TelegramBot, { ChatId, EditMessageTextOptions, InlineKeyboardMarkup } from 'node-telegram-bot-api';
import { Redis } from 'ioredis';
import { MessageMS } from '../dto/messages';
import { getPath } from '../utils/parse';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * create a new data to edit message, using in callback handler
 * @param {string} text - new text  of message
 * @param {TelegramBot.InlineKeyboardButton[][]} Options - new buttons
 * @param {string} image - string of img name and extension
 */
export function createEditData(text: string, options: Options['reply_markup'], image?: string) {
  return { text, options, image };
}

export class MessageService {
  private bot: TelegramBot;
  private client: Redis;

  constructor(bot: TelegramBot, client: Redis) {
    this.bot = bot;
    this.client = client;
  }

  /**
   * delete msg from chat
   */
  async deleteMessage(chat_id: ChatId, message_id: number): Promise<void> {
    try {
      await this.bot.deleteMessage(chat_id, message_id);
    } catch (error) {
      console.error(`Error deleting msg ID ${message_id}:`, error);
    }
  }

  /**
   * save msg
   */
  async saveMessage({ chat_id, message_id, direction, content, special }: MessageMS) {
    try {
      const messageKey = `messages:${chat_id}`;
      const message = { message_id, direction, content, special, timestamp: Date.now() };
      await this.client.rpush(messageKey, JSON.stringify(message));
    } catch (e) {
      console.error('Message Service: error to saving message - ', e)
    }
  }

  /**
   * save msgs
   */
  async saveMessages(msgs: MessageMS[]) {
    for (const msg of msgs) {
      await this.saveMessage(msg)
    }
  }

  /**
   * delete all current msgs and add new array of msgs
   */
  async addNewAndDelOld(msgs: MessageMS[], chat_id: number) {
    await this.deleteAllMessages(chat_id)
    await this.saveMessages(msgs)
  }

  /**
   * delete all current msgs and new msgs without saving
   */ 
  async deleteAllNewMessages(msgs: MessageMS[], chat_id: number, exclude?: string) {
    const deletePromises = msgs.map(async (msg) => {
      try {
        await this.bot.deleteMessage(chat_id, msg.message_id);
      } catch (error) {
        console.error(`Error during delete message ${msg.message_id}:`, error);
      }
    });
    await Promise.all(deletePromises);
  }

    /**
   * get one special msg
   */ 
  async getSpecialMsg(chat_id: number, special: string) {
    const msgs = await this.getMessages(chat_id);
    return msgs.filter(msg => msg.special === special)[0]
  }

  /**
   * get all msg
   */
  async getMessages(chat_id: number): Promise<any[]> {
    const messageKey = `messages:${chat_id}`;
    const messages = await this.client.lrange(messageKey, 0, -1);
    return messages.map(message => JSON.parse(message));
  }

  /**
   * delete old and new messages
   */
  async deleteOldAndNewMessages(chat_id: number, msgs: MessageMS[], exclude?: string) {
    await this.deleteAllMessages(chat_id, exclude)
    await this.deleteAllNewMessages(msgs, chat_id)
  }

/**
 * delete all msgs from chat
 */
async deleteAllMessages(chat_id: number, exclude?: string): Promise<void> {
  try {
    const messages = (await this.getMessages(chat_id)).reverse();
    let specialFound = false;
    
    const deletePromises = messages.map(async (message) => {
      try {
        if (exclude && message.special === exclude && !specialFound) {
          specialFound = true;
          return; 
        }
        await this.bot.deleteMessage(chat_id, message.message_id);
      } catch (error) {
        console.error(`Error during delete message ${message.message_id}:`, error);
      }
    });
    await Promise.all(deletePromises);
    this.clearMessages(chat_id);
  } catch (error) {
    console.error(`Error during delete all msgs from chat, user: ${chat_id} -`, error);
  }
}

  /**
   * delete all msgs from storage
   */
  async clearMessages(chat_id: number) {
    const messageKey = `messages:${chat_id}`;
    await this.client.del(messageKey);
  }

  /**
   * universal message editor
   */
  async editMessage(
    chat_id: ChatId, 
    message_id: number, 
    newText?: string, 
    newReplyMarkup?: Options['reply_markup'], 
    media?: string,
  ) {
    
    try {
      if (media) {
        const imagePath = getPath(media);
        return editMessageMedia(chat_id, message_id, imagePath, process.env.TELEGRAM_TOKEN!, newText, newReplyMarkup);
      }

      if (newText) {
        await this.bot.editMessageCaption(newText, {
          chat_id,
          message_id,
          parse_mode: 'HTML',
        } as EditMessageTextOptions);
      }
  
      if (newReplyMarkup) {
        await this.bot.editMessageReplyMarkup(newReplyMarkup, {
          chat_id,
          message_id,
        });
      }
    } catch (error) {
      if (!newText || newText === " ") {
        newText = undefined
      }

      const imagePath = media ? getPath(media) : getPath(images.hello)
      const user = await users_db.getUserById(chat_id as number);

      if (user) {
        this.clearMessages(user.chat_id)
        const message = await this.bot.sendPhoto(user.chat_id, imagePath, { caption: newText, reply_markup: mainOptions(false, user.type ?? 'new')})
        await this.saveMessage({ chat_id: user.chat_id, message_id: message.message_id, special: 'menu' })
      }

      const errorMessage = (error as any).response?.body?.description || (error as Error).message || 'Unknown error';
      console.error(`Error editing msg, ID: ${message_id} - ${errorMessage.substring(0, 200)}`);
    }
  }
}

import fs from 'fs';
import FormData from 'form-data';
import { mainOptions, Options } from '../components/botButtons';
import { images } from '../dto/images';
import { users_db } from '../../database/models/users';


/**
 * edit message media (photo), native method to tg api request 
 * @param {number | string} chat_id - user chat id
 * @param {number} message_id - message id
 * @param {string} mediaPath - resplved photo path
 * @param {string} botToken - api bot token from bot father
 * @param {string} caption - new text of message
 * @param {InlineKeyboardMarkup} replyMarkup - new buttons
 */
async function editMessageMedia(  
  chat_id: number | string, 
  message_id: number, 
  mediaPath: string, 
  botToken: string,
  caption?: string, 
  replyMarkup?: InlineKeyboardMarkup, 
) {
  try {
    const form = new FormData();

    form.append('media', JSON.stringify({
      type: 'photo',
      media: 'attach://photo',
      caption: caption || "", 
      parse_mode: 'HTML' 
    }));

    form.append('photo', fs.createReadStream(mediaPath));

    form.append('chat_id', chat_id);
    form.append('message_id', message_id);

    if (replyMarkup) {
      form.append('reply_markup', JSON.stringify(replyMarkup));
    }

    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/editMessageMedia`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
      }
    );

    return response;
  } catch (error) {
    console.error('Error editing media:', error);
    return null;
  }
}