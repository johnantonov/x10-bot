CREATE TABLE IF NOT EXISTS users (
    chat_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    wb_api_key VARCHAR,
    type VARCHAR,
    article BIGINT,
    notification_time NUMERIC,
    added_at TIMESTAMP DEFAULT NOW(),
    ss VARCHAR
);

CREATE TABLE IF NOT EXISTS user_articles (
    article NUMERIC PRIMARY KEY UNIQUE,
    user_id BIGINT REFERENCES users(chat_id) ON DELETE CASCADE,
    name VARCHAR,
    self_cost BIGINT,
    other_cost BIGINT,
    marketing_cost BIGINT,
    created_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE user_articles ADD CONSTRAINT unique_user_id UNIQUE (user_id);

ALTER TABLE users ADD COLUMN ss_report BOOLEAN;
