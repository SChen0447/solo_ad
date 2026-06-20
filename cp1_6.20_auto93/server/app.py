import uuid
import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
app.config['SECRET_KEY'] = 'team-idea-canvas-secret'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

MAX_VOTES_PER_USER = 3

topics = {}
ideas = {}
user_votes = {}


def generate_id():
    return str(uuid.uuid4())


def serialize_topic(topic):
    return {
        'id': topic['id'],
        'title': topic['title'],
        'description': topic['description'],
        'creator_id': topic['creator_id'],
        'created_at': topic['created_at'].isoformat() if topic['created_at'] else None,
        'deadline': topic['deadline'].isoformat() if topic['deadline'] else None,
        'is_voting_ended': topic['is_voting_ended'],
    }


def serialize_idea(idea):
    return {
        'id': idea['id'],
        'topic_id': idea['topic_id'],
        'title': idea['title'],
        'description': idea['description'],
        'author_id': idea['author_id'],
        'author_name': idea['author_name'],
        'author_avatar': idea['author_avatar'],
        'votes': idea['votes'],
        'created_at': idea['created_at'].isoformat() if idea['created_at'] else None,
    }


def is_voting_ended(topic):
    if topic['is_voting_ended']:
        return True
    if topic['deadline']:
        return datetime.datetime.now(datetime.timezone.utc) >= topic['deadline']
    return False


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200


@app.route('/api/topics', methods=['GET'])
def get_topics():
    result = []
    for topic in topics.values():
        t = serialize_topic(topic)
        t['is_voting_ended'] = is_voting_ended(topic)
        result.append(t)
    return jsonify(result), 200


@app.route('/api/topics', methods=['POST'])
def create_topic():
    data = request.get_json() or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    creator_id = data.get('creator_id', generate_id())

    if not title:
        return jsonify({'error': '主题标题不能为空'}), 400

    topic_id = generate_id()
    topic = {
        'id': topic_id,
        'title': title,
        'description': description,
        'creator_id': creator_id,
        'created_at': datetime.datetime.now(datetime.timezone.utc),
        'deadline': None,
        'is_voting_ended': False,
    }
    topics[topic_id] = topic
    ideas[topic_id] = []

    socketio.emit('topic:created', serialize_topic(topic), namespace='/')
    return jsonify(serialize_topic(topic)), 201


@app.route('/api/topics/<topic_id>', methods=['GET'])
def get_topic(topic_id):
    topic = topics.get(topic_id)
    if not topic:
        return jsonify({'error': '主题不存在'}), 404
    t = serialize_topic(topic)
    t['is_voting_ended'] = is_voting_ended(topic)
    return jsonify(t), 200


@app.route('/api/topics/<topic_id>/deadline', methods=['PUT'])
def set_deadline(topic_id):
    topic = topics.get(topic_id)
    if not topic:
        return jsonify({'error': '主题不存在'}), 404

    data = request.get_json() or {}
    deadline_str = data.get('deadline')
    user_id = data.get('user_id', '')

    if user_id != topic['creator_id']:
        return jsonify({'error': '只有创建者可以设置截止时间'}), 403

    if deadline_str:
        try:
            topic['deadline'] = datetime.datetime.fromisoformat(deadline_str.replace('Z', '+00:00'))
        except (ValueError, AttributeError):
            return jsonify({'error': '无效的截止时间格式'}), 400
    else:
        topic['deadline'] = None

    ended = is_voting_ended(topic)
    t = serialize_topic(topic)
    t['is_voting_ended'] = ended

    socketio.emit(f'topic:{topic_id}:updated', t, namespace='/')
    return jsonify(t), 200


@app.route('/api/topics/<topic_id>/end', methods=['POST'])
def end_voting(topic_id):
    topic = topics.get(topic_id)
    if not topic:
        return jsonify({'error': '主题不存在'}), 404

    data = request.get_json() or {}
    user_id = data.get('user_id', '')

    if user_id != topic['creator_id']:
        return jsonify({'error': '只有创建者可以结束投票'}), 403

    topic['is_voting_ended'] = True
    t = serialize_topic(topic)
    t['is_voting_ended'] = True

    socketio.emit(f'topic:{topic_id}:updated', t, namespace='/')
    socketio.emit(f'topic:{topic_id}:voting_ended', t, namespace='/')
    return jsonify(t), 200


@app.route('/api/topics/<topic_id>/ideas', methods=['GET'])
def get_ideas(topic_id):
    if topic_id not in ideas:
        return jsonify({'error': '主题不存在'}), 404
    return jsonify([serialize_idea(idea) for idea in ideas[topic_id]]), 200


