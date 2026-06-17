import os
import sys
import json
import uuid
import threading
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from models import (
    init_db,
    get_all_swimlanes, get_swimlane, create_swimlane, update_swimlane, delete_swimlane,
    get_all_cards, get_card, create_card, update_card, delete_card, move_card,
)

ROOM_NAME = 'story_map_board'

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'story-map-secret-key-2024')

CORS(app, resources={
    r'/api/*': {'origins': '*'},
    r'/*': {'origins': '*'},
})

socketio = SocketIO(
    app,
    cors_allowed_origins='*',
    async_mode='threading',
    logger=False,
    engineio_logger=False,
    ping_timeout=60,
    ping_interval=25,
)

users = {}
users_lock = threading.Lock()


def generate_avatar_url(name):
    import hashlib
    from urllib.parse import quote
    initials = name[:2].upper() if name else '??'
    color_hash = hashlib.md5(name.encode()).hexdigest()[:6]
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">'
        f'<rect width="40" height="40" rx="20" fill="#{color_hash}"/>'
        f'<text x="20" y="26" font-size="16" text-anchor="middle" fill="white" '
        f'font-family="Arial" font-weight="bold">{initials}</text>'
        '</svg>'
    )
    return f'data:image/svg+xml;utf8,{quote(svg)}'


def broadcast_users_list():
    with users_lock:
        users_list = [
            {
                'userId': uid,
                'userName': info['userName'],
                'avatar': info.get('avatar', generate_avatar_url(info['userName'])),
                'color': info.get('color', '#3b82f6'),
                'isOnline': True,
            }
            for uid, info in users.items()
        ]
    socketio.emit('users_list', users_list, room=ROOM_NAME)


@socketio.on('connect')
def handle_connect():
    join_room(ROOM_NAME)


@socketio.on('disconnect')
def handle_disconnect():
    sid = request.sid
    user_info = None
    with users_lock:
        for uid, info in list(users.items()):
            if info.get('sid') == sid:
                user_info = info
                user_info['userId'] = uid
                del users[uid]
                break
    leave_room(ROOM_NAME)
    if user_info:
        socketio.emit('user_left', {
            'userId': user_info['userId'],
            'userName': user_info['userName'],
            'color': user_info.get('color', '#3b82f6'),
        }, room=ROOM_NAME)
        broadcast_users_list()


@socketio.on('user_connected')
def handle_user_connected(data):
    sid = request.sid
    user_id = data.get('userId') or str(uuid.uuid4())
    user_name = data.get('userName') or '匿名用户'
    user_color = data.get('color') or '#3b82f6'

    with users_lock:
        for uid, info in list(users.items()):
            if uid == user_id and info.get('sid') != sid:
                socketio.emit('user_left', {
                    'userId': uid,
                    'userName': info['userName'],
                    'color': info.get('color', '#3b82f6'),
                }, room=ROOM_NAME)
            users[user_id] = {
                'sid': sid,
                'userName': user_name,
                'color': user_color,
                'joinedAt': datetime.now().isoformat(),
                'avatar': data.get('avatar') or generate_avatar_url(user_name),
            }

    socketio.emit('user_joined', {
        'userId': user_id,
        'userName': user_name,
        'avatar': users[user_id]['avatar'],
        'color': user_color,
        'isOnline': True,
    }, room=ROOM_NAME)

    broadcast_users_list()


@socketio.on('cursor_move')
def handle_cursor_move(data):
    data['userId'] = data.get('userId')
    socketio.emit('cursor_move', data, room=ROOM_NAME)


@socketio.on('card_move')
def handle_card_move(data):
    card_id = data.get('cardId')
    swimlane_id = data.get('swimlaneId')
    position = data.get('position', 0)

    try:
        move_card(card_id, swimlane_id, position)
    except Exception as e:
        print(f'Error moving card: {e}', flush=True)

    socketio.emit('card_moved', {
        'cardId': card_id,
        'swimlaneId': swimlane_id,
        'position': position,
        'userId': data.get('userId'),
        'userName': data.get('userName'),
        'color': data.get('color', '#3b82f6'),
        'x': data.get('x') if data.get('x') is not None else 0,
        'y': data.get('y') if data.get('y') is not None else 0,
        'timestamp': data.get('timestamp') or datetime.now().isoformat(),
    }, room=ROOM_NAME)


@socketio.on('swimlane_create')
def handle_swimlane_create(data):
    try:
        lane = create_swimlane(data)
        socketio.emit('swimlane_created', lane, room=ROOM_NAME)
    except Exception as e:
        print(f'Error creating swimlane: {e}', flush=True)


