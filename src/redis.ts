import { Redis } from 'ioredis';

export class redis {
  private client: Redis;

  constructor() {
    this.client = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: 6379,
    });
  }

  public getClient(): Redis {
    return this.client;
  }

  async getUserState(chatId: number): Promise<string | null> {
    return await this.client.get(`user:${chatId}:state`);
  }

  async setUserState(chatId: number, state: string, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.client.set(`user:${chatId}:state`, state, 'EX', ttlSeconds);
    } else {
      await this.client.set(`user:${chatId}:state`, state);
    }
  }

  async deleteUserState(chatId: number): Promise<void> {
    await this.client.del(`user:${chatId}:state`);
  }
}

export const waitingStates = [
  'awaiing_connection_title?', 
  'awaiting_wb_api_key', 
  'awaiting_prem_pass', 
  'awaiting_cost_art', 
  'awaiting_title_art', 
  'awaiting_new_connection'
]

export const rStates = {
  waitConnectionTitle: waitingStates[0],
  waitWbApiKey: waitingStates[1],
  waitPremPass: waitingStates[2],
  waitCostArt: waitingStates[3],
  waitTitleArt: waitingStates[4],
  waitNewConnection: waitingStates[5],
}


export const ttls = {
  usual: 600,
  hour: 3600,
}
