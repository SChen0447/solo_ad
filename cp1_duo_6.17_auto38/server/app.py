from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import uuid
from collections import defaultdict

app = Flask(__name__)
CORS(app)

lines = []
snapshots_cache = {}
first_publish_time = int(time.time())
online_users = defaultdict(int)


def generate_user_id(ip):
    return f"用户_{hash(ip) % 10000:04d}"


@app.route('/api/lines', methods=['GET'])
def get_lines():
    limit = request.args.get('limit', 1000, type=int)
    recent_lines = lines[-limit:] if limit > 0 else lines
    return jsonify({
        'lines': recent_lines,
        'total': len(lines),
        'first_time': first_publish_time
    })


@app.route('/api/lines', methods=['POST'])
def publish_lines():
    data = request.json
    new_lines = data.get('lines', [])
    ip = request.remote_addr or '127.0.0.1'
    user_id = generate_user_id(ip)
    current_time = int(time.time())

    published = []
    for line_data in new_lines:
        line = {
            'id': str(uuid.uuid4()),
            'points': line_data.get('points', []),
            'color': line_data.get('color', '#000000'),
            'size': line_data.get('size', 5),
            'user_id': user_id,
            'created_at': current_time,
            'likes': 0,
            'liked_by': []
        }
        lines.append(line)
        published.append(line)

    snapshots_cache.clear()

    return jsonify({
        'success': True,
        'count': len(published),
        'user_id': user_id,
        'lines': published
    }), 201


@app.route('/api/lines/<line_id>/like', methods=['PUT'])
def like_line(line_id):
    ip = request.remote_addr or '127.0.0.1'
    user_id = generate_user_id(ip)

    for line in lines:
        if line['id'] == line_id:
            if user_id in line['liked_by']:
                line['likes'] -= 1
                line['liked_by'].remove(user_id)
                liked = False
            else:
                line['likes'] += 1
                line['liked_by'].append(user_id)
                liked = True
            return jsonify({
                'success': True,
                'line_id': line_id,
                'likes': line['likes'],
                'liked': liked
            })

    return jsonify({'success': False, 'error': 'Line not found'}), 404


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    sorted_lines = sorted(lines, key=lambda x: x['likes'], reverse=True)
    top_lines = sorted_lines[:20]
    return jsonify({
        'leaderboard': [
            {
                'id': line['id'],
                'user_id': line['user_id'],
                'likes': line['likes'],
                'created_at': line['created_at'],
                'color': line['color']
            }
            for line in top_lines
        ]
    })


@app.route('/api/snapshots', methods=['GET'])
def get_snapshot():
    target_time = request.args.get('time', type=int)
    if not target_time:
        return jsonify({'error': 'time parameter required'}), 400

    if target_time in snapshots_cache:
        return jsonify(snapshots_cache[target_time])

    snapshot_lines = [
        line for line in lines
        if line['created_at'] <= target_time
    ]

    online_count = len(set(
        line['user_id'] for line in lines
        if target_time - 300 <= line['created_at'] <= target_time
    ))

    new_lines_count = len([
        line for line in lines
        if target_time - 60 <= line['created_at'] <= target_time
    ])

    result = {
        'time': target_time,
        'lines': snapshot_lines,
        'online_users': max(online_count, 1),
        'new_lines': new_lines_count,
        'total_lines': len(snapshot_lines)
    }

    if len(snapshots_cache) < 100:
        snapshots_cache[target_time] = result

    return jsonify(result)


@app.route('/api/heartbeat', methods=['POST'])
def heartbeat():
    ip = request.remote_addr or '127.0.0.1'
    user_id = generate_user_id(ip)
    online_users[user_id] = int(time.time())

    active_users = sum(
        1 for last_seen in online_users.values()
        if time.time() - last_seen < 60
    )

    return jsonify({
        'online_users': active_users,
        'user_id': user_id
    })


@app.route('/api/new-lines', methods=['GET'])
def get_new_lines():
    since = request.args.get('since', type=int, default=0)
    new_lines = [line for line in lines if line['created_at'] > since]
    return jsonify({
        'lines': new_lines,
        'count': len(new_lines)
    })


if __name__ == '__main__':
    print("Starting collaborative canvas server on port 5000...")
    app.run(host='0.0.0.0', port=5000, debug=True)
