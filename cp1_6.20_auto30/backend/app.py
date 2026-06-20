import time
import uuid
from threading import Lock
from typing import Dict, List, Optional, Any

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

from harmonyEngine import generate_harmony


app = Flask(__name__)
app.config['SECRET_KEY'] = 'score-editor-secret-key-2024'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode='eventlet',
    ping_timeout=60,
    ping_interval=25,
)


class NoteStore:
    def __init__(self):
        self._notes: Dict[str, Dict[str, Any]] = {}
        self._lock = Lock()
        self._last_edit_time: Dict[int, float] = {}
        self._last_edit_user: Dict[int, str] = {}

    def add_note(self, note_data: Dict[str, Any], user_id: str, measure: int) -> bool:
        note_id = note_data.get('id')
        if not note_id:
            return False
        with self._lock:
            current_time = time.time()
            self._notes[note_id] = {
                **note_data,
                'last_updated': current_time,
                'last_user': user_id,
            }
            self._check_conflict(measure, user_id, current_time)
            self._last_edit_time[measure] = current_time
            self._last_edit_user[measure] = user_id
            return True

    def delete_note(self, note_id: str, user_id: str, measure: int) -> bool:
        with self._lock:
            if note_id in self._notes:
                current_time = time.time()
                self._check_conflict(measure, user_id, current_time)
                del self._notes[note_id]
                self._last_edit_time[measure] = current_time
                self._last_edit_user[measure] = user_id
                return True
            return False

    def move_note(self, note_data: Dict[str, Any], user_id: str, measure: int, old_measure: Optional[int] = None) -> bool:
        note_id = note_data.get('id')
        if not note_id:
            return False
        with self._lock:
            if note_id in self._notes:
                current_time = time.time()
                existing = self._notes[note_id]
                if note_data.get('timestamp', 0) >= existing.get('last_updated', 0):
                    self._check_conflict(measure, user_id, current_time)
                    self._notes[note_id] = {
                        **note_data,
                        'last_updated': current_time,
                        'last_user': user_id,
                    }
                    self._last_edit_time[measure] = current_time
                    self._last_edit_user[measure] = user_id
                    return True
            return False

    def _check_conflict(self, measure: int, user_id: str, current_time: float) -> Optional[str]:
        last_time = self._last_edit_time.get(measure, 0)
        last_user = self._last_edit_user.get(measure, '')
        if last_user and last_user != user_id and (current_time - last_time) < 2.0:
            return f"小节 {measure + 1} 发生编辑冲突，已采用最新修改"
        return None

    def get_all_notes(self) -> List[Dict[str, Any]]:
        with self._lock:
            result = []
            for note in self._notes.values():
                result.append({
                    k: v for k, v in note.items()
                    if k not in ('last_updated', 'last_user')
                })
            return result


class Room:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.notes = NoteStore()
        self.users: Dict[str, str] = {}
        self.owner_id: Optional[str] = None
        self.settings: Dict[str, Any] = {
            'timeSignature': '4/4',
            'keySignature': 'C大调',
            'tempo': 120,
        }
        self.created_at = time.time()
        self._conflicts: List[Dict[str, Any]] = []

    def add_user(self, user_id: str, user_name: str) -> bool:
        if not self.users:
            self.owner_id = user_id
        self.users[user_id] = user_name
        return True

    def remove_user(self, user_id: str) -> Optional[str]:
        name = self.users.pop(user_id, None)
        if user_id == self.owner_id and self.users:
            self.owner_id = next(iter(self.users))
        return name

    def get_users_list(self) -> List[Dict[str, str]]:
        return [
            {'id': uid, 'name': name}
            for uid, name in self.users.items()
        ]

    def add_conflict(self, measure: int, message: str):
        self._conflicts.append({
            'measure': measure,
            'message': message,
            'timestamp': time.time(),
        })


rooms: Dict[str, Room] = {}
rooms_lock = Lock()
user_to_room: Dict[str, str] = {}


def get_or_create_room(room_id: str) -> Room:
    with rooms_lock:
        if room_id not in rooms:
            rooms[room_id] = Room(room_id)
        return rooms[room_id]


@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")


@socketio.on('disconnect')
def handle_disconnect():
    user_id = request.sid
    room_id = user_to_room.pop(user_id, None)
    if room_id and room_id in rooms:
        room = rooms[room_id]
        user_name = room.remove_user(user_id)
        if user_name:
            leave_room(room_id)
            emit('user:left', {
                'id': user_id,
                'name': user_name,
            }, room=room_id)
            if not room.users:
                with rooms_lock:
                    if room_id in rooms and not rooms[room_id].users:
                        del rooms[room_id]
    print(f"Client disconnected: {user_id}")


@socketio.on('room:create')
def handle_create_room(data):
    user_id = request.sid
    room_id = data.get('roomId') or uuid.uuid4().hex[:6].upper()
    user_name = data.get('userName', 'Anonymous')

    room = get_or_create_room(room_id)
    room.add_user(user_id, user_name)
    user_to_room[user_id] = room_id
    join_room(room_id)

    emit('room:joined', {
        'roomId': room_id,
        'notes': room.notes.get_all_notes(),
        'settings': room.settings,
        'users': room.get_users_list(),
    })


