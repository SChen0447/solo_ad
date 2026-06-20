import json
import os
import time
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'leaderboard.json')


def load_leaderboard():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_leaderboard(data):
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except IOError:
        return False


@app.route('/api/seed', methods=['GET'])
def get_seed():
    level = request.args.get('level', default=1, type=int)
    seed = int(time.time() * 1000) + random.randint(0, 100000) + level * 7
    return jsonify({
        'seed': seed,
        'level': level,
        'grid_size': 8 + min(level - 1, 4)
    })


@app.route('/api/score', methods=['POST'])
def submit_score():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({'error': 'Invalid request body'}), 400

    nickname = str(data.get('nickname', '')).strip()
    total_score = data.get('total_score')
    completion_time = data.get('completion_time')
    levels_cleared = data.get('levels_cleared', 0)

    if not nickname or len(nickname) > 10:
        return jsonify({'error': 'Nickname must be 1-10 characters'}), 400

    nickname = ''.join(c for c in nickname if c.isalnum() or c in '_- ')
    if not nickname:
        return jsonify({'error': 'Invalid nickname'}), 400

    try:
        total_score = int(total_score)
        completion_time = float(completion_time)
        levels_cleared = int(levels_cleared)
    except (TypeError, ValueError):
        return jsonify({'error': 'Invalid score data'}), 400

    leaderboard = load_leaderboard()
    entry = {
        'id': int(time.time() * 1000) + random.randint(0, 9999),
        'nickname': nickname,
        'total_score': total_score,
        'completion_time': completion_time,
        'levels_cleared': levels_cleared,
        'submitted_at': int(time.time())
    }
    leaderboard.append(entry)
    leaderboard.sort(key=lambda x: x['total_score'], reverse=True)
    save_leaderboard(leaderboard)

    rank = next((i + 1 for i, e in enumerate(leaderboard) if e['id'] == entry['id']), len(leaderboard))

    return jsonify({
        'success': True,
        'entry': entry,
        'rank': rank
    })


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    limit = request.args.get('limit', default=10, type=int)
    limit = min(max(limit, 1), 100)

    leaderboard = load_leaderboard()
    leaderboard.sort(key=lambda x: x['total_score'], reverse=True)
    top = leaderboard[:limit]

    return jsonify({
        'total': len(leaderboard),
        'entries': top
    })


@app.route('/api/score/<int:entry_id>', methods=['DELETE'])
def delete_score(entry_id):
    leaderboard = load_leaderboard()
    original_len = len(leaderboard)
    leaderboard = [e for e in leaderboard if e.get('id') != entry_id]

    if len(leaderboard) == original_len:
        return jsonify({'error': 'Entry not found'}), 404

    save_leaderboard(leaderboard)
    return jsonify({'success': True})


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': int(time.time())})


if __name__ == '__main__':
    print('Maze Escape Backend starting on port 5000...')
    app.run(host='0.0.0.0', port=5000, debug=False)