@socketio.on('card_create')
def handle_card_create(data):
    try:
        card = create_card(data)
        if card:
            socketio.emit('card_created', card, room=ROOM_NAME)
    except Exception as e:
        print(f'Error creating card: {e}', flush=True)


@socketio.on('card_update')
def handle_card_update(data):
    card_id = data.get('id') or data.get('cardId')
    try:
        card = update_card(card_id, data)
        if card:
            socketio.emit('card_updated', card, room=ROOM_NAME)
    except Exception as e:
        print(f'Error updating card: {e}', flush=True)


@socketio.on('card_delete')
def handle_card_delete(data):
    card_id = data.get('id') or data.get('cardId')
    try:
        delete_card(card_id)
        socketio.emit('card_deleted', card_id, room=ROOM_NAME)
    except Exception as e:
        print(f'Error deleting card: {e}', flush=True)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'users_online': len(users),
    })


@app.route('/api/swimlanes', methods=['GET'])
def api_get_swimlanes():
    try:
        lanes = get_all_swimlanes()
        return jsonify(lanes)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/swimlanes', methods=['POST'])
def api_create_swimlane():
    try:
        data = request.get_json() or {}
        if not data.get('title'):
            return jsonify({'error': 'Title is required'}), 400
        lane = create_swimlane(data)
        socketio.emit('swimlane_created', lane, room=ROOM_NAME)
        return jsonify(lane), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/swimlanes/<lane_id>', methods=['GET'])
def api_get_swimlane(lane_id):
    try:
        lane = get_swimlane(lane_id)
        if not lane:
            return jsonify({'error': 'Swimlane not found'}), 404
        return jsonify(lane)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/swimlanes/<lane_id>', methods=['PUT'])
def api_update_swimlane(lane_id):
    try:
        data = request.get_json() or {}
        lane = update_swimlane(lane_id, data)
        if not lane:
            return jsonify({'error': 'Swimlane not found'}), 404
        return jsonify(lane)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/swimlanes/<lane_id>', methods=['DELETE'])
def api_delete_swimlane(lane_id):
    try:
        result = delete_swimlane(lane_id)
        return jsonify({'deleted': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/cards', methods=['GET'])
def api_get_cards():
    try:
        cards = get_all_cards()
        return jsonify(cards)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/cards', methods=['POST'])
def api_create_card():
    try:
        data = request.get_json() or {}
        card = create_card(data)
        if not card:
            return jsonify({'error': 'swimlaneId is required'}), 400
        socketio.emit('card_created', card, room=ROOM_NAME)
        return jsonify(card), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/cards/<card_id>', methods=['GET'])
def api_get_card(card_id):
    try:
        card = get_card(card_id)
        if not card:
            return jsonify({'error': 'Card not found'}), 404
        return jsonify(card)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/cards/<card_id>', methods=['PUT'])
def api_update_card(card_id):
    try:
        data = request.get_json() or {}
        card = update_card(card_id, data)
        if not card:
            return jsonify({'error': 'Card not found'}), 404
        socketio.emit('card_updated', card, room=ROOM_NAME)
        return jsonify(card)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/cards/<card_id>/move', methods=['POST'])
def api_move_card(card_id):
    try:
        data = request.get_json() or {}
        swimlane_id = data.get('swimlaneId') or data.get('swimlane_id')
        position = data.get('position', 0)
        if not swimlane_id:
            return jsonify({'error': 'swimlaneId is required'}), 400
        card = move_card(card_id, swimlane_id, position)
        if not card:
            return jsonify({'error': 'Card not found'}), 404
        socketio.emit('card_moved', {
            'cardId': card_id,
            'swimlaneId': swimlane_id,
            'position': position,
            'userId': data.get('userId', 'system'),
            'userName': data.get('userName', 'System'),
            'color': data.get('color', '#3b82f6'),
            'x': data.get('x') if data.get('x') is not None else 0,
            'y': data.get('y') if data.get('y') is not None else 0,
            'timestamp': data.get('timestamp') or datetime.now().isoformat(),
        }, room=ROOM_NAME)
        return jsonify(card)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/cards/<card_id>', methods=['DELETE'])
def api_delete_card(card_id):
    try:
        result = delete_card(card_id)
        socketio.emit('card_deleted', card_id, room=ROOM_NAME)
        return jsonify({'deleted': result})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


def main():
    init_db()
    port = int(os.environ.get('PORT', 5000))
    host = os.environ.get('HOST', '0.0.0.0')
    print(f'🚀 User Story Map Server starting on {host}:{port}', flush=True)
    print(f'📋 API available at http://localhost:{port}/api', flush=True)
    print(f'🔌 WebSocket available at http://localhost:{port}', flush=True)
    socketio.run(app, host=host, port=port, debug=False, use_reloader=False)


if __name__ == '__main__':
    main()
