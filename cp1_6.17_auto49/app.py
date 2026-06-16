from flask import Flask, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

gifts_db = [
    {"id": "1", "name": "玫瑰", "iconUrl": "🌹", "value": 10},
    {"id": "2", "name": "钻石", "iconUrl": "💎", "value": 100},
    {"id": "3", "name": "火箭", "iconUrl": "🚀", "value": 500},
    {"id": "4", "name": "皇冠", "iconUrl": "👑", "value": 1000},
    {"id": "5", "name": "爱心", "iconUrl": "❤️", "value": 50},
    {"id": "6", "name": "星星", "iconUrl": "⭐", "value": 20},
    {"id": "7", "name": "彩虹", "iconUrl": "🌈", "value": 200},
    {"id": "8", "name": "烟花", "iconUrl": "🎆", "value": 300},
]

leaderboard_data = {}

@app.route('/api/gifts')
def get_gifts():
    return jsonify(gifts_db)

@socketio.on('gift_send')
def handle_gift_send(data):
    sender = data.get('senderName', 'unknown')
    target = data.get('targetName', 'unknown')
    gift_id = data.get('giftId', '')
    gift_name = data.get('giftName', '')
    gift_value = data.get('giftValue', 0)
    gift_icon = data.get('giftIconUrl', '')

    if sender not in leaderboard_data:
        leaderboard_data[sender] = {'giftCount': 0, 'totalValue': 0}
    leaderboard_data[sender]['giftCount'] += 1
    leaderboard_data[sender]['totalValue'] += gift_value

    sorted_entries = sorted(
        leaderboard_data.items(),
        key=lambda x: x[1]['totalValue'],
        reverse=True
    )[:10]

    leaderboard_list = []
    for rank, (nickname, stats) in enumerate(sorted_entries, 1):
        leaderboard_list.append({
            'rank': rank,
            'nickname': nickname,
            'giftCount': stats['giftCount'],
            'totalValue': stats['totalValue'],
            'rankChange': 'same'
        })

    emit('gift_event', data, broadcast=True)
    emit('leaderboard_update', leaderboard_list, broadcast=True)

@socketio.on('connect')
def handle_connect():
    sorted_entries = sorted(
        leaderboard_data.items(),
        key=lambda x: x[1]['totalValue'],
        reverse=True
    )[:10]
    leaderboard_list = []
    for rank, (nickname, stats) in enumerate(sorted_entries, 1):
        leaderboard_list.append({
            'rank': rank,
            'nickname': nickname,
            'giftCount': stats['giftCount'],
            'totalValue': stats['totalValue'],
            'rankChange': 'same'
        })
    emit('leaderboard_update', leaderboard_list)

if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
