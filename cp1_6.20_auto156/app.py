from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import uuid
import random

app = Flask(__name__)
CORS(app)

cards = []
members = [
    {"id": "mem_001", "name": "小明"},
    {"id": "mem_002", "name": "小红"},
    {"id": "mem_003", "name": "小刚"},
    {"id": "mem_004", "name": "小李"},
]

MOOD_TYPES = ['happy', 'calm', 'anxious', 'sad', 'angry', 'tired']


def init_demo_data():
    demo_contents = {
        'happy': [
            '今天阳光真好，心情也跟着明亮起来了~',
            '项目终于上线了！成就感满满',
            '喝到了好喝的咖啡，小确幸',
            '收到朋友的礼物，超开心！',
        ],
        'calm': [
            '享受片刻宁静，听听轻音乐',
            '周末的午后，一本书一杯茶',
            '窗外雨声淅沥，内心很平静',
            '深呼吸，感受当下的美好',
        ],
        'anxious': [
            '明天的汇报有点紧张...',
            'deadline快到了，压力山大',
            '不知道结果会怎样，有点忐忑',
            '事情太多，有点理不清头绪',
        ],
        'sad': [
            '今天有点小伤感',
            '想念远方的朋友了',
            '雨天总是让人有些惆怅',
            '有些话不知道该跟谁说',
        ],
        'angry': [
            '被人放鸽子了，好气！',
            '代码改了一天还是有bug',
            '地铁又晚点了，烦躁',
            '有些人真的很无语',
        ],
        'tired': [
            '连续加班一周，身体被掏空',
            '好想躺在床上什么都不做',
            '周末只想补觉...',
            '今天的我是没电的电池',
        ],
    }

    now = datetime.now()
    for i in range(12):
        mood = random.choice(MOOD_TYPES)
        member = random.choice(members)
        content = random.choice(demo_contents[mood])
        cards.append({
            'id': f'card_{uuid.uuid4().hex[:8]}',
            'mood': mood,
            'content': content,
            'memberId': member['id'],
            'memberName': member['name'],
            'keywords': random.sample(['工作', '生活', '学习', '朋友', '美食', '运动', '天气'], k=random.randint(0, 2)),
            'createdAt': (now - timedelta(minutes=random.randint(5, 600))).isoformat(),
        })

    cards.sort(key=lambda x: x['createdAt'], reverse=True)


init_demo_data()


@app.route('/api/cards', methods=['GET'])
def get_cards():
    mood = request.args.get('mood')
    member_id = request.args.get('memberId')

    result = cards.copy()

    if mood and mood != 'all':
        result = [c for c in result if c['mood'] == mood]

    if member_id:
        result = [c for c in result if c['memberId'] == member_id]

    return jsonify(result)


@app.route('/api/cards', methods=['POST'])
def create_card():
    data = request.get_json()

    if not data or 'mood' not in data or 'content' not in data:
        return jsonify({'error': '缺少必要参数'}), 400

    if data['mood'] not in MOOD_TYPES:
        return jsonify({'error': '无效的情绪类型'}), 400

    if len(data['content']) > 80:
        return jsonify({'error': '内容超过80字限制'}), 400

    new_card = {
        'id': f'card_{uuid.uuid4().hex[:8]}',
        'mood': data['mood'],
        'content': data['content'],
        'memberId': data.get('memberId', 'anonymous'),
        'memberName': data.get('memberName', '匿名'),
        'keywords': data.get('keywords', []),
        'createdAt': datetime.now().isoformat(),
    }

    cards.insert(0, new_card)
    return jsonify(new_card), 201


@app.route('/api/cards/<card_id>', methods=['GET'])
def get_card(card_id):
    card = next((c for c in cards if c['id'] == card_id), None)
    if not card:
        return jsonify({'error': '卡片不存在'}), 404
    return jsonify(card)


@app.route('/api/cards/<card_id>', methods=['DELETE'])
def delete_card(card_id):
    global cards
    cards = [c for c in cards if c['id'] != card_id]
    return jsonify({'message': '删除成功'})


@app.route('/api/aggregate', methods=['GET'])
def get_aggregate():
    total = len(cards)

    distribution = []
    for mood in MOOD_TYPES:
        count = len([c for c in cards if c['mood'] == mood])
        percentage = (count / total * 100) if total > 0 else 0
        distribution.append({
            'mood': mood,
            'count': count,
            'percentage': round(percentage, 1),
        })

    intensity_history = generate_intensity_history()

    return jsonify({
        'distribution': distribution,
        'intensityHistory': intensity_history,
        'totalCount': total,
    })


def generate_intensity_history():
    history = []
    now = datetime.now()

    for i in range(12, -1, -1):
        time_point = now - timedelta(hours=i)
        time_label = time_point.strftime('%H:%M')

        hour_cards = [
            c for c in cards
            if datetime.fromisoformat(c['createdAt']).hour == time_point.hour
        ]
        hour_count = len(hour_cards) or 1

        intensities = {}
        for mood in MOOD_TYPES:
            mood_count = len([c for c in hour_cards if c['mood'] == mood])
            base_intensity = (mood_count / hour_count * 100) if hour_count > 0 else 0
            noise = random.uniform(-5, 5)
            intensities[mood] = max(0, min(100, round(base_intensity + noise, 1)))

        history.append({
            'time': time_label,
            **intensities,
        })

    return history


@app.route('/api/members', methods=['GET'])
def get_members():
    return jsonify(members)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
