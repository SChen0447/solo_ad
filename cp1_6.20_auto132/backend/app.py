from flask import Flask, request, jsonify
from flask_cors import CORS
from levelStore import store

app = Flask(__name__)
CORS(app)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})


@app.route('/api/map', methods=['POST'])
def save_map():
    try:
        level_data = request.get_json()
        if not level_data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        level_id = store.save_level(level_data)
        return jsonify({
            'success': True,
            'id': level_id,
            'message': 'Level saved successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/map/<level_id>', methods=['GET'])
def get_map(level_id):
    try:
        level_data = store.get_level(level_id)
        if not level_data:
            return jsonify({'success': False, 'message': 'Level not found'}), 404
        return jsonify(level_data)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/maps', methods=['GET'])
def get_all_maps():
    try:
        levels = store.get_all_levels()
        return jsonify(levels)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/replay/<level_id>', methods=['POST'])
def save_replay(level_id):
    try:
        replay_data = request.get_json()
        if not replay_data:
            return jsonify({'success': False, 'message': 'No data provided'}), 400
        
        replay_id = store.save_replay(level_id, replay_data)
        return jsonify({
            'success': True,
            'replayId': replay_id,
            'message': 'Replay saved successfully'
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@app.route('/api/replay/<replay_id>', methods=['GET'])
def get_replay(replay_id):
    try:
        replay_data = store.get_replay(replay_id)
        if not replay_data:
            return jsonify({'success': False, 'message': 'Replay not found'}), 404
        return jsonify(replay_data)
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
