from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
from room_manager import RoomManager
import uuid

app = Flask(__name__)
app.config['SECRET_KEY'] = 'secret!'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

room_manager = RoomManager()


@app.route('/api/rooms/<room_id>', methods=['GET'])
def get_room(room_id):
    room = room_manager.get_or_create_room(room_id)
    return jsonify(room.to_dict())


@app.route('/api/rooms', methods=['POST'])
def create_room():
    room_id = str(uuid.uuid4())[:8]
    room = room_manager.get_or_create_room(room_id)
    return jsonify({"room_id": room_id, "data": room.to_dict()})


@socketio.on('join')
def handle_join(data):
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    if not room_id:
        return
    room = room_manager.join_room(request.sid, room_id)
    join_room(room_id)
    emit('room_state', room.to_dict(), to=request.sid)
    emit('user_joined', {'user_id': user_id, 'room_id': room_id}, to=room_id, include_self=False)


@socketio.on('leave')
def handle_leave(data):
    room_id = data.get('room_id')
    user_id = data.get('user_id')
    room_manager.leave_room(request.sid)
    if room_id:
        leave_room(room_id)
        emit('user_left', {'user_id': user_id}, to=room_id, include_self=False)


@socketio.on('node_create')
def handle_node_create(data):
    room_id = data.get('room_id')
    node_data = data.get('node')
    if not room_id or not node_data:
        return
    node = room_manager.add_node(room_id, node_data)
    emit('node_created', {'node': node.to_dict()}, to=room_id)


@socketio.on('node_update')
def handle_node_update(data):
    room_id = data.get('room_id')
    node_id = data.get('node_id')
    updates = data.get('updates')
    if not room_id or not node_id or not updates:
        return
    node = room_manager.update_node(room_id, node_id, updates)
    if node:
        emit('node_updated', {'node_id': node_id, 'updates': updates}, to=room_id)


@socketio.on('node_delete')
def handle_node_delete(data):
    room_id = data.get('room_id')
    node_id = data.get('node_id')
    if not room_id or not node_id:
        return
    if room_manager.delete_node(room_id, node_id):
        emit('node_deleted', {'node_id': node_id}, to=room_id)


@socketio.on('node_merge')
def handle_node_merge(data):
    room_id = data.get('room_id')
    node_ids = data.get('node_ids')
    new_text = data.get('new_text')
    primary_node_id = data.get('primary_node_id')
    if not room_id or not node_ids or len(node_ids) < 2:
        return
    primary = room_manager.update_node(room_id, primary_node_id, {'text': new_text})
    if primary:
        for nid in node_ids:
            if nid != primary_node_id:
                room_manager.delete_node(room_id, nid)
        emit('node_merged', {
            'primary_node_id': primary_node_id,
            'merged_node_ids': [n for n in node_ids if n != primary_node_id],
            'new_text': new_text
        }, to=room_id)


@socketio.on('task_create')
def handle_task_create(data):
    room_id = data.get('room_id')
    node_id = data.get('node_id')
    creator_id = data.get('creator_id')
    if not room_id or not node_id:
        return
    task = room_manager.create_task_from_node(room_id, node_id, creator_id)
    if task:
        emit('task_created', {'task': task.to_dict()}, to=room_id)


@socketio.on('task_update')
def handle_task_update(data):
    room_id = data.get('room_id')
    task_id = data.get('task_id')
    new_status = data.get('new_status')
    new_index = data.get('new_index', 0)
    if not room_id or not task_id or not new_status:
        return
    task = room_manager.update_task_status(room_id, task_id, new_status, new_index)
    if task:
        emit('task_updated', {
            'task_id': task_id,
            'task': task.to_dict()
        }, to=room_id)


@socketio.on('task_delete')
def handle_task_delete(data):
    room_id = data.get('room_id')
    task_id = data.get('task_id')
    if not room_id or not task_id:
        return
    if room_manager.delete_task(room_id, task_id):
        emit('task_deleted', {'task_id': task_id}, to=room_id)


@socketio.on('disconnect')
def handle_disconnect():
    room_manager.leave_room(request.sid)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, use_reloader=False)
