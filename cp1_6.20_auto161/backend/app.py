from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import uuid
import random
import time
import os
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

INSTRUMENT_TYPES = ['guitar', 'violin', 'saxophone', 'keyboard']
PART_NAMES = {
    'headstock': '琴头',
    'neck': '琴颈',
    'body': '琴身',
    'bridge': '琴桥',
    'accessories': '配件'
}
ANGLES = ['front', 'back', 'side', 'top']
ANGLE_NAMES = {
    'front': '正面',
    'back': '背面',
    'side': '侧面',
    'top': '俯视'
}
GRADE_THRESHOLDS = [
    (90, 'S'),
    (80, 'A'),
    (70, 'B'),
    (60, 'C'),
    (0, 'D')
]
GRADE_COLORS = {
    'S': '#FFD700',
    'A': '#22C55E',
    'B': '#3B82F6',
    'C': '#F97316',
    'D': '#EF4444'
}

mock_instruments_db = []
mock_reports_db = {}
mock_transactions_db = {}
mock_users_db = {
    'user_demo': {
        'id': 'user_demo',
        'nickname': '乐器爱好者小王',
        'avatar': '🎸',
        'reputation': 4.7,
        'total_ratings': 128
    }
}
mock_reviews_db = []

def generate_mock_instruments():
    if len(mock_instruments_db) > 0:
        return
    samples = [
        {'type': 'guitar', 'name': '马丁 D-28 原声吉他', 'brand': 'Martin', 'price': 15800, 'year': 2019},
        {'type': 'violin', 'name': '斯特拉迪瓦里 4/4 小提琴', 'brand': 'Stradivari', 'price': 28000, 'year': 2020},
        {'type': 'saxophone', 'name': '雅马哈 YAS-62 中音萨克斯', 'brand': 'Yamaha', 'price': 12500, 'year': 2021},
        {'type': 'keyboard', 'name': '罗兰 RD-2000 舞台电钢琴', 'brand': 'Roland', 'price': 19800, 'year': 2022},
        {'type': 'guitar', 'name': '吉布森 Les Paul Standard', 'brand': 'Gibson', 'price': 22000, 'year': 2018},
        {'type': 'guitar', 'name': '泰勒 814ce 电箱吉他', 'brand': 'Taylor', 'price': 17500, 'year': 2020},
        {'type': 'violin', 'name': '瓜奈里 4/4 演奏级小提琴', 'brand': 'Guarneri', 'price': 35000, 'year': 2019},
        {'type': 'keyboard', 'name': 'Nord Stage 3 合成器', 'brand': 'Nord', 'price': 26800, 'year': 2021},
        {'type': 'saxophone', 'name': '塞尔玛 Mark VII 次中音萨克斯', 'brand': 'Selmer', 'price': 32000, 'year': 2017},
    ]
    img_map = {
        'guitar': 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=400&h=300&fit=crop',
        'violin': 'https://images.unsplash.com/photo-1612225330812-01a9c6b355ec?w=400&h=300&fit=crop',
        'saxophone': 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=400&h=300&fit=crop',
        'keyboard': 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=400&h=300&fit=crop'
    }
    type_names = {'guitar': '吉他', 'violin': '小提琴', 'saxophone': '萨克斯', 'keyboard': '电子琴'}
    
    for i, s in enumerate(samples):
        report_id = f'report_{uuid.uuid4().hex[:8]}'
        instrument_id = f'inst_{uuid.uuid4().hex[:8]}'
        score = random.randint(65, 98)
        grade = next(g for t, g in GRADE_THRESHOLDS if score >= t)
        
        parts = {}
        for part_key, part_name in PART_NAMES.items():
            angle = random.choice(ANGLES)
            part_score = random.randint(score - 10, score + 5)
            part_score = max(50, min(100, part_score))
            parts[part_key] = {
                'name': part_name,
                'angle': angle,
                'angle_label': ANGLE_NAMES[angle],
                'image': img_map[s['type']],
                'score': part_score,
                'clarity': random.randint(70, 100),
                'completeness': random.randint(70, 100),
                'angle_standard': random.randint(75, 100),
                'description': f'{part_name}整体状态{"极佳" if part_score >= 90 else "良好" if part_score >= 80 else "一般" if part_score >= 70 else "需注意"}, {"无明显磨损痕迹" if part_score >= 85 else "有轻微使用痕迹" if part_score >= 75 else "存在可见磨损"}'
            }
        
        mock_reports_db[report_id] = {
            'id': report_id,
            'instrument_id': instrument_id,
            'instrument_type': s['type'],
            'instrument_type_name': type_names[s['type']],
            'overall_score': score,
            'grade': grade,
            'grade_color': GRADE_COLORS[grade],
            'generated_at': (datetime.now() - timedelta(days=random.randint(1, 30))).isoformat(),
            'parts': parts,
            'summary': f'该{type_names[s["type"]]}综合评分{score}分，评级{grade}级。整体{"品相极佳，收藏级成色" if grade == "S" else "品相优秀，专业演奏级" if grade == "A" else "品相良好，适合进阶学习" if grade == "B" else "品相中规中矩，适合入门练习" if grade == "C" else "有较明显使用痕迹，建议现场验货后购买"}。',
            'used': True
        }
        
        mock_instruments_db.append({
            'id': instrument_id,
            'name': s['name'],
            'type': s['type'],
            'type_name': type_names[s['type']],
            'brand': s['brand'],
            'price': s['price'],
            'year': s['year'],
            'seller_id': 'user_demo',
            'seller_name': mock_users_db['user_demo']['nickname'],
            'report_id': report_id,
            'grade': grade,
            'grade_color': GRADE_COLORS[grade],
            'overall_score': score,
            'thumbnail': img_map[s['type']],
            'description': f'自用{s["year"]}年购入的{s["brand"]}{type_names[s["type"]]}，保养良好，配件齐全。因升级设备忍痛转让，欢迎验机当面交易。',
            'created_at': (datetime.now() - timedelta(hours=random.randint(2, 48))).isoformat(),
            'status': 'available',
            'location': random.choice(['北京市朝阳区', '上海市浦东新区', '广州市天河区', '深圳市南山区', '杭州市西湖区'])
        })
    
    for _ in range(5):
        rid = f'report_{uuid.uuid4().hex[:8]}'
        t = random.choice(INSTRUMENT_TYPES)
        score = random.randint(70, 95)
        grade = next(g for tt, g in GRADE_THRESHOLDS if score >= tt)
        mock_reports_db[rid] = {
            'id': rid,
            'instrument_id': None,
            'instrument_type': t,
            'instrument_type_name': type_names[t],
            'overall_score': score,
            'grade': grade,
            'grade_color': GRADE_COLORS[grade],
            'generated_at': datetime.now().isoformat(),
            'parts': {
                pk: {
                    'name': pn,
                    'angle': random.choice(ANGLES),
                    'angle_label': ANGLE_NAMES[random.choice(ANGLES)],
                    'image': img_map[t],
                    'score': random.randint(score - 10, score + 5),
                    'clarity': random.randint(70, 100),
                    'completeness': random.randint(70, 100),
                    'angle_standard': random.randint(75, 100),
                    'description': f'{pn}检测完成'
                } for pk, pn in PART_NAMES.items()
            },
            'summary': f'该乐器综合评分{score}分，评级{grade}级。',
            'used': False
        }

