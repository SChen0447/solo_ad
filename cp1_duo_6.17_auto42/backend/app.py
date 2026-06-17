from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, date
import json
import os
import uuid
from dateutil import parser as date_parser

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

MATERIALS_FILE = os.path.join(DATA_DIR, 'materials.json')
SCHEDULES_FILE = os.path.join(DATA_DIR, 'schedules.json')
TAGS_FILE = os.path.join(DATA_DIR, 'tags.json')

PLATFORM_LIMITS = {
    'weibo': {'title': 0, 'content': 140},
    'xiaohongshu': {'title': 20, 'content': 1000},
    'wechat': {'title': 64, 'content': 5000}
}


def load_json(filepath, default):
    if not os.path.exists(filepath):
        return default
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_json(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


materials = load_json(MATERIALS_FILE, [])
schedules = load_json(SCHEDULES_FILE, [])
tags = load_json(TAGS_FILE, ['节日营销', '新品上市', '品牌故事', '用户互动'])

if not materials:
    materials = [
        {
            'id': '1',
            'title': '618大促销活动预告',
            'content': '一年一度的618年中大促即将开始！全场低至5折起，满300减50，更多优惠等你来抢。关注我们的官方账号，第一时间获取最新资讯和独家优惠券。',
            'images': ['https://picsum.photos/seed/618/800/600'],
            'tags': ['节日营销', '新品上市'],
            'createdAt': '2024-06-01T10:00:00Z',
            'updatedAt': '2024-06-10T14:30:00Z'
        },
        {
            'id': '2',
            'title': '新品发布会回顾',
            'content': '感谢所有参加昨日新品发布会的朋友们！我们的全新产品线正式亮相，获得了大家的一致好评。没有到场的朋友也别担心，接下来的一周我们会陆续为大家详细介绍每一款新品的特点和亮点。记得持续关注我们的动态哦！',
            'images': ['https://picsum.photos/seed/newproduct/800/600'],
            'tags': ['新品上市', '品牌故事'],
            'createdAt': '2024-06-05T09:00:00Z',
            'updatedAt': '2024-06-12T16:00:00Z'
        },
        {
            'id': '3',
            'title': '端午节特别企划',
            'content': '端午安康！今天你吃粽子了吗？甜粽还是咸粽？评论区聊聊你最喜欢的口味。关注+点赞+评论，抽3位粉丝送端午礼盒一份~',
            'images': ['https://picsum.photos/seed/dragonboat/800/600'],
            'tags': ['节日营销', '用户互动'],
            'createdAt': '2024-06-08T08:00:00Z',
            'updatedAt': '2024-06-10T12:00:00Z'
        }
    ]
    save_json(MATERIALS_FILE, materials)

if not schedules:
    schedules = [
        {
            'id': 's1',
            'materialId': '1',
            'title': '618大促销活动预告',
            'platform': 'weibo',
            'publishDate': '2024-06-15T10:00:00',
            'status': 'scheduled',
            'coverImage': 'https://picsum.photos/seed/618/200/150',
            'order': 0
        },
        {
            'id': 's2',
            'materialId': '1',
            'title': '618种草笔记',
            'platform': 'xiaohongshu',
            'publishDate': '2024-06-15T12:00:00',
            'status': 'draft',
            'coverImage': 'https://picsum.photos/seed/618/200/150',
            'order': 1
        },
        {
            'id': 's3',
            'materialId': '2',
            'title': '新品发布会回顾',
            'platform': 'wechat',
            'publishDate': '2024-06-16T09:00:00',
            'status': 'scheduled',
            'coverImage': 'https://picsum.photos/seed/newproduct/200/150',
            'order': 0
        },
        {
            'id': 's4',
            'materialId': '3',
            'title': '端午节特别企划',
            'platform': 'weibo',
            'publishDate': '2024-06-10T08:00:00',
            'status': 'published',
            'coverImage': 'https://picsum.photos/seed/dragonboat/200/150',
            'order': 0
        },
        {
            'id': 's5',
            'materialId': '3',
            'title': '端午安康',
            'platform': 'xiaohongshu',
            'publishDate': '2024-06-10T10:00:00',
            'status': 'published',
            'coverImage': 'https://picsum.photos/seed/dragonboat/200/150',
            'order': 1
        }
    ]
    save_json(SCHEDULES_FILE, schedules)


@app.route('/api/materials', methods=['GET'])
def get_materials():
    search = request.args.get('search', '')
    tag_filter = request.args.get('tag', '')
    result = materials
    if search:
        result = [m for m in result if search.lower() in m['title'].lower()]
    if tag_filter:
        result = [m for m in result if tag_filter in m['tags']]
    return jsonify(result)


@app.route('/api/materials/<material_id>', methods=['GET'])
def get_material(material_id):
    material = next((m for m in materials if m['id'] == material_id), None)
    if not material:
        return jsonify({'error': 'Material not found'}), 404
    return jsonify(material)


@app.route('/api/materials', methods=['POST'])
def create_material():
    data = request.get_json()
    now = datetime.utcnow().isoformat() + 'Z'
    new_material = {
        'id': str(uuid.uuid4()),
        'title': data.get('title', ''),
        'content': data.get('content', ''),
        'images': data.get('images', []),
        'tags': data.get('tags', []),
        'createdAt': now,
        'updatedAt': now
    }
    materials.append(new_material)
    save_json(MATERIALS_FILE, materials)
    return jsonify(new_material), 201


@app.route('/api/materials/<material_id>', methods=['PUT'])
def update_material(material_id):
    material = next((m for m in materials if m['id'] == material_id), None)
    if not material:
        return jsonify({'error': 'Material not found'}), 404
    data = request.get_json()
    material['title'] = data.get('title', material['title'])
    material['content'] = data.get('content', material['content'])
    material['images'] = data.get('images', material['images'])
    material['tags'] = data.get('tags', material['tags'])
    material['updatedAt'] = datetime.utcnow().isoformat() + 'Z'
    save_json(MATERIALS_FILE, materials)
    return jsonify(material)


@app.route('/api/materials/<material_id>', methods=['DELETE'])
def delete_material(material_id):
    global materials
    material = next((m for m in materials if m['id'] == material_id), None)
    if not material:
        return jsonify({'error': 'Material not found'}), 404
    materials = [m for m in materials if m['id'] != material_id]
    save_json(MATERIALS_FILE, materials)
    return jsonify({'message': 'Deleted successfully'})


@app.route('/api/schedules', methods=['GET'])
def get_schedules():
    start = request.args.get('start')
    end = request.args.get('end')
    result = schedules
    if start:
        start_date = date_parser.parse(start).date()
        result = [s for s in result if date_parser.parse(s['publishDate']).date() >= start_date]
    if end:
        end_date = date_parser.parse(end).date()
        result = [s for s in result if date_parser.parse(s['publishDate']).date() <= end_date]
    return jsonify(result)


@app.route('/api/schedules/<schedule_id>', methods=['GET'])
def get_schedule(schedule_id):
    schedule = next((s for s in schedules if s['id'] == schedule_id), None)
    if not schedule:
        return jsonify({'error': 'Schedule not found'}), 404
    return jsonify(schedule)


@app.route('/api/schedules', methods=['POST'])
def create_schedule():
    data = request.get_json()
    new_schedule = {
        'id': str(uuid.uuid4()),
        'materialId': data.get('materialId', ''),
        'title': data.get('title', ''),
        'platform': data.get('platform', 'weibo'),
        'publishDate': data.get('publishDate', ''),
        'status': data.get('status', 'draft'),
        'coverImage': data.get('coverImage', ''),
        'order': data.get('order', 0)
    }
    schedules.append(new_schedule)
    save_json(SCHEDULES_FILE, schedules)
    return jsonify(new_schedule), 201


@app.route('/api/schedules/<schedule_id>', methods=['PUT'])
def update_schedule(schedule_id):
    schedule = next((s for s in schedules if s['id'] == schedule_id), None)
    if not schedule:
        return jsonify({'error': 'Schedule not found'}), 404
    data = request.get_json()
    schedule['materialId'] = data.get('materialId', schedule['materialId'])
    schedule['title'] = data.get('title', schedule['title'])
    schedule['platform'] = data.get('platform', schedule['platform'])
    schedule['publishDate'] = data.get('publishDate', schedule['publishDate'])
    schedule['status'] = data.get('status', schedule['status'])
    schedule['coverImage'] = data.get('coverImage', schedule['coverImage'])
    schedule['order'] = data.get('order', schedule.get('order', 0))
    save_json(SCHEDULES_FILE, schedules)
    return jsonify(schedule)


@app.route('/api/schedules/<schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    global schedules
    schedule = next((s for s in schedules if s['id'] == schedule_id), None)
    if not schedule:
        return jsonify({'error': 'Schedule not found'}), 404
    schedules = [s for s in schedules if s['id'] != schedule_id]
    save_json(SCHEDULES_FILE, schedules)
    return jsonify({'message': 'Deleted successfully'})


@app.route('/api/schedules/reorder', methods=['POST'])
def reorder_schedules():
    data = request.get_json()
    date_str = data.get('date', '')
    order_map = data.get('orderMap', {})
    target_date = date_parser.parse(date_str).date()
    for s in schedules:
        s_date = date_parser.parse(s['publishDate']).date()
        if s_date == target_date and s['id'] in order_map:
            s['order'] = order_map[s['id']]
    save_json(SCHEDULES_FILE, schedules)
    return jsonify({'message': 'Reordered successfully'})


@app.route('/api/platforms/validate', methods=['POST'])
def validate_platform():
    data = request.get_json()
    platform = data.get('platform', '')
    title = data.get('title', '')
    content = data.get('content', '')
    if platform not in PLATFORM_LIMITS:
        return jsonify({'error': 'Invalid platform'}), 400
    limits = PLATFORM_LIMITS[platform]
    result = {
        'platform': platform,
        'valid': True,
        'titleOverflow': 0,
        'contentOverflow': 0,
        'titleLimit': limits['title'],
        'contentLimit': limits['content'],
        'truncateRisk': False
    }
    if limits['title'] > 0 and len(title) > limits['title']:
        result['valid'] = False
        result['truncateRisk'] = True
        result['titleOverflow'] = len(title) - limits['title']
    if len(content) > limits['content']:
        result['valid'] = False
        result['truncateRisk'] = True
        result['contentOverflow'] = len(content) - limits['content']
    return jsonify(result)


@app.route('/api/tags', methods=['GET'])
def get_tags():
    return jsonify(tags)


@app.route('/api/tags', methods=['POST'])
def create_tag():
    data = request.get_json()
    tag = data.get('tag', '')
    if tag and tag not in tags:
        tags.append(tag)
        save_json(TAGS_FILE, tags)
    return jsonify(tags)


@app.route('/api/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file'}), 400
    file = request.files['image']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    upload_dir = os.path.join(DATA_DIR, 'uploads')
    os.makedirs(upload_dir, exist_ok=True)
    filename = str(uuid.uuid4()) + '_' + file.filename
    filepath = os.path.join(upload_dir, filename)
    file.save(filepath)
    return jsonify({'url': f'/uploads/{filename}'})


@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(os.path.join(DATA_DIR, 'uploads'), filename)


if __name__ == '__main__':
    app.run(debug=True, port=5000)
