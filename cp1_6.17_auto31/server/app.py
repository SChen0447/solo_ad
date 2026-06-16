import uuid
import random
import time
import threading
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room, emit

app = Flask(__name__)
app.config['SECRET_KEY'] = 'lucky-wheel-secret-key-2024'
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/socket.io/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", path='/socket.io', async_mode='eventlet')

activities = {}
participants = {}
win_records = {}
used_sessions = {}
activity_lock = threading.Lock()


def generate_activity_code():
    code = ''
    chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    for _ in range(6):
        code += random.choice(chars)
    return code


def generate_share_url(activity_code):
    return f'/draw/{activity_code}'


def select_prize(prizes):
    total_prob = sum(p['probability'] for p in prizes)
    rand = random.uniform(0, total_prob)
    current = 0
    for prize in prizes:
        current += prize['probability']
        if rand <= current:
            if prize['count'] > 0:
                return prize
            else:
                available = [p for p in prizes if p['count'] > 0]
                if available:
                    return random.choice(available)
                return None
    available = [p for p in prizes if p['count'] > 0]
    if available:
        return random.choice(available)
    return None


@app.route('/api/activities', methods=['POST'])
def create_activity():
    data = request.get_json()
    name = data.get('name', '')
    prizes_data = data.get('prizes', [])
    max_draws = data.get('maxDraws', 1)
    duration = data.get('duration', 60)

    if not name:
        return jsonify({'error': '活动名称不能为空'}), 400

    if not prizes_data:
        return jsonify({'error': '至少需要一个奖项'}), 400

    activity_id = str(uuid.uuid4())
    code = generate_activity_code()

    prizes = []
    for p in prizes_data:
        prize_id = str(uuid.uuid4())
        prizes.append({
            'id': prize_id,
            'name': p.get('name', ''),
            'count': p.get('count', 0),
            'color': p.get('color', '#e94560'),
            'probability': p.get('probability', 0)
        })

    activity = {
        'id': activity_id,
        'name': name,
        'code': code,
        'prizes': prizes,
        'maxDraws': max_draws,
        'duration': duration,
        'isActive': True,
        'createdAt': datetime.now().isoformat(),
        'expiresAt': (datetime.now() + timedelta(minutes=duration)).isoformat(),
        'shareUrl': generate_share_url(code)
    }

    with activity_lock:
        activities[activity_id] = activity
        activities[code] = activity
        participants[activity_id] = {}
        win_records[activity_id] = []
        used_sessions[activity_id] = set()

    return jsonify(activity), 201


@app.route('/api/activities/<code>', methods=['GET'])
def get_activity(code):
    activity = activities.get(code.upper())
    if not activity:
        return jsonify({'error': '活动不存在'}), 404

    return jsonify({
        'id': activity['id'],
        'name': activity['name'],
        'code': activity['code'],
        'prizes': activity['prizes'],
        'maxDraws': activity['maxDraws'],
        'isActive': activity['isActive']
    })


@app.route('/api/admin/activities/<activity_id>', methods=['GET'])
def admin_get_activity(activity_id):
    activity = activities.get(activity_id)
    if not activity:
        return jsonify({'error': '活动不存在'}), 404

    return jsonify(activity)


@app.route('/api/admin/activities/<activity_id>/status', methods=['PATCH'])
def toggle_activity_status(activity_id):
    activity = activities.get(activity_id)
    if not activity:
        return jsonify({'error': '活动不存在'}), 404

    data = request.get_json()
    is_active = data.get('isActive', True)
    activity['isActive'] = is_active

    socketio.emit('activity_status', {'isActive': is_active}, room=activity_id)

    return jsonify(activity)


@app.route('/api/participants/<activity_id>', methods=['POST'])
def join_activity(activity_id):
    activity = activities.get(activity_id)
    if not activity:
        return jsonify({'error': '活动不存在'}), 404

    data = request.get_json()
    name = data.get('name', '').strip()

    if not name:
        return jsonify({'error': '昵称不能为空'}), 400

    participant_id = str(uuid.uuid4())

    if activity_id not in participants:
        participants[activity_id] = {}

    participants[activity_id][participant_id] = {
        'id': participant_id,
        'name': name,
        'drawCount': 0,
        'joinedAt': datetime.now().isoformat()
    }

    socketio.emit('participant_joined', {
        'participantId': participant_id,
        'name': name,
        'total': len(participants[activity_id])
    }, room=activity_id)

    return jsonify({
        'participantId': participant_id,
        'name': name
    }), 201


