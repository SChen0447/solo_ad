import random
import json
import time
import uuid
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
app.config['SECRET_KEY'] = 'tongue-twister-arena-secret'
socketio = SocketIO(app, cors_allowed_origins='*', async_mode='eventlet', ping_timeout=60)

ROOM_EXPIRY = 3600
TOTAL_ROUNDS = 3
ROUND_PREP_TIME = 5
MAX_RECORD_TIME = 10

TONGUE_TWISTERS = [
    '四是四，十是十，十四是十四，四十是四十',
    '黑化肥发灰，灰化肥发黑',
    '红鲤鱼与绿鲤鱼与驴',
    '红凤凰，粉凤凰，红粉凤凰花凤凰',
    '刘奶奶找牛奶奶买榴莲牛奶，牛奶奶给刘奶奶拿榴莲牛奶',
    '八百标兵奔北坡，炮兵并排北边跑，炮兵怕把标兵碰，标兵怕碰炮兵炮',
    '白石塔，白石搭，白石搭白塔，白塔白石搭，搭好白石塔，白塔白又大',
    '牛郎恋刘娘，刘娘念牛郎，牛郎年年恋刘娘，刘娘年年念牛郎',
    '会炖我的炖冻豆腐，来炖我的炖冻豆腐，不会炖我的炖冻豆腐，别炖我的炖冻豆腐',
    '司小四和史小世，四月十四日十四时四十上集市',
    '大兔子，大肚子，大肚子的大兔子，要咬大兔子的大肚子',
    '有个小孩叫小杜，上街打醋又买布，买了布打了醋，回头看见鹰抓兔',
    '扁担长，板凳宽，扁担没有板凳宽，板凳没有扁担长，扁担绑在板凳上',
    '紫瓷盘，盛鱼翅，一盘熟鱼翅，一盘生鱼翅，迟小池拿了一把瓷汤匙',
    '老龙恼怒闹老农，老农恼怒闹老龙，农怒龙恼农更怒，龙恼农怒龙怕农'
]

EMOJI_AVATARS = [
    '🦊', '🐼', '🐵', '🦁', '🐯', '🐸', '🐙', '🦄',
    '🐲', '🦖', '🐳', '🦋', '🐝', '🦉', '🐺', '🐨',
    '🐰', '🐱', '🐶', '🐻'
]

AVATAR_BG_COLORS = [
    'rgba(0, 212, 255, 0.2)', 'rgba(255, 0, 127, 0.2)',
    'rgba(255, 215, 0, 0.2)', 'rgba(0, 255, 136, 0.2)',
    'rgba(192, 192, 192, 0.2)', 'rgba(205, 127, 50, 0.2)',
    'rgba(138, 43, 226, 0.2)', 'rgba(255, 107, 107, 0.2)',
    'rgba(78, 205, 196, 0.2)', 'rgba(255, 159, 243, 0.2)',
    'rgba(255, 234, 167, 0.2)', 'rgba(84, 160, 255, 0.2)',
    'rgba(255, 121, 198, 0.2)', 'rgba(108, 255, 169, 0.2)',
    'rgba(255, 206, 84, 0.2)', 'rgba(189, 195, 199, 0.2)',
    'rgba(162, 155, 254, 0.2)', 'rgba(255, 138, 101, 0.2)',
    'rgba(255, 210, 63, 0.2)', 'rgba(86, 210, 255, 0.2)'
]

rooms = {}
player_room_map = {}


def generate_room_code():
    while True:
        code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
        if code not in rooms:
            return code


def pick_avatar_for_new_room(existing_avatars):
    available = [e for e in EMOJI_AVATARS if e not in existing_avatars]
    if not available:
        return random.choice(EMOJI_AVATARS), random.choice(AVATAR_BG_COLORS)
    emoji = random.choice(available)
    idx = EMOJI_AVATARS.index(emoji)
    return emoji, AVATAR_BG_COLORS[idx % len(AVATAR_BG_COLORS)]


def broadcast_room_state(room_code):
    room = rooms.get(room_code)
    if not room:
        return
    players_info = []
    for pid, pdata in room['players'].items():
        players_info.append({
            'id': pid,
            'name': pdata['name'],
            'avatar': pdata['avatar'],
            'avatar_bg': pdata['avatar_bg'],
            'is_host': pdata['is_host'],
            'total_score': pdata['total_score'],
            'round_scores': pdata['round_scores'],
            'submitted_round': pdata['submitted_round']
        })
    socketio.emit('room_state', {
        'room_code': room_code,
        'phase': room['phase'],
        'players': players_info,
        'current_round': room['current_round'],
        'total_rounds': TOTAL_ROUNDS,
        'current_twister': room.get('current_twister', ''),
        'countdown': room.get('countdown', 0)
    }, room=room_code)