generate_mock_instruments()

def calculate_grade(score: int):
    for threshold, grade in GRADE_THRESHOLDS:
        if score >= threshold:
            return grade
    return 'D'

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()})

@app.route('/api/instruments', methods=['GET'])
def get_instruments():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 9))
    inst_type = request.args.get('type', '')
    grade = request.args.get('grade', '')
    min_price = request.args.get('min_price', '')
    max_price = request.args.get('max_price', '')
    keyword = request.args.get('keyword', '')
    
    result = [i for i in mock_instruments_db if i['status'] == 'available']
    
    if inst_type:
        result = [i for i in result if i['type'] == inst_type]
    if grade:
        result = [i for i in result if i['grade'] == grade]
    if min_price:
        result = [i for i in result if i['price'] >= int(min_price)]
    if max_price:
        result = [i for i in result if i['price'] <= int(max_price)]
    if keyword:
        kw = keyword.lower()
        result = [i for i in result if kw in i['name'].lower() or kw in i['brand'].lower() or kw in i['description'].lower()]
    
    result.sort(key=lambda x: x['created_at'], reverse=True)
    
    total = len(result)
    start = (page - 1) * per_page
    end = start + per_page
    items = result[start:end]
    
    return jsonify({
        'items': items,
        'total': total,
        'page': page,
        'per_page': per_page,
        'total_pages': (total + per_page - 1) // per_page
    })

