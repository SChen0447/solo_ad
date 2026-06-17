"""
记忆便签 Flask 后端应用
提供便签CRUD接口、情感分析接口、地理位置解析接口
"""

import os
import uuid
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

from emotion_model import analyze_emotion, get_emotion_analyzer

app = Flask(__name__)
CORS(app)

DATA_FILE = os.path.join(os.path.dirname(__file__), 'notes_data.json')

notes_db = []


def load_notes():
    """从文件加载便签数据"""
    global notes_db
    try:
        if os.path.exists(DATA_FILE):
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                notes_db = json.load(f)
        else:
            notes_db = []
            _init_mock_data()
    except Exception as e:
        print(f"加载数据失败: {e}")
        notes_db = []
        _init_mock_data()


def save_notes():
    """保存便签数据到文件"""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(notes_db, f, ensure_ascii=False, indent=2)
    except Exception as e:
        print(f"保存数据失败: {e}")


def _init_mock_data():
    """初始化演示数据"""
    now = datetime.now()
    mock_notes = [
        {
            'id': str(uuid.uuid4()),
            'content': '今天阳光真好，心情特别愉快！在公园散步时看到了一只可爱的小狗。',
            'type': 'text',
            'createdAt': _time_ago(hours=1),
            'location': '北京市朝阳区',
            'emotion': 'happy',
            'imageUrl': None,
            'voiceUrl': None,
            'voiceDuration': None
        },
        {
            'id': str(uuid.uuid4()),
            'content': '工作上遇到了一些挫折，有点不开心。但是相信明天会更好的！',
            'type': 'text',
            'createdAt': _time_ago(days=1),
            'location': '上海市浦东新区',
            'emotion': 'sad',
            'imageUrl': None,
            'voiceUrl': None,
            'voiceDuration': None
        },
        {
            'id': str(uuid.uuid4()),
            'content': '突然想到一个很棒的创业点子，需要尽快整理一下！太惊喜了！',
            'type': 'text',
            'createdAt': _time_ago(hours=2),
            'location': '深圳市南山区',
            'emotion': 'surprised',
            'imageUrl': None,
            'voiceUrl': None,
            'voiceDuration': None
        },
        {
            'id': str(uuid.uuid4()),
            'content': '下午的咖啡时光，静静地看会儿书，享受这份宁静。',
            'type': 'text',
            'createdAt': _time_ago(days=2),
            'location': '杭州市西湖区',
            'emotion': 'calm',
            'imageUrl': None,
            'voiceUrl': None,
            'voiceDuration': None
        },
        {
            'id': str(uuid.uuid4()),
            'content': '今天的会议效率太低了，浪费了很多时间，有点烦躁！',
            'type': 'text',
            'createdAt': _time_ago(days=3),
            'location': '广州市天河区',
            'emotion': 'angry',
            'imageUrl': None,
            'voiceUrl': None,
            'voiceDuration': None
        },
        {
            'id': str(uuid.uuid4()),
            'content': '周末和家人一起去爬山，风景太美了！心情大好。',
            'type': 'text',
            'createdAt': _time_ago(days=4),
            'location': '成都市锦江区',
            'emotion': 'happy',
            'imageUrl': None,
            'voiceUrl': None,
            'voiceDuration': None
        }
    ]
    notes_db.extend(mock_notes)
    save_notes()


def _time_ago(days=0, hours=0, minutes=0):
    """生成指定时间前的ISO格式时间字符串"""
    from datetime import timedelta
    delta = timedelta(days=days, hours=hours, minutes=minutes)
    past_time = datetime.now() - delta
    return past_time.isoformat()