@app.route('/api/room/create', methods=['POST'])
def create_room():
    data = request.get_json()
    player_name = data.get('name', '').strip()
    if not player_name:
        return jsonify({'error': '玩家昵称不能为空'}), 400
    room_code = generate_room_code()
    player_id = str(uuid.uuid4())
    avatar, avatar_bg = pick_avatar_for_new_room(set())
    rooms[room_code] = {
        'created_at': time.time(),
        'phase': 'lobby',
        'current_round': 0,
        'players': {
            player_id: {
                'name': player_name,
                'avatar': avatar,
                'avatar_bg': avatar_bg,
                'is_host': True,
                'total_score': 0,
                'round_scores': [],
                'submitted_round': False,
                'current_result': None
            }
        },
        'current_twister': '',
        'countdown': 0,
        'round_start_time': 0,
        'round_results': {}
    }
    return jsonify({
        'room_code': room_code,
        'player_id': player_id,
        'avatar': avatar,
        'avatar_bg': avatar_bg
    })


@app.route('/api/room/join', methods=['POST'])
def join_room_api():
    data = request.get_json()
    player_name = data.get('name', '').strip()
    room_code = str(data.get('room_code', '')).strip()
    if not player_name:
        return jsonify({'error': '玩家昵称不能为空'}), 400
    if room_code not in rooms:
        return jsonify({'error': '房间不存在'}), 404
    room = rooms[room_code]
    if room['phase'] != 'lobby':
        return jsonify({'error': '游戏已开始，无法加入'}), 400
    if len(room['players']) >= 8:
        return jsonify({'error': '房间已满'}), 400
    existing_avatars = {p['avatar'] for p in room['players'].values()}
    player_id = str(uuid.uuid4())
    avatar, avatar_bg = pick_avatar_for_new_room(existing_avatars)
    room['players'][player_id] = {
        'name': player_name,
        'avatar': avatar,
        'avatar_bg': avatar_bg,
        'is_host': False,
        'total_score': 0,
        'round_scores': [],
        'submitted_round': False,
        'current_result': None
    }
    player_room_map[player_id] = room_code
    broadcast_room_state(room_code)
    return jsonify({
        'room_code': room_code,
        'player_id': player_id,
        'avatar': avatar,
        'avatar_bg': avatar_bg
    })


@socketio.on('connect')
def on_connect():
    pass


@socketio.on('join_socket_room')
def on_join_socket_room(data):
    room_code = data.get('room_code')
    player_id = data.get('player_id')
    if room_code in rooms and player_id in rooms[room_code]['players']:
        player_room_map[player_id] = room_code
        join_room(room_code)
        broadcast_room_state(room_code)


@socketio.on('leave')
def on_leave(data):
    player_id = data.get('player_id', '')
    room_code = player_room_map.pop(player_id, None)
    if room_code and room_code in rooms:
        room = rooms[room_code]
        if player_id in room['players']:
            was_host = room['players'][player_id]['is_host']
            del room['players'][player_id]
            if was_host and room['players']:
                next_host = next(iter(room['players']))
                room['players'][next_host]['is_host'] = True
            if not room['players']:
                del rooms[room_code]
            else:
                broadcast_room_state(room_code)
        leave_room(room_code)


@socketio.on('start_game')
def on_start_game(data):
    room_code = data.get('room_code')
    player_id = data.get('player_id')
    if room_code not in rooms:
        return
    room = rooms[room_code]
    if player_id not in room['players'] or not room['players'][player_id]['is_host']:
        emit('error', {'message': '只有房主可以开始游戏'})
        return
    if len(room['players']) < 2:
        emit('error', {'message': '至少需要2名玩家'})
        return
    room['phase'] = 'round_prep'
    room['current_round'] = 1
    for pid in room['players']:
        room['players'][pid]['round_scores'] = []
        room['players'][pid]['total_score'] = 0
        room['players'][pid]['submitted_round'] = False
        room['players'][pid]['current_result'] = None
    room['round_results'] = {}
    run_round_prep(room_code)


def run_round_prep(room_code):
    room = rooms.get(room_code)
    if not room:
        return
    twister = random.choice(TONGUE_TWISTERS)
    room['current_twister'] = twister
    for i in range(ROUND_PREP_TIME, 0, -1):
        room['countdown'] = i
        socketio.emit('round_prep', {
            'countdown': i,
            'round': room['current_round'],
            'total_rounds': TOTAL_ROUNDS,
            'twister': twister
        }, room=room_code)
        broadcast_room_state(room_code)
        socketio.sleep(1)
    room['phase'] = 'recording'
    room['round_start_time'] = time.time()
    room['countdown'] = MAX_RECORD_TIME
    room['round_results'] = {}
    for pid in room['players']:
        room['players'][pid]['submitted_round'] = False
    socketio.emit('round_start', {
        'round': room['current_round'],
        'total_rounds': TOTAL_ROUNDS,
        'twister': twister,
        'max_time': MAX_RECORD_TIME
    }, room=room_code)
    broadcast_room_state(room_code)
    socketio.start_background_task(run_recording_countdown, room_code)


