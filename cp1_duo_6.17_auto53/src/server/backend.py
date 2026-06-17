import json
import os
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
RECORDS_FILE = os.path.join(DATA_DIR, 'records.json')

os.makedirs(DATA_DIR, exist_ok=True)

if not os.path.exists(RECORDS_FILE):
    with open(RECORDS_FILE, 'w', encoding='utf-8') as f:
        json.dump([], f)

ISLAND_POSITIONS = [
    {"id": 0, "x": 0, "y": 80, "z": 0, "size": 120, "texture": "grass", "isFinish": False},
    {"id": 1, "x": 250, "y": 100, "z": -120, "size": 90, "texture": "rock", "isFinish": False},
    {"id": 2, "x": 480, "y": 70, "z": 80, "size": 110, "texture": "desert", "isFinish": False},
    {"id": 3, "x": 620, "y": 120, "z": -180, "size": 85, "texture": "grass", "isFinish": False},
    {"id": 4, "x": 800, "y": 90, "z": 50, "size": 95, "texture": "rock", "isFinish": False},
    {"id": 5, "x": 950, "y": 110, "z": -220, "size": 100, "texture": "grass", "isFinish": False},
    {"id": 6, "x": 1120, "y": 75, "z": 100, "size": 88, "texture": "desert", "isFinish": False},
    {"id": 7, "x": 1280, "y": 95, "z": -150, "size": 92, "texture": "rock", "isFinish": False},
    {"id": 8, "x": 1450, "y": 85, "z": 30, "size": 105, "texture": "grass", "isFinish": False},
    {"id": 9, "x": 1620, "y": 110, "z": -100, "size": 130, "texture": "grass", "isFinish": True}
]

RING_COUNT_PER_ISLAND = [4, 3, 4, 3, 5, 3, 4, 3, 4, 0]


@app.route('/api/tracks', methods=['GET'])
def get_tracks():
    track_data = {
        "islands": ISLAND_POSITIONS,
        "ringCounts": RING_COUNT_PER_ISLAND,
        "startPosition": {"x": 0, "y": 120, "z": 0}
    }
    return jsonify(track_data)


@app.route('/api/records', methods=['POST'])
def submit_record():
    data = request.get_json()
    if not data or 'time' not in data:
        return jsonify({"error": "Invalid request, 'time' field is required"}), 400

    try:
        time_ms = float(data['time'])
    except (ValueError, TypeError):
        return jsonify({"error": "'time' must be a number"}), 400

    record = {
        "time": time_ms,
        "date": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "timestamp": int(time.time() * 1000)
    }

    try:
        with open(RECORDS_FILE, 'r', encoding='utf-8') as f:
            records = json.load(f)
    except (json.JSONDecodeError, IOError):
        records = []

    records.append(record)
    records.sort(key=lambda r: r['time'])
    records = records[:100]

    with open(RECORDS_FILE, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    rank = next(i + 1 for i, r in enumerate(records) if r['timestamp'] == record['timestamp'])

    return jsonify({
        "success": True,
        "record": record,
        "rank": rank,
        "totalRecords": len(records)
    })


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    try:
        with open(RECORDS_FILE, 'r', encoding='utf-8') as f:
            records = json.load(f)
    except (json.JSONDecodeError, IOError):
        records = []

    top_records = records[:3]
    return jsonify({
        "leaderboard": top_records,
        "totalRecords": len(records)
    })


if __name__ == '__main__':
    print("🚀 Cloud Island Racing Backend Server")
    print("📡 Endpoints:")
    print("   GET  /api/tracks       - 获取赛道配置")
    print("   POST /api/records      - 提交完赛记录")
    print("   GET  /api/leaderboard  - 获取排行榜")
    print()
    app.run(host='0.0.0.0', port=5000, debug=False)
