import os
import json
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

CONFIG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'configs')
os.makedirs(CONFIG_DIR, exist_ok=True)


@app.route('/api/save', methods=['POST'])
def save_config():
    try:
        data = request.get_json()
        if not data or 'bodies' not in data:
            return jsonify({'error': 'Invalid data format'}), 400

        config_id = uuid.uuid4().hex[:8]
        file_path = os.path.join(CONFIG_DIR, f'{config_id}.json')

        with open(file_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return jsonify({'id': config_id}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/load/<config_id>', methods=['GET'])
def load_config(config_id):
    try:
        file_path = os.path.join(CONFIG_DIR, f'{config_id}.json')

        if not os.path.exists(file_path):
            return jsonify({'error': 'Config not found'}), 404

        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        return jsonify(data), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