@socketio.on('room:join')
def handle_join_room(data):
    user_id = request.sid
    room_id = data.get('roomId', '').upper()
    user_name = data.get('userName', 'Anonymous')

    if not room_id:
        emit('error', {'message': '房间ID不能为空'})
        return

    room = get_or_create_room(room_id)
    room.add_user(user_id, user_name)
    user_to_room[user_id] = room_id
    join_room(room_id)

    emit('room:joined', {
        'roomId': room_id,
        'notes': room.notes.get_all_notes(),
        'settings': room.settings,
        'users': room.get_users_list(),
    })

    emit('user:joined', {
        'id': user_id,
        'name': user_name,
    }, room=room_id, include_self=False)


@socketio.on('room:leave')
def handle_leave_room(data):
    user_id = request.sid
    room_id = data.get('roomId')
    if room_id in rooms:
        room = rooms[room_id]
        user_name = room.remove_user(user_id)
        if user_name:
            leave_room(room_id)
            user_to_room.pop(user_id, None)
            emit('user:left', {
                'id': user_id,
                'name': user_name,
            }, room=room_id)


@socketio.on('room:settings:update')
def handle_settings_update(data):
    user_id = request.sid
    room_id = data.get('roomId')
    settings = data.get('settings')

    if room_id not in rooms:
        return

    room = rooms[room_id]
    if room.owner_id == user_id:
        room.settings.update(settings)
        emit('room:settings', room.settings, room=room_id)


@socketio.on('cursor:update')
def handle_cursor_update(data):
    user_id = request.sid
    room_id = user_to_room.get(user_id)
    if not room_id:
        return

    emit('cursor:update', {
        'userId': user_id,
        'userName': data.get('userName', ''),
        'position': data.get('position', 0),
        'measure': data.get('measure', 0),
        'color': data.get('color', '#ff6b6b'),
    }, room=room_id, include_self=False)


@socketio.on('note:edit')
def handle_note_edit(data):
    user_id = request.sid
    room_id = user_to_room.get(user_id)
    if not room_id or room_id not in rooms:
        return

    room = rooms[room_id]
    edit_type = data.get('type')
    note = data.get('note', {})
    measure = data.get('measure', note.get('measure', 0))
    old_measure = data.get('oldNote', {}).get('measure') if data.get('oldNote') else None

    event_for_broadcast = {
        **data,
        'userId': user_id,
    }

    conflict_message = None
    last_time_key = f"_{measure}"
    if not hasattr(room.notes, '_last_edit_time'):
        room.notes._last_edit_time = {}
        room.notes._last_edit_user = {}

    last_edit_time = room.notes._last_edit_time.get(measure, 0)
    last_edit_user = room.notes._last_edit_user.get(measure, '')
    current_time = time.time()

    if (last_edit_user and last_edit_user != user_id and
            (current_time - last_edit_time) < 2.0):
        conflict_message = f"小节 {measure + 1} 发生编辑冲突，已采用最新修改"
        emit('conflict:detected', {
            'measure': measure,
            'message': conflict_message,
        }, room=room_id)

    if edit_type == 'add':
        room.notes.add_note(note, user_id, measure)
        emit('note:added', event_for_broadcast, room=room_id, include_self=False)
    elif edit_type == 'delete':
        note_id = note.get('id')
        room.notes.delete_note(note_id, user_id, measure)
        emit('note:deleted', event_for_broadcast, room=room_id, include_self=False)
    elif edit_type == 'move':
        room.notes.move_note(note, user_id, measure, old_measure)
        emit('note:moved', event_for_broadcast, room=room_id, include_self=False)


@socketio.on('harmony:generate')
def handle_harmony_generate(data):
    user_id = request.sid
    room_id = user_to_room.get(user_id)
    if not room_id or room_id not in rooms:
        return

    room = rooms[room_id]
    measures_data = data.get('measures', [])
    key_signature = room.settings.get('keySignature', 'C大调')

    try:
        chords = generate_harmony(measures_data, key_signature)
        emit('harmony:generated', {
            'chords': chords,
        }, room=user_id)
    except Exception as e:
        print(f"Harmony generation error: {e}")
        emit('harmony:generated', {
            'chords': [],
            'error': str(e),
        }, room=user_id)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'activeRooms': len(rooms),
        'timestamp': time.time(),
    })


@app.route('/api/rooms', methods=['GET'])
def list_rooms():
    room_list = []
    for rid, room in rooms.items():
        room_list.append({
            'id': rid,
            'userCount': len(room.users),
            'settings': room.settings,
            'noteCount': len(room.notes.get_all_notes()),
        })
    return jsonify({'rooms': room_list})


@app.route('/api/rooms/<room_id>/notes', methods=['GET'])
def get_room_notes(room_id):
    if room_id not in rooms:
        return jsonify({'error': '房间不存在'}), 404
    room = rooms[room_id]
    return jsonify({
        'roomId': room_id,
        'notes': room.notes.get_all_notes(),
        'settings': room.settings,
    })


if __name__ == '__main__':
    print("=" * 50)
    print("  协同乐谱编辑器 - 后端服务")
    print("  启动地址: http://localhost:5000")
    print("=" * 50)
    socketio.run(
        app,
        host='0.0.0.0',
        port=5000,
        debug=False,
    )
