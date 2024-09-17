export type user_type = 'old' | 'old_ss' 

export class User {
  chat_id: number;
  username: string | undefined;
  wb_api_key: string | undefined | null;
  type: user_type;
  article: number | null;
  notification_time: number | null;
  added_at: string;
  ss: string | undefined;

  [key: string]: any;

  constructor (data: any) {
    this.chat_id = data.chat.id;
    this.username = data.from?.username
    this.wb_api_key = data.message_id
    this.type = data.text;
    this.article = data.message_id
    this.notification_time = null
    this.added_at = `${new Date()}`
  }
}

export interface UserData {

}