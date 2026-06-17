import os
import json
import random
import string
import sqlite3
import time
from datetime import datetime
from flask import Flask, request, jsonify, g
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'brainstorm.db')

app = Flask(__name__)
app.config['SECRET_KEY'] = 'brainstorm-secret-key'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

rooms_cache = {}
user_rooms = {}


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
    c.execute('''CREATE TABLE IF NOT EXISTS rooms (
        code TEXT PRIMARY KEY,
        host_id TEXT,
        created_at REAL,
        countdown_duration INTEGER DEFAULT 0,
        countdown_started_at REAL,
        voting_locked INTEGER DEFAULT 0,
        final_result TEXT
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS nodes (
        id TEXT PRIMARY KEY,
        room_code TEXT,
        parent_id TEXT,
        title TEXT,
        description TEXT,
        tags TEXT,
        x REAL,
        y REAL,
        color TEXT,
        votes INTEGER DEFAULT 0,
        created_at REAL,
        FOREIGN KEY (room_code) REFERENCES rooms(code)
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS votes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        room_code TEXT,
        node_id TEXT,
        user_id TEXT,
        value INTEGER,
        created_at REAL,
        UNIQUE(room_code, node_id, user_id)
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        room_code TEXT,
        node_id TEXT,
        user_id TEXT,
        user_name TEXT,
        content TEXT,
        created_at REAL
    )''')
    conn.commit()
    conn.close()


init_db()


def generate_room_code():
    while True:
        code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        conn = sqlite3.connect(DB_PATH)
        c = conn.cursor()
        c.execute("SELECT code FROM rooms WHERE code = ?", (code,))
        exists = c.fetchone()
        conn.close()
        if not exists:
            return code


def load_room(room_code):
    if room_code in rooms_cache:
        return rooms_cache[room_code]
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM rooms WHERE code = ?", (room_code,))
    room = c.fetchone()
    if not room:
        conn.close()
        return None
    c.execute("SELECT * FROM nodes WHERE room_code = ?", (room_code,))
    nodes = [dict(row) for row in c.fetchall()]
    for n in nodes:
        n['tags'] = json.loads(n['tags']) if n['tags'] else []
    c.execute("SELECT * FROM votes WHERE room_code = ?", (room_code,))
    votes = {}
    for row in c.fetchall():
        if row['node_id'] not in votes:
            votes[row['node_id']] = {}
        votes[row['node_id']][row['user_id']] = row['value']
    c.execute("SELECT * FROM comments WHERE room_code = ?", (room_code,))
    comments = {}
    for row in c.fetchall():
        if row['node_id'] not in comments:
            comments[row['node_id']] = []
        comments[row['node_id']].append(dict(row))
    conn.close()
    data = {
        'code': room['code'],
        'host_id': room['host_id'],
        'created_at': room['created_at'],
        'countdown_duration': room['countdown_duration'],
        'countdown_started_at': room['countdown_started_at'],
        'voting_locked': bool(room['voting_locked']),
        'final_result': json.loads(room['final_result']) if room['final_result'] else None,
        'nodes': {n['id']: n for n in nodes},
        'votes': votes,
        'comments': comments,
        'users': {}
    }
    rooms_cache[room_code] = data
    return data