@app.route('/api/instruments/<instrument_id>', methods=['GET'])
def get_instrument(instrument_id):
    inst = next((i for i in mock_instruments_db if i['id'] == instrument_id), None)
    if not inst:
        return jsonify({'error': 'Instrument not found'}), 404
    return jsonify(inst)

@app.route('/api/reports', methods=['POST'])
def submit_inspection():
    time.sleep(0.5)
    data = request.get_json(force=True)
    
    required_parts = list(PART_NAMES.keys())
    if not data.get('photos'):
        return jsonify({'error': '请上传所有部位的照片'}), 400
    
    uploaded_parts = {p['part'] for p in data['photos']}
    missing = set(required_parts) - uploaded_parts
    if missing:
        return jsonify({'error': f'缺少以下部位照片: {", ".join(PART_NAMES[p] for p in missing)}'}), 400
    
    instrument_type = data.get('instrument_type', 'guitar')
    if instrument_type not in INSTRUMENT_TYPES:
        return jsonify({'error': '不支持的乐器类型'}), 400
    
    type_quality_weights = {
        'guitar': {'neck': 1.2, 'body': 1.1, 'bridge': 1.15},
        'violin': {'body': 1.25, 'bridge': 1.2, 'neck': 1.05},
        'saxophone': {'body': 1.3, 'accessories': 1.1},
        'keyboard': {'body': 1.2, 'accessories': 1.15}
    }
    weights = type_quality_weights.get(instrument_type, {})
    
    img_map = {
        'guitar': 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=300&h=300&fit=crop',
        'violin': 'https://images.unsplash.com/photo-1612225330812-01a9c6b355ec?w=300&h=300&fit=crop',
        'saxophone': 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop',
        'keyboard': 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=300&h=300&fit=crop'
    }
    type_names = {'guitar': '吉他', 'violin': '小提琴', 'saxophone': '萨克斯', 'keyboard': '电子琴'}
    
    parts = {}
    weighted_total = 0
    weight_sum = 0
    
    for photo in data['photos']:
        part_key = photo['part']
        angle = photo.get('angle', 'front')
        if angle not in ANGLES:
            angle = 'front'
        
        base_clarity = random.randint(75, 98)
        base_completeness = random.randint(72, 97)
        angle_standard = 100 if angle == 'front' else 90 if angle == 'top' else 85 if angle == 'side' else 80
        
        part_score = int((base_clarity * 0.35 + base_completeness * 0.4 + angle_standard * 0.25))
        part_score = max(50, min(100, part_score))
        
        w = weights.get(part_key, 1.0)
        weighted_total += part_score * w
        weight_sum += w
        
        parts[part_key] = {
            'name': PART_NAMES[part_key],
            'angle': angle,
            'angle_label': ANGLE_NAMES[angle],
            'image': data.get('images', {}).get(part_key, img_map[instrument_type]),
            'score': part_score,
            'clarity': base_clarity,
            'completeness': base_completeness,
            'angle_standard': angle_standard,
            'description': f'{PART_NAMES[part_key]}{"角度标准，" if angle_standard >= 90 else ""}{"清晰度高，" if base_clarity >= 90 else ""}{"信息完整，" if base_completeness >= 90 else ""}综合评分{part_score}分'
        }
    
    overall_score = int(weighted_total / weight_sum) if weight_sum > 0 else 75
    grade = calculate_grade(overall_score)
    
    report_id = f'report_{uuid.uuid4().hex[:8]}'
    type_names_full = {'guitar': '吉他', 'violin': '小提琴', 'saxophone': '萨克斯', 'keyboard': '电子琴'}
    
    summary_map = {
        'S': f'该{type_names_full[instrument_type]}品相极佳，综合评分{overall_score}分，达到S级收藏级标准。各部位均无明显瑕疵，推荐专业演奏者及收藏人士购买。',
        'A': f'该{type_names_full[instrument_type]}品相优秀，综合评分{overall_score}分，A级专业演奏级。整体保养良好，仅存在极细微使用痕迹，性价比突出。',
        'B': f'该{type_names_full[instrument_type]}品相良好，综合评分{overall_score}分，B级进阶级。有正常使用痕迹，不影响演奏，适合进阶学习者。',
        'C': f'该{type_names_full[instrument_type]}品相中规中矩，综合评分{overall_score}分，C级入门级。存在可见磨损，功能完好，适合预算有限的入门练习者。',
        'D': f'该{type_names_full[instrument_type]}综合评分{overall_score}分，D级。有较明显使用痕迹或瑕疵，建议现场验货后再决定是否购买。'
    }
    
    report = {
        'id': report_id,
        'instrument_id': None,
        'instrument_type': instrument_type,
        'instrument_type_name': type_names[instrument_type],
        'overall_score': overall_score,
        'grade': grade,
        'grade_color': GRADE_COLORS[grade],
        'generated_at': datetime.now().isoformat(),
        'parts': parts,
        'summary': summary_map[grade],
        'used': False
    }
    
    mock_reports_db[report_id] = report
    return jsonify({'report_id': report_id, 'report': report})

