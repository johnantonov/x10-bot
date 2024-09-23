import { Pool } from 'pg';

interface QueryResult<T> {
  rows: T[];
}

export abstract class BaseModel<T> {
  protected tableName: string;
  protected pool: Pool;

  constructor(tableName: string, pool: Pool) {
    this.tableName = tableName;
    this.pool = pool;
  }

  async getAllData() {
    try {
      const usersResult = await this.pool.query('SELECT * FROM users');
      const connectionsResult = await this.pool.query('SELECT * FROM connections');
  
      return {
        users: usersResult.rows,
        connections: connectionsResult.rows,
      };
    } catch (err) {
      console.error('Ошибка при получении данных:', err);
    }
  }

  async insert(data: Partial<T>): Promise<void> {
    const columns = Object.keys(data).join(', ');
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');

    const query = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders})`;
    await this.pool.query(query, values);
  }

  async delete(key: keyof T, value: any): Promise<void> {
    const query = `DELETE FROM ${this.tableName} WHERE ${String(key)} = $1`;
    await this.pool.query(query, [value]);
  }

  async select(whereClause: Partial<T>): Promise<QueryResult<T>> {
    const conditions = Object.keys(whereClause)
      .map((key, index) => `${key} = $${index + 1}`)
      .join(' AND ');
    const values = Object.values(whereClause);

    const query = `SELECT * FROM ${this.tableName} WHERE ${conditions}`;
    const result = await this.pool.query(query, values);
    return result;
  }

  async update(key: keyof T, keyValue: any, data: Partial<T>, uniqueColumns: (keyof T)[]): Promise<void> {
    const columns = Object.keys(data);
    
    const columnNames = columns.map((col) => `"${col}"`).join(', ');
    const valuePlaceholders = columns.map((_, index) => `$${index + 1}`).join(', ');
  
    const conflictColumns = uniqueColumns.map((col) => `"${String(col)}"`).join(', ');
    const conflictAction = columns
      .filter((col) => !uniqueColumns.includes(col as keyof T)) 
      .map((col) => `"${col}" = EXCLUDED."${col}"`)
      .join(', ');
  
    const values = [...Object.values(data), keyValue];
  
    const query = `
      INSERT INTO ${this.tableName} (${columnNames}, "${String(key)}")
      VALUES (${valuePlaceholders}, $${values.length})
      ON CONFLICT (${conflictColumns})  -- Учитываем все уникальные столбцы
      DO UPDATE SET ${conflictAction};
    `;
  
    await this.pool.query(query, values);
  }
}