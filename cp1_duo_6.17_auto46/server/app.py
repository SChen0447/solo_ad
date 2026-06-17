from flask import Flask, request, jsonify
from flask_cors import CORS
import time
import uuid
import random
from collections import deque
from datetime import datetime

app = Flask(__name__)
CORS(app)

lines_store = deque(maxlen=5000)
lines_by_id = {}
online_users = {}
first_line_time = None
SNAPSHOT_CACHE_TTL = 60
snapshot_cache = {}


def generate_anonymous_id(ip):
    if not ip:
        ip = "unknown"
    seed = hash(ip) % 100000
    colors = ["红枫", "雪松", "青竹", "墨梅", "幽兰", "紫藤", "丹桂", "白鹭"]
    nums = ["001", "002", "003", "004", "005", "006", "007", "008", "009"]
    return f"{colors[seed % len(colors)]}{nums[(seed // 10) % len(nums)]}"


def get_client_ip():
    return request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1')


@app.route('/api/lines', methods=['POST'])
def publish_lines():
    global first_line_time
    data = request.get_json()
    if not data or 'lines' not in data:
        return jsonify({'error': '缺少lines数据'}), 400

    ip = get_client_ip()
    author_id = generate_anonymous_id(ip)
    created_lines = []

    for line_data in data['lines']:
        line = {
            'id': str(uuid.uuid4()),
            'points': line_data.get('points', []),
            'color': line_data.get('color', '#000000'),
            'size': line_data.get('size', 3),
            'author': author_id,
            'timestamp': time.time(),
            'likes': 0,
            'liked_by': set()
        }
        lines_store.append(line)
        lines_by_id[line['id']] = line
        created_lines.append({
            'id': line['id'],
            'author': line['author'],
            'timestamp': line['timestamp']
        })
        if first_line_time is None:
            first_line_time = line['timestamp']

    online_users[ip] = time.time()

    return jsonify({
        'success': True,
        'lines': created_lines,
        'author': author_id,
        'count': len(created_lines)
    }), 201


@app.route('/api/lines', methods=['GET'])
def get_recent_lines():
    limit = min(int(request.args.get('limit', 1000)), 1000)
    since = request.args.get('since', None)

    result = []
    count = 0

    for line in reversed(lines_store):
        if since and line['timestamp'] <= float(since):
            continue
        result.append({
            'id': line['id'],
            'points': line['points'],
            'color': line['color'],
            'size': line['size'],
            'author': line['author'],
            'timestamp': line['timestamp'],
            'likes': line['likes']
        })
        count += 1
        if count >= limit:
            break

    result.reverse()

    now = time.time()
    active_count = sum(1 for t in online_users.values() if now - t < 300)

    return jsonify({
        'lines': result,
        'total': len(lines_store),
        'online_count': max(active_count, 1 + len(online_users) // 2),
        'first_time': first_line_time or now
    })


@app.route('/api/snapshots', methods=['GET'])
def get_snapshot():
    time_str = request.args.get('time', None)
    if not time_str:
        return jsonify({'error': '缺少time参数'}), 400

    try:
        target_time = float(time_str)
    except (ValueError, TypeError):
        return jsonify({'error': 'time参数格式错误'}), 400

    cache_key = str(int(target_time // 60) * 60)
    now = time.time()

    if cache_key in snapshot_cache:
        cached = snapshot_cache[cache_key]
        if now - cached['created'] < SNAPSHOT_CACHE_TTL:
            return jsonify(cached['data'])

    snapshot_lines = []
    for line in lines_store:
        if line['timestamp'] <= target_time:
            snapshot_lines.append({
                'id': line['id'],
                'points': line['points'],
                'color': line['color'],
                'size': line['size'],
                'author': line['author'],
                'timestamp': line['timestamp'],
                'likes': line['likes']
            })

    min_time = first_line_time or (now - 3600)
    max_time = now
    time_diff = target_time - min_time
    total_diff = max(0.001, max_time - min_time)
    ratio = max(0, min(1, time_diff / total_diff))
    estimated_online = int(1 + ratio * 35 + random.random() * 8)
    estimated_new = int(len(snapshot_lines) * 0.15 * (0.8 + random.random() * 0.4))

    result = {
        'lines': snapshot_lines,
        'target_time': target_time,
        'online_count': estimated_online,
        'new_lines_count': min(estimated_new, len(snapshot_lines)),
        'snapshot_time': now
    }

    snapshot_cache[cache_key] = {
        'created': now,
        'data': result
    }

    return jsonify(result)


@app.route('/api/lines/<line_id>/like', methods=['PUT'])
def like_line(line_id):
    ip = get_client_ip()
    line = lines_by_id.get(line_id)

    if not line:
        return jsonify({'error': '线条不存在'}), 404

    if ip in line['liked_by']:
        line['likes'] -= 1
        line['liked_by'].discard(ip)
        liked = False
    else:
        line['likes'] += 1
        line['liked_by'].add(ip)
        liked = True

    return jsonify({
        'success': True,
        'liked': liked,
        'likes': line['likes']
    })


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    limit = min(int(request.args.get('limit', 20)), 50)

    sorted_lines = sorted(
        lines_by_id.values(),
        key=lambda x: x['likes'],
        reverse=True
    )[:limit]

    leaderboard = []
    for idx, line in enumerate(sorted_lines):
        leaderboard.append({
            'rank': idx + 1,
            'id': line['id'],
            'author': line['author'],
            'likes': line['likes'],
            'color': line['color'],
            'timestamp': line['timestamp']
        })

    return jsonify({
        'leaderboard': leaderboard,
        'total_likes': sum(l['likes'] for l in lines_by_id.values()),
        'total_lines': len(lines_by_id)
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'lines_count': len(lines_store),
        'first_line_time': first_line_time,
        'server_time': time.time()
    })


if __name__ == '__main__':
    demo_authors = ["白鹭001", "青竹002", "雪松003", "红枫004", "紫藤005"]
    demo_colors = ["#8B4513", "#2E8B57", "#4682B4", "#CD5C5C", "#9370DB"]

    for i in range(25):
        author = demo_authors[i % len(demo_authors)]
        color = demo_colors[i % len(demo_colors)]
        cx = random.uniform(-400, 400)
        cy = random.uniform(-300, 300)
        points = []
        px, py = cx, cy
        for j in range(random.randint(8, 20)):
            points.append({'x': px, 'y': py, 'p': random.uniform(0.5, 1.0)})
            px += random.uniform(-25, 25)
            py += random.uniform(-25, 25)

        line_id = str(uuid.uuid4())
        line = {
            'id': line_id,
            'points': points,
            'color': color,
            'size': random.uniform(2, 6),
            'author': author,
            'timestamp': time.time() - random.uniform(86400, 172800) + i * 3600,
            'likes': random.randint(0, 50),
            'liked_by': set()
        }
        lines_store.append(line)
        lines_by_id[line_id] = line

    first_line_time = min((l['timestamp'] for l in lines_store), default=time.time())

    print("=" * 50)
    print("  创意众包画布后端服务启动中...")
    print(f"  初始线条数量: {len(lines_store)}")
    print(f"  API服务地址: http://localhost:5000")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=False, threaded=True)
