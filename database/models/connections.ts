import { BaseModel } from "../BaseModel";
import { Pool, QueryResult } from 'pg';
import * as dotenv from 'dotenv';
import pool from "../db";
dotenv.config();


export interface Connection {
  ss: string;
  chat_id: number;
  notification_time?: number;
  title?: string;
  type?: string;
  report_on?: boolean;
}

class ConnectionsModel extends BaseModel<Connection> {
  constructor(pool: Pool) {
    super('connections', pool);
  }

  async getAllConnectionsForUser(chatId: number): Promise<QueryResult<Connection>> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE chat_id = $1
    `;
    const result = await this.pool.query<Connection>(query, [chatId]); 
    return result 
  }

  async addConnection(connection: Partial<Connection>): Promise<void> {
    await this.insert(connection);
  }

  async updateReportTime(chat_id: number, ss: string, time: number) {
    const query = `
    UPDATE ${this.tableName}
    SET () chat_id = $1
  `;
  }

  async removeConnection(chatId: number, ss: string): Promise<void> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE chat_id = $1 AND ss = $2
    `;
    await this.pool.query(query, [chatId, ss]);
  }
}

export const connections_db = new ConnectionsModel(pool);