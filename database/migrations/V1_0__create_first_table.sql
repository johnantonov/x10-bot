CREATE TABLE IF NOT EXISTS users (
    chat_id BIGINT PRIMARY KEY,
    username VARCHAR(255),
    wb_api_key VARCHAR,
    type VARCHAR DEFAULT 'new',
    article BIGINT,
    notification_time NUMERIC,
    added_at TIMESTAMP DEFAULT NOW(),
    ss VARCHAR,
    ss_report BOOLEAN,
);
