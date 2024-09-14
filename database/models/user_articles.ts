import { BaseModel } from "../BaseModel";
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import pool from "../db";
import { sortObjDatesKeys } from "../../src/utils/dates";
dotenv.config();

export interface Article {
  articles: number[];  
  user_id: number;
  created_at: string;
  name: string;
  self_cost: number;
  other_cost: number;
  marketing_cost: any; 
}

class ArticlesModel extends BaseModel<Article> {
  constructor(pool: Pool) {
    super('user_articles', pool);
  }

  async updateArticle(chat_id: number, key: number): Promise<void> {
    try {
      const query = `SELECT * FROM user_articles WHERE user_id = $1`;
      const data = await this.pool.query(query, [chat_id]);
  
      let articles: number[] = data.rows[0]?.articles ?? [];
      articles.unshift(key);

      const marketing_cost = {}
      
      if (articles.length > 5) {
        articles = articles.slice(0, 5);
      }
  
      await this.update('user_id', chat_id, { articles, marketing_cost }, ['user_id']);
    } catch (e) {
      console.error(e);
    }
  }

  async updateField(chat_id: number, key: string, value: any) {
    try {
      const query = `
        UPDATE user_articles 
        SET ${key === 'name' ? 'name' : 'self_cost'} = $1 
        WHERE user_id = $2
      `;
      await this.pool.query(query, [value, chat_id]);
    } catch (e) {
      console.error('Error updating field:', e);
    }
  }
  
  async deleteArticle(chat_id: number) {
    try {
      const query = `DELETE FROM user_articles WHERE user_id = $1`;
      await this.pool.query(query, [chat_id]);
    } catch (e) {
      console.error('Error deleting article:', e);
    }
  }

  async selectArticle(user_id: number): Promise<Article | null> {
    try {
      const query = `SELECT * FROM user_articles WHERE user_id = $1`;
      const res = await this.pool.query(query, [user_id]);

      if (res.rows.length > 0) {
        const article = res.rows[0];
        article.article = article.articles[0]; 
        return article;
      } else {
        return null;
      }
    } catch (e) {
      console.error('postgres: ' + e);
      return null
    }
  }

  async addMarketingCost(user_id: number, marketingCost: Record<string, number>): Promise<void> {
    try {
      const query = `SELECT marketing_cost FROM user_articles WHERE user_id = $1`;
      const result = await this.pool.query(query, [user_id]);

      console.log(result)
  
      let currentMarketingCost = result.rows[0]?.marketing_cost || {};
      
      console.log(currentMarketingCost)
      for (const [date, cost] of Object.entries(marketingCost)) {
        if (cost !== 0 || !(date in currentMarketingCost)) {
          currentMarketingCost[date] = cost;
        }
      }
  
      const sortedDates = sortObjDatesKeys(currentMarketingCost);
      const latest30Days = sortedDates.slice(0, 30);
      
      const updatedMarketingCost = latest30Days.reduce((obj, date) => {
        obj[date] = currentMarketingCost[date];
        return obj;
      }, {} as Record<string, number>);
  
      const updateQuery = `
        UPDATE user_articles 
        SET marketing_cost = $1 
        WHERE user_id = $2
      `;

      console.log(updateQuery)
      await this.pool.query(updateQuery, [updatedMarketingCost, user_id]);
    } catch (e) {
      console.error('Error updating marketing cost:', e);
    }
  }
}

export const user_articles_db = new ArticlesModel(pool);