"""
迷宫逃脱游戏后端服务
提供：
  1. /maze/seed  - 基于种子的随机迷宫生成API
  2. /scores     - 得分存储与排行榜API
  3. Socket.IO   - 实时多人同步与排行榜推送

数据流向：
  前端 MazeService  → GET /maze/seed → 生成迷宫JSON → GameScene渲染
  前端 ScoreManager → POST /scores   → 存储得分 → Socket.IO推送排行榜
  多人游戏同步     ↔ Socket.IO事件  ↔ 各客户端实时同步
"""

import os
import json
import time
import random
import hashlib
from typing import List, Tuple, Dict, Any
from dataclasses import dataclass, asdict
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

try:
    import eventlet
    eventlet.monkey_patch()
    ASYNC_MODE = 'eventlet'
except ImportError:
    ASYNC_MODE = 'threading'

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SCORES_FILE = os.path.join(BASE_DIR, 'scores.json')

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode=ASYNC_MODE,
    ping_timeout=10000,
    ping_interval=5000,
)

MAZE_SIZE = 10
MIN_COINS = 8

active_rooms: Dict[str, Dict[str, Any]] = {}


def load_scores() -> List[Dict[str, Any]]:
    if not os.path.exists(SCORES_FILE):
        return []
    try:
        with open(SCORES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return []


def save_scores(scores: List[Dict[str, Any]]) -> None:
    with open(SCORES_FILE, 'w', encoding='utf-8') as f:
        json.dump(scores, f, ensure_ascii=False, indent=2)


def seeded_random(seed: int) -> random.Random:
    return random.Random(seed)


def generate_maze(size: int, seed: int) -> Tuple[List[List[int]], List[Tuple[int, int]], Tuple[int, int]]:
    """
    使用 DFS 回溯算法生成连通迷宫
    返回：(maze二维数组, 金币坐标列表, 出口坐标)
      maze: 0=走廊, 1=墙壁
    """
    rng = seeded_random(seed)

    maze = [[1] * size for _ in range(size)]

    def carve(x: int, y: int) -> None:
        maze[y][x] = 0
        directions = [(2, 0), (-2, 0), (0, 2), (0, -2)]
        rng.shuffle(directions)
        for dx, dy in directions:
            nx, ny = x + dx, y + dy
            if 0 <= nx < size and 0 <= ny < size and maze[ny][nx] == 1:
                maze[y + dy // 2][x + dx // 2] = 0
                carve(nx, ny)

    start_x, start_y = 0, 0
    carve(start_x, start_y)

    maze[0][0] = 0
    maze[size - 1][size - 1] = 0

    if size >= 2 and maze[0][1] == 1 and maze[1][0] == 0:
        maze[0][1] = 0
    if size >= 2 and maze[1][0] == 1 and maze[0][1] == 0:
        maze[1][0] = 0

    corridor_cells = []
    for y in range(size):
        for x in range(size):
            if maze[y][x] == 0 and not (x == 0 and y == 0) and not (x == size - 1 and y == size - 1):
                corridor_cells.append((x, y))

    rng.shuffle(corridor_cells)
    coins: List[Tuple[int, int]] = []
    for cell in corridor_cells:
        if len(coins) >= MIN_COINS + rng.randint(0, 3):
            break
        coins.append(cell)

    while len(coins) < MIN_COINS and corridor_cells:
        cell = corridor_cells.pop(0)
        if cell not in coins:
            coins.append(cell)

    exit_pos = (size - 1, size - 1)
    return maze, coins, exit_pos


@app.route('/maze/seed', methods=['GET'])
def get_maze():
    """
    GET /maze/seed?seed=<int>&size=<int>
    返回迷宫数据（墙壁、金币、出口、AI出生点）
    """
    try:
        seed = int(request.args.get('seed', int(time.time() * 1000)))
        size = int(request.args.get('size', MAZE_SIZE))
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid parameters'}), 400

    size = max(5, min(size, 30))

    start = time.time()
    maze, coins, exit_pos = generate_maze(size, seed)
    elapsed = time.time() - start

    rng = seeded_random(seed + 9999)

    ai_spawns = []
    corridor_cells = [
        (x, y)
        for y in range(size)
        for x in range(size)
        if maze[y][x] == 0
        and not (x < 3 and y < 3)
        and not (x == size - 1 and y == size - 1)
    ]
    rng.shuffle(corridor_cells)
    for cell in corridor_cells[:3]:
        ai_spawns.append({'x': cell[0], 'y': cell[1]})

    response = {
        'seed': seed,
        'size': size,
        'maze': maze,
        'start': {'x': 0, 'y': 0},
        'exit': {'x': exit_pos[0], 'y': exit_pos[1]},
        'coins': [{'x': c[0], 'y': c[1]} for c in coins],
        'ai_spawns': ai_spawns,
        'generated_ms': round(elapsed * 1000, 2)
    }
    return jsonify(response)


@app.route('/scores', methods=['GET'])
def get_scores():
    """
    GET /scores?limit=10
    返回前N名排行榜
    """
    try:
        limit = int(request.args.get('limit', 10))
    except (TypeError, ValueError):
        limit = 10

    scores = load_scores()
    sorted_scores = sorted(
        scores,
        key=lambda s: (s.get('time_ms', float('inf')), -s.get('coins', 0))
    )
    return jsonify(sorted_scores[:limit])


@app.route('/scores', methods=['POST'])
def post_score():
    """
    POST /scores
    Body: { name, time_ms, coins, seed, finished: bool }
    存储得分并返回排名
    """
    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify({'error': 'Invalid JSON body'}), 400

    name = (data.get('name', '') or '匿名玩家').strip()[:16] or '匿名玩家'
    time_ms = max(0, int(data.get('time_ms', 0)))
    coins = max(0, int(data.get('coins', 0)))
    seed = int(data.get('seed', 0))
    finished = bool(data.get('finished', False))

    entry = {
        'name': name,
        'time_ms': time_ms,
        'coins': coins,
        'seed': seed,
        'finished': finished,
        'timestamp': int(time.time() * 1000)
    }

    scores = load_scores()
    scores.append(entry)
    save_scores(scores)

    sorted_scores = sorted(
        scores,
        key=lambda s: (s.get('time_ms', float('inf')), -s.get('coins', 0))
    )
    rank = next((i + 1 for i, s in enumerate(sorted_scores) if s is entry), len(sorted_scores))

    top10 = sorted_scores[:10]
    socketio.emit('leaderboard_update', top10)

    return jsonify({
        'rank': rank,
        'total_players': len(sorted_scores),
        'entry': entry,
        'top10': top10
    })


@socketio.on('connect')
def on_connect():
    print(f'[WS] Client connected: {request.sid}')


@socketio.on('disconnect')
def on_disconnect():
    print(f'[WS] Client disconnected: {request.sid}')
    for room_id, room in list(active_rooms.items()):
        players = room.get('players', {})
        if request.sid in players:
            del players[request.sid]
            leave_room(room_id)
            emit('room_update', {
                'room': room_id,
                'players': list(players.values()),
                'count': len(players)
            }, room=room_id)
            if not players:
                del active_rooms[room_id]
            break


@socketio.on('join_room')
def on_join_room(data):
    room_id = str(data.get('room', 'default'))
    player_name = str(data.get('name', '匿名'))[:12]
    player_color = str(data.get('color', '#8a2be2'))

    join_room(room_id)
    if room_id not in active_rooms:
        active_rooms[room_id] = {
            'players': {},
            'seed': int(data.get('seed', int(time.time() * 1000))),
            'started': False,
            'start_time': None
        }

    room = active_rooms[room_id]
    room['players'][request.sid] = {
        'id': request.sid,
        'name': player_name,
        'color': player_color,
        'x': 0,
        'y': 0,
        'coins': 0,
        'finished': False,
        'time_ms': 0,
        'joined_at': int(time.time() * 1000)
    }

    emit('room_update', {
        'room': room_id,
        'players': list(room['players'].values()),
        'count': len(room['players']),
        'seed': room['seed']
    }, room=room_id)


@socketio.on('player_move')
def on_player_move(data):
    room_id = str(data.get('room', 'default'))
    room = active_rooms.get(room_id)
    if not room or request.sid not in room['players']:
        return

    player = room['players'][request.sid]
    player['x'] = int(data.get('x', player.get('x', 0)))
    player['y'] = int(data.get('y', player.get('y', 0)))
    player['coins'] = int(data.get('coins', player.get('coins', 0)))

    emit('player_positions', {
        'players': [
            {'id': p['id'], 'name': p['name'], 'color': p['color'], 'x': p['x'], 'y': p['y'], 'coins': p['coins']}
            for p in room['players'].values()
        ]
    }, room=room_id, include_self=False)


@socketio.on('player_finish')
def on_player_finish(data):
    room_id = str(data.get('room', 'default'))
    room = active_rooms.get(room_id)
    if not room or request.sid not in room['players']:
        return

    player = room['players'][request.sid]
    player['finished'] = True
    player['time_ms'] = max(0, int(data.get('time_ms', 0)))

    finished_players = sorted(
        [p for p in room['players'].values() if p.get('finished')],
        key=lambda p: p['time_ms']
    )
    rank = next((i + 1 for i, p in enumerate(finished_players) if p['id'] == request.sid), len(finished_players))

    emit('race_finish', {
        'id': request.sid,
        'name': player['name'],
        'rank': rank,
        'time_ms': player['time_ms'],
        'coins': player['coins']
    }, room=room_id)


if __name__ == '__main__':
    print(f'[Maze Escape Server] Starting on http://localhost:5000 (async_mode={ASYNC_MODE})')
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