def save_room_db(room_data):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''UPDATE rooms SET countdown_duration=?, countdown_started_at=?, 
                 voting_locked=?, final_result=? WHERE code=?''',
              (room_data['countdown_duration'], room_data['countdown_started_at'],
               1 if room_data['voting_locked'] else 0,
               json.dumps(room_data['final_result']) if room_data['final_result'] else None,
               room_data['code']))
    conn.commit()
    conn.close()


def save_node_db(node, room_code):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''INSERT OR REPLACE INTO nodes (id, room_code, parent_id, title, description, 
                 tags, x, y, color, votes, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
              (node['id'], room_code, node.get('parent_id'), node.get('title', ''),
               node.get('description', ''), json.dumps(node.get('tags', [])),
               node.get('x', 0), node.get('y', 0), node.get('color', ''),
               node.get('votes', 0), node.get('created_at', time.time())))
    conn.commit()
    conn.close()


@app.route('/api/room/create', methods=['POST'])
def api_create_room():
    data = request.json or {}
    user_id = data.get('user_id') or ''.join(random.choices(string.ascii_lowercase + string.digits, k=12))
    user_name = data.get('user_name') or '用户' + user_id[:4]
    code = generate_room_code()
    now = time.time()
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''INSERT INTO rooms (code, host_id, created_at, countdown_duration, 
                 countdown_started_at, voting_locked) VALUES (?,?,?,?,0,0)''',
              (code, user_id, now, 0))
    root_id = 'root_' + code
    root_node = {
        'id': root_id,
        'parent_id': None,
        'title': '主题',
        'description': '',
        'tags': [],
        'x': 400,
        'y': 300,
        'color': '#0f3460',
        'votes': 0,
        'created_at': now
    }
    c.execute('''INSERT INTO nodes (id, room_code, parent_id, title, description, tags, x, y, color, votes, created_at)
                 VALUES (?,?,?,?,?,?,?,?,?,?,?)''',
              (root_id, code, None, '主题', '', json.dumps([]), 400, 300, '#0f3460', 0, now))
    conn.commit()
    conn.close()
    room_data = {
        'code': code,
        'host_id': user_id,
        'created_at': now,
        'countdown_duration': 0,
        'countdown_started_at': None,
        'voting_locked': False,
        'final_result': None,
        'nodes': {root_id: root_node},
        'votes': {},
        'comments': {},
        'users': {user_id: {'id': user_id, 'name': user_name, 'is_host': True}}
    }
    rooms_cache[code] = room_data
    return jsonify({'room_code': code, 'user_id': user_id, 'is_host': True})


@app.route('/api/room/<code>', methods=['GET'])
def api_get_room(code):
    room = load_room(code)
    if not room:
        return jsonify({'error': '房间不存在'}), 404
    return jsonify({
        'code': room['code'],
        'host_id': room['host_id'],
        'countdown_duration': room['countdown_duration'],
        'countdown_started_at': room['countdown_started_at'],
        'voting_locked': room['voting_locked'],
        'final_result': room['final_result']
    })


@socketio.on('join_room')
def on_join_room(data):
    room_code = data.get('room_code')
    user_id = data.get('user_id')
    user_name = data.get('user_name') or '用户' + (user_id or '')[:4]
    if not room_code or not user_id:
        return
    room = load_room(room_code)
    if not room:
        emit('error', {'message': '房间不存在'})
        return
    join_room(room_code)
    user_rooms[request.sid] = room_code
    is_host = (user_id == room['host_id'])
    room['users'][user_id] = {'id': user_id, 'name': user_name, 'is_host': is_host}
    emit('room_state', {
        'code': room['code'],
        'host_id': room['host_id'],
        'countdown_duration': room['countdown_duration'],
        'countdown_started_at': room['countdown_started_at'],
        'voting_locked': room['voting_locked'],
        'final_result': room['final_result'],
        'nodes': room['nodes'],
        'votes': room['votes'],
        'comments': room['comments'],
        'users': room['users'],
        'user_id': user_id,
        'is_host': is_host
    }, room=request.sid)
    socketio.emit('user_joined', {
        'user_id': user_id,
        'user_name': user_name,
        'users': room['users']
    }, room=room_code)


@socketio.on('disconnect')
def on_disconnect():
    room_code = user_rooms.pop(request.sid, None)
    if room_code and room_code in rooms_cache:
        pass


@socketio.on('create_node')
def on_create_node(data):
    room_code = data.get('room_code')
    room = load_room(room_code)
    if not room or room['voting_locked']:
        return
    node = data.get('node')
    if not node or not node.get('id'):
        return
    node['created_at'] = time.time()
    node['votes'] = 0
    room['nodes'][node['id']] = node
    save_node_db(node, room_code)
    socketio.emit('node_created', {'node': node}, room=room_code)


@socketio.on('update_node')
def on_update_node(data):
    room_code = data.get('room_code')
    room = load_room(room_code)
    if not room:
        return
    node_id = data.get('node_id')
    updates = data.get('updates', {})
    if node_id not in room['nodes']:
        return
    room['nodes'][node_id].update(updates)
    save_node_db(room['nodes'][node_id], room_code)
    socketio.emit('node_updated', {'node_id': node_id, 'updates': updates}, room=room_code)


