import TelegramBot from "node-telegram-bot-api";
import { Options } from "../components/buttons";
import { user_type } from "./user";

export class UserMsg {
  chatId: number;
  text: string | undefined;
  user_id: number | undefined;
  username: string | undefined;
  messageId: number;

  [key: string]: any;

  constructor (data: TelegramBot.Message) {
    this.chatId = data.chat.id;
    this.text = data.text;
    this.user_id = data.from?.id;
    this.username = data.from?.username
    this.messageId = data.message_id
  }
}

export class UserCb {
  chid: number | undefined;
  cb: any;
  user_id: number | undefined;
  username: string | undefined;
  messageId: number | undefined;

  [key: string]: any;

  constructor (data: TelegramBot.CallbackQuery) {
    this.chatId = data.message?.chat.id;
    this.cb = data.data;
    this.user_id = data.from?.id;
    this.username = data.from?.username
    this.messageId = data.message?.message_id
  }
}

export class AwaitingAnswer {
  text: string;
  buttons: Options | undefined;
  result: Boolean;
  type?: user_type;

  [key: string]: any;

  constructor (data: {
    text: string,
    buttons?: Options | undefined,
    result: Boolean,
    type?: user_type
  }) {
    this.text = data.text;
    this.buttons = data.buttons;
    this.result = data.result;
    this.type = data.type
  }
}

export interface MessageMService {
  chatId: number; 
  messageId: number;
  direction: 'incoming' | 'outgoing';
  content?: string | undefined;
  special?: any;
}