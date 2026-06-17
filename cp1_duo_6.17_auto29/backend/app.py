import os
import sqlite3
import uuid
import json
import datetime
from functools import wraps
from flask import Flask, request, jsonify, g
from flask_cors import CORS
import jwt
from werkzeug.security import generate_password_hash, check_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'poetry.db')
SECRET_KEY = os.environ.get('SECRET_KEY', 'poetry-gallery-secret-key')
JWT_EXPIRE_HOURS = 24

app = Flask(__name__)
CORS(app)
app.config['JSON_AS_ASCII'] = False

PALETTES = [
    {"id": 1, "name": "墨韵青", "primary": "#2d5a4d", "secondary": "#1a3a32", "background": "#0f2a22", "text": "#e8f5e9", "accent": "#4caf8d"},
    {"id": 2, "name": "桃花粉", "primary": "#d4738a", "secondary": "#a6485e", "background": "#5a2632", "text": "#ffe8ee", "accent": "#ff9fb5"},
    {"id": 3, "name": "江天蓝", "primary": "#4a89c7", "secondary": "#2e5f8f", "background": "#153352", "text": "#e3f1ff", "accent": "#7fb3e8"},
    {"id": 4, "name": "落日橙", "primary": "#e07b39", "secondary": "#a85220", "background": "#4d270f", "text": "#fff1e3", "accent": "#ffa55e"},
    {"id": 5, "name": "翠竹绿", "primary": "#6fa060", "secondary": "#3f6b34", "background": "#1e3a17", "text": "#eaf5e5", "accent": "#9bcd8c"},
    {"id": 6, "name": "暮云紫", "primary": "#8c6bb1", "secondary": "#5c4482", "background": "#2d1f45", "text": "#f0e8ff", "accent": "#b599d9"},
    {"id": 7, "name": "朱砂红", "primary": "#c44b4b", "secondary": "#8a2d2d", "background": "#3d1313", "text": "#ffe6e6", "accent": "#ff7a7a"},
    {"id": 8, "name": "宣纸米", "primary": "#c9b896", "secondary": "#8a7a5a", "background": "#3d3525", "text": "#f5ecd7", "accent": "#e6d7b0"},
    {"id": 9, "name": "夜空蓝", "primary": "#40588a", "secondary": "#233354", "background": "#0c1527", "text": "#dce6ff", "accent": "#6b86c4"},
    {"id": 10, "name": "秋枫金", "primary": "#c88a3d", "secondary": "#8a5a1e", "background": "#3d280e", "text": "#fff3dc", "accent": "#e8b268"},
    {"id": 11, "name": "荷塘碧", "primary": "#3d968a", "secondary": "#21645c", "background": "#0f3633", "text": "#dff5f2", "accent": "#6cc4b8"},
    {"id": 12, "name": "烟雨灰", "primary": "#7d8694", "secondary": "#4f5762", "background": "#262b33", "text": "#eef1f5", "accent": "#a8b1bd"},
    {"id": 13, "name": "樱雪白", "primary": "#b8a9c4", "secondary": "#7f6f8f", "background": "#3d3548", "text": "#f5f0fa", "accent": "#d5c6e2"},
    {"id": 14, "name": "松涛深", "primary": "#2f4a3f", "secondary": "#1a2e26", "background": "#0d1a14", "text": "#dce8e1", "accent": "#568670"},
]

TEXTURES = [
    {
        "id": 1, "name": "宣纸",
        "svg": '''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.9  0 0 0 0 0.85  0 0 0 0 0.75  0 0 0 0.15 0"/></filter><rect width="400" height="400" filter="url(#n)"/></svg>'''
    },
    {
        "id": 2, "name": "水墨",
        "svg": '''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><radialGradient id="g1"><stop offset="0%" stop-color="#000" stop-opacity="0.5"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient><radialGradient id="g2" cx="70%" cy="30%"><stop offset="0%" stop-color="#000" stop-opacity="0.4"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient></defs><ellipse cx="150" cy="200" rx="180" ry="140" fill="url(#g1)"/><ellipse cx="280" cy="150" rx="160" ry="110" fill="url(#g2)"/></svg>'''
    },
    {
        "id": 3, "name": "星空",
        "svg": '''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><radialGradient id="st"><stop offset="0%" stop-color="#fff" stop-opacity="0.9"/><stop offset="100%" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><g fill="url(#st)"><circle cx="40" cy="60" r="3"/><circle cx="120" cy="30" r="2"/><circle cx="200" cy="80" r="4"/><circle cx="280" cy="40" r="2.5"/><circle cx="350" cy="90" r="3"/><circle cx="70" cy="150" r="2"/><circle cx="160" cy="180" r="3.5"/><circle cx="250" cy="130" r="2"/><circle cx="320" cy="200" r="3"/><circle cx="50" cy="260" r="2.5"/><circle cx="130" cy="300" r="3"/><circle cx="220" cy="270" r="2"/><circle cx="300" cy="320" r="4"/><circle cx="370" cy="280" r="2"/><circle cx="90" cy="360" r="3"/><circle cx="180" cy="350" r="2"/><circle cx="260" cy="370" r="2.5"/><circle cx="340" cy="360" r="3"/></g></svg>'''
    },
    {
        "id": 4, "name": "木纹",
        "svg": '''<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400"><defs><pattern id="w" width="400" height="60" patternUnits="userSpaceOnUse"><path d="M0 30 Q 50 10 100 30 T 200 30 T 300 30 T 400 30" stroke="#000" stroke-opacity="0.1" fill="none" stroke-width="2"/><path d="M0 45 Q 60 25 120 45 T 240 45 T 360 45" stroke="#000" stroke-opacity="0.08" fill="none" stroke-width="1.5"/><path d="M0 15 Q 40 30 80 15 T 160 15 T 240 15 T 320 15 T 400 15" stroke="#000" stroke-opacity="0.06" fill="none" stroke-width="1"/></pattern></defs><rect width="400" height="400" fill="url(#w)"/></svg>'''
    },
]