def run_recording_countdown(room_code):
    for remaining in range(MAX_RECORD_TIME - 1, -1, -1):
        socketio.sleep(1)
        room = rooms.get(room_code)
        if not room or room['phase'] != 'recording':
            return
        room['countdown'] = remaining
        socketio.emit('recording_tick', {'remaining': remaining}, room=room_code)
        if remaining == 0:
            finalize_round(room_code)
            break


@socketio.on('submit_score')
def on_submit_score(data):
    room_code = data.get('room_code')
    player_id = data.get('player_id')
    accuracy = float(data.get('accuracy', 0))
    duration = float(data.get('duration', 0))
    recognized_text = data.get('recognized_text', '')
    round_score = float(data.get('round_score', 0))
    if room_code not in rooms:
        return
    room = rooms[room_code]
    if room['phase'] != 'recording':
        return
    if player_id not in room['players']:
        return
    if room['players'][player_id]['submitted_round']:
        return
    room['players'][player_id]['submitted_round'] = True
    room['players'][player_id]['current_result'] = {
        'accuracy': accuracy,
        'duration': duration,
        'recognized_text': recognized_text,
        'round_score': round_score
    }
    room['round_results'][player_id] = room['players'][player_id]['current_result']
    all_submitted = all(p['submitted_round'] for p in room['players'].values())
    broadcast_room_state(room_code)
    if all_submitted:
        finalize_round(room_code)


def finalize_round(room_code):
    room = rooms.get(room_code)
    if not room:
        return
    room['phase'] = 'round_end'
    results = room['round_results']
    if results:
        durations = [r['duration'] for r in results.values() if r['duration'] > 0]
        min_duration = min(durations) if durations else 1
    else:
        min_duration = 1
    ranked_results = {}
    for pid, r in results.items():
        duration = r['duration']
        if duration <= 0:
            duration = min_duration
        duration_score = (min_duration / duration) * 100 if duration > 0 else 0
        final_score = round(r['accuracy'] * 0.7 + duration_score * 0.3, 2)
        ranked_results[pid] = {
            **r,
            'accuracy_score': round(r['accuracy'] * 100 * 0.7, 2),
            'duration_score': round(duration_score * 0.3, 2),
            'final_score': final_score
        }
        room['players'][pid]['round_scores'].append(final_score)
        room['players'][pid]['total_score'] = round(
            sum(room['players'][pid]['round_scores'])
        )
    sorted_scores = sorted(ranked_results.items(), key=lambda x: x[1]['final_score'], reverse=True)
    rankings = []
    for rank, (pid, r) in enumerate(sorted_scores, 1):
        rankings.append({
            'rank': rank,
            'player_id': pid,
            'name': room['players'][pid]['name'],
            'avatar': room['players'][pid]['avatar'],
            'avatar_bg': room['players'][pid]['avatar_bg'],
            **r
        })
    socketio.emit('round_end', {
        'round': room['current_round'],
        'total_rounds': TOTAL_ROUNDS,
        'rankings': rankings,
        'twister': room['current_twister']
    }, room=room_code)
    broadcast_room_state(room_code)
    if room['current_round'] >= TOTAL_ROUNDS:
        socketio.sleep(5)
        finalize_game(room_code)
    else:
        socketio.sleep(5)
        room['current_round'] += 1
        room['phase'] = 'round_prep'
        run_round_prep(room_code)


def finalize_game(room_code):
    room = rooms.get(room_code)
    if not room:
        return
    room['phase'] = 'game_end'
    final_rankings = []
    players_sorted = sorted(
        room['players'].items(),
        key=lambda x: x[1]['total_score'],
        reverse=True
    )
    for rank, (pid, pdata) in enumerate(players_sorted, 1):
        final_rankings.append({
            'rank': rank,
            'player_id': pid,
            'name': pdata['name'],
            'avatar': pdata['avatar'],
            'avatar_bg': pdata['avatar_bg'],
            'total_score': pdata['total_score'],
            'round_scores': pdata['round_scores']
        })
    socketio.emit('game_end', {
        'final_rankings': final_rankings,
        'total_rounds': TOTAL_ROUNDS
    }, room=room_code)
    broadcast_room_state(room_code)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'rooms': len(rooms)})


if __name__ == '__main__':
    print('🎤 绕口令擂台后端启动中...')
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
