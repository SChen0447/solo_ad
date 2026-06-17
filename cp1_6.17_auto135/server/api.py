import json
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LEVELS_FILE = os.path.join(BASE_DIR, 'levels.json')
SAVE_FILE = os.path.join(BASE_DIR, 'save.json')


def load_levels():
    with open(LEVELS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def load_save():
    if os.path.exists(SAVE_FILE):
        with open(SAVE_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {'currentLevel': 1, 'lives': 5, 'unlockedLevels': [1]}


def write_save(data):
    with open(SAVE_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.route('/api/levels', methods=['GET'])
def get_levels():
    levels = load_levels()
    save = load_save()
    result = []
    for lvl in levels:
        result.append({
            'id': lvl['id'],
            'name': lvl['name'],
            'unlocked': lvl['id'] in save.get('unlockedLevels', [1])
        })
    return jsonify(result)


@app.route('/api/level/<int:level_id>', methods=['GET'])
def get_level(level_id):
    levels = load_levels()
    for lvl in levels:
        if lvl['id'] == level_id:
            return jsonify(lvl)
    return jsonify({'error': 'Level not found'}), 404


@app.route('/api/save', methods=['POST'])
def save_progress():
    data = request.get_json()
    save = load_save()

    if 'currentLevel' in data:
        save['currentLevel'] = data['currentLevel']

    if 'lives' in data:
        save['lives'] = data['lives']

    if 'completedLevel' in data:
        completed = data['completedLevel']
        unlocked = save.get('unlockedLevels', [1])
        if completed not in unlocked:
            unlocked.append(completed)
        next_level = completed + 1
        if next_level not in unlocked:
            levels = load_levels()
            if any(lvl['id'] == next_level for lvl in levels):
                unlocked.append(next_level)
        save['unlockedLevels'] = unlocked

    write_save(save)
    return jsonify({'success': True, 'save': save})


@app.route('/api/save', methods=['GET'])
def get_save():
    return jsonify(load_save())


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
