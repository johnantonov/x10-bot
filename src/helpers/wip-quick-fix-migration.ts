export const migrations = {
  first: [`CREATE TABLE IF NOT EXISTS users (
    chat_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    wb_api_key VARCHAR,
    type VARCHAR,
    article BIGINT,
    notification_time NUMERIC,
    added_at TIMESTAMP DEFAULT NOW(),
    ss VARCHAR,
    ss_report BOOLEAN,
);`,

`CREATE TABLE IF NOT EXISTS user_articles (
    user_id BIGINT PRIMARY KEY UNIQUE,
    article NUMERIC[],
    name VARCHAR,
    self_cost BIGINT,
    other_cost BIGINT,
    marketing_cost JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
);`,

`ALTER TABLE user_articles ADD CONSTRAINT unique_user_id UNIQUE (user_id);
`]
}