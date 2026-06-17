import os
import uuid
import threading
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", path='/socket.io')

documents = {}
document_users = {}
document_locks = {}
version_counters = {}
last_saved_content = {}
auto_save_timers = {}

USER_COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dfe6e9']


def get_user_color(user_id):
    hash_value = hash(user_id) % len(USER_COLORS)
    return USER_COLORS[hash_value]


def auto_save_version(doc_id):
    with document_locks.setdefault(doc_id, threading.Lock()):
        if doc_id not in documents:
            return

        current_content = documents[doc_id]['content']
        last_content = last_saved_content.get(doc_id, '')

        if current_content != last_content:
            version_counters[doc_id] = version_counters.get(doc_id, 0) + 1
            version = {
                'id': str(uuid.uuid4()),
                'versionNumber': version_counters[doc_id],
                'content': current_content,
                'timestamp': datetime.now().isoformat(),
                'savedBy': 'system'
            }
            documents[doc_id]['versions'].append(version)
            documents[doc_id]['updatedAt'] = datetime.now().isoformat()
            last_saved_content[doc_id] = current_content

            socketio.emit('version_save', {
                'type': 'version_save',
                'payload': {'version': version},
                'timestamp': int(time.time() * 1000),
                'userId': 'system',
                'docId': doc_id
            }, room=doc_id)

    if doc_id in documents:
        auto_save_timers[doc_id] = threading.Timer(10, auto_save_version, [doc_id])
        auto_save_timers[doc_id].daemon = True
        auto_save_timers[doc_id].start()


@app.route('/api/documents', methods=['POST'])
def create_document():
    data = request.get_json()
    doc_id = data.get('id') or str(uuid.uuid4())
    title = data.get('title', '未命名文档')
    content = data.get('content', '')

    now = datetime.now().isoformat()
    document = {
        'id': doc_id,
        'title': title,
        'content': content,
        'createdAt': now,
        'updatedAt': now,
        'versions': []
    }

    documents[doc_id] = document
    document_users[doc_id] = {}
    document_locks[doc_id] = threading.Lock()
    version_counters[doc_id] = 0
    last_saved_content[doc_id] = content

    auto_save_timers[doc_id] = threading.Timer(10, auto_save_version, [doc_id])
    auto_save_timers[doc_id].daemon = True
    auto_save_timers[doc_id].start()

    return jsonify(document), 201


@app.route('/api/documents/<doc_id>', methods=['GET'])
def get_document(doc_id):
    if doc_id not in documents:
        return jsonify({'error': 'Document not found'}), 404
    return jsonify(documents[doc_id])


@app.route('/api/documents/<doc_id>', methods=['PUT'])
def update_document(doc_id):
    if doc_id not in documents:
        return jsonify({'error': 'Document not found'}), 404

    data = request.get_json()
    content = data.get('content')

    if content is not None:
        with document_locks[doc_id]:
            documents[doc_id]['content'] = content
            documents[doc_id]['updatedAt'] = datetime.now().isoformat()

    return jsonify(documents[doc_id])


@app.route('/api/documents/<doc_id>/title', methods=['PUT'])
def update_title(doc_id):
    if doc_id not in documents:
        return jsonify({'error': 'Document not found'}), 404

    data = request.get_json()
    title = data.get('title')

    if title is not None:
        documents[doc_id]['title'] = title
        documents[doc_id]['updatedAt'] = datetime.now().isoformat()

    return jsonify(documents[doc_id])


@app.route('/api/documents/<doc_id>/versions', methods=['GET'])
def get_versions(doc_id):
    if doc_id not in documents:
        return jsonify({'error': 'Document not found'}), 404
    return jsonify(documents[doc_id]['versions'])


