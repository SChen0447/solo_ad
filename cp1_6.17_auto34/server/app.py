from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import database as db

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

db.init_db()


@app.route('/api/votes', methods=['GET'])
def get_votes():
    votes = db.get_all_votes()
    return jsonify(votes)


@app.route('/api/votes', methods=['POST'])
def create_vote():
    data = request.get_json()
    title = data.get('title', '').strip()
    vote_type = data.get('vote_type', 'single')
    options = data.get('options', [])
    creator_id = data.get('creator_id', '')
    deadline = data.get('deadline')
    if not title or len(title) > 50:
        return jsonify({'error': '标题不能为空且不超过50字'}), 400
    if not options or len(options) < 2 or len(options) > 8:
        return jsonify({'error': '选项数量需在2-8之间'}), 400
    if not creator_id:
        return jsonify({'error': '缺少creator_id'}), 400
    if vote_type not in ('single', 'multiple'):
        vote_type = 'single'
    options = [opt.strip() for opt in options if opt and opt.strip()]
    if len(options) < 2:
        return jsonify({'error': '有效选项至少2个'}), 400
    vote = db.create_vote(title, vote_type, options, creator_id, deadline)
    socketio.emit('vote_created', vote, broadcast=True)
    return jsonify(vote)


@app.route('/api/votes/<vote_id>', methods=['GET'])
def get_vote(vote_id):
    vote = db.get_vote_detail(vote_id)
    if not vote:
        return jsonify({'error': '投票不存在'}), 404
    return jsonify(vote)


@app.route('/api/votes/<vote_id>/vote', methods=['POST'])
def do_vote(vote_id):
    data = request.get_json()
    option_ids = data.get('option_ids', [])
    user_id = data.get('user_id', '')
    if not option_ids or not user_id:
        return jsonify({'error': '参数不完整'}), 400
    updated = db.submit_vote(vote_id, option_ids, user_id)
    if not updated:
        return jsonify({'error': '投票失败或已投过'}), 400
    socketio.emit('vote_updated', updated, room=vote_id)
    socketio.emit('vote_list_updated', {'id': vote_id, 'total_voters': updated['total_voters']}, broadcast=True)
    return jsonify(updated)


@app.route('/api/votes/<vote_id>', methods=['DELETE'])
def remove_vote(vote_id):
    data = request.get_json() or {}
    creator_id = data.get('creator_id', '')
    ok = db.delete_vote(vote_id, creator_id)
    if not ok:
        return jsonify({'error': '删除失败'}), 400
    socketio.emit('vote_deleted', {'id': vote_id}, broadcast=True)
    return jsonify({'success': True})


@app.route('/api/votes/<vote_id>/messages', methods=['GET'])
def get_msgs(vote_id):
    msgs = db.get_messages(vote_id)
    return jsonify(msgs)


@socketio.on('join_vote')
def on_join(data):
    vote_id = data.get('vote_id')
    if vote_id:
        join_room(vote_id)


@socketio.on('leave_vote')
def on_leave(data):
    vote_id = data.get('vote_id')
    if vote_id:
        leave_room(vote_id)


@socketio.on('send_message')
def on_message(data):
    vote_id = data.get('vote_id')
    nickname = data.get('nickname', '')
    content = data.get('content', '').strip()
    if not vote_id or not content:
        return
    msg = db.add_message(vote_id, nickname, content)
    emit('new_message', msg, room=vote_id)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
