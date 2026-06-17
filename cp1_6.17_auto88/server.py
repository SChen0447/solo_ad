from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import time
import os
import base64

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'audio_uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

records = []

avatars = [
    'https://api.dicebear.com/7.x/adventurer/svg?seed=1',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=2',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=3',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=4',
    'https://api.dicebear.com/7.x/adventurer/svg?seed=5',
]

def generate_dummy_audio():
    sample_rate = 22050
    duration = 2
    frequency = 440
    num_samples = sample_rate * duration
    
    import math
    import io
    import wave
    
    audio_buffer = io.BytesIO()
    with wave.open(audio_buffer, 'wb') as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        for i in range(num_samples):
            sample = int(32767 * 0.5 * math.sin(2 * math.pi * frequency * i / sample_rate))
            wf.writeframes(sample.to_bytes(2, 'little', signed=True))
    
    audio_data = audio_buffer.getvalue()
    return base64.b64encode(audio_data).decode('utf-8')

dummy_audio = generate_dummy_audio()

initial_records = [
    {
        'id': str(uuid.uuid4()),
        'name': '故宫角楼的清晨',
        'latitude': 39.9163,
        'longitude': 116.3972,
        'audioData': dummy_audio,
        'duration': 120,
        'recorderNickname': '旅行者小明',
        'emotion': 'calm',
        'scene': 'park',
        'createdAt': int(time.time() * 1000) - 3600000,
        'reactions': [
            {
                'id': str(uuid.uuid4()),
                'emotion': 'happy',
                'userNickname': '音乐爱好者',
                'userAvatar': avatars[0],
                'timestamp': int(time.time() * 1000) - 180000
            },
            {
                'id': str(uuid.uuid4()),
                'emotion': 'calm',
                'userNickname': '摄影师阿杰',
                'userAvatar': avatars[1],
                'timestamp': int(time.time() * 1000) - 300000
            }
        ]
    },
    {
        'id': str(uuid.uuid4()),
        'name': '王府井步行街',
        'latitude': 39.9147,
        'longitude': 116.4108,
        'audioData': dummy_audio,
        'duration': 95,
        'recorderNickname': '城市记录者',
        'emotion': 'happy',
        'scene': 'street',
        'createdAt': int(time.time() * 1000) - 7200000,
        'reactions': [
            {
                'id': str(uuid.uuid4()),
                'emotion': 'happy',
                'userNickname': '逛街达人',
                'userAvatar': avatars[2],
                'timestamp': int(time.time() * 1000) - 600000
            }
        ]
    },
    {
        'id': str(uuid.uuid4()),
        'name': '什刹海酒吧街',
        'latitude': 39.9388,
        'longitude': 116.3803,
        'audioData': dummy_audio,
        'duration': 180,
        'recorderNickname': '夜猫子',
        'emotion': 'happy',
        'scene': 'street',
        'createdAt': int(time.time() * 1000) - 10800000,
        'reactions': [
            {
                'id': str(uuid.uuid4()),
                'emotion': 'calm',
                'userNickname': '文艺青年',
                'userAvatar': avatars[3],
                'timestamp': int(time.time() * 1000) - 900000
            },
            {
                'id': str(uuid.uuid4()),
                'emotion': 'anxious',
                'userNickname': '失眠患者',
                'userAvatar': avatars[4],
                'timestamp': int(time.time() * 1000) - 120000
            }
        ]
    },
    {
        'id': str(uuid.uuid4()),
        'name': '国贸地铁站',
        'latitude': 39.9087,
        'longitude': 116.4605,
        'audioData': dummy_audio,
        'duration': 60,
        'recorderNickname': '上班族阿伟',
        'emotion': 'anxious',
        'scene': 'subway',
        'createdAt': int(time.time() * 1000) - 5400000,
        'reactions': [
            {
                'id': str(uuid.uuid4()),
                'emotion': 'anxious',
                'userNickname': '挤地铁的鱼',
                'userAvatar': avatars[0],
                'timestamp': int(time.time() * 1000) - 240000
            },
            {
                'id': str(uuid.uuid4()),
                'emotion': 'sad',
                'userNickname': '加班狗',
                'userAvatar': avatars[1],
                'timestamp': int(time.time() * 1000) - 180000
            }
        ]
    },
    {
        'id': str(uuid.uuid4()),
        'name': '798艺术区咖啡馆',
        'latitude': 39.9847,
        'longitude': 116.4962,
        'audioData': dummy_audio,
        'duration': 240,
        'recorderNickname': '设计师小美',
        'emotion': 'calm',
        'scene': 'cafe',
        'createdAt': int(time.time() * 1000) - 14400000,
        'reactions': [
            {
                'id': str(uuid.uuid4()),
                'emotion': 'calm',
                'userNickname': '咖啡品鉴师',
                'userAvatar': avatars[2],
                'timestamp': int(time.time() * 1000) - 420000
            },
            {
                'id': str(uuid.uuid4()),
                'emotion': 'happy',
                'userNickname': '自由职业者',
                'userAvatar': avatars[3],
                'timestamp': int(time.time() * 1000) - 300000
            },
            {
                'id': str(uuid.uuid4()),
                'emotion': 'calm',
                'userNickname': '读书人',
                'userAvatar': avatars[4],
                'timestamp': int(time.time() * 1000) - 60000
            }
        ]
    }
]

records.extend(initial_records)

@app.route('/api/records', methods=['GET'])
def get_records():
    return jsonify(records)

@app.route('/api/records/<record_id>', methods=['GET'])
def get_record(record_id):
    for record in records:
        if record['id'] == record_id:
            return jsonify(record)
    return jsonify({'error': 'Record not found'}), 404

@app.route('/api/records', methods=['POST'])
def create_record():
    data = request.get_json()
    
    audio_data = data.get('audioData', '')
    if audio_data.startswith('data:audio'):
        audio_data = audio_data.split(',')[1]
    
    record = {
        'id': str(uuid.uuid4()),
        'name': data.get('name', '未命名声音'),
        'latitude': data.get('latitude', 39.9042),
        'longitude': data.get('longitude', 116.4074),
        'audioData': audio_data,
        'duration': data.get('duration', 0),
        'recorderNickname': data.get('recorderNickname', '匿名用户'),
        'emotion': data.get('emotion', 'calm'),
        'scene': data.get('scene', 'street'),
        'createdAt': int(time.time() * 1000),
        'reactions': []
    }
    
    records.append(record)
    return jsonify(record), 201

@app.route('/api/emotions', methods=['POST'])
def add_emotion():
    data = request.get_json()
    record_id = data.get('recordId')
    
    for record in records:
        if record['id'] == record_id:
            reaction = {
                'id': str(uuid.uuid4()),
                'recordId': record_id,
                'emotion': data.get('emotion', 'calm'),
                'userNickname': data.get('userNickname', '匿名用户'),
                'userAvatar': data.get('userAvatar', avatars[0]),
                'timestamp': int(time.time() * 1000)
            }
            record['reactions'].append(reaction)
            return jsonify(record), 200
    
    return jsonify({'error': 'Record not found'}), 404

@app.route('/api/records/<record_id>', methods=['DELETE'])
def delete_record(record_id):
    global records
    records = [r for r in records if r['id'] != record_id]
    return jsonify({'message': 'Record deleted'})

if __name__ == '__main__':
    print('Server starting on http://localhost:5000')
    print(f'Loaded {len(records)} initial records')
    app.run(host='0.0.0.0', port=5000, debug=True)
