import sqlite3
import json
from datetime import datetime

DB_PATH = 'stories.db'

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS stories (
            story_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            pages TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def create_story(story_id, title, pages):
    now = datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO stories (story_id, title, pages, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
        (story_id, title, json.dumps(pages, ensure_ascii=False), now, now)
    )
    conn.commit()
    conn.close()

def get_story(story_id):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM stories WHERE story_id = ?', (story_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return {
            'story_id': row['story_id'],
            'title': row['title'],
            'pages': json.loads(row['pages']),
            'created_at': row['created_at'],
            'updated_at': row['updated_at']
        }
    return None

def update_story(story_id, title, pages):
    now = datetime.now().isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE stories SET title = ?, pages = ?, updated_at = ? WHERE story_id = ?',
        (title, json.dumps(pages, ensure_ascii=False), now, story_id)
    )
    conn.commit()
    conn.close()

def get_all_stories():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT story_id, title, pages, created_at FROM stories ORDER BY created_at DESC')
    rows = cursor.fetchall()
    conn.close()
    stories = []
    for row in rows:
        pages = json.loads(row['pages'])
        first_page = pages[0] if pages else {}
        stories.append({
            'story_id': row['story_id'],
            'title': row['title'],
            'cover_color': first_page.get('backgroundColor', '#FFE4C4'),
            'cover_image': first_page.get('backgroundImage', ''),
            'description': first_page.get('content', '')[:100],
            'total_pages': len(pages),
            'created_at': row['created_at']
        })
    return stories