@socketio.on('join_document')
def handle_join_document(data):
    doc_id = data.get('docId')
    user_id = data.get('userId')

    if not doc_id or not user_id:
        return

    join_room(doc_id)

    user_name = f'用户{user_id[:4]}'
    user_data = {
        'id': user_id,
        'name': user_name,
        'color': get_user_color(user_id),
        'cursorPosition': 0
    }

    if doc_id not in document_users:
        document_users[doc_id] = {}

    document_users[doc_id][user_id] = {
        'user': user_data,
        'sid': request.sid,
        'last_activity': time.time()
    }

    emit('user_join', {
        'type': 'user_join',
        'payload': {'user': user_data},
        'timestamp': int(time.time() * 1000),
        'userId': user_id,
        'docId': doc_id
    }, room=doc_id, skip_sid=request.sid)

    users = [info['user'] for info in document_users[doc_id].values()]

    if doc_id in documents:
        emit('document_sync', {
            'type': 'document_sync',
            'payload': {
                'document': documents[doc_id],
                'users': users
            },
            'timestamp': int(time.time() * 1000),
            'userId': user_id,
            'docId': doc_id
        }, room=request.sid)


@socketio.on('message')
def handle_message(message):
    msg_type = message.get('type')
    doc_id = message.get('docId')
    user_id = message.get('userId')
    payload = message.get('payload', {})
    timestamp = message.get('timestamp', int(time.time() * 1000))

    if not doc_id or not msg_type:
        return

    if doc_id in document_users and user_id in document_users[doc_id]:
        document_users[doc_id][user_id]['last_activity'] = time.time()

    if msg_type == 'content_update':
        handle_content_update(doc_id, user_id, payload, timestamp)
    elif msg_type == 'cursor_update':
        handle_cursor_update(doc_id, user_id, payload, timestamp)


def handle_content_update(doc_id, user_id, payload, timestamp):
    if doc_id not in documents:
        return

    new_content = payload.get('content', '')
    cursor_position = payload.get('cursorPosition', 0)

    with document_locks[doc_id]:
        current_content = documents[doc_id]['content']
        if current_content != new_content:
            if len(current_content) > 0 and len(new_content) > 0:
                common_prefix = 0
                while (common_prefix < len(current_content) and
                       common_prefix < len(new_content) and
                       current_content[common_prefix] == new_content[common_prefix]):
                    common_prefix += 1

                common_suffix = 0
                while (common_suffix < len(current_content) - common_prefix and
                       common_suffix < len(new_content) - common_prefix and
                       current_content[-(common_suffix + 1)] == new_content[-(common_suffix + 1)]):
                    common_suffix += 1

                old_middle = current_content[common_prefix:len(current_content) - common_suffix]
                new_middle = new_content[common_prefix:len(new_content) - common_suffix]

                if old_middle and new_middle and old_middle != new_middle:
                    emit('conflict', {
                        'type': 'conflict',
                        'payload': {},
                        'timestamp': timestamp,
                        'userId': user_id,
                        'docId': doc_id
                    }, room=doc_id)

            documents[doc_id]['content'] = new_content
            documents[doc_id]['updatedAt'] = datetime.now().isoformat()

            if doc_id in document_users and user_id in document_users[doc_id]:
                document_users[doc_id][user_id]['user']['cursorPosition'] = cursor_position

    emit('content_update', {
        'type': 'content_update',
        'payload': {
            'content': new_content,
            'cursorPosition': cursor_position,
            'userId': user_id
        },
        'timestamp': timestamp,
        'userId': user_id,
        'docId': doc_id
    }, room=doc_id, skip_sid=request.sid)


def handle_cursor_update(doc_id, user_id, payload, timestamp):
    cursor_position = payload.get('cursorPosition', 0)

    if doc_id in document_users and user_id in document_users[doc_id]:
        document_users[doc_id][user_id]['user']['cursorPosition'] = cursor_position

    emit('cursor_update', {
        'type': 'cursor_update',
        'payload': {
            'userId': user_id,
            'cursorPosition': cursor_position
        },
        'timestamp': timestamp,
        'userId': user_id,
        'docId': doc_id
    }, room=doc_id, skip_sid=request.sid)


@socketio.on('disconnect')
def handle_disconnect():
    for doc_id, users in document_users.items():
        for user_id, info in list(users.items()):
            if info['sid'] == request.sid:
                del users[user_id]

                emit('user_leave', {
                    'type': 'user_leave',
                    'payload': {'userId': user_id},
                    'timestamp': int(time.time() * 1000),
                    'userId': user_id,
                    'docId': doc_id
                }, room=doc_id)
                break


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
