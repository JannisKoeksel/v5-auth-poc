drop schema if exists app cascade;

create schema app;

-- Create users table
CREATE TABLE IF NOT EXISTS app.users (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL
);

-- Create posts table
CREATE TABLE IF NOT EXISTS app.posts (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    CONSTRAINT fk_posts_user
      FOREIGN KEY(user_id)
        REFERENCES app.users(id)
        ON DELETE CASCADE
);

-- Index on posts.user_id for performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id
    ON app.posts(user_id);

-- Insert sample users
INSERT INTO app.users (tenant_id, name) VALUES
  ('tenant_1', 'Alice'),
  ('tenant_1', 'Bob'),
  ('tenant_1', 'Charlie'),
  ('tenant_1', 'Diana'),
  ('tenant_1', 'Ethan');

-- Insert sample posts (20 total)
INSERT INTO app.posts (tenant_id, user_id, title) VALUES
  ('tenant_1', 1, 'Post 1 by Alice'),
  ('tenant_1', 1, 'Post 2 by Alice'),
  ('tenant_1', 1, 'Post 3 by Alice'),
  ('tenant_1', 1, 'Post 4 by Alice'),
  ('tenant_1', 1, 'Post 5 by Alice'),
  ('tenant_1', 2, 'Post 1 by Bob'),
  ('tenant_1', 2, 'Post 2 by Bob'),
  ('tenant_1', 2, 'Post 3 by Bob'),
  ('tenant_1', 2, 'Post 4 by Bob'),
  ('tenant_1', 3, 'Post 1 by Charlie'),
  ('tenant_1', 3, 'Post 2 by Charlie'),
  ('tenant_1', 3, 'Post 3 by Charlie'),
  ('tenant_1', 4, 'Post 1 by Diana'),
  ('tenant_1', 4, 'Post 2 by Diana'),
  ('tenant_1', 4, 'Post 3 by Diana'),
  ('tenant_1', 5, 'Post 1 by Ethan'),
  ('tenant_1', 5, 'Post 2 by Ethan'),
  ('tenant_1', 5, 'Post 3 by Ethan'),
  ('tenant_1', 5, 'Post 4 by Ethan'),
  ('tenant_1', 5, 'Post 5 by Ethan');