import { BaseModel } from "../BaseModel";
import { Pool } from 'pg';
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
      type: 'old',
      ss,
    };

    await this.update('chat_id', chat_id, updateData, ['chat_id']);
  }

  async updateReportTime(chat_id: number, time: number) {
    try {
      const updateData: Partial<User> = { notification_time: time, type: 'old_ss' };
      await this.update('chat_id', chat_id, updateData, ['chat_id']);
      console.log('postgres: update ss report time for '+chat_id)
      return 'old_ss'
    } catch (e) {
      console.error('postgres: error to update ss report time for '+chat_id+" - "+e)
    }
  }

  async getUserById(chat_id: number) {
    const existingUser = await this.select({ chat_id });
      
      if (existingUser.rows.length > 0) {
        return existingUser.rows[0];  
      } else {
        return null
      }
  }
}

export const users_db = new UsersModel(pool);