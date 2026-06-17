from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import uuid
import copy

app = Flask(__name__)
CORS(app)

PLATFORM_LIMITS = {
    'weibo': 140,
    'xiaohongshu': 1000,
    'wechat': 5000,
}

def now_iso():
    return datetime.now().isoformat()

def uid():
    return uuid.uuid4().hex[:8]

materials = [
    {
        'id': 'm1',
        'title': '新品发布：夏日限定系列',
        'content': '今天为大家带来我们全新的夏日限定系列产品！轻薄透气的面料，清新自然的配色，让你在这个夏天成为最亮眼的存在。现在下单还有专属优惠，前100名额外赠送精美礼品一份～ 点击链接了解更多详情，数量有限先到先得！',
        'coverImage': '',
        'images': [],
        'tags': ['2'],
        'createdAt': now_iso(),
        'updatedAt': now_iso(),
    },
    {
        'id': 'm2',
        'title': '618大促活动预热',
        'content': '一年一度的618购物节即将到来！我们为大家准备了超值福利：全场低至5折，满减优惠券叠加使用，更有神秘大礼等你抽取。关注我们，第一时间获取活动信息，千万不要错过这次购物盛宴！',
        'coverImage': '',
        'images': [],
        'tags': ['1'],
        'createdAt': now_iso(),
        'updatedAt': now_iso(),
    },
    {
        'id': 'm3',
        'title': '品牌故事：十年匠心路',
        'content': '从一家小小的工作室，到如今被千万用户喜爱的品牌。这十年，我们坚持初心，用心做好每一件产品。感谢每一位陪伴我们成长的用户，未来的路，我们继续同行。',
        'coverImage': '',
        'images': [],
        'tags': ['3'],
        'createdAt': now_iso(),
        'updatedAt': now_iso(),
    },
]

def get_mock_date(days_offset, hour, minute=0):
    from datetime import timedelta
    d = datetime.now() + timedelta(days=days_offset)
    d = d.replace(hour=hour, minute=minute, second=0, microsecond=0)
    return d.isoformat()

schedules = [
    {'id': 's1', 'materialId': 'm1', 'platform': 'weibo', 'publishTime': get_mock_date(1, 10, 0), 'status': 'pending', 'orderIndex': 0},
    {'id': 's2', 'materialId': 'm1', 'platform': 'xiaohongshu', 'publishTime': get_mock_date(1, 12, 0), 'status': 'pending', 'orderIndex': 1},
    {'id': 's3', 'materialId': 'm1', 'platform': 'wechat', 'publishTime': get_mock_date(2, 9, 0), 'status': 'draft', 'orderIndex': 0},
    {'id': 's4', 'materialId': 'm2', 'platform': 'weibo', 'publishTime': get_mock_date(3, 20, 0), 'status': 'pending', 'orderIndex': 0},
    {'id': 's5', 'materialId': 'm3', 'platform': 'wechat', 'publishTime': get_mock_date(-1, 18, 0), 'status': 'published', 'orderIndex': 0},
]


def enrich_schedule(s):
    mat = next((m for m in materials if m['id'] == s['materialId']), None)
    result = copy.deepcopy(s)
    if mat:
        result['material'] = mat
    return result


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': now_iso()})


@app.route('/api/materials', methods=['GET'])
def list_materials():
    return jsonify(materials)


@app.route('/api/materials/<material_id>', methods=['GET'])
def get_material(material_id):
    mat = next((m for m in materials if m['id'] == material_id), None)
    if not mat:
        return jsonify({'message': '素材不存在'}), 404
    return jsonify(mat)


@app.route('/api/materials', methods=['POST'])
def create_material():
    data = request.get_json() or {}
    new_mat = {
        'id': uid(),
        'title': data.get('title', ''),
        'content': data.get('content', ''),
        'coverImage': data.get('coverImage', ''),
        'images': data.get('images', []),
        'tags': data.get('tags', []),
        'createdAt': now_iso(),
        'updatedAt': now_iso(),
    }
    materials.insert(0, new_mat)
    return jsonify(new_mat), 201


@app.route('/api/materials/<material_id>', methods=['PUT'])
def update_material(material_id):
    data = request.get_json() or {}
    for i, m in enumerate(materials):
        if m['id'] == material_id:
            materials[i].update({k: v for k, v in data.items() if k != 'id'})
            materials[i]['updatedAt'] = now_iso()
            return jsonify(materials[i])
    return jsonify({'message': '素材不存在'}), 404


@app.route('/api/materials/<material_id>', methods=['DELETE'])
def delete_material(material_id):
    global materials, schedules
    materials = [m for m in materials if m['id'] != material_id]
    schedules = [s for s in schedules if s['materialId'] != material_id]
    return jsonify({'success': True})


@app.route('/api/schedules', methods=['GET'])
def list_schedules():
    enriched = [enrich_schedule(s) for s in schedules]
    return jsonify(enriched)


@app.route('/api/schedules/<schedule_id>', methods=['GET'])
def get_schedule(schedule_id):
    s = next((s for s in schedules if s['id'] == schedule_id), None)
    if not s:
        return jsonify({'message': '排期不存在'}), 404
    return jsonify(enrich_schedule(s))


@app.route('/api/schedules', methods=['POST'])
def create_schedule():
    data = request.get_json() or {}
    new_sched = {
        'id': uid(),
        'materialId': data.get('materialId', ''),
        'platform': data.get('platform', 'weibo'),
        'publishTime': data.get('publishTime', now_iso()),
        'status': data.get('status', 'draft'),
        'orderIndex': data.get('orderIndex', len(schedules)),
    }
    schedules.append(new_sched)
    return jsonify(enrich_schedule(new_sched)), 201


@app.route('/api/schedules/<schedule_id>', methods=['PUT'])
def update_schedule(schedule_id):
    data = request.get_json() or {}
    for i, s in enumerate(schedules):
        if s['id'] == schedule_id:
            schedules[i].update({k: v for k, v in data.items() if k != 'id'})
            return jsonify(enrich_schedule(schedules[i]))
    return jsonify({'message': '排期不存在'}), 404


@app.route('/api/schedules/<schedule_id>', methods=['DELETE'])
def delete_schedule(schedule_id):
    global schedules
    schedules = [s for s in schedules if s['id'] != schedule_id]
    return jsonify({'success': True})


@app.route('/api/platform/validate', methods=['POST'])
def validate_platform():
    data = request.get_json() or {}
    content = data.get('content', '')
    platform = data.get('platform', 'weibo')
    limit = PLATFORM_LIMITS.get(platform, 5000)
    char_count = len(content)
    valid = char_count <= limit
    overflow = max(0, char_count - limit)
    return jsonify({
        'platform': platform,
        'valid': valid,
        'charCount': char_count,
        'limit': limit,
        'overflow': overflow,
        'truncateIndex': None if valid else limit,
    })


if __name__ == '__main__':
    print('Starting Flask server on http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)
