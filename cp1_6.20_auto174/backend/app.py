import sqlite3
import os
from flask import Flask
from flask_cors import CORS
from world_api import world_bp
from fork_api import fork_bp

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'story.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS worlds (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            description TEXT NOT NULL,
            characters TEXT NOT NULL DEFAULT '[]',
            chapters TEXT NOT NULL DEFAULT '[]'
        )
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS story_fork (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            world_id INTEGER NOT NULL,
            chapter_index INTEGER NOT NULL,
            author TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    conn.commit()
    conn.close()

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}})

app.register_blueprint(world_bp, url_prefix='/api')
app.register_blueprint(fork_bp, url_prefix='/api')

@app.route('/api/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
