from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import json
import io
from vote_manager import VoteManager

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

vote_manager = VoteManager()


@app.route('/api/courses', methods=['POST'])
def create_course():
    data = request.get_json()
    name = data.get('name', '未命名课程')
    course = vote_manager.create_course(name)
    return jsonify(vote_manager.to_dict(course.code))


@app.route('/api/courses/<code>', methods=['GET'])
def get_course(code):
    course = vote_manager.to_dict(code)
    if not course:
        return jsonify({'error': '课程不存在'}), 404
    return jsonify(course)


@app.route('/api/courses/<code>/start-qa', methods=['POST'])
def start_qa(code):
    course = vote_manager.start_qa_session(code)
    if not course:
        return jsonify({'error': '课程不存在'}), 404
    room = f'course_{code}'
    socketio.emit('qa_started', vote_manager.to_dict(code), room=room)
    return jsonify(vote_manager.to_dict(code))


@app.route('/api/courses/<code>/end-qa', methods=['POST'])
def end_qa(code):
    course = vote_manager.end_qa_session(code)
    if not course:
        return jsonify({'error': '课程不存在'}), 404
    room = f'course_{code}'
    socketio.emit('qa_ended', vote_manager.to_dict(code), room=room)
    return jsonify(vote_manager.to_dict(code))


@app.route('/api/courses/<code>/questions/<question_id>/star', methods=['POST'])
def star_question(code, question_id):
    data = request.get_json()
    starred = data.get('starred', True)
    question = vote_manager.star_question(code, question_id, starred)
    if not question:
        return jsonify({'error': '问题不存在'}), 404
    room = f'course_{code}'
    socketio.emit('question_updated', {
        'code': code,
        'question': {
            'id': question.id,
            'content': question.content,
            'color': question.color,
            'is_starred': question.is_starred,
            'is_for_vote': question.is_for_vote,
            'votes_agree': question.votes_agree,
            'votes_disagree': question.votes_disagree
        }
    }, room=room)
    return jsonify(vote_manager.to_dict(code))


@app.route('/api/courses/<code>/questions/<question_id>/vote-mark', methods=['POST'])
def mark_for_vote(code, question_id):
    data = request.get_json()
    for_vote = data.get('for_vote', True)
    question = vote_manager.mark_for_vote(code, question_id, for_vote)
    if not question:
        return jsonify({'error': '问题不存在'}), 404
    room = f'course_{code}'
    socketio.emit('question_updated', {
        'code': code,
        'question': {
            'id': question.id,
            'content': question.content,
            'color': question.color,
            'is_starred': question.is_starred,
            'is_for_vote': question.is_for_vote,
            'votes_agree': question.votes_agree,
            'votes_disagree': question.votes_disagree
        }
    }, room=room)
    return jsonify(vote_manager.to_dict(code))


@app.route('/api/courses/<code>/results', methods=['GET'])
def get_results(code):
    results = vote_manager.get_vote_results(code)
    if not results:
        return jsonify({'error': '课程不存在'}), 404
    return jsonify(results)


@app.route('/api/courses/<code>/export', methods=['GET'])
def export_results(code):
    results = vote_manager.get_vote_results(code)
    if not results:
        return jsonify({'error': '课程不存在'}), 404
    json_data = json.dumps(results, ensure_ascii=False, indent=2)
    buffer = io.BytesIO(json_data.encode('utf-8'))
    buffer.seek(0)
    return send_file(
        buffer,
        mimetype='application/json',
        as_attachment=True,
        download_name=f'vote_results_{code}.json'
    )


@socketio.on('join_course')
def handle_join(data):
    code = data.get('code')
    if not code:
        return
    room = f'course_{code}'
    join_room(room)
    emit('course_state', vote_manager.to_dict(code))


@socketio.on('leave_course')
def handle_leave(data):
    code = data.get('code')
    if not code:
        return
    room = f'course_{code}'
    leave_room(room)


@socketio.on('submit_question')
def handle_question(data):
    code = data.get('code')
    content = data.get('content', '')
    question = vote_manager.add_question(code, content)
    if not question:
        emit('error', {'message': '无法提交问题'})
        return
    room = f'course_{code}'
    socketio.emit('new_question', {
        'code': code,
        'question': {
            'id': question.id,
            'content': question.content,
            'color': question.color,
            'is_starred': question.is_starred,
            'is_for_vote': question.is_for_vote,
            'votes_agree': question.votes_agree,
            'votes_disagree': question.votes_disagree
        }
    }, room=room)


@socketio.on('submit_vote')
def handle_vote(data):
    code = data.get('code')
    question_id = data.get('question_id')
    student_id = data.get('student_id', '')
    agree = data.get('agree', True)
    result = vote_manager.submit_vote(code, question_id, student_id, agree)
    if not result:
        emit('error', {'message': '无法提交投票'})
        return
    room = f'course_{code}'
    socketio.emit('vote_updated', {
        'code': code,
        'result': result
    }, room=room)


@socketio.on('request_state')
def handle_request_state(data):
    code = data.get('code')
    if code:
        emit('course_state', vote_manager.to_dict(code))


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
