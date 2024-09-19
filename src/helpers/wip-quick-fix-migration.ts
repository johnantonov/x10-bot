export const migrations = [
// -------- 0  
    [],
// -------- 1    
    [`CREATE TABLE IF NOT EXISTS users (
      chat_id BIGINT PRIMARY KEY,
      username VARCHAR(255),
      wb_api_key VARCHAR,
      type VARCHAR,
      article BIGINT,
      notification_time NUMERIC,
      added_at TIMESTAMP DEFAULT NOW(),
      ss VARCHAR,
      ss_report BOOLEAN);`],
// -------- 2
   [`CREATE TABLE IF NOT EXISTS connections (
    ss VARCHAR NOT NULL,
    chat_id BIGINT NOT NULL,
    notification_time NUMERIC,
    title VARCHAR,
    type VARCHAR,
    status VARCHAR DEFAULT 'off',
    report_on BOOLEAN,
    PRIMARY KEY (ss, chat_id),
    FOREIGN KEY (chat_id) REFERENCES users(chat_id) ON DELETE CASCADE);`, 
    
    `ALTER TABLE users
    DROP COLUMN wb_api_key,
    DROP COLUMN article,
    DROP COLUMN notification_time;`]
// -------
]