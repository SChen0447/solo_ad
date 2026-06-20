import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "database.db")


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            is_musician INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS tracks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            artist TEXT NOT NULL,
            cover_url TEXT DEFAULT '',
            audio_url TEXT DEFAULT '',
            lyrics TEXT DEFAULT '',
            user_id INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS studios (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL,
            host_id INTEGER NOT NULL,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            duration INTEGER DEFAULT 1800,
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (track_id) REFERENCES tracks(id),
            FOREIGN KEY (host_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS danmakus (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            nickname TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (track_id) REFERENCES tracks(id)
        );
    """)
    conn.commit()
    conn.close()


# ---- User operations ----

def create_user(username, email, password_hash, is_musician=0):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO users (username, email, password_hash, is_musician) VALUES (?, ?, ?, ?)",
        (username, email, password_hash, is_musician),
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()
    return user_id


def get_user_by_email(email):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(user) if user else None


def get_user_by_id(user_id):
    conn = get_db()
    user = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(user) if user else None


def update_user_musician(user_id):
    conn = get_db()
    conn.execute("UPDATE users SET is_musician = 1 WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()


# ---- Track operations ----

def create_track(title, artist, cover_url, audio_url, lyrics, user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO tracks (title, artist, cover_url, audio_url, lyrics, user_id) VALUES (?, ?, ?, ?, ?, ?)",
        (title, artist, cover_url, audio_url, lyrics, user_id),
    )
    conn.commit()
    track_id = cursor.lastrowid
    conn.close()
    return track_id


def get_all_tracks(search=None):
    conn = get_db()
    if search:
        tracks = conn.execute(
            "SELECT * FROM tracks WHERE title LIKE ? OR artist LIKE ? ORDER BY created_at DESC",
            (f"%{search}%", f"%{search}%"),
        ).fetchall()
    else:
        tracks = conn.execute("SELECT * FROM tracks ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(t) for t in tracks]


def get_track_by_id(track_id):
    conn = get_db()
    track = conn.execute("SELECT * FROM tracks WHERE id = ?", (track_id,)).fetchone()
    conn.close()
    return dict(track) if track else None


def update_track(track_id, title, artist, cover_url, audio_url, lyrics):
    conn = get_db()
    conn.execute(
        "UPDATE tracks SET title = ?, artist = ?, cover_url = ?, audio_url = ?, lyrics = ? WHERE id = ?",
        (title, artist, cover_url, audio_url, lyrics, track_id),
    )
    conn.commit()
    conn.close()


def delete_track(track_id):
    conn = get_db()
    conn.execute("DELETE FROM tracks WHERE id = ?", (track_id,))
    conn.commit()
    conn.close()


def get_track_lyrics(track_id):
    conn = get_db()
    row = conn.execute("SELECT lyrics FROM tracks WHERE id = ?", (track_id,)).fetchone()
    conn.close()
    return dict(row)["lyrics"] if row else None


# ---- Studio operations ----

def create_studio(track_id, host_id, duration=1800):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO studios (track_id, host_id, duration, is_active) VALUES (?, ?, ?, 1)",
        (track_id, host_id, duration),
    )
    conn.commit()
    studio_id = cursor.lastrowid
    conn.close()
    return studio_id


def get_active_studios():
    conn = get_db()
    studios = conn.execute(
        "SELECT s.*, t.title as track_title, t.artist as track_artist, u.username as host_name "
        "FROM studios s "
        "JOIN tracks t ON s.track_id = t.id "
        "JOIN users u ON s.host_id = u.id "
        "WHERE s.is_active = 1 ORDER BY s.started_at DESC"
    ).fetchall()
    conn.close()
    return [dict(s) for s in studios]


def get_studio_by_id(studio_id):
    conn = get_db()
    studio = conn.execute(
        "SELECT s.*, t.title as track_title, t.artist as track_artist, u.username as host_name "
        "FROM studios s "
        "JOIN tracks t ON s.track_id = t.id "
        "JOIN users u ON s.host_id = u.id "
        "WHERE s.id = ?",
        (studio_id,),
    ).fetchone()
    conn.close()
    return dict(studio) if studio else None


# ---- Danmaku operations ----

def create_danmaku(track_id, content, nickname):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO danmakus (track_id, content, nickname) VALUES (?, ?, ?)",
        (track_id, content, nickname),
    )
    conn.commit()
    danmaku_id = cursor.lastrowid
    conn.close()
    return danmaku_id


def get_danmakus_by_track(track_id):
    conn = get_db()
    danmakus = conn.execute(
        "SELECT * FROM danmakus WHERE track_id = ? ORDER BY created_at ASC",
        (track_id,),
    ).fetchall()
    conn.close()
    return [dict(d) for d in danmakus]


def is_table_empty(table_name):
    conn = get_db()
    count = conn.execute(f"SELECT COUNT(*) FROM {table_name}").fetchone()[0]
    conn.close()
    return count == 0