@app.route('/api/topics/<topic_id>/ideas', methods=['POST'])
def create_idea(topic_id):
    if topic_id not in ideas:
        return jsonify({'error': '主题不存在'}), 404

    topic = topics[topic_id]
    if is_voting_ended(topic):
        return jsonify({'error': '投票已结束，无法添加新卡片'}), 400

    data = request.get_json() or {}
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    author_id = data.get('author_id', generate_id())
    author_name = data.get('author_name', '匿名用户')
    author_avatar = data.get('author_avatar', '')

    if not title:
        return jsonify({'error': '卡片标题不能为空'}), 400
    if len(title) > 50:
        return jsonify({'error': '卡片标题最多50字'}), 400
    if len(description) > 300:
        return jsonify({'error': '卡片描述最多300字'}), 400

    idea_id = generate_id()
    idea = {
        'id': idea_id,
        'topic_id': topic_id,
        'title': title,
        'description': description,
        'author_id': author_id,
        'author_name': author_name,
        'author_avatar': author_avatar,
        'votes': 0,
        'created_at': datetime.datetime.now(datetime.timezone.utc),
    }
    ideas[topic_id].append(idea)

    socketio.emit(f'topic:{topic_id}:idea:created', serialize_idea(idea), namespace='/')
    return jsonify(serialize_idea(idea)), 201


@app.route('/api/topics/<topic_id>/ideas/<idea_id>/vote', methods=['POST'])
def vote_idea(topic_id, idea_id):
    if topic_id not in ideas:
        return jsonify({'error': '主题不存在'}), 404

    topic = topics[topic_id]
    if is_voting_ended(topic):
        return jsonify({'error': '投票已结束'}), 400

    data = request.get_json() or {}
    user_id = data.get('user_id', '')

    if not user_id:
        return jsonify({'error': '用户ID不能为空'}), 400

    idea = None
    for i in ideas[topic_id]:
        if i['id'] == idea_id:
            idea = i
            break
    if not idea:
        return jsonify({'error': '卡片不存在'}), 404

    vote_key = f"{topic_id}:{user_id}"
    if vote_key not in user_votes:
        user_votes[vote_key] = set()

    user_vote_set = user_votes[vote_key]
    if idea_id in user_vote_set:
        return jsonify({'error': '您已为该卡片投过票'}), 400

    if len(user_vote_set) >= MAX_VOTES_PER_USER:
        return jsonify({'error': f'您最多只能投{MAX_VOTES_PER_USER}票'}), 400

    user_vote_set.add(idea_id)
    idea['votes'] += 1

    payload = {
        'idea_id': idea_id,
        'votes': idea['votes'],
        'user_id': user_id,
        'remaining_votes': MAX_VOTES_PER_USER - len(user_vote_set),
    }
    socketio.emit(f'topic:{topic_id}:idea:voted', payload, namespace='/')
    return jsonify(payload), 200


@app.route('/api/topics/<topic_id>/user-votes', methods=['GET'])
def get_user_votes(topic_id):
    if topic_id not in topics:
        return jsonify({'error': '主题不存在'}), 404
    user_id = request.args.get('user_id', '')
    vote_key = f"{topic_id}:{user_id}"
    voted_ids = list(user_votes.get(vote_key, set()))
    return jsonify({
        'voted_ids': voted_ids,
        'remaining_votes': MAX_VOTES_PER_USER - len(voted_ids),
        'max_votes': MAX_VOTES_PER_USER,
    }), 200


@socketio.on('join')
def on_join(data):
    topic_id = data.get('topic_id', '')
    if topic_id:
        join_room(topic_id)
        emit('joined', {'topic_id': topic_id})


@socketio.on('leave')
def on_leave(data):
    topic_id = data.get('topic_id', '')
    if topic_id:
        leave_room(topic_id)
        emit('left', {'topic_id': topic_id})


if __name__ == '__main__':
    sample_topic_id = generate_id()
    topics[sample_topic_id] = {
        'id': sample_topic_id,
        'title': 'Q4产品创新方向',
        'description': '讨论下一季度我们产品的创新方向和功能优先级',
        'creator_id': 'admin',
        'created_at': datetime.datetime.now(datetime.timezone.utc),
        'deadline': None,
        'is_voting_ended': False,
    }
    ideas[sample_topic_id] = [
        {
            'id': generate_id(),
            'topic_id': sample_topic_id,
            'title': 'AI智能助手',
            'description': '在产品中集成AI助手，帮助用户快速完成任务，提升工作效率',
            'author_id': 'u1',
            'author_name': '张小明',
            'author_avatar': '',
            'votes': 5,
            'created_at': datetime.datetime.now(datetime.timezone.utc),
        },
        {
            'id': generate_id(),
            'topic_id': sample_topic_id,
            'title': '移动端适配优化',
            'description': '全面优化移动端体验，支持离线模式和快捷操作手势',
            'author_id': 'u2',
            'author_name': '李小红',
            'author_avatar': '',
            'votes': 3,
            'created_at': datetime.datetime.now(datetime.timezone.utc),
        },
        {
            'id': generate_id(),
            'topic_id': sample_topic_id,
            'title': '团队协作看板',
            'description': '新增看板视图，支持拖拽式任务管理和实时多人协作',
            'author_id': 'u3',
            'author_name': '王大力',
            'author_avatar': '',
            'votes': 7,
            'created_at': datetime.datetime.now(datetime.timezone.utc),
        },
    ]

    socketio.run(app, host='0.0.0.0', port=5000, debug=True, allow_unsafe_werkzeug=True)
