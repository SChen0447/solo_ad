import sqlite3
from datetime import datetime
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'garden.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        avatar TEXT,
        points INTEGER DEFAULT 100,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS plots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        grid_x INTEGER NOT NULL,
        grid_y INTEGER NOT NULL,
        user_id INTEGER,
        water_level INTEGER DEFAULT 0,
        fertilizer_level INTEGER DEFAULT 0,
        claimed_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS diaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        plot_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (plot_id) REFERENCES plots (id)
    )
    ''')

    cursor.execute('''
    CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        from_user_id INTEGER NOT NULL,
        to_user_id INTEGER NOT NULL,
        amount INTEGER NOT NULL,
        type TEXT NOT NULL,
        plot_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (from_user_id) REFERENCES users (id),
        FOREIGN KEY (to_user_id) REFERENCES users (id),
        FOREIGN KEY (plot_id) REFERENCES plots (id)
    )
    ''')

    cursor.execute('SELECT COUNT(*) FROM users')
    if cursor.fetchone()[0] == 0:
        cursor.execute('INSERT INTO users (username, avatar, points) VALUES (?, ?, ?)',
                      ('小明', 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming', 100))
        cursor.execute('INSERT INTO users (username, avatar, points) VALUES (?, ?, ?)',
                      ('小红', 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaohong', 100))
        cursor.execute('INSERT INTO users (username, avatar, points) VALUES (?, ?, ?)',
                      ('小刚', 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaogang', 100))

    cursor.execute('SELECT COUNT(*) FROM plots')
    if cursor.fetchone()[0] == 0:
        for y in range(8):
            for x in range(10):
                cursor.execute('INSERT INTO plots (grid_x, grid_y) VALUES (?, ?)', (x, y))

    conn.commit()
    conn.close()

def add_points(user_id, amount):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('UPDATE users SET points = points + ? WHERE id = ?', (amount, user_id))
    conn.commit()
    conn.close()

def deduct_points(user_id, amount):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT points FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    if user and user['points'] >= amount:
        cursor.execute('UPDATE users SET points = points - ? WHERE id = ?', (amount, user_id))
        conn.commit()
        conn.close()
        return True
    conn.close()
    return False

def record_transaction(from_user_id, to_user_id, amount, trans_type, plot_id=None):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO transactions (from_user_id, to_user_id, amount, type, plot_id)
        VALUES (?, ?, ?, ?, ?)
    ''', (from_user_id, to_user_id, amount, trans_type, plot_id))
    conn.commit()
    conn.close()
