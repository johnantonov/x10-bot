CREATE TABLE IF NOT EXISTS connections (
    ss VARCHAR NOT NULL,
    chat_id BIGINT NOT NULL,
    notification_time NUMERIC,
    title VARCHAR,
    type VARCHAR,
    report_on BOOLEAN,
    PRIMARY KEY (ss, chat_id)
);

ALTER TABLE users
DROP COLUMN wb_api_key,
DROP COLUMN article,
DROP COLUMN notification_time;