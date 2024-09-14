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

  async updateType(chat_id: number, ss?: string | undefined, decreaseTo?: user_type): Promise<void> {
    if (decreaseTo) {
      await this.update('chat_id', chat_id, { type: decreaseTo }, ['chat_id'])
      return
    }
    const newType = ss ? 'old' : 'new'

    const updateData: Partial<User> = {
      type: newType,
      ss,
    };

    await this.update('chat_id', chat_id, updateData, ['chat_id']);
  }

  async updateReportTime(chat_id: number, time: number) {
    try {
      const currentType = await this.select({ chat_id }).then(res => { return res.rows[0].type })
      if (currentType === 'new_art' || currentType === 'new') {
        const updateData: Partial<User> = { notification_time: time, type: 'new_art' };
        await this.update('chat_id', chat_id, updateData, ['chat_id']);
        return 'new_art'
      } else {
        const updateData: Partial<User> = { notification_time: time, type: 'old_ss' };
        await this.update('chat_id', chat_id, updateData, ['chat_id']);
        console.log('postgres: update ss report time for '+chat_id)
        return 'old_ss'
      }
    } catch (e) {
      console.error('postgres: error to update ss report time for '+chat_id+" - "+e)
    }
  }

  async checkWbApiKey(chat_id: number) {
    try {
      const user = await this.select({ chat_id });
  
      if (user.rows.length > 0 && user.rows[0].wb_api_key) {
        return user.rows[0].wb_api_key; 
      } else {
        return false; 
      }
    } catch (e) {
      console.error('postgres: error to check key - '+e)
    }
  }
  
  async checkTrack(chat_id: number) {
    try {
      const user = await this.select({ chat_id });

      if (user.rows.length > 0 && user.rows[0].article) {
        return user.rows[0].article; 
      } else {
        return false; 
      }
    } catch(e) {
      console.error('postgres: error to get article - '+e)
    }
  }

  async updateWbApiKey(chat_id: number, key: string): Promise<void> {
    try {
      const updateData: Partial<User> = { wb_api_key: key };
      await this.update('chat_id', chat_id, updateData, ['chat_id']);
      console.log('postres: success to update wb api key for '+ chat_id)
    } catch(e) {
      console.error('postgres: error to update wb api key - '+e)
    }
  }

  async updateArticle(chat_id: number, key: number): Promise<void> {
    try {
      const updateData: Partial<User> = { article: key, type: 'new_art'};
      await this.update('chat_id', chat_id, updateData, ['chat_id']);
      console.log('postres: success to update article for '+ chat_id)
    } catch(e) {
      console.error('postgres: error to update article - '+e)
    }
  }

  async checkWbApiKeyAndTrack(chat_id: number) {
    try {
      const user = await this.select({ chat_id });
  
      if (user.rows.length > 0) {
        return [ user.rows[0].wb_api_key, user.rows[0].article ]
      } else {
        return [ false, false ]
      }
    } catch (e) {
      console.error('postgres: error to check article and key - '+e)
      return [ false, false ]
    }
  }

  async cancelFollowingArticle(chat_id: number) {
    try {
      const updateData: Partial<User> = { article: null, type: 'new'};
      await this.update('chat_id', chat_id, updateData, ['chat_id']);
      console.log('postres: success to cancel article for '+ chat_id)
    } catch(e) {
      console.error('postgres: error while canceling following article - '+e)
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