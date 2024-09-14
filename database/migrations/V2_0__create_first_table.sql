ALTER TABLE user_articles DROP COLUMN article;

ALTER TABLE user_articles ADD COLUMN articles NUMERIC[];

ALTER TABLE user_articles DROP CONSTRAINT user_articles_pkey;
ALTER TABLE user_articles ADD PRIMARY KEY (user_id);

ALTER TABLE user_articles DROP CONSTRAINT unique_user_id;

ALTER TABLE user_articles DROP COLUMN marketing_cost;
ALTER TABLE user_articles ADD COLUMN marketing_cost JSONB;