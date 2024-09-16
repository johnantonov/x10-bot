import { Redis } from 'ioredis';
import TelegramBot, { ChatId } from 'node-telegram-bot-api';
import { MessageMService } from '../dto/msgData';

export class MessageService {
  private bot: TelegramBot;
  private client: Redis;

  constructor(bot: TelegramBot, client: Redis) {
    this.bot = bot;
    this.client = client;
  }

  // delete msg from chat
  async deleteMessage(chatId: ChatId, messageId: number): Promise<void> {
    try {
      await this.bot.deleteMessage(chatId, messageId);
      console.log(`Сообщение с ID ${messageId} удалено из чата ${chatId}`);
    } catch (error) {
      console.error(`Ошибка при удалении сообщения с ID ${messageId}:`, error);
    }
  }

  // save msg
  async saveMessage({ chatId, messageId, direction, content } : MessageMService) {
    const messageKey = `messages:${chatId}`;
    const message = {
      messageId,
      direction,
      content,
      timestamp: Date.now(),
    };
    await this.client.rpush(messageKey, JSON.stringify(message));
  }

  // save msgs
  async saveMessages(msgs: MessageMService[]) {
    for (const msg of msgs) {
      await this.saveMessage(msg)
    }
  }

  // delete all current msgs and add new array of msgs
  async addNewAndDelOld(msgs: MessageMService[], chatId: number) {
    await this.deleteAllMessages(chatId)
    await this.saveMessages(msgs)
  }

  // get all msg
  async getMessages(chatId: number): Promise<any[]> {
    const messageKey = `messages:${chatId}`;
    const messages = await this.client.lrange(messageKey, 0, -1);
    return messages.map(message => JSON.parse(message));
  }

  // delete all msgs from chat
  async deleteAllMessages(chatId: number): Promise<void> {
    try {
      const messages = await this.getMessages(chatId); 
      for (const message of messages) {
        try {
          await this.bot.deleteMessage(chatId, message.messageId); 
          console.log(`Message ${message.messageId} deleted from ${chatId}`);
        } catch (error) {
          console.error(`Error during deleting message ${message.messageId}:`, error);
        }
      }
  
      const messageKey = `messages:${chatId}`;
      await this.client.del(messageKey); 
      console.log(`Все сообщения для чата ${chatId} удалены из хранилища`);
      
    } catch (error) {
      console.error(`Ошибка при удалении всех сообщений для чата ${chatId}:`, error);
    }
  }

  // delete msg from redis
  async deleteMessageFromStorage(chatId: number, messageId: number) {
    const messageKey = `messages:${chatId}`;
    const messages = await this.getMessages(chatId);
    const updatedMessages = messages.filter(message => message.messageId !== messageId);
    await this.client.del(messageKey);
    for (const msg of updatedMessages) {
      await this.client.rpush(messageKey, JSON.stringify(msg));
    }
  }

  // delete all msgs from storage
  async clearMessages(chatId: number) {
    const messageKey = `messages:${chatId}`;
    await this.client.del(messageKey);
  }
}