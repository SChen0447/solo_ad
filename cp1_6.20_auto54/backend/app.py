from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import jwt
import datetime
import threading
import uuid
from functools import wraps
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from evaluator import evaluate_code, get_assignments

app = Flask(__name__)
app.config['SECRET_KEY'] = 'code-evaluation-secret-key-2026'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

users = {}
submissions = {}
user_submissions = {}

SECRET_KEY = 'code-evaluation-secret-key-2026'


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            token = token.replace('Bearer ', '')
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            current_user = data['email']
        except:
            return jsonify({'error': 'Token is invalid'}), 401
        return f(current_user, *args, **kwargs)
    return decorated


@app.route('/api/register', methods=['POST'])
def register():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if email in users:
        return jsonify({'error': 'User already exists'}), 400

    users[email] = {'password': password, 'email': email}
    user_submissions[email] = []

    token = jwt.encode({
        'email': email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, SECRET_KEY, algorithm='HS256')

    return jsonify({'token': token, 'email': email})


@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    email = data.get('email')
    password = data.get('password')

    if email not in users or users[email]['password'] != password:
        return jsonify({'error': 'Invalid credentials'}), 401

    token = jwt.encode({
        'email': email,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }, SECRET_KEY, algorithm='HS256')

    return jsonify({'token': token, 'email': email})


@app.route('/api/assignments', methods=['GET'])
@token_required
def get_assignments_list(current_user):
    assignments = get_assignments()
    return jsonify({'assignments': assignments})


@app.route('/api/run_tests', methods=['POST'])
@token_required
def run_tests(current_user):
    data = request.json
    code = data.get('code', '')
    assignment_id = data.get('assignment_id', '1')

    def progress_callback(update):
        socketio.emit('evaluation_progress', {
            'user': current_user,
            'assignment_id': assignment_id,
            **update
        })

    def run_evaluation():
        result = evaluate_code(code, assignment_id, progress_callback)
        result['email'] = current_user
        result['assignment_id'] = assignment_id

        submissions[result['submission_id']] = result
        if current_user not in user_submissions:
            user_submissions[current_user] = []
        user_submissions[current_user].append(result['submission_id'])

        socketio.emit('evaluation_complete', {
            'user': current_user,
            'assignment_id': assignment_id,
            **result
        })

    thread = threading.Thread(target=run_evaluation)
    thread.start()

    return jsonify({'status': 'started', 'message': 'Evaluation started'})


@app.route('/api/results/<submission_id>', methods=['GET'])
@token_required
def get_result(current_user, submission_id):
    result = submissions.get(submission_id)
    if not result:
        return jsonify({'error': 'Result not found'}), 404
    if result.get('email') != current_user:
        return jsonify({'error': 'Unauthorized'}), 403
    return jsonify(result)


@app.route('/api/submissions', methods=['GET'])
@token_required
def get_submissions(current_user):
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))

    user_sub_ids = user_submissions.get(current_user, [])
    user_sub_list = [submissions[sid] for sid in reversed(user_sub_ids) if sid in submissions]

    total = len(user_sub_list)
    start = (page - 1) * per_page
    end = start + per_page
    paginated = user_sub_list[start:end]

    return jsonify({
        'submissions': paginated,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    })


@socketio.on('connect')
def handle_connect():
    print('Client connected')


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')


@socketio.on('subscribe')
def handle_subscribe(data):
    channel = data.get('channel')
    print(f'Subscribed to channel: {channel}')


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
