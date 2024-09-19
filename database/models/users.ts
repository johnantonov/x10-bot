import { BaseModel } from "../BaseModel";
import { Pool, QueryResult } from 'pg';
import * as dotenv from 'dotenv';
import pool from "../db";
import { User, user_type } from "../../src/dto/user";
dotenv.config();

class UsersModel extends BaseModel<User> {
  constructor(pool: Pool) {
    super('users', pool)
  }

  async findOrCreateUser(chat_id: number, username: string | undefined): Promise<User | null> {
      const existingUser = await this.select({ chat_id });
      
      if (existingUser.rows.length > 0) {
        return existingUser.rows[0];  
      } else {
        const newUser: Partial<User> = { chat_id, username };
        await this.insert(newUser);
        return (await this.select({ chat_id })).rows[0];
      }
    }

  async updateType(chat_id: number, ss: string, decreaseTo?: user_type): Promise<void> {
    if (decreaseTo) {
      await this.update('chat_id', chat_id, { type: decreaseTo }, ['chat_id'])
      return
    }

    const updateData: Partial<User> = {
      type: 'registered',
      ss,
    };

    await this.update('chat_id', chat_id, updateData, ['chat_id']);
  }

  async getUserById(chat_id: number) {
    const existingUser = await this.select({ chat_id });
      
      if (existingUser.rows.length > 0) {
        return existingUser.rows[0];  
      } else {
        return null
      }
  }

  async getConnections(chat_id: number) {
    const query = `
      SELECT * FROM connections
      WHERE chat_id = $1
    `;
    const result = await this.pool.query(query, [chat_id]);
    return result.rows;
  }

  async getConnection(chatId: number, ss: string) {
    const query = `
      SELECT * FROM connections
      WHERE chat_id = $1 AND ss = $2
    `;
    const result = await this.pool.query(query, [chatId, ss]);
    return result.rows[0];
  }
}

export const users_db = new UsersModel(pool);