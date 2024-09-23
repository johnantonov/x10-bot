export type user_type = 'new' | 'registered' 

export class User {
  chat_id: number;
  username: string;
  type: user_type;
  added_at: string;
  ss: string;
  ss_report?: boolean;
  

  [key: string]: any;

  constructor (data: any) {
    this.chat_id = data.chat.id;
    this.username = data.from?.username
    this.type = data.text;
    this.added_at = `${new Date()}`,
    this.ss = data.ss,
    this.ss_report = data.ss
  }
}
