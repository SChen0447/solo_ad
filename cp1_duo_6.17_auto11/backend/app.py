from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
from datetime import datetime

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
FAVORITES_FILE = os.path.join(DATA_DIR, 'favorites.json')

PRESET_CURVES = [
    {
        'id': 'ease',
        'name': 'ease',
        'label': 'ease',
        'curve': {'p1x': 0.25, 'p1y': 0.1, 'p2x': 0.25, 'p2y': 1.0},
        'built_in': True
    },
    {
        'id': 'ease-in',
        'name': 'ease-in',
        'label': 'ease-in',
        'curve': {'p1x': 0.42, 'p1y': 0.0, 'p2x': 1.0, 'p2y': 1.0},
        'built_in': True
    },
    {
        'id': 'ease-out',
        'name': 'ease-out',
        'label': 'ease-out',
        'curve': {'p1x': 0.0, 'p1y': 0.0, 'p2x': 0.58, 'p2y': 1.0},
        'built_in': True
    },
    {
        'id': 'ease-in-out',
        'name': 'ease-in-out',
        'label': 'ease-in-out',
        'curve': {'p1x': 0.42, 'p1y': 0.0, 'p2x': 0.58, 'p2y': 1.0},
        'built_in': True
    },
    {
        'id': 'linear',
        'name': 'linear',
        'label': 'linear',
        'curve': {'p1x': 0.0, 'p1y': 0.0, 'p2x': 1.0, 'p2y': 1.0},
        'built_in': True
    },
    {
        'id': 'ease-in-back',
        'name': 'ease-in-back',
        'label': 'ease-in-back',
        'curve': {'p1x': 0.6, 'p1y': -0.28, 'p2x': 0.735, 'p2y': 0.045},
        'built_in': True
    },
    {
        'id': 'ease-out-back',
        'name': 'ease-out-back',
        'label': 'ease-out-back',
        'curve': {'p1x': 0.175, 'p1y': 0.885, 'p2x': 0.32, 'p2y': 1.275},
        'built_in': True
    },
    {
        'id': 'ease-in-out-back',
        'name': 'ease-in-out-back',
        'label': 'ease-in-out-back',
        'curve': {'p1x': 0.68, 'p1y': -0.55, 'p2x': 0.265, 'p2y': 1.55},
        'built_in': True
    }
]


def ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)


def load_favorites():
    ensure_data_dir()
    if not os.path.exists(FAVORITES_FILE):
        return []
    try:
        with open(FAVORITES_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_favorites(favorites):
    ensure_data_dir()
    with open(FAVORITES_FILE, 'w', encoding='utf-8') as f:
        json.dump(favorites, f, ensure_ascii=False, indent=2)


@app.route('/api/presets', methods=['GET'])
def get_presets():
    return jsonify({
        'success': True,
        'data': PRESET_CURVES
    })


@app.route('/api/presets/<preset_id>', methods=['GET'])
def get_preset(preset_id):
    preset = next((p for p in PRESET_CURVES if p['id'] == preset_id), None)
    if not preset:
        return jsonify({'success': False, 'message': '预设不存在'}), 404
    return jsonify({
        'success': True,
        'data': preset
    })


@app.route('/api/favorites', methods=['GET'])
def get_favorites():
    favorites = load_favorites()
    return jsonify({
        'success': True,
        'data': favorites
    })


@app.route('/api/favorites', methods=['POST'])
def add_favorite():
    data = request.get_json()
    if not data or 'curve' not in data:
        return jsonify({'success': False, 'message': '参数错误'}), 400

    favorites = load_favorites()
    new_favorite = {
        'id': f'fav_{datetime.now().strftime("%Y%m%d%H%M%S")}_{len(favorites)}',
        'name': data.get('name', f'曲线 {len(favorites) + 1}'),
        'label': data.get('label', data.get('name', f'曲线 {len(favorites) + 1}')),
        'curve': data['curve'],
        'created_at': datetime.now().isoformat(),
        'built_in': False
    }
    favorites.append(new_favorite)
    save_favorites(favorites)

    return jsonify({
        'success': True,
        'data': new_favorite
    }), 201


@app.route('/api/favorites/<favorite_id>', methods=['DELETE'])
def delete_favorite(favorite_id):
    favorites = load_favorites()
    index = next((i for i, f in enumerate(favorites) if f['id'] == favorite_id), None)
    if index is None:
        return jsonify({'success': False, 'message': '收藏不存在'}), 404

    deleted = favorites.pop(index)
    save_favorites(favorites)

    return jsonify({
        'success': True,
        'data': deleted
    })


@app.route('/api/favorites/<favorite_id>', methods=['PUT'])
def update_favorite(favorite_id):
    data = request.get_json()
    favorites = load_favorites()
    index = next((i for i, f in enumerate(favorites) if f['id'] == favorite_id), None)
    if index is None:
        return jsonify({'success': False, 'message': '收藏不存在'}), 404

    if 'name' in data:
        favorites[index]['name'] = data['name']
        favorites[index]['label'] = data.get('label', data['name'])
    if 'curve' in data:
        favorites[index]['curve'] = data['curve']

    save_favorites(favorites)

    return jsonify({
        'success': True,
        'data': favorites[index]
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'success': True,
        'status': 'running'
    })


if __name__ == '__main__':
    print('CSS贝塞尔曲线编辑器后端服务启动中...')
    print('API文档:')
    print('  GET  /api/presets          - 获取所有预设曲线')
    print('  GET  /api/presets/<id>     - 获取单个预设曲线')
    print('  GET  /api/favorites        - 获取收藏的曲线')
    print('  POST /api/favorites        - 添加收藏曲线')
    print('  PUT  /api/favorites/<id>   - 更新收藏曲线')
    print('  DELETE /api/favorites/<id> - 删除收藏曲线')
    app.run(host='0.0.0.0', port=5000, debug=True)