@socketio.on('vote')
def on_vote(data):
    room_code = data.get('room_code')
    room = load_room(room_code)
    if not room or room['voting_locked']:
        return
    node_id = data.get('node_id')
    user_id = data.get('user_id')
    value = data.get('value', 0)
    if node_id not in room['nodes']:
        return
    if node_id not in room['votes']:
        room['votes'][node_id] = {}
    prev = room['votes'][node_id].get(user_id, 0)
    if prev == value:
        room['votes'][node_id].pop(user_id, None)
        value = 0
    else:
        room['votes'][node_id][user_id] = value
    total = sum(room['votes'][node_id].values()) if node_id in room['votes'] else 0
    room['nodes'][node_id]['votes'] = total
    save_node_db(room['nodes'][node_id], room_code)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    if value == 0:
        c.execute("DELETE FROM votes WHERE room_code=? AND node_id=? AND user_id=?",
                  (room_code, node_id, user_id))
    else:
        c.execute('''INSERT OR REPLACE INTO votes (room_code, node_id, user_id, value, created_at)
                     VALUES (?,?,?,?,?)''', (room_code, node_id, user_id, value, time.time()))
    conn.commit()
    conn.close()
    socketio.emit('vote_updated', {
        'node_id': node_id,
        'total': total,
        'user_vote': value,
        'user_id': user_id
    }, room=room_code)


@socketio.on('add_comment')
def on_add_comment(data):
    room_code = data.get('room_code')
    room = load_room(room_code)
    if not room:
        return
    node_id = data.get('node_id')
    comment = data.get('comment')
    if not comment or not comment.get('id'):
        return
    comment['created_at'] = time.time()
    if node_id not in room['comments']:
        room['comments'][node_id] = []
    room['comments'][node_id].append(comment)
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''INSERT INTO comments (id, room_code, node_id, user_id, user_name, content, created_at)
                 VALUES (?,?,?,?,?,?,?)''',
              (comment['id'], room_code, node_id, comment['user_id'],
               comment.get('user_name', ''), comment.get('content', ''), comment['created_at']))
    conn.commit()
    conn.close()
    socketio.emit('comment_added', {'node_id': node_id, 'comment': comment}, room=room_code)


@socketio.on('set_countdown')
def on_set_countdown(data):
    room_code = data.get('room_code')
    room = load_room(room_code)
    if not room:
        return
    user_id = data.get('user_id')
    if user_id != room['host_id']:
        return
    minutes = data.get('minutes', 0)
    room['countdown_duration'] = minutes
    if minutes > 0:
        room['countdown_started_at'] = time.time()
    else:
        room['countdown_started_at'] = None
    room['voting_locked'] = False
    room['final_result'] = None
    save_room_db(room)
    socketio.emit('countdown_set', {
        'minutes': minutes,
        'started_at': room['countdown_started_at'],
        'voting_locked': False
    }, room=room_code)
    if minutes > 0:
        def lock_votes():
            r = load_room(room_code)
            if r and not r['voting_locked']:
                r['voting_locked'] = True
                sorted_nodes = sorted(r['nodes'].values(), key=lambda n: n.get('votes', 0), reverse=True)
                top3 = sorted_nodes[:3]
                r['final_result'] = [{'id': n['id'], 'title': n.get('title', ''), 'votes': n.get('votes', 0)} for n in top3]
                save_room_db(r)
                socketio.emit('voting_locked', {'final_result': r['final_result']}, room=room_code)
        socketio.start_background_task(lambda: (socketio.sleep(minutes * 60), lock_votes()))


@socketio.on('save_conclusion')
def on_save_conclusion(data):
    room_code = data.get('room_code')
    room = load_room(room_code)
    if not room:
        return
    user_id = data.get('user_id')
    if user_id != room['host_id']:
        return
    node_id = data.get('node_id')
    conclusion = data.get('conclusion', '')
    if node_id and node_id in room['nodes']:
        room['nodes'][node_id]['description'] = conclusion
        save_node_db(room['nodes'][node_id], room_code)
        socketio.emit('node_updated', {'node_id': node_id, 'updates': {'description': conclusion}}, room=room_code)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
