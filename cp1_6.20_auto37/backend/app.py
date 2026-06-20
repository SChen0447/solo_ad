import uuid
import random
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

feedbacks = []
liked_ips = {}

sample_contents = [
    "产品的用户界面设计非常直观，上手很快，体验很棒！",
    "整体功能还行，但是加载速度有点慢，希望能优化一下。",
    "这次更新的新功能很实用，团队协作效率提升了不少。",
    "文档写得不够详细，有些配置找了好久才弄明白。",
    "客服响应速度很快，问题解决得也很专业，点赞！",
    "移动端适配做得不错，在手机上用也很流畅。",
    "价格有点贵，希望能推出更多优惠活动。",
    "数据导出功能很方便，支持多种格式，非常实用。",
    "搜索功能不太精准，有时候找不到想要的内容。",
    "安全性做得很好，多重验证让人很放心。"
]

sample_names = ["张三", "李四", "王五", "赵六", "匿名用户", "小明", "小红", "产品经理", "开发小哥", "测试妹子"]
emotions = ["positive", "neutral", "negative"]

def generate_mock_data():
    base_date = datetime.now() - timedelta(days=30)
    for i in range(100):
        days_offset = random.randint(0, 30)
        hours_offset = random.randint(0, 23)
        minutes_offset = random.randint(0, 59)
        created_at = base_date + timedelta(days=days_offset, hours=hours_offset, minutes=minutes_offset)
        
        emotion = random.choice(emotions)
        content = random.choice(sample_contents)
        name = random.choice(sample_names)
        is_anonymous = name == "匿名用户"
        
        feedback = {
            "id": str(uuid.uuid4()),
            "content": content,
            "emotion": emotion,
            "name": name if not is_anonymous else None,
            "is_anonymous": is_anonymous,
            "likes": random.randint(0, 50),
            "created_at": created_at.isoformat()
        }
        feedbacks.append(feedback)
    
    feedbacks.sort(key=lambda x: x["created_at"], reverse=True)

generate_mock_data()

def get_client_ip():
    return request.remote_addr

@app.route('/api/feedbacks', methods=['GET'])
def get_feedbacks():
    emotion_filter = request.args.get('emotion', 'all')
    sort_by = request.args.get('sort', 'latest')
    
    filtered = feedbacks
    
    if emotion_filter != 'all':
        filtered = [f for f in filtered if f['emotion'] == emotion_filter]
    
    if sort_by == 'hottest':
        filtered = sorted(filtered, key=lambda x: x['likes'], reverse=True)
    else:
        filtered = sorted(filtered, key=lambda x: x['created_at'], reverse=True)
    
    return jsonify({
        "success": True,
        "data": filtered,
        "total": len(filtered)
    })

@app.route('/api/feedbacks', methods=['POST'])
def create_feedback():
    data = request.get_json()
    content = data.get('content', '').strip()
    emotion = data.get('emotion', 'neutral')
    name = data.get('name', '').strip()
    is_anonymous = data.get('is_anonymous', False)
    
    if len(content) < 10:
        return jsonify({
            "success": False,
            "message": "反馈内容至少需要10个字"
        }), 400
    
    if emotion not in emotions:
        return jsonify({
            "success": False,
            "message": "无效的情感标签"
        }), 400
    
    feedback = {
        "id": str(uuid.uuid4()),
        "content": content,
        "emotion": emotion,
        "name": None if is_anonymous else (name if name else "匿名用户"),
        "is_anonymous": is_anonymous or not name,
        "likes": 0,
        "created_at": datetime.now().isoformat()
    }
    
    feedbacks.insert(0, feedback)
    
    socketio.emit('new_feedback', feedback)
    
    return jsonify({
        "success": True,
        "data": feedback
    }), 201

@app.route('/api/feedbacks/<feedback_id>', methods=['GET'])
def get_feedback(feedback_id):
    feedback = next((f for f in feedbacks if f['id'] == feedback_id), None)
    if not feedback:
        return jsonify({"success": False, "message": "反馈不存在"}), 404
    return jsonify({"success": True, "data": feedback})

@app.route('/api/feedbacks/<feedback_id>', methods=['PUT'])
def update_feedback(feedback_id):
    data = request.get_json()
    feedback = next((f for f in feedbacks if f['id'] == feedback_id), None)
    if not feedback:
        return jsonify({"success": False, "message": "反馈不存在"}), 404
    
    if 'content' in data:
        feedback['content'] = data['content']
    if 'emotion' in data:
        feedback['emotion'] = data['emotion']
    
    return jsonify({"success": True, "data": feedback})

@app.route('/api/feedbacks/<feedback_id>', methods=['DELETE'])
def delete_feedback(feedback_id):
    global feedbacks
    feedback = next((f for f in feedbacks if f['id'] == feedback_id), None)
    if not feedback:
        return jsonify({"success": False, "message": "反馈不存在"}), 404
    
    feedbacks = [f for f in feedbacks if f['id'] != feedback_id]
    return jsonify({"success": True, "message": "删除成功"})

@app.route('/api/feedbacks/<feedback_id>/like', methods=['PUT'])
def like_feedback(feedback_id):
    ip = get_client_ip()
    feedback = next((f for f in feedbacks if f['id'] == feedback_id), None)
    
    if not feedback:
        return jsonify({"success": False, "message": "反馈不存在"}), 404
    
    liked_key = f"{feedback_id}:{ip}"
    if liked_key in liked_ips:
        return jsonify({
            "success": False,
            "message": "您已经点过赞了",
            "data": {"likes": feedback['likes'], "liked": True}
        }), 400
    
    feedback['likes'] += 1
    liked_ips[liked_key] = True
    
    socketio.emit('like_update', {
        "id": feedback_id,
        "likes": feedback['likes']
    })
    
    return jsonify({
        "success": True,
        "data": {"likes": feedback['likes'], "liked": True}
    })

@app.route('/api/trends', methods=['GET'])
def get_trends():
    days = int(request.args.get('days', 7))
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days - 1)
    
    trend_data = []
    current_date = start_date
    
    while current_date <= end_date:
        date_str = current_date.strftime('%Y-%m-%d')
        
        day_feedbacks = [
            f for f in feedbacks
            if f['created_at'].split('T')[0] == date_str
        ]
        
        positive_count = len([f for f in day_feedbacks if f['emotion'] == 'positive'])
        neutral_count = len([f for f in day_feedbacks if f['emotion'] == 'neutral'])
        negative_count = len([f for f in day_feedbacks if f['emotion'] == 'negative'])
        
        trend_data.append({
            "date": date_str,
            "positive": positive_count,
            "neutral": neutral_count,
            "negative": negative_count,
            "total": len(day_feedbacks)
        })
        
        current_date += timedelta(days=1)
    
    return jsonify({
        "success": True,
        "data": trend_data
    })

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
