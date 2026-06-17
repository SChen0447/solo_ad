import os
import sqlite3
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'scores.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS scores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nickname TEXT NOT NULL,
            score INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()


init_db()


@app.route('/api/scores', methods=['POST'])
def submit_score():
    data = request.get_json()
    if not data or 'nickname' not in data or 'score' not in data:
        return jsonify({'error': 'nickname and score are required'}), 400

    nickname = str(data['nickname']).strip()[:16]
    score = int(data['score'])

    if not nickname:
        return jsonify({'error': 'nickname cannot be empty'}), 400

    conn = get_db()
    cursor = conn.execute(
        'INSERT INTO scores (nickname, score) VALUES (?, ?)',
        (nickname, score)
    )
    conn.commit()
    entry_id = cursor.lastrowid
    conn.close()

    return jsonify({
        'id': entry_id,
        'nickname': nickname,
        'score': score,
    }), 201


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    conn = get_db()
    rows = conn.execute(
        'SELECT id, nickname, score, created_at FROM scores ORDER BY score DESC LIMIT 10'
    ).fetchall()
    conn.close()

    leaderboard = []
    for i, row in enumerate(rows):
        entry = {
            'id': row['id'],
            'nickname': row['nickname'],
            'score': row['score'],
            'created_at': row['created_at'],
            'rank': i + 1,
            'rankChange': '',
        }
        leaderboard.append(entry)

    return jsonify(leaderboard), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
