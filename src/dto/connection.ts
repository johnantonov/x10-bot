export interface Connection {
  ss: string;
  chat_id: number;
  notification_time?: number;
  title?: string;
  type?: string;
  status?: ConnectionStatus;
  report_on?: boolean;
}
 
export type ConnectionStatus = 'on' | 'off';

export interface ConnectionCallbackData {
  mn?: string;
  ss: string;
  sts: ConnectionStatus;
  an?: string;
}