FONTS = [
    {"id": "serif", "name": "衬线体", "family": "'Noto Serif SC', 'Songti SC', Georgia, serif"},
    {"id": "sans", "name": "无衬线", "family": "'PingFang SC', 'Helvetica Neue', Arial, sans-serif"},
    {"id": "handwriting", "name": "手写体", "family": "'Ma Shan Zheng', 'Kaiti SC', 'STKaiti', cursive"},
]


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS poems (
        id TEXT PRIMARY KEY, title TEXT NOT NULL, poet TEXT NOT NULL, content TEXT NOT NULL,
        palette_id INTEGER NOT NULL, font_id TEXT NOT NULL, texture_id INTEGER NOT NULL,
        favorites INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS notes (
        poem_id TEXT PRIMARY KEY, poem_title TEXT NOT NULL, content TEXT NOT NULL,
        updated_at TEXT NOT NULL
    )''')
    c.execute('SELECT COUNT(*) FROM poems')
    if c.fetchone()[0] == 0:
        sample_poems = [
            (str(uuid.uuid4()), '静夜思', '李白', '床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。', 1, 'serif', 1, 12),
            (str(uuid.uuid4()), '春晓', '孟浩然', '春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。', 5, 'handwriting', 2, 8),
            (str(uuid.uuid4()), '登鹳雀楼', '王之涣', '白日依山尽，\n黄河入海流。\n欲穷千里目，\n更上一层楼。', 3, 'serif', 3, 15),
            (str(uuid.uuid4()), '相思', '王维', '红豆生南国，\n春来发几枝。\n愿君多采撷，\n此物最相思。', 2, 'sans', 1, 20),
            (str(uuid.uuid4()), '江雪', '柳宗元', '千山鸟飞绝，\n万径人踪灭。\n孤舟蓑笠翁，\n独钓寒江雪。', 9, 'serif', 4, 10),
        ]
        now = datetime.datetime.now().isoformat()
        for p in sample_poems:
            c.execute('INSERT INTO poems VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
                      (p[0], p[1], p[2], p[3], p[4], p[5], p[6], p[7], now))
    conn.commit()
    conn.close()


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': '未登录'}), 401
        try:
            jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        except Exception:
            return jsonify({'error': '登录已过期'}), 401
        return f(*args, **kwargs)
    return decorated


@app.route('/api/palettes', methods=['GET'])
def get_palettes():
    return jsonify(PALETTES)


@app.route('/api/textures', methods=['GET'])
def get_textures():
    return jsonify(TEXTURES)


@app.route('/api/fonts', methods=['GET'])
def get_fonts():
    return jsonify(FONTS)


@app.route('/api/poems', methods=['GET'])
def list_poems():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 12))
    offset = (page - 1) * limit
    db = get_db()
    rows = db.execute('SELECT * FROM poems ORDER BY created_at DESC LIMIT ? OFFSET ?',
                      (limit + 1, offset)).fetchall()
    has_more = len(rows) > limit
    poems = [dict(r) for r in rows[:limit]]
    return jsonify({'poems': poems, 'hasMore': has_more})


@app.route('/api/poems/<poem_id>', methods=['GET'])
def get_poem(poem_id):
    db = get_db()
    row = db.execute('SELECT * FROM poems WHERE id = ?', (poem_id,)).fetchone()
    if not row:
        return jsonify({'error': '诗歌不存在'}), 404
    return jsonify(dict(row))


@app.route('/api/poems', methods=['POST'])
def create_poem_route():
    data = request.get_json() or {}
    title = (data.get('title') or '').strip()
    poet = (data.get('poet') or '佚名').strip()
    content = (data.get('content') or '').strip()
    palette_id = int(data.get('palette_id') or 1)
    font_id = (data.get('font_id') or 'serif').strip()
    texture_id = int(data.get('texture_id') or 1)
    if not title or not content:
        return jsonify({'error': '标题和内容不能为空'}), 400
    poem_id = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    db = get_db()
    db.execute('INSERT INTO poems VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
               (poem_id, title, poet, content, palette_id, font_id, texture_id, 0, now))
    db.commit()
    row = db.execute('SELECT * FROM poems WHERE id = ?', (poem_id,)).fetchone()
    return jsonify(dict(row)), 201


@app.route('/api/poems/<poem_id>/favorite', methods=['POST'])
def favorite_poem(poem_id):
    db = get_db()
    db.execute('UPDATE poems SET favorites = favorites + 1 WHERE id = ?', (poem_id,))
    db.commit()
    row = db.execute('SELECT favorites FROM poems WHERE id = ?', (poem_id,)).fetchone()
    if not row:
        return jsonify({'error': '诗歌不存在'}), 404
    return jsonify({'favorites': row['favorites']})


@app.route('/api/notes', methods=['GET'])
def search_notes():
    q = (request.args.get('q') or '').strip().lower()
    db = get_db()
    if q:
        rows = db.execute('SELECT * FROM notes WHERE LOWER(poem_title) LIKE ? OR LOWER(content) LIKE ? LIMIT 20',
                          (f'%{q}%', f'%{q}%')).fetchall()
    else:
        rows = db.execute('SELECT * FROM notes ORDER BY updated_at DESC LIMIT 20').fetchall()
    return jsonify([dict(r) for r in rows])


@app.route('/api/notes/<poem_id>', methods=['GET'])
def get_note(poem_id):
    db = get_db()
    row = db.execute('SELECT * FROM notes WHERE poem_id = ?', (poem_id,)).fetchone()
    if not row:
        return jsonify({'error': '笔记不存在'}), 404
    return jsonify(dict(row))


@app.route('/api/notes/<poem_id>', methods=['PUT'])
def save_note_route(poem_id):
    data = request.get_json() or {}
    poem_title = (data.get('poem_title') or '').strip()
    content = (data.get('content') or '').strip()
    now = datetime.datetime.now().isoformat()
    db = get_db()
    exists = db.execute('SELECT 1 FROM notes WHERE poem_id = ?', (poem_id,)).fetchone()
    if exists:
        db.execute('UPDATE notes SET poem_title = ?, content = ?, updated_at = ? WHERE poem_id = ?',
                   (poem_title, content, now, poem_id))
    else:
        db.execute('INSERT INTO notes VALUES (?, ?, ?, ?)', (poem_id, poem_title, content, now))
    db.commit()
    row = db.execute('SELECT * FROM notes WHERE poem_id = ?', (poem_id,)).fetchone()
    return jsonify(dict(row))


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    if not username or not password:
        return jsonify({'error': '用户名和密码不能为空'}), 400
    db = get_db()
    if db.execute('SELECT 1 FROM users WHERE username = ?', (username,)).fetchone():
        return jsonify({'error': '用户名已存在'}), 400
    user_id = str(uuid.uuid4())
    now = datetime.datetime.now().isoformat()
    db.execute('INSERT INTO users VALUES (?, ?, ?, ?)',
               (user_id, username, generate_password_hash(password), now))
    db.commit()
    token = jwt.encode({'user_id': user_id, 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRE_HOURS)},
                       SECRET_KEY, algorithm='HS256')
    return jsonify({'token': token})


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    username = (data.get('username') or '').strip()
    password = (data.get('password') or '').strip()
    db = get_db()
    row = db.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
    if not row or not check_password_hash(row['password_hash'], password):
        return jsonify({'error': '用户名或密码错误'}), 401
    token = jwt.encode({'user_id': row['id'], 'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRE_HOURS)},
                       SECRET_KEY, algorithm='HS256')
    return jsonify({'token': token})


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