@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查接口"""
    return jsonify({
        'success': True,
        'data': {
            'status': 'ok',
            'model_available': get_emotion_analyzer().model_available,
            'notes_count': len(notes_db)
        }
    })


@app.route('/api/notes', methods=['GET'])
def get_notes():
    """获取所有便签列表"""
    emotion_filter = request.args.get('emotion')
    date_from = request.args.get('date_from')
    date_to = request.args.get('date_to')
    keyword = request.args.get('keyword')

    filtered_notes = notes_db.copy()

    if emotion_filter:
        filtered_notes = [n for n in filtered_notes if n.get('emotion') == emotion_filter]

    if date_from:
        try:
            filtered_notes = [n for n in filtered_notes if n.get('createdAt', '') >= date_from]
        except ValueError:
            pass

    if date_to:
        try:
            filtered_notes = [n for n in filtered_notes if n.get('createdAt', '') <= date_to + 'T23:59:59']
        except ValueError:
            pass

    if keyword:
        keyword_lower = keyword.lower()
        filtered_notes = [n for n in filtered_notes if keyword_lower in n.get('content', '').lower()]

    sorted_notes = sorted(
        filtered_notes,
        key=lambda x: x.get('createdAt', ''),
        reverse=True
    )

    return jsonify({
        'success': True,
        'data': sorted_notes,
        'count': len(sorted_notes)
    })


@app.route('/api/notes/<note_id>', methods=['GET'])
def get_note(note_id):
    """获取单个便签详情"""
    note = next((n for n in notes_db if n.get('id') == note_id), None)
    if not note:
        return jsonify({
            'success': False,
            'message': '便签不存在'
        }), 404

    return jsonify({
        'success': True,
        'data': note
    })


@app.route('/api/notes', methods=['POST'])
def create_note():
    """创建新便签"""
    data = request.get_json()

    if not data or 'content' not in data:
        return jsonify({
            'success': False,
            'message': '缺少必要参数 content'
        }), 400

    emotion = data.get('emotion')
    if not emotion:
        emotion_result = analyze_emotion(data['content'])
        emotion = emotion_result['emotion']

    new_note = {
        'id': str(uuid.uuid4()),
        'content': data['content'],
        'type': data.get('type', 'text'),
        'createdAt': datetime.now().isoformat(),
        'location': data.get('location'),
        'emotion': emotion,
        'imageUrl': data.get('imageUrl'),
        'voiceUrl': data.get('voiceUrl'),
        'voiceDuration': data.get('voiceDuration')
    }

    notes_db.insert(0, new_note)
    save_notes()

    return jsonify({
        'success': True,
        'data': new_note,
        'message': '便签创建成功'
    }), 201


@app.route('/api/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    """更新便签"""
    note = next((n for n in notes_db if n.get('id') == note_id), None)
    if not note:
        return jsonify({
            'success': False,
            'message': '便签不存在'
        }), 404

    data = request.get_json()

    if 'content' in data and data['content'] != note['content']:
        note['content'] = data['content']
        emotion_result = analyze_emotion(data['content'])
        note['emotion'] = emotion_result['emotion']

    if 'location' in data:
        note['location'] = data['location']

    if 'imageUrl' in data:
        note['imageUrl'] = data['imageUrl']

    if 'voiceUrl' in data:
        note['voiceUrl'] = data['voiceUrl']

    if 'voiceDuration' in data:
        note['voiceDuration'] = data['voiceDuration']

    note['updatedAt'] = datetime.now().isoformat()
    save_notes()

    return jsonify({
        'success': True,
        'data': note,
        'message': '便签更新成功'
    })


@app.route('/api/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    """删除便签"""
    global notes_db
    note_index = next((i for i, n in enumerate(notes_db) if n.get('id') == note_id), -1)

    if note_index == -1:
        return jsonify({
            'success': False,
            'message': '便签不存在'
        }), 404

    deleted_note = notes_db.pop(note_index)
    save_notes()

    return jsonify({
        'success': True,
        'data': deleted_note,
        'message': '便签删除成功'
    })


@app.route('/api/analyze', methods=['POST'])
def analyze_emotion_endpoint():
    """情感分析接口"""
    data = request.get_json()

    if not data or 'text' not in data:
        return jsonify({
            'success': False,
            'message': '缺少必要参数 text'
        }), 400

    result = analyze_emotion(data['text'])

    return jsonify({
        'success': True,
        'data': result
    })


@app.route('/api/analyze/batch', methods=['POST'])
def analyze_batch():
    """批量情感分析"""
    data = request.get_json()

    if not data or 'texts' not in data or not isinstance(data['texts'], list):
        return jsonify({
            'success': False,
            'message': '缺少必要参数 texts (数组)'
        }), 400

    results = []
    for text in data['texts']:
        results.append(analyze_emotion(text))

    return jsonify({
        'success': True,
        'data': results
    })


@app.route('/api/location/reverse', methods=['GET'])
def reverse_geocode():
    """
    反向地理编码
    根据经纬度返回城市名（演示版本，实际项目中可接入真实地图API）
    """
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)

    if lat is None or lng is None:
        return jsonify({
            'success': False,
            'message': '缺少必要参数 lat 或 lng'
        }), 400

    city = _get_city_by_coords(lat, lng)

    return jsonify({
        'success': True,
        'data': {
            'city': city,
            'address': city,
            'latitude': lat,
            'longitude': lng
        }
    })


def _get_city_by_coords(lat, lng):
    """根据经纬度估算城市（简化版本）"""
    cities = [
        {'name': '北京市朝阳区', 'lat': 39.9042, 'lng': 116.4074},
        {'name': '上海市浦东新区', 'lat': 31.2304, 'lng': 121.4737},
        {'name': '深圳市南山区', 'lat': 22.5431, 'lng': 114.0579},
        {'name': '杭州市西湖区', 'lat': 30.2741, 'lng': 120.1551},
        {'name': '广州市天河区', 'lat': 23.1291, 'lng': 113.2644},
        {'name': '成都市锦江区', 'lat': 30.5728, 'lng': 104.0668},
        {'name': '武汉市武昌区', 'lat': 30.5928, 'lng': 114.3055},
        {'name': '南京市鼓楼区', 'lat': 32.0603, 'lng': 118.7969}
    ]

    min_distance = float('inf')
    nearest_city = '未知位置'

    for city in cities:
        distance = ((lat - city['lat']) ** 2 + (lng - city['lng']) ** 2) ** 0.5
        if distance < min_distance:
            min_distance = distance
            nearest_city = city['name']

    if min_distance > 5:
        nearest_city = '未知位置'

    return nearest_city


@app.route('/api/upload/image', methods=['POST'])
def upload_image():
    """上传图片接口（演示版本，实际项目中需要文件存储）"""
    if 'image' not in request.files:
        return jsonify({
            'success': False,
            'message': '没有上传图片'
        }), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({
            'success': False,
            'message': '文件名为空'
        }), 400

    import base64
    file_content = file.read()
    base64_data = base64.b64encode(file_content).decode('utf-8')
    mime_type = file.mimetype or 'image/jpeg'
    data_url = f'data:{mime_type};base64,{base64_data}'

    return jsonify({
        'success': True,
        'data': {
            'url': data_url,
            'filename': file.filename,
            'size': len(file_content)
        }
    })


@app.route('/api/upload/voice', methods=['POST'])
def upload_voice():
    """上传语音接口"""
    if 'voice' not in request.files:
        return jsonify({
            'success': False,
            'message': '没有上传语音'
        }), 400

    file = request.files['voice']
    if file.filename == '':
        return jsonify({
            'success': False,
            'message': '文件名为空'
        }), 400

    import base64
    file_content = file.read()
    base64_data = base64.b64encode(file_content).decode('utf-8')
    mime_type = file.mimetype or 'audio/webm'
    data_url = f'data:{mime_type};base64,{base64_data}'

    return jsonify({
        'success': True,
        'data': {
            'url': data_url,
            'filename': file.filename,
            'size': len(file_content),
            'duration': 0
        }
    })


@app.route('/api/stats', methods=['GET'])
def get_stats():
    """获取统计数据"""
    total = len(notes_db)

    emotion_counts = {}
    for note in notes_db:
        emotion = note.get('emotion', 'calm')
        emotion_counts[emotion] = emotion_counts.get(emotion, 0) + 1

    type_counts = {}
    for note in notes_db:
        note_type = note.get('type', 'text')
        type_counts[note_type] = type_counts.get(note_type, 0) + 1

    today_str = datetime.now().strftime('%Y-%m-%d')
    today_count = sum(
        1 for n in notes_db
        if n.get('createdAt', '').startswith(today_str)
    )

    return jsonify({
        'success': True,
        'data': {
            'total': total,
            'today_count': today_count,
            'emotion_counts': emotion_counts,
            'type_counts': type_counts
        }
    })


@app.before_first_request
def initialize():
    """应用启动时初始化"""
    load_notes()
    get_emotion_analyzer()
    print("[MemoryNotes] 后端服务已启动")
    print(f"[MemoryNotes] 情感分析模型: {'预训练模型' if get_emotion_analyzer().model_available else '关键词规则'}")


if __name__ == '__main__':
    load_notes()
    print(f"已加载 {len(notes_db)} 条便签数据")
    print(f"情感分析模型: {'预训练模型' if get_emotion_analyzer().model_available else '关键词规则 (降级模式)'}")
    app.run(debug=True, host='0.0.0.0', port=5000)
