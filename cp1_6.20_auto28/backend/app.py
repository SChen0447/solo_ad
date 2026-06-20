import uuid
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import qrcode
import io
import base64

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

votes_db = {}


def generate_id():
    return str(uuid.uuid4())[:8]


def generate_qr_code(url):
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#00d2ff", back_color="#1a1a2e")

    buffered = io.BytesIO()
    img.save(buffered, format="PNG")
    img_str = base64.b64encode(buffered.getvalue()).decode()
    return f"data:image/png;base64,{img_str}"


def get_vote_status(vote):
    now = datetime.now()
    end_time = datetime.fromisoformat(vote['endTime'])

    if now >= end_time or vote.get('ended'):
        return 'ended'
    return 'active'


def serialize_vote(vote):
    vote_copy = vote.copy()
    vote_copy['status'] = get_vote_status(vote)
    vote_copy['totalVotes'] = vote.get('totalVotes', 0)
    return vote_copy


@app.route('/api/votes', methods=['GET'])
def get_votes():
    votes_list = [serialize_vote(v) for v in votes_db.values()]
    votes_list.sort(key=lambda x: x['createdAt'], reverse=True)
    return jsonify(votes_list)


@app.route('/api/votes/<vote_id>', methods=['GET'])
def get_vote(vote_id):
    vote = votes_db.get(vote_id)
    if not vote:
        return jsonify({'error': '投票不存在'}), 404
    return jsonify(serialize_vote(vote))


@app.route('/api/votes', methods=['POST'])
def create_vote():
    data = request.json

    if not data.get('title'):
        return jsonify({'error': '投票标题不能为空'}), 400

    options = data.get('options', [])
    if len(options) < 2:
        return jsonify({'error': '至少需要2个选项'}), 400

    vote_id = generate_id()

    vote_options = []
    for i, opt_text in enumerate(options):
        option = {
            'id': f'opt_{vote_id}_{i}',
            'text': opt_text,
            'votes': 0,
            'rating': 0,
            'ratingCount': 0
        }
        vote_options.append(option)

    vote = {
        'id': vote_id,
        'title': data['title'],
        'description': data.get('description', ''),
        'type': data.get('type', 'single'),
        'options': vote_options,
        'endTime': data['endTime'],
        'createdAt': datetime.now().isoformat(),
        'totalVotes': 0,
        'ended': False,
        'voters': []
    }

    votes_db[vote_id] = vote

    vote_url = f"{request.host_url}vote/{vote_id}"
    qr_code = generate_qr_code(vote_url)

    result = serialize_vote(vote)
    socketio.emit('update', result, room=vote_id)

    return jsonify({
        'vote': result,
        'qrCode': qr_code
    })


@app.route('/api/votes/submit', methods=['POST'])
def submit_vote():
    data = request.json
    vote_id = data.get('voteId')

    vote = votes_db.get(vote_id)
    if not vote:
        return jsonify({'error': '投票不存在'}), 404

    if vote.get('ended'):
        return jsonify({'error': '投票已结束'}), 400

    status = get_vote_status(vote)
    if status != 'active':
        return jsonify({'error': '投票未开始或已结束'}), 400

    option_ids = data.get('optionIds', [])
    ratings = data.get('ratings', {})

    if vote['type'] != 'rating' and len(option_ids) == 0:
        return jsonify({'error': '请选择投票选项'}), 400

    if vote['type'] == 'single' and len(option_ids) > 1:
        return jsonify({'error': '单选投票只能选择一个选项'}), 400

    if vote['type'] == 'rating':
        for opt in vote['options']:
            rating = ratings.get(opt['id'])
            if rating is None:
                return jsonify({'error': '请为所有选项评分'}), 400
            if rating < 1 or rating > 5:
                return jsonify({'error': '评分必须在1-5之间'}), 400

            opt['ratingCount'] = opt.get('ratingCount', 0) + 1
            total_rating = opt.get('rating', 0) * (opt['ratingCount'] - 1)
            opt['rating'] = round((total_rating + rating) / opt['ratingCount'], 1)

        vote['totalVotes'] += 1
    else:
        valid_option_ids = [opt['id'] for opt in vote['options']]
        for opt_id in option_ids:
            if opt_id not in valid_option_ids:
                return jsonify({'error': '无效的选项'}), 400

        for opt in vote['options']:
            if opt['id'] in option_ids:
                opt['votes'] += 1

        vote['totalVotes'] += 1

    result = serialize_vote(vote)

    socketio.emit('submit', result, room=vote_id)
    socketio.emit('update', result, room=vote_id)

    return jsonify(result)


@app.route('/api/votes/<vote_id>/end', methods=['POST'])
def end_vote(vote_id):
    vote = votes_db.get(vote_id)
    if not vote:
        return jsonify({'error': '投票不存在'}), 404

    vote['ended'] = True
    result = serialize_vote(vote)

    socketio.emit('update', result, room=vote_id)

    return jsonify(result)


@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')


@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')


@socketio.on('join')
def handle_join(room_id):
    join_room(room_id)
    print(f'Client {request.sid} joined room {room_id}')

    vote = votes_db.get(room_id)
    if vote:
        emit('update', serialize_vote(vote), room=request.sid)


@socketio.on('leave')
def handle_leave(room_id):
    leave_room(room_id)
    print(f'Client {request.sid} left room {room_id}')


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
