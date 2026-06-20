import uuid
import random
import string
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'live-vote-pace-secret'
CORS(app, resources={r"/api/*": {"origins": "*"}, "/socket.io/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

sessions = {}
MAX_HISTORY = 50


def generate_room_code():
    while True:
        code = ''.join(random.choices(string.digits, k=6))
        if code not in sessions:
            return code


def make_topic(topic_name, index):
    return {
        'id': str(uuid.uuid4())[:8],
        'name': topic_name,
        'index': index,
        'votes': {'for': 0, 'against': 0, 'neutral': 0},
        'voter_choices': {},
        'suggested_duration': 5.0,
        'elapsed': 0,
    }


def make_history_entry(topic_name, vote_type, delta, total_votes):
    return {
        'id': str(uuid.uuid4())[:8],
        'timestamp': datetime.now().strftime('%H:%M:%S'),
        'topic_name': topic_name,
        'vote_type': vote_type,
        'delta': delta,
        'total_votes': total_votes,
    }


@app.route('/api/sessions', methods=['POST'])
def create_session():
    data = request.get_json()
    title = data.get('title', '').strip()[:30]
    description = data.get('description', '').strip()
    topics = data.get('topics', [])

    if not title:
        return jsonify({'error': '标题不能为空'}), 400
    if len(topics) < 3:
        return jsonify({'error': '至少需要3个话题'}), 400

    topic_list = []
    for i, t in enumerate(topics):
        name = t.strip()[:50]
        if name:
            topic_list.append(make_topic(name, i))

    if len(topic_list) < 3:
        return jsonify({'error': '至少需要3个有效话题'}), 400

    room_code = generate_room_code()
    speaker_id = str(uuid.uuid4())[:8]
    session_id = str(uuid.uuid4())[:8]

    session_data = {
        'id': session_id,
        'room_code': room_code,
        'title': title,
        'description': description,
        'speaker_id': speaker_id,
        'topics': topic_list,
        'current_topic_index': 0,
        'history': [],
        'audience_count': 0,
    }

    sessions[room_code] = session_data

    return jsonify({
        'session_id': session_id,
        'room_code': room_code,
        'speaker_id': speaker_id,
        'title': title,
        'description': description,
        'topics': topic_list,
        'current_topic_index': 0,
        'invite_link': f'http://localhost:5173/join/{room_code}',
    }), 201


@app.route('/api/sessions/<room_code>', methods=['GET'])
def get_session(room_code):
    if room_code not in sessions:
        return jsonify({'error': '房间不存在'}), 404

    s = sessions[room_code]
    return jsonify({
        'session_id': s['id'],
        'room_code': s['room_code'],
        'title': s['title'],
        'description': s['description'],
        'speaker_id': s['speaker_id'],
        'topics': s['topics'],
        'current_topic_index': s['current_topic_index'],
        'audience_count': s['audience_count'],
    }), 200


@socketio.on('connect')
def on_connect():
    pass


@socketio.on('disconnect')
def on_disconnect():
    pass


@socketio.on('join_session')
def on_join_session(data):
    room_code = data.get('room_code')
    if room_code not in sessions:
        emit('error', {'message': '房间不存在'})
        return

    join_room(room_code)
    s = sessions[room_code]
    s['audience_count'] += 1

    topic = s['topics'][s['current_topic_index']]
    emit('session_joined', {
        'session_id': s['id'],
        'room_code': s['room_code'],
        'title': s['title'],
        'description': s['description'],
        'current_topic': topic,
        'current_topic_index': s['current_topic_index'],
        'topics': s['topics'],
        'audience_count': s['audience_count'],
    })

    emit('audience_count_update', {
        'audience_count': s['audience_count'],
    }, room=room_code)


@socketio.on('speaker_join')
def on_speaker_join(data):
    room_code = data.get('room_code')
    speaker_id = data.get('speaker_id')

    if room_code not in sessions:
        emit('error', {'message': '房间不存在'})
        return

    s = sessions[room_code]
    if s['speaker_id'] != speaker_id:
        emit('error', {'message': '演讲者身份验证失败'})
        return

    join_room(room_code)

    emit('session_joined', {
        'session_id': s['id'],
        'room_code': s['room_code'],
        'title': s['title'],
        'description': s['description'],
        'current_topic': s['topics'][s['current_topic_index']],
        'current_topic_index': s['current_topic_index'],
        'topics': s['topics'],
        'audience_count': s['audience_count'],
        'speaker_id': speaker_id,
        'history': s['history'],
    })


@socketio.on('leave_session')
def on_leave_session(data):
    room_code = data.get('room_code')
    if room_code not in sessions:
        return

    leave_room(room_code)
    s = sessions[room_code]
    s['audience_count'] = max(0, s['audience_count'] - 1)
    emit('audience_count_update', {
        'audience_count': s['audience_count'],
    }, room=room_code)


@socketio.on('vote')
def on_vote(data):
    room_code = data.get('room_code')
    topic_id = data.get('topic_id')
    vote_type = data.get('vote_type')
    voter_id = data.get('voter_id')

    if room_code not in sessions:
        emit('error', {'message': '房间不存在'})
        return

    if vote_type not in ('for', 'against', 'neutral'):
        emit('error', {'message': '无效的投票类型'})
        return

    s = sessions[room_code]
    topic = None
    for t in s['topics']:
        if t['id'] == topic_id:
            topic = t
            break

    if topic is None:
        emit('error', {'message': '话题不存在'})
        return

    old_choice = topic['voter_choices'].get(voter_id)
    if old_choice:
        topic['votes'][old_choice] = max(0, topic['votes'][old_choice] - 1)

    topic['votes'][vote_type] += 1
    topic['voter_choices'][voter_id] = vote_type

    total = topic['votes']['for'] + topic['votes']['against'] + topic['votes']['neutral']

    history_entry = make_history_entry(
        topic['name'],
        vote_type,
        +1 if not old_choice else 0,
        total,
    )
    s['history'].insert(0, history_entry)
    if len(s['history']) > MAX_HISTORY:
        s['history'] = s['history'][:MAX_HISTORY]

    emit('vote_updated', {
        'topic_id': topic['id'],
        'votes': topic['votes'],
        'total': total,
        'voter_choice': vote_type,
        'voter_id': voter_id,
    }, room=room_code)

    emit('history_update', {
        'history': s['history'],
    }, room=room_code)


@socketio.on('next_topic')
def on_next_topic(data):
    room_code = data.get('room_code')
    speaker_id = data.get('speaker_id')

    if room_code not in sessions:
        return

    s = sessions[room_code]
    if s['speaker_id'] != speaker_id:
        return

    next_idx = s['current_topic_index'] + 1
    if next_idx >= len(s['topics']):
        emit('session_ended', {'message': '所有话题已完成'})
        return

    s['current_topic_index'] = next_idx
    topic = s['topics'][next_idx]

    emit('topic_changed', {
        'current_topic': topic,
        'current_topic_index': next_idx,
        'topics': s['topics'],
    }, room=room_code)


@socketio.on('prev_topic')
def on_prev_topic(data):
    room_code = data.get('room_code')
    speaker_id = data.get('speaker_id')

    if room_code not in sessions:
        return

    s = sessions[room_code]
    if s['speaker_id'] != speaker_id:
        return

    prev_idx = s['current_topic_index'] - 1
    if prev_idx < 0:
        return

    s['current_topic_index'] = prev_idx
    topic = s['topics'][prev_idx]

    emit('topic_changed', {
        'current_topic': topic,
        'current_topic_index': prev_idx,
        'topics': s['topics'],
    }, room=room_code)


@socketio.on('adjust_time')
def on_adjust_time(data):
    room_code = data.get('room_code')
    speaker_id = data.get('speaker_id')
    topic_id = data.get('topic_id')
    duration = data.get('duration')

    if room_code not in sessions:
        return

    s = sessions[room_code]
    if s['speaker_id'] != speaker_id:
        return

    for t in s['topics']:
        if t['id'] == topic_id:
            t['suggested_duration'] = duration
            break

    emit('time_adjusted', {
        'topic_id': topic_id,
        'duration': duration,
    }, room=room_code)


@socketio.on('speed_up')
def on_speed_up(data):
    room_code = data.get('room_code')
    speaker_id = data.get('speaker_id')

    if room_code not in sessions:
        return

    s = sessions[room_code]
    if s['speaker_id'] != speaker_id:
        return

    emit('pace_change', {
        'type': 'speed_up',
        'message': '演讲者建议加速！',
    }, room=room_code)


@socketio.on('slow_down')
def on_slow_down(data):
    room_code = data.get('room_code')
    speaker_id = data.get('speaker_id')

    if room_code not in sessions:
        return

    s = sessions[room_code]
    if s['speaker_id'] != speaker_id:
        return

    emit('pace_change', {
        'type': 'slow_down',
        'message': '演讲者建议减速！',
    }, room=room_code)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
