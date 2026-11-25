CREATE TABLE runner_scores (
  name_key TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 3600),
  achieved_at INTEGER NOT NULL
);
