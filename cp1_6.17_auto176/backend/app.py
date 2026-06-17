from flask import Flask, request, jsonify
from flask_cors import CORS
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from utils.map_generator import generate_map
from engine.battle_simulator import run_simulation

app = Flask(__name__)
CORS(app)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Battlefield Fog API is running'})


@app.route('/api/map/generate', methods=['POST'])
def generate_map_endpoint():
    data = request.get_json()
    width = data.get('width', 20)
    height = data.get('height', 15)
    terrain_density = data.get('terrainDensity', 50)
    seed = data.get('seed')

    terrain = generate_map(width, height, terrain_density, seed)

    return jsonify({
        'success': True,
        'terrain': terrain,
        'width': width,
        'height': height,
    })


@app.route('/api/simulate', methods=['POST'])
def simulate_endpoint():
    data = request.get_json()
    units = data.get('units', [])
    terrain = data.get('terrain', [])
    move_paths = data.get('movePaths', [])
    max_turns = data.get('maxTurns', 50)

    if not units or not terrain:
        return jsonify({
            'success': False,
            'error': 'Units and terrain data are required',
        }), 400

    result = run_simulation(units, terrain, move_paths, max_turns)

    return jsonify({
        'success': True,
        'result': result,
    })


@app.route('/api/turn/<int:turn_number>', methods=['POST'])
def get_turn_state(turn_number):
    data = request.get_json()
    units = data.get('units', [])
    terrain = data.get('terrain', [])
    move_paths = data.get('movePaths', [])
    max_turns = data.get('maxTurns', 50)

    result = run_simulation(units, terrain, move_paths, max_turns)

    if turn_number < 0 or turn_number >= len(result['turns']):
        return jsonify({
            'success': False,
            'error': f'Invalid turn number: {turn_number}',
        }), 400

    return jsonify({
        'success': True,
        'turnState': result['turns'][turn_number],
        'totalTurns': result['totalTurns'],
        'winner': result['winner'],
    })


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
