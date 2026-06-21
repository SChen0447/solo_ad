CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  nickname TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  avatar_color TEXT NOT NULL DEFAULT '#409EFF',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pois (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  creator_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS poi_comments (
  id TEXT PRIMARY KEY,
  poi_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (poi_id) REFERENCES pois(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS likes (
  id TEXT PRIMARY KEY,
  poi_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (poi_id, user_id),
  FOREIGN KEY (poi_id) REFERENCES pois(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS friendships (
  id TEXT PRIMARY KEY,
  follower_id TEXT NOT NULL,
  following_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (follower_id, following_id),
  FOREIGN KEY (follower_id) REFERENCES users(id),
  FOREIGN KEY (following_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS feed_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  poi_id TEXT NOT NULL,
  comment_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (poi_id) REFERENCES pois(id),
  FOREIGN KEY (comment_id) REFERENCES poi_comments(id)
);

CREATE INDEX IF NOT EXISTS idx_pois_creator ON pois(creator_id);
CREATE INDEX IF NOT EXISTS idx_pois_location ON pois(lat, lng);
CREATE INDEX IF NOT EXISTS idx_comments_poi ON poi_comments(poi_id);
CREATE INDEX IF NOT EXISTS idx_likes_poi ON likes(poi_id);
CREATE INDEX IF NOT EXISTS idx_friendships_follower ON friendships(follower_id);
CREATE INDEX IF NOT EXISTS idx_friendships_following ON friendships(following_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_user ON feed_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_created ON feed_events(created_at DESC);
