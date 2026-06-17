from flask import Flask, request, jsonify, g
from flask_cors import CORS
import sqlite3
import time
import uuid
import random
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'canvas.db')

online_users = {}
lines_by_id = {}
SNAPSHOT_CACHE_TTL = 60
snapshot_cache = {}


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute('PRAGMA journal_mode=WAL')
        g.db.execute('PRAGMA synchronous=NORMAL')
    return g.db


@app.teardown_appcontext
def close_db(exception):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute('PRAGMA journal_mode=WAL')
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lines (
            id TEXT PRIMARY KEY,
            points_json TEXT NOT NULL,
            color TEXT NOT NULL DEFAULT '#000000',
            size REAL NOT NULL DEFAULT 3.0,
            author TEXT NOT NULL,
            timestamp REAL NOT NULL,
            likes INTEGER NOT NULL DEFAULT 0
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS likes (
            line_id TEXT NOT NULL,
            ip TEXT NOT NULL,
            created_at REAL NOT NULL,
            PRIMARY KEY (line_id, ip),
            FOREIGN KEY (line_id) REFERENCES lines(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('CREATE INDEX IF NOT EXISTS idx_lines_timestamp ON lines(timestamp DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_lines_likes ON lines(likes DESC)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_likes_line ON likes(line_id)')

    cursor.execute('SELECT COUNT(*) FROM lines')
    count = cursor.fetchone()[0]

    if count == 0:
        demo_authors = ["白鹭001", "青竹002", "雪松003", "红枫004", "紫藤005"]
        demo_colors = ["#8B4513", "#2E8B57", "#4682B4", "#CD5C5C", "#9370DB"]
        base_time = time.time()

        for i in range(25):
            author = demo_authors[i % len(demo_authors)]
            color = demo_colors[i % len(demo_colors)]
            cx = random.uniform(-400, 400)
            cy = random.uniform(-300, 300)
            points = []
            px, py = cx, cy
            for j in range(random.randint(8, 20)):
                points.append({'x': px, 'y': py, 'p': random.uniform(0.5, 1.0)})
                px += random.uniform(-25, 25)
                py += random.uniform(-25, 25)

            line_id = str(uuid.uuid4())
            timestamp = base_time - random.uniform(86400, 172800) + i * 3600
            likes = random.randint(0, 50)

            cursor.execute(
                'INSERT INTO lines (id, points_json, color, size, author, timestamp, likes) VALUES (?, ?, ?, ?, ?, ?, ?)',
                (line_id, json.dumps(points), color, random.uniform(2, 6), author, timestamp, likes)
            )

        conn.commit()
        print(f"  初始化 {25} 条演示线条数据")

    cursor.execute('SELECT COUNT(*) FROM lines')
    final_count = cursor.fetchone()[0]
    cursor.execute('SELECT MIN(timestamp) FROM lines')
    first_time = cursor.fetchone()[0]

    cursor.execute('SELECT id, points_json, color, size, author, timestamp, likes FROM lines')
    for row in cursor.fetchall():
        lines_by_id[row['id']] = {
            'id': row['id'],
            'points': json.loads(row['points_json']),
            'color': row['color'],
            'size': row['size'],
            'author': row['author'],
            'timestamp': row['timestamp'],
            'likes': row['likes']
        }

    conn.close()
    return final_count, first_time


def generate_anonymous_id(ip):
    if not ip:
        ip = "unknown"
    seed = hash(ip) % 100000
    colors = ["红枫", "雪松", "青竹", "墨梅", "幽兰", "紫藤", "丹桂", "白鹭"]
    nums = ["001", "002", "003", "004", "005", "006", "007", "008", "009"]
    return f"{colors[seed % len(colors)]}{nums[(seed // 10) % len(nums)]}"


def get_client_ip():
    return request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1')


def row_to_line_dict(row, include_points=True):
    result = {
        'id': row['id'],
        'color': row['color'],
        'size': row['size'],
        'author': row['author'],
        'timestamp': row['timestamp'],
        'likes': row['likes']
    }
    if include_points:
        result['points'] = json.loads(row['points_json'])
    return result


@app.route('/api/lines', methods=['POST'])
def publish_lines():
    data = request.get_json()
    if not data or 'lines' not in data:
        return jsonify({'error': '缺少lines数据'}), 400

    ip = get_client_ip()
    author_id = generate_anonymous_id(ip)
    created_lines = []
    db = get_db()
    cursor = db.cursor()

    for line_data in data['lines']:
        line_id = str(uuid.uuid4())
        points = line_data.get('points', [])
        color = line_data.get('color', '#000000')
        size = line_data.get('size', 3)
        timestamp = time.time()

        cursor.execute(
            'INSERT INTO lines (id, points_json, color, size, author, timestamp, likes) VALUES (?, ?, ?, ?, ?, ?, 0)',
            (line_id, json.dumps(points), color, size, author_id, timestamp)
        )

        line_obj = {
            'id': line_id,
            'points': points,
            'color': color,
            'size': size,
            'author': author_id,
            'timestamp': timestamp,
            'likes': 0
        }
        lines_by_id[line_id] = line_obj
        created_lines.append({
            'id': line_id,
            'author': author_id,
            'timestamp': timestamp
        })

    db.commit()
    online_users[ip] = time.time()

    return jsonify({
        'success': True,
        'lines': created_lines,
        'author': author_id,
        'count': len(created_lines)
    }), 201


@app.route('/api/lines', methods=['GET'])
def get_recent_lines():
    limit = min(int(request.args.get('limit', 1000)), 1000)
    since = request.args.get('since', None)
    db = get_db()
    cursor = db.cursor()

    query = 'SELECT * FROM lines'
    params = []
    if since:
        query += ' WHERE timestamp > ?'
        params.append(float(since))
    query += ' ORDER BY timestamp DESC LIMIT ?'
    params.append(limit)

    cursor.execute(query, params)
    rows = cursor.fetchall()

    result = []
    for row in reversed(rows):
        result.append(row_to_line_dict(row))

    cursor.execute('SELECT COUNT(*) FROM lines')
    total = cursor.fetchone()[0]

    cursor.execute('SELECT MIN(timestamp) FROM lines')
    first_time_row = cursor.fetchone()[0]

    now = time.time()
    active_count = sum(1 for t in online_users.values() if now - t < 300)

    return jsonify({
        'lines': result,
        'total': total,
        'online_count': max(active_count, 1 + len(online_users) // 2),
        'first_time': first_time_row or now
    })


@app.route('/api/snapshots', methods=['GET'])
def get_snapshot():
    time_str = request.args.get('time', None)
    if not time_str:
        return jsonify({'error': '缺少time参数'}), 400

    try:
        target_time = float(time_str)
    except (ValueError, TypeError):
        return jsonify({'error': 'time参数格式错误'}), 400

    cache_key = str(int(target_time // 60) * 60)
    now = time.time()

    if cache_key in snapshot_cache:
        cached = snapshot_cache[cache_key]
        if now - cached['created'] < SNAPSHOT_CACHE_TTL:
            return jsonify(cached['data'])

    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT * FROM lines WHERE timestamp <= ? ORDER BY timestamp ASC', (target_time,))
    rows = cursor.fetchall()

    snapshot_lines = [row_to_line_dict(row) for row in rows]

    cursor.execute('SELECT MIN(timestamp) FROM lines')
    min_row = cursor.fetchone()[0]
    min_time = min_row or (now - 3600)
    max_time = now

    time_diff = target_time - min_time
    total_diff = max(0.001, max_time - min_time)
    ratio = max(0, min(1, time_diff / total_diff))
    estimated_online = int(1 + ratio * 35 + random.random() * 8)
    estimated_new = int(len(snapshot_lines) * 0.15 * (0.8 + random.random() * 0.4))

    result = {
        'lines': snapshot_lines,
        'target_time': target_time,
        'online_count': estimated_online,
        'new_lines_count': min(estimated_new, max(0, len(snapshot_lines) - 1)),
        'snapshot_time': now
    }

    snapshot_cache[cache_key] = {
        'created': now,
        'data': result
    }

    return jsonify(result)


@app.route('/api/lines/<line_id>/like', methods=['PUT'])
def like_line(line_id):
    ip = get_client_ip()
    db = get_db()
    cursor = db.cursor()

    cursor.execute('SELECT id, likes FROM lines WHERE id = ?', (line_id,))
    line_row = cursor.fetchone()

    if not line_row:
        return jsonify({'error': '线条不存在'}), 404

    cursor.execute('SELECT 1 FROM likes WHERE line_id = ? AND ip = ?', (line_id, ip))
    liked_before = cursor.fetchone() is not None

    if liked_before:
        cursor.execute('DELETE FROM likes WHERE line_id = ? AND ip = ?', (line_id, ip))
        cursor.execute('UPDATE lines SET likes = likes - 1 WHERE id = ?', (line_id,))
        liked = False
    else:
        cursor.execute(
            'INSERT INTO likes (line_id, ip, created_at) VALUES (?, ?, ?)',
            (line_id, ip, time.time())
        )
        cursor.execute('UPDATE lines SET likes = likes + 1 WHERE id = ?', (line_id,))
        liked = True

    db.commit()

    cursor.execute('SELECT likes FROM lines WHERE id = ?', (line_id,))
    new_likes = cursor.fetchone()[0]

    if line_id in lines_by_id:
        lines_by_id[line_id]['likes'] = new_likes

    return jsonify({
        'success': True,
        'liked': liked,
        'likes': new_likes
    })


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    limit = min(int(request.args.get('limit', 20)), 50)
    db = get_db()
    cursor = db.cursor()

    cursor.execute(
        'SELECT id, author, color, timestamp, likes FROM lines ORDER BY likes DESC LIMIT ?',
        (limit,)
    )
    rows = cursor.fetchall()

    leaderboard = []
    for idx, row in enumerate(rows):
        leaderboard.append({
            'rank': idx + 1,
            'id': row['id'],
            'author': row['author'],
            'likes': row['likes'],
            'color': row['color'],
            'timestamp': row['timestamp']
        })

    cursor.execute('SELECT COALESCE(SUM(likes), 0) FROM lines')
    total_likes = cursor.fetchone()[0]

    cursor.execute('SELECT COUNT(*) FROM lines')
    total_lines = cursor.fetchone()[0]

    return jsonify({
        'leaderboard': leaderboard,
        'total_likes': total_likes,
        'total_lines': total_lines
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    db = get_db()
    cursor = db.cursor()
    cursor.execute('SELECT COUNT(*) FROM lines')
    count = cursor.fetchone()[0]
    cursor.execute('SELECT MIN(timestamp) FROM lines')
    first_time = cursor.fetchone()[0]
    return jsonify({
        'status': 'ok',
        'lines_count': count,
        'first_line_time': first_time,
        'server_time': time.time(),
        'db_path': DB_PATH
    })


if __name__ == '__main__':
    print("=" * 50)
    print("  创意众包画布后端服务启动中...")
    print(f"  数据库路径: {DB_PATH}")
    count, first_time = init_db()
    print(f"  线条总数: {count}")
    if first_time:
        print(f"  最早线条时间: {datetime.fromtimestamp(first_time).strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"  API服务地址: http://localhost:5000")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