@app.route('/api/draw/<activity_id>', methods=['POST'])
def draw_prize(activity_id):
    activity = activities.get(activity_id)
    if not activity:
        return jsonify({'error': '活动不存在'}), 404

    if not activity['isActive']:
        return jsonify({'error': '抽奖已暂停'}), 400

    data = request.get_json()
    participant_id = data.get('participantId')
    session_id = data.get('sessionId')

    if not participant_id:
        return jsonify({'error': '缺少参与者ID'}), 400

    if not session_id:
        return jsonify({'error': '缺少会话ID'}), 400

    with activity_lock:
        if activity_id in used_sessions and session_id in used_sessions[activity_id]:
            return jsonify({'error': '请勿重复提交'}), 400

        used_sessions.setdefault(activity_id, set()).add(session_id)

        if activity_id not in participants or participant_id not in participants[activity_id]:
            return jsonify({'error': '参与者不存在'}), 404

        participant = participants[activity_id][participant_id]

        if participant['drawCount'] >= activity['maxDraws']:
            return jsonify({'error': '抽奖次数已用完'}), 400

        prize = select_prize(activity['prizes'])
        if not prize:
            return jsonify({'error': '所有奖品已抽完'}), 400

        prize['count'] -= 1
        participant['drawCount'] += 1

        record = {
            'id': str(uuid.uuid4()),
            'participantId': participant_id,
            'participantName': participant['name'],
            'prizeId': prize['id'],
            'prizeName': prize['name'],
            'prizeColor': prize['color'],
            'timestamp': datetime.now().isoformat()
        }

        win_records[activity_id].append(record)

    socketio.emit('new_win', {'record': record}, room=activity_id)
    socketio.emit('stats_update', {
        'totalParticipants': len(participants[activity_id]),
        'totalWins': len(win_records[activity_id])
    }, room=f'admin_{activity_id}')

    return jsonify(record)


@app.route('/api/draw/<activity_id>/records', methods=['GET'])
def get_my_records(activity_id):
    activity = activities.get(activity_id)
    if not activity:
        return jsonify({'error': '活动不存在'}), 404

    participant_id = request.args.get('participantId', '')

    records = []
    if activity_id in win_records:
        records = [
            r for r in win_records[activity_id]
            if r['participantId'] == participant_id
        ]
        records.sort(key=lambda x: x['timestamp'], reverse=True)

    return jsonify(records)


@app.route('/api/admin/activities/<activity_id>/records', methods=['GET'])
def admin_get_records(activity_id):
    activity = activities.get(activity_id)
    if not activity:
        return jsonify({'error': '活动不存在'}), 404

    prize_filter = request.args.get('prize', '')
    search = request.args.get('search', '')

    records = []
    if activity_id in win_records:
        records = list(win_records[activity_id])

    if prize_filter:
        records = [r for r in records if r['prizeId'] == prize_filter]

    if search:
        search_lower = search.lower()
        records = [r for r in records if search_lower in r['participantName'].lower()]

    records.sort(key=lambda x: x['timestamp'], reverse=True)

    return jsonify(records)


@app.route('/api/admin/activities/<activity_id>/participants', methods=['GET'])
def admin_get_participants(activity_id):
    activity = activities.get(activity_id)
    if not activity:
        return jsonify({'error': '活动不存在'}), 404

    participant_list = []
    if activity_id in participants:
        participant_list = list(participants[activity_id].values())

    return jsonify(participant_list)


@socketio.on('connect')
def handle_connect():
    activity_id = request.args.get('activityId', '')
    participant_id = request.args.get('participantId', '')

    if activity_id:
        join_room(activity_id)
        activity = activities.get(activity_id)
        if activity:
            emit('activity_status', {'isActive': activity['isActive']})

    if participant_id:
        join_room(f'user_{participant_id}')


@socketio.on('admin_connect')
def handle_admin_connect(data):
    activity_id = data.get('activityId', '')
    if activity_id:
        join_room(f'admin_{activity_id}')
        emit('stats_update', {
            'totalParticipants': len(participants.get(activity_id, {})),
            'totalWins': len(win_records.get(activity_id, []))
        })


@socketio.on('participant_won')
def handle_participant_won(data):
    pass


@socketio.on('disconnect')
def handle_disconnect():
    pass


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
