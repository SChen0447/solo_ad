from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime

app = Flask(__name__, static_folder='../dist', static_url_path='')
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
SCENES_FILE = os.path.join(DATA_DIR, 'scenes.json')
ROOMS_FILE = os.path.join(DATA_DIR, 'rooms.json')


def load_rooms():
    with open(ROOMS_FILE, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return data['rooms']


def load_scenes():
    if not os.path.exists(SCENES_FILE):
        return []
    with open(SCENES_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_scenes(scenes):
    with open(SCENES_FILE, 'w', encoding='utf-8') as f:
        json.dump(scenes, f, ensure_ascii=False, indent=2)


@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    rooms = load_rooms()
    result = [{'id': r['id'], 'name': r['name']} for r in rooms]
    return jsonify(result)


@app.route('/api/rooms/<room_id>', methods=['GET'])
def get_room(room_id):
    rooms = load_rooms()
    room = next((r for r in rooms if r['id'] == room_id), None)
    if room is None:
        return jsonify({'error': 'Room not found'}), 404
    return jsonify(room)


@app.route('/api/scenes', methods=['GET'])
def get_scenes():
    scenes = load_scenes()
    return jsonify(scenes)


@app.route('/api/scenes', methods=['POST'])
def create_scene():
    data = request.get_json()
    if not data or 'name' not in data or 'roomId' not in data:
        return jsonify({'error': 'Missing required fields'}), 400
    
    scenes = load_scenes()
    new_scene = {
        'id': str(uuid.uuid4()),
        'name': data['name'][:20],
        'roomId': data['roomId'],
        'lights': data.get('lights', {}),
        'thumbnail': data.get('thumbnail', ''),
        'createdAt': datetime.now().isoformat()
    }
    scenes.append(new_scene)
    save_scenes(scenes)
    return jsonify(new_scene), 201


@app.route('/api/scenes/<scene_id>', methods=['GET'])
def get_scene(scene_id):
    scenes = load_scenes()
    scene = next((s for s in scenes if s['id'] == scene_id), None)
    if scene is None:
        return jsonify({'error': 'Scene not found'}), 404
    return jsonify(scene)


@app.route('/api/scenes/<scene_id>', methods=['PUT'])
def update_scene(scene_id):
    scenes = load_scenes()
    scene_index = next((i for i, s in enumerate(scenes) if s['id'] == scene_id), None)
    if scene_index is None:
        return jsonify({'error': 'Scene not found'}), 404
    
    data = request.get_json()
    if 'name' in data:
        scenes[scene_index]['name'] = data['name'][:20]
    if 'lights' in data:
        scenes[scene_index]['lights'] = data['lights']
    if 'thumbnail' in data:
        scenes[scene_index]['thumbnail'] = data['thumbnail']
    
    save_scenes(scenes)
    return jsonify(scenes[scene_index])


@app.route('/api/scenes/<scene_id>', methods=['DELETE'])
def delete_scene(scene_id):
    scenes = load_scenes()
    scene_index = next((i for i, s in enumerate(scenes) if s['id'] == scene_id), None)
    if scene_index is None:
        return jsonify({'error': 'Scene not found'}), 404
    
    deleted = scenes.pop(scene_index)
    save_scenes(scenes)
    return jsonify(deleted)


@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    os.makedirs(DATA_DIR, exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