@app.route('/api/reports/<report_id>', methods=['GET'])
def get_report(report_id):
    report = mock_reports_db.get(report_id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    return jsonify(report)

@app.route('/api/reports/<report_id>/regenerate', methods=['POST'])
def regenerate_report(report_id):
    report = mock_reports_db.get(report_id)
    if not report:
        return jsonify({'error': 'Report not found'}), 404
    if report.get('used', False):
        return jsonify({'error': '已使用的报告无法重新生成'}), 400
    
    time.sleep(0.5)
    instrument_type = report['instrument_type']
    img_map = {
        'guitar': 'https://images.unsplash.com/photo-1510915361894-db8b60106cb1?w=300&h=300&fit=crop',
        'violin': 'https://images.unsplash.com/photo-1612225330812-01a9c6b355ec?w=300&h=300&fit=crop',
        'saxophone': 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=300&h=300&fit=crop',
        'keyboard': 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=300&h=300&fit=crop'
    }
    type_names_full = {'guitar': '吉他', 'violin': '小提琴', 'saxophone': '萨克斯', 'keyboard': '电子琴'}
    
    overall_score = random.randint(70, 96)
    grade = calculate_grade(overall_score)
    
    new_parts = {}
    for pk in PART_NAMES:
        p = report['parts'][pk]
        ns = random.randint(overall_score - 8, overall_score + 6)
        ns = max(55, min(100, ns))
        new_parts[pk] = {
            **p,
            'score': ns,
            'clarity': random.randint(75, 98),
            'completeness': random.randint(72, 97),
            'angle_standard': random.randint(78, 100),
            'description': f'{p["name"]}重新检测，综合评分{ns}分'
        }
    
    summary_map = {
        'S': f'该{type_names_full[instrument_type]}品相极佳，综合评分{overall_score}分，达到S级收藏级标准。',
        'A': f'该{type_names_full[instrument_type]}品相优秀，综合评分{overall_score}分，A级专业演奏级。',
        'B': f'该{type_names_full[instrument_type]}品相良好，综合评分{overall_score}分，B级进阶级。',
        'C': f'该{type_names_full[instrument_type]}品相中规中矩，综合评分{overall_score}分，C级入门级。',
        'D': f'该{type_names_full[instrument_type]}综合评分{overall_score}分，D级。建议现场验货。'
    }
    
    report['overall_score'] = overall_score
    report['grade'] = grade
    report['grade_color'] = GRADE_COLORS[grade]
    report['parts'] = new_parts
    report['summary'] = summary_map[grade]
    report['generated_at'] = datetime.now().isoformat()
    
    return jsonify(report)

@app.route('/api/transactions', methods=['POST'])
def create_transaction():
    data = request.get_json(force=True)
    instrument_id = data.get('instrument_id')
    buyer_id = data.get('buyer_id', 'user_demo')
    
    inst = next((i for i in mock_instruments_db if i['id'] == instrument_id), None)
    if not inst:
        return jsonify({'error': 'Instrument not found'}), 404
    if inst['status'] != 'available':
        return jsonify({'error': '该乐器已被购买或下架'}), 400
    
    inst['status'] = 'sold_pending'
    
    tx_id = f'tx_{uuid.uuid4().hex[:8]}'
    tx = {
        'id': tx_id,
        'instrument_id': instrument_id,
        'instrument_name': inst['name'],
        'instrument_thumbnail': inst['thumbnail'],
        'price': inst['price'],
        'seller_id': inst['seller_id'],
        'seller_name': inst['seller_name'],
        'buyer_id': buyer_id,
        'buyer_name': mock_users_db.get(buyer_id, mock_users_db['user_demo'])['nickname'],
        'status': 'escrow',
        'created_at': datetime.now().isoformat(),
        'inspection_deadline': (datetime.now() + timedelta(hours=48)).isoformat(),
        'dispute': None,
        'review_by_seller': None,
        'review_by_buyer': None
    }
    mock_transactions_db[tx_id] = tx
    
    report = mock_reports_db.get(inst['report_id'])
    if report:
        report['used'] = True
    
    return jsonify(tx)

@app.route('/api/transactions/<tx_id>', methods=['GET'])
def get_transaction(tx_id):
    tx = mock_transactions_db.get(tx_id)
    if not tx:
        return jsonify({'error': 'Transaction not found'}), 404
    return jsonify(tx)

@app.route('/api/transactions/<tx_id>/confirm-receipt', methods=['POST'])
def confirm_receipt(tx_id):
    tx = mock_transactions_db.get(tx_id)
    if not tx:
        return jsonify({'error': 'Transaction not found'}), 404
    if tx['status'] != 'escrow':
        return jsonify({'error': '当前状态不允许确认收货'}), 400
    
    tx['status'] = 'inspection_period'
    tx['confirmed_at'] = datetime.now().isoformat()
    tx['inspection_deadline'] = (datetime.now() + timedelta(hours=48)).isoformat()
    
    return jsonify(tx)

@app.route('/api/transactions/<tx_id>/complete', methods=['POST'])
def complete_transaction(tx_id):
    tx = mock_transactions_db.get(tx_id)
    if not tx:
        return jsonify({'error': 'Transaction not found'}), 404
    if tx['status'] not in ['inspection_period', 'escrow']:
        return jsonify({'error': '当前状态不允许完成交易'}), 400
    
    tx['status'] = 'completed'
    tx['completed_at'] = datetime.now().isoformat()
    
    return jsonify(tx)

@app.route('/api/transactions/<tx_id>/dispute', methods=['POST'])
def file_dispute(tx_id):
    tx = mock_transactions_db.get(tx_id)
    if not tx:
        return jsonify({'error': 'Transaction not found'}), 404
    if tx['status'] != 'inspection_period':
        return jsonify({'error': '仅验货期内可发起争议'}), 400
    
    data = request.get_json(force=True)
    tx['status'] = 'disputed'
    tx['dispute'] = {
        'reason': data.get('reason', ''),
        'description': data.get('description', ''),
        'evidence_images': data.get('evidence_images', []),
        'filed_at': datetime.now().isoformat(),
        'status': 'platform_reviewing'
    }
    
    return jsonify(tx)

@app.route('/api/transactions/<tx_id>/reviews', methods=['POST'])
def submit_review(tx_id):
    tx = mock_transactions_db.get(tx_id)
    if not tx:
        return jsonify({'error': 'Transaction not found'}), 404
    if tx['status'] != 'completed':
        return jsonify({'error': '仅完成的交易可评价'}), 400
    
    data = request.get_json(force=True)
    reviewer_role = data.get('role')
    rating = data.get('rating')
    comment = data.get('comment', '')
    
    if reviewer_role not in ['buyer', 'seller']:
        return jsonify({'error': '无效的评价者角色'}), 400
    if not rating or rating < 1 or rating > 5:
        return jsonify({'error': '评分需在1-5星之间'}), 400
    
    review_id = f'review_{uuid.uuid4().hex[:8]}'
    review_data = {
        'id': review_id,
        'transaction_id': tx_id,
        'rating': rating,
        'comment': comment,
        'created_at': datetime.now().isoformat()
    }
    
    if reviewer_role == 'buyer':
        tx['review_by_buyer'] = review_data
        target_user = tx['seller_id']
        review_data['from'] = tx['buyer_name']
        review_data['to'] = tx['seller_name']
    else:
        tx['review_by_seller'] = review_data
        target_user = tx['buyer_id']
        review_data['from'] = tx['seller_name']
        review_data['to'] = tx['buyer_name']
    
    mock_reviews_db.append(review_data)
    
    if target_user in mock_users_db:
        user = mock_users_db[target_user]
        old_total = user['total_ratings']
        old_rep = user['reputation']
        new_total = old_total + 1
        new_rep = round((old_rep * old_total + rating) / new_total, 2)
        user['total_ratings'] = new_total
        user['reputation'] = new_rep
    
    return jsonify(review_data)

@app.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    user = mock_users_db.get(user_id)
    if not user:
        user = mock_users_db['user_demo']
    user_reviews = [r for r in mock_reviews_db if r['to'] == user['nickname']]
    return jsonify({
        **user,
        'recent_reviews': user_reviews[-5:]
    })

@app.route('/api/users/<user_id>/listings', methods=['GET'])
def get_user_listings(user_id):
    listings = [i for i in mock_instruments_db if i['seller_id'] == user_id]
    listings.sort(key=lambda x: x['created_at'], reverse=True)
    return jsonify({'items': listings, 'total': len(listings)})

@app.route('/api/users/<user_id>/purchases', methods=['GET'])
def get_user_purchases(user_id):
    purchases = [t for t in mock_transactions_db.values() if t['buyer_id'] == user_id]
    purchases.sort(key=lambda x: x['created_at'], reverse=True)
    return jsonify({'items': purchases, 'total': len(purchases)})

@app.route('/api/users/<user_id>/pending-reviews', methods=['GET'])
def get_pending_reviews(user_id):
    pending = []
    for t in mock_transactions_db.values():
        if t['status'] == 'completed':
            if t['buyer_id'] == user_id and not t.get('review_by_buyer'):
                pending.append({**t, 'pending_role': 'buyer'})
            if t['seller_id'] == user_id and not t.get('review_by_seller'):
                pending.append({**t, 'pending_role': 'seller'})
    pending.sort(key=lambda x: x['completed_at'] if 'completed_at' in x else x['created_at'], reverse=True)
    return jsonify({'items': pending, 'total': len(pending)})

@app.route('/api/users/<user_id>/reports', methods=['GET'])
def get_user_reports(user_id):
    reports = list(mock_reports_db.values())
    reports.sort(key=lambda x: x['generated_at'], reverse=True)
    return jsonify({'items': reports, 'total': len(reports)})

@app.route('/api/meta/types', methods=['GET'])
def get_meta_types():
    return jsonify([
        {'value': 'guitar', 'label': '吉他', 'icon': '🎸'},
        {'value': 'violin', 'label': '小提琴', 'icon': '🎻'},
        {'value': 'saxophone', 'label': '萨克斯', 'icon': '🎷'},
        {'value': 'keyboard', 'label': '电子琴', 'icon': '🎹'}
    ])

@app.route('/api/meta/grades', methods=['GET'])
def get_meta_grades():
    return jsonify([
        {'value': 'S', 'label': 'S级', 'color': GRADE_COLORS['S'], 'desc': '90分以上，收藏级'},
        {'value': 'A', 'label': 'A级', 'color': GRADE_COLORS['A'], 'desc': '80-89分，专业级'},
        {'value': 'B', 'label': 'B级', 'color': GRADE_COLORS['B'], 'desc': '70-79分，进阶级'},
        {'value': 'C', 'label': 'C级', 'color': GRADE_COLORS['C'], 'desc': '60-69分，入门级'},
        {'value': 'D', 'label': 'D级', 'color': GRADE_COLORS['D'], 'desc': '60分以下，建议验货'}
    ])

@app.route('/api/meta/parts', methods=['GET'])
def get_meta_parts():
    return jsonify([{'value': k, 'label': v} for k, v in PART_NAMES.items()])

@app.route('/api/meta/angles', methods=['GET'])
def get_meta_angles():
    return jsonify([{'value': k, 'label': v} for k, v in ANGLE_NAMES.items()])

if __name__ == '__main__':
    os.makedirs('uploads', exist_ok=True)
    app.run(host='0.0.0.0', port=5000, debug=True)
