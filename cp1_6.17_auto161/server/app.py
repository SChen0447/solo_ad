import uuid
import threading
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from server.room_manager import RoomManager

app = Flask(__name__, static_folder=None)
app.config['SECRET_KEY'] = 'lingguang-yixian-secret'
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

room_mgr = RoomManager()
timers: dict = {}
timers_lock = threading.Lock()


def emit_to_room(room_id: str, event: str, data: dict, skip_sid: str = None):
    socketio.emit(event, data, room=room_id, skip_sid=skip_sid)


def start_round_timer(room_id: str):
    with timers_lock:
        if room_id in timers:
            try:
                timers[room_id].cancel()
            except Exception:
                pass

    def tick():
        room = room_mgr.get_room(room_id)
        if not room or room.phase != 'drawing':
            return

        room.time_left -= 1
        emit_to_room(room_id, 'timer_update', {'timeLeft': room.time_left})

        if room.time_left <= 0:
            result = room.round_end()
            emit_to_room(room_id, 'round_end', result)
            start_inter_round_timer(room_id)
        else:
            t = threading.Timer(1.0, tick)
            t.daemon = True
            with timers_lock:
                timers[room_id] = t
            t.start()

    t = threading.Timer(1.0, tick)
    t.daemon = True
    with timers_lock:
        timers[room_id] = t
    t.start()


def start_inter_round_timer(room_id: str):
    countdown = [10]

    def tick():
        room = room_mgr.get_room(room_id)
        if not room:
            return

        countdown[0] -= 1
        if countdown[0] <= 0:
            next_data = room.next_round()
            if next_data.get('phase') == 'gameEnd':
                emit_to_room(room_id, 'game_end', {'players': next_data['players']})
            else:
                emit_to_room(room_id, 'round_start', next_data)
                start_round_timer(room_id)
        else:
            t = threading.Timer(1.0, tick)
            t.daemon = True
            with timers_lock:
                timers[room_id] = t
            t.start()

    t = threading.Timer(1.0, tick)
    t.daemon = True
    with timers_lock:
        timers[room_id] = t
    t.start()


def cancel_timer(room_id: str):
    with timers_lock:
        if room_id in timers:
            try:
                timers[room_id].cancel()
            except Exception:
                pass
            del timers[room_id]


@socketio.on('connect')
def on_connect():
    pass


@socketio.on('disconnect')
def on_disconnect():
    sid = request.sid
    room = room_mgr.get_room_by_player(sid)
    if not room:
        return

    room_id = room.room_id
    player_id = sid
    room = room_mgr.leave_room(player_id)
    if room:
        emit_to_room(room_id, 'player_update', room.get_player_list())
        if not room.players:
            cancel_timer(room_id)


@socketio.on('create_room')
def on_create_room(data):
    nickname = data.get('nickname', '').strip()
    if not nickname:
        emit('error', {'message': '昵称不能为空'})
        return

    player_id = request.sid
    room_id, player = room_mgr.create_room(player_id, nickname, player_id)
    join_room(room_id)
    emit('room_created', {'roomId': room_id, 'playerId': player_id})
    emit_to_room(room_id, 'player_update', room_mgr.get_room(room_id).get_player_list())


@socketio.on('join_room')
def on_join_room(data):
    nickname = data.get('nickname', '').strip()
    room_code = data.get('roomId', '').strip()

    if not nickname:
        emit('error', {'message': '昵称不能为空'})
        return
    if not room_code:
        emit('error', {'message': '房间码不能为空'})
        return

    result = room_mgr.join_room(room_code, request.sid, nickname, request.sid)
    if not result:
        emit('error', {'message': '房间不存在'})
        return

    room, player = result
    join_room(room_code)
    emit('room_joined', {
        'roomId': room_code,
        'playerId': request.sid,
        'players': room.get_player_list(),
    })
    emit_to_room(room_code, 'player_update', room.get_player_list(), skip_sid=request.sid)


@socketio.on('toggle_ready')
def on_toggle_ready():
    room = room_mgr.get_room_by_player(request.sid)
    if not room:
        return
    player = room.players.get(request.sid)
    if player:
        player.is_ready = not player.is_ready
        emit_to_room(room.room_id, 'player_update', room.get_player_list())


@socketio.on('start_game')
def on_start_game():
    room = room_mgr.get_room_by_player(request.sid)
    if not room:
        return
    if room.owner_id != request.sid:
        emit('error', {'message': '只有房主才能开始游戏'})
        return
    ready_count = sum(1 for p in room.players.values() if p.is_ready)
    if ready_count < 2:
        emit('error', {'message': '至少需要2名玩家准备'})
        return

    start_data = room.start_game()
    emit_to_room(room.room_id, 'game_start', {
        'roomId': room.room_id,
        'players': room.get_player_list(),
    })
    round_data = room.next_round()
    emit_to_room(room.room_id, 'round_start', round_data)
    start_round_timer(room.room_id)


@socketio.on('draw_stroke')
def on_draw_stroke(data):
    room = room_mgr.get_room_by_player(request.sid)
    if not room:
        return
    player = room.players.get(request.sid)
    if not player or not player.is_drawer:
        return
    room.draw_history.append(data)
    emit_to_room(room.room_id, 'draw_stroke', data, skip_sid=request.sid)


@socketio.on('draw_undo')
def on_draw_undo():
    room = room_mgr.get_room_by_player(request.sid)
    if not room:
        return
    player = room.players.get(request.sid)
    if not player or not player.is_drawer:
        return
    emit_to_room(room.room_id, 'draw_undo', {}, skip_sid=request.sid)


@socketio.on('submit_guess')
def on_submit_guess(data):
    content = data.get('content', '').strip()
    room = room_mgr.get_room_by_player(request.sid)
    if not room:
        return

    result = room.submit_guess(request.sid, content)
    if result is None:
        return

    emit_to_room(room.room_id, 'guess_result', result)

    if result['isCorrect'] and room.all_guessed():
        end_result = room.round_end()
        emit_to_room(room.room_id, 'round_end', end_result)
        start_inter_round_timer(room.room_id)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
