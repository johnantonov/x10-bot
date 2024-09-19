import TelegramBot, { ChatId, EditMessageTextOptions, InlineKeyboardMarkup } from 'node-telegram-bot-api';
import { Redis } from 'ioredis';
import { MessageMS } from '../dto/msgData';
import { sendImageWithText } from '../components/answers';
import { getPath } from '../utils/text';

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
  async deleteMessage(chatId: ChatId, messageId: number): Promise<void> {
    try {
      await this.bot.deleteMessage(chatId, messageId);
    } catch (error) {
      console.error(`Error deleting msg ID ${messageId}:`, error);
    }
  }

  /**
   * save msg
   */
  async saveMessage({ chatId, messageId, direction, content, special } : MessageMS) {
    const messageKey = `messages:${chatId}`;
    const message = {
      messageId,
      direction,
      content,
      special,
      timestamp: Date.now(),
    };
    await this.client.rpush(messageKey, JSON.stringify(message));
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
  async addNewAndDelOld(msgs: MessageMS[], chatId: number) {
    await this.deleteAllMessages(chatId)
    await this.saveMessages(msgs)
  }

  /**
   * delete all current msgs and new msgs without saving
   */ 
  async delNewDelOld(msgs: MessageMS[], chatId: number, exclude?: string) {
    console.log(exclude)
    await this.deleteAllMessages(chatId, exclude)
    for (const msg of msgs) {
      await this.bot.deleteMessage(chatId, msg.messageId); 
    }
  }

    /**
   * get one special msg
   */ 
  async getSpecialMsg(chatId: number, special: string) {
    const msgs = await this.getMessages(chatId)
    return msgs.filter(msg => msg.special === special)[0]
  }

  /**
   * get all msg
   */
  async getMessages(chatId: number): Promise<any[]> {
    const messageKey = `messages:${chatId}`;
    const messages = await this.client.lrange(messageKey, 0, -1);
    return messages.map(message => JSON.parse(message));
  }

  /**
   * delete all msgs from chat
   */
  async deleteAllMessages(chatId: number, exclude?: string): Promise<void> {
    try {
      const messages = (await this.getMessages(chatId)).reverse();
      
      let specialFound = false
      
      for (const message of messages) {
        try {
          console.log(messages)
          if (exclude && message.special === exclude && !specialFound) {
            specialFound = true;
            continue;
          };
          await this.bot.deleteMessage(chatId, message.messageId); 
          console.log(`Message ${message.messageId} deleted from ${chatId}`);
        } catch (error) {
          console.error(`Error during delete message ${message.messageId}:`, error);
        }
      }
      
      this.clearMessages(chatId) 
      console.log(`All msgs deleted from chat, user: ${chatId}`);
      
    } catch (error) {
      console.error(`Error during delete all msgs from chat, user: ${chatId} -`, error);
    }
  }

  /**
   * delete all msgs from storage
   */
  async clearMessages(chatId: number) {
    const messageKey = `messages:${chatId}`;
    await this.client.del(messageKey);
  }

  /**
   * universal message editor
   */
  async editMessage(
    chat_id: ChatId, 
    message_id: number, 
    newText?: string, 
    newReplyMarkup?: InlineKeyboardMarkup, 
    media?: string,
  ) {
    

    try {
      if (media) {
        const imagePath = getPath(media)
        if (process.env.TELEGRAM_TOKEN) {
          await editMessageMedia(chat_id, message_id, imagePath, process.env.TELEGRAM_TOKEN)
          // await this.bot.deleteMessage(chat_id, message_id)
          // return sendImageWithText(this.bot, +chat_id, media, newText, { reply_markup: newReplyMarkup })
        }
      }

      if (newText) {
        await this.bot.editMessageText(newText, {
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
      console.error(`Error editing msg, ID: ${message_id} - `, error);
    }
  }
}

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

async function editMessageMedia(chat_id: number | string, message_id: number, mediaPath: string, botToken: string) {
  try {
    const form = new FormData();
    
    form.append('media', JSON.stringify({
      type: 'photo',
      media: 'attach://photo'
    }));
    
    form.append('photo', fs.createReadStream(mediaPath));

    form.append('chat_id', chat_id);
    form.append('message_id', message_id);


    const response = await axios.post(
      `https://api.telegram.org/bot${botToken}/editMessageMedia`,
      form,
      {
        headers: {
          ...form.getHeaders(),
        },
      }
    );

    console.log('Media edited successfully:', response.data);
  } catch (error) {
    console.error('Error editing media:', error);
  }
}