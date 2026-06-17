import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import time
import uuid

from database import db
from matrix_engine import engine

app = Flask(__name__)
app.config['SECRET_KEY'] = 'idea-matrix-secret-key'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

connected_clients = set()


def broadcast_update(event_type: str, data: dict):
    socketio.emit(event_type, data, namespace='/ws/updates')


@socketio.on('connect', namespace='/ws/updates')
def handle_connect():
    client_id = str(uuid.uuid4())
    connected_clients.add(request.sid)
    emit('client_connected', {'client_id': client_id, 'timestamp': time.time()})


@socketio.on('disconnect', namespace='/ws/updates')
def handle_disconnect():
    connected_clients.discard(request.sid)


@app.route('/api/ideas', methods=['GET'])
def get_ideas():
    ideas = db.get_all_ideas()
    weights = db.get_weights()
    return jsonify({
        'ideas': [db.idea_to_dict(idea) for idea in ideas],
        'weights': weights
    })


@app.route('/api/ideas', methods=['POST'])
def create_idea():
    data = request.json
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    author_name = data.get('author_name', '匿名用户').strip()

    if not title:
        return jsonify({'error': '标题不能为空'}), 400
    if len(description) > 200:
        return jsonify({'error': '描述不能超过200字'}), 400

    idea = db.create_idea(title, description, author_name)
    engine.recalculate_all()

    idea_dict = db.idea_to_dict(idea)
    broadcast_update('idea_created', idea_dict)

    return jsonify(idea_dict), 201


@app.route('/api/ideas/<idea_id>/like', methods=['POST'])
def like_idea(idea_id):
    data = request.json
    user_id = data.get('user_id', f'user_{int(time.time() * 1000)}')

    idea = db.add_like(idea_id, user_id)
    if not idea:
        return jsonify({'error': '想法不存在'}), 404

    engine.recalculate_all()

    idea_dict = db.idea_to_dict(idea)
    broadcast_update('idea_updated', idea_dict)

    return jsonify(idea_dict)


@app.route('/api/ideas/<idea_id>/vote', methods=['POST'])
def vote_idea(idea_id):
    data = request.json
    user_id = data.get('user_id', f'user_{int(time.time() * 1000)}')
    rating = data.get('rating', 0)

    if rating < 0.5 or rating > 5:
        return jsonify({'error': '评分必须在0.5到5之间'}), 400

    idea = db.add_vote(idea_id, user_id, rating)
    if not idea:
        return jsonify({'error': '想法不存在'}), 404

    engine.recalculate_all()

    idea_dict = db.idea_to_dict(idea)
    broadcast_update('idea_updated', idea_dict)

    return jsonify(idea_dict)


@app.route('/api/ideas/<idea_id>/comment', methods=['POST'])
def comment_idea(idea_id):
    data = request.json
    user_id = data.get('user_id', f'user_{int(time.time() * 1000)}')
    user_name = data.get('user_name', '匿名用户')
    content = data.get('content', '').strip()

    if not content:
        return jsonify({'error': '评论内容不能为空'}), 400

    idea = db.add_comment(idea_id, user_id, user_name, content)
    if not idea:
        return jsonify({'error': '想法不存在'}), 404

    engine.recalculate_all()

    idea_dict = db.idea_to_dict(idea)
    broadcast_update('idea_updated', idea_dict)

    return jsonify(idea_dict)


@app.route('/api/matrix', methods=['PUT'])
def update_matrix():
    data = request.json
    idea_id = data.get('idea_id')
    matrix_x = data.get('matrix_x')
    matrix_y = data.get('matrix_y')

    if not idea_id or matrix_x is None or matrix_y is None:
        return jsonify({'error': '缺少必要参数'}), 400

    idea = db.update_matrix_position(idea_id, matrix_x, matrix_y)
    if not idea:
        return jsonify({'error': '想法不存在'}), 404

    idea_dict = db.idea_to_dict(idea)
    broadcast_update('matrix_updated', idea_dict)

    return jsonify(idea_dict)


@app.route('/api/weights', methods=['PUT'])
def update_weights():
    data = request.json
    importance_weight = data.get('importance_weight', 5.0)
    urgency_weight = data.get('urgency_weight', 5.0)

    importance_weight = max(0, min(10, importance_weight))
    urgency_weight = max(0, min(10, urgency_weight))

    db.set_weights(importance_weight, urgency_weight)
    updated_ideas = engine.recalculate_all()

    weights = db.get_weights()
    broadcast_update('weights_updated', {
        'weights': weights,
        'ideas': updated_ideas
    })

    return jsonify({
        'weights': weights,
        'ideas': updated_ideas
    })


@app.route('/api/weights', methods=['GET'])
def get_weights():
    return jsonify(db.get_weights())


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'healthy', 'clients': len(connected_clients)})


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
