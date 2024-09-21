import { Pool, QueryResult } from 'pg';
import { BaseModel } from "../BaseModel";
import * as dotenv from 'dotenv';
import pool from "../db";
dotenv.config();

export interface Connection {
  ss: string;
  chat_id: number;
  notification_time?: number;
  title?: string;
  type?: string;
  status?: 'on' | 'off';
  report_on?: boolean;
}

class ConnectionsModel extends BaseModel<Connection> {
  constructor(pool: Pool) {
    super('connections', pool);
  }

  async getConnectionsByTime(notification_time: number) {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE notification_time = $1
    `;
    return (await this.pool.query<Connection>(query, [notification_time])).rows;
  }

  async getAllConnectionsForUser(chat_id: number): Promise<QueryResult<Connection>> {
    const query = `
      SELECT * FROM ${this.tableName}
      WHERE chat_id = $1
    `;
    return await this.pool.query<Connection>(query, [chat_id]);
  }

  async addConnection(connection: Partial<Connection>): Promise<void> {
    await this.insert(connection);
  }

  async removeConnection(chat_id: number, ss: string): Promise<void> {
    const query = `
      DELETE FROM ${this.tableName}
      WHERE chat_id = $1 AND ss = $2
    `;
    await this.pool.query(query, [chat_id, ss]);
  }

  async updateNotificationTime(chat_id: number, notification_time: number): Promise<void> {
    let status;
    status = notification_time === 0 ? 'off' : 'on';

    const query = `
      UPDATE ${this.tableName}
      SET notification_time = $1, status = $3
      WHERE chat_id = $2
    `;

    await this.pool.query(query, [notification_time, chat_id, status]);
  }

  async updateTitle(chat_id: number, ss: string, title: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET title = $1
      WHERE chat_id = $2 AND ss = $3
    `;
    await this.pool.query(query, [title, chat_id, ss]);
  }

  async updateType(chat_id: number, ss: string, type: string): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET type = $1
      WHERE chat_id = $2 AND ss = $3
    `;
    await this.pool.query(query, [type, chat_id, ss]);
  }

  async updateStatus(chat_id: number, ss: string, status: 'on' | 'off'): Promise<void> {
    const query = `
      UPDATE ${this.tableName}
      SET status = $1
      WHERE chat_id = $2 AND ss = $3
    `;
    await this.pool.query(query, [status, chat_id, ss]);
  }

  async updateFields(chat_id: number, ss: string, fields: Partial<Connection>): Promise<void> {
    const keys = Object.keys(fields);
    const values = Object.values(fields);

    if (keys.length === 0) {
      throw new Error("No fields to update");
    }

    const setClause = keys.map((key, index) => `${key} = $${index + 1}`).join(', ');

    const query = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE chat_id = $${keys.length + 1} AND ss = $${keys.length + 2}
    `;

    await this.pool.query(query, [...values, chat_id, ss]);
  }
}

export const connections_db = new ConnectionsModel(pool);
