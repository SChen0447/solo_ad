from flask import Flask, request, jsonify, make_response
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid
import csv
import io
from datetime import datetime
from collections import defaultdict

app = Flask(__name__)
app.config['SECRET_KEY'] = 'instant-vote-secret-key'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

votes_db = {}
participated_db = defaultdict(list)
created_db = defaultdict(list)


def generate_id():
    return str(uuid.uuid4())[:8]


@app.route('/api/votes', methods=['POST'])
def create_vote():
    data = request.get_json()
    vote_id = generate_id()
    now = datetime.now().isoformat()

    vote = {
        'id': vote_id,
        'title': data.get('title', ''),
        'options': [{'id': idx, 'text': opt, 'votes': 0, 'timestamps': []}
                    for idx, opt in enumerate(data.get('options', []))],
        'isMultiple': data.get('isMultiple', False),
        'deadline': data.get('deadline', ''),
        'createdAt': now,
        'createdBy': data.get('userId', 'anonymous'),
        'totalVotes': 0,
        'voters': []
    }

    votes_db[vote_id] = vote
    created_db[vote['createdBy']].append(vote_id)

    return jsonify({
        'id': vote_id,
        'link': f'/vote/{vote_id}',
        'vote': vote
    }), 201


@app.route('/api/votes/<vote_id>', methods=['GET'])
def get_vote(vote_id):
    vote = votes_db.get(vote_id)
    if not vote:
        return jsonify({'error': 'Vote not found'}), 404
    return jsonify(vote)


@app.route('/api/votes/<vote_id>/vote', methods=['POST'])
def submit_vote(vote_id):
    vote = votes_db.get(vote_id)
    if not vote:
        return jsonify({'error': 'Vote not found'}), 404

    data = request.get_json()
    option_ids = data.get('optionIds', [])
    user_id = data.get('userId', 'anonymous')

    if vote['deadline']:
        deadline = datetime.fromisoformat(vote['deadline'])
        if datetime.now() > deadline:
            return jsonify({'error': 'Vote has ended'}), 400

    if not vote.get('isMultiple', False) and len(option_ids) != 1:
        return jsonify({'error': 'Single choice only'}), 400

    now = datetime.now().isoformat()
    if user_id not in vote['voters']:
        vote['voters'].append(user_id)
        if user_id != 'anonymous':
            participated_db[user_id].append(vote_id)

    for opt_id in option_ids:
        for opt in vote['options']:
            if opt['id'] == opt_id:
                opt['votes'] += 1
                opt['timestamps'].append(now)
                vote['totalVotes'] += 1

    socketio.emit('vote_updated', {'voteId': vote_id, 'vote': vote}, room=vote_id)

    return jsonify({'success': True, 'vote': vote})


@app.route('/api/votes/history', methods=['GET'])
def get_history():
    user_id = request.args.get('userId', 'anonymous')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')

    all_ids = list(set(created_db.get(user_id, []) + participated_db.get(user_id, [])))
    history = []

    for vid in all_ids:
        vote = votes_db.get(vid)
        if not vote:
            continue
        if start_date:
            if datetime.fromisoformat(vote['createdAt']) < datetime.fromisoformat(start_date):
                continue
        if end_date:
            if datetime.fromisoformat(vote['createdAt']) > datetime.fromisoformat(end_date):
                continue
        history.append({
            'id': vote['id'],
            'title': vote['title'],
            'createdAt': vote['createdAt'],
            'totalVotes': vote['totalVotes'],
            'participants': len(vote['voters']),
            'isCreator': vote['createdBy'] == user_id,
            'optionsSummary': [{'text': o['text'], 'votes': o['votes']} for o in vote['options'][:3]]
        })

    history.sort(key=lambda x: x['createdAt'], reverse=True)
    return jsonify({'history': history})


@app.route('/api/votes/stats', methods=['GET'])
def get_stats():
    total_votes = len(votes_db)
    total_participants = sum(len(v['voters']) for v in votes_db.values())
    total_votes_cast = sum(v['totalVotes'] for v in votes_db.values())
    avg_participation = total_participants / total_votes if total_votes > 0 else 0

    votes_list = []
    for v in votes_db.values():
        votes_list.append({
            'id': v['id'],
            'title': v['title'],
            'createdAt': v['createdAt'],
            'totalVotes': v['totalVotes'],
            'participants': len(v['voters'])
        })

    return jsonify({
        'totalVotes': total_votes,
        'totalParticipants': total_participants,
        'totalVotesCast': total_votes_cast,
        'avgParticipation': round(avg_participation, 2),
        'votes': votes_list
    })


@app.route('/api/votes/<vote_id>/export', methods=['GET'])
def export_csv(vote_id):
    vote = votes_db.get(vote_id)
    if not vote:
        return jsonify({'error': 'Vote not found'}), 404

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(['投票ID', '投票主题', '创建时间', '截止时间', '选项', '票数', '投票时间'])
    writer.writerow([vote['id'], vote['title'], vote['createdAt'], vote['deadline'] or '无', '', '', ''])

    for opt in vote['options']:
        timestamps = '; '.join(opt['timestamps']) if opt['timestamps'] else ''
        writer.writerow(['', '', '', '', opt['text'], opt['votes'], timestamps])

    response = make_response(output.getvalue())
    response.headers['Content-Type'] = 'text/csv; charset=utf-8'
    response.headers['Content-Disposition'] = f'attachment; filename=vote_{vote_id}.csv'
    return response


@socketio.on('join_vote')
def handle_join(data):
    vote_id = data.get('voteId')
    if vote_id:
        join_room(vote_id)


@socketio.on('leave_vote')
def handle_leave(data):
    vote_id = data.get('voteId')
    if vote_id:
        leave_room(vote_id)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
