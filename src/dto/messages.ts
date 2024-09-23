import TelegramBot from "node-telegram-bot-api";
import { Options } from "../components/botButtons";
import { user_type } from "./user";

// class of user text message
export class UserMsg {
  chat_id: number;
  text?: string;
  user_id?: number;
  username?: string;
  message_id: number;

  constructor(data: TelegramBot.Message) {
    this.chat_id = data.chat.id;
    this.text = data.text;
    this.user_id = data.from?.id;
    this.username = data.from?.username;
    this.message_id = data.message_id;
  }
}

// class of callback telegram data
export class UserCallback {
  chat_id: number;
  userCallbackData: string;
  user_id?: number;
  username?: string;
  message_id?: number;

  constructor(data: TelegramBot.CallbackQuery) {
    this.chat_id = data.message!.chat.id;
    this.userCallbackData = data.data!;
    this.user_id = data.from?.id;
    this.username = data.from?.username;
    this.message_id = data.message?.message_id;
  }
}

// result response class for users that have awaiting states
export class AwaitingAnswer {
  text: string;
  buttons?: Options;
  result: boolean;
  type?: user_type;
  data?: any;

  constructor(data: { text: string; buttons?: Options; result: boolean; type?: user_type; data?: any }) {
    this.text = data.text;
    this.buttons = data.buttons;
    this.result = data.result;
    this.type = data.type;
    this.data = data.data;
  }
}

// interface of data for MessageMS
export interface IMessageService {
  chat_id: number;
  message_id: number;
  direction?: 'incoming' | 'outgoing';
  content?: string;
  special?: any;
}

// class message of Message Service
export class MessageMS {
  chat_id: number;
  message_id: number;
  direction?: 'incoming' | 'outgoing';
  content?: string;
  special?: any;

  constructor(data: IMessageService) {
    this.chat_id = data.chat_id;
    this.message_id = data.message_id;
    this.direction = data.direction;
    this.content = data.content;
    this.special = data.special;
  }
}