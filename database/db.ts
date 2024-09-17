import { Pool } from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({
  host: 'inner-x10Bot-postgres',
  port: Number(process.env.PGPORT),
  user: process.env.PGUSER,
  password: process.env.PGPASS,
  database: process.env.PGNAME,
});

export default pool;
