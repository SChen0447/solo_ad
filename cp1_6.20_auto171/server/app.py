from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import uuid

app = Flask(__name__)
CORS(app)

units_data = {
    "infantry": {
        "name": "步兵",
        "type": "infantry",
        "attack": 2,
        "defense": 2,
        "movement": 3,
        "health": 10,
        "range": 1,
        "color": "#c0392b"
    },
    "archer": {
        "name": "弓箭手",
        "type": "archer",
        "attack": 3,
        "defense": 1,
        "movement": 2,
        "health": 8,
        "range": 3,
        "color": "#2980b9"
    },
    "knight": {
        "name": "骑士",
        "type": "knight",
        "attack": 4,
        "defense": 1,
        "movement": 4,
        "health": 12,
        "range": 1,
        "color": "#f39c12"
    }
}

game_records = {}


@app.route('/api/units', methods=['GET'])
def get_units():
    return jsonify({"success": True, "data": units_data})


@app.route('/api/units/<unit_type>', methods=['GET'])
def get_unit(unit_type):
    if unit_type in units_data:
        return jsonify({"success": True, "data": units_data[unit_type]})
    return jsonify({"success": False, "message": "Unit not found"}), 404


@app.route('/api/games', methods=['POST'])
def save_game():
    data = request.get_json()
    game_id = str(uuid.uuid4())
    record = {
        "id": game_id,
        "winner": data.get("winner"),
        "turns": data.get("turns", 0),
        "player_units_remaining": data.get("player_units_remaining", 0),
        "ai_units_remaining": data.get("ai_units_remaining", 0),
        "timestamp": datetime.now().isoformat(),
        "duration": data.get("duration", 0)
    }
    game_records[game_id] = record
    return jsonify({"success": True, "data": record})


@app.route('/api/games', methods=['GET'])
def get_games():
    records = sorted(game_records.values(), key=lambda x: x["timestamp"], reverse=True)
    return jsonify({"success": True, "data": records})


@app.route('/api/games/<game_id>', methods=['GET'])
def get_game(game_id):
    if game_id in game_records:
        return jsonify({"success": True, "data": game_records[game_id]})
    return jsonify({"success": False, "message": "Game not found"}), 404


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"success": True, "message": "Server is running"})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=False)
