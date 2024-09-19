CREATE TABLE IF NOT EXISTS connections (
    ss VARCHAR NOT NULL,
    chat_id BIGINT NOT NULL,
    notification_time NUMERIC,
    title VARCHAR,
    type VARCHAR,
    status VARCHAR DEFAULT 'off',
    report_on BOOLEAN,
    PRIMARY KEY (ss, chat_id),
    FOREIGN KEY (chat_id) REFERENCES users(chat_id) ON DELETE CASCADE
);

ALTER TABLE users
DROP COLUMN wb_api_key,
DROP COLUMN article,
DROP COLUMN notification_time;