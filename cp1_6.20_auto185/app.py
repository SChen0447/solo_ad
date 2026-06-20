from flask import Flask, request, jsonify
from flask_cors import CORS
import random
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

CATEGORIES = [
    {'key': 'plastic', 'label': '塑料瓶', 'color': '#4ECDC4'},
    {'key': 'glass', 'label': '玻璃瓶', 'color': '#45B7D1'},
    {'key': 'paper', 'label': '纸箱', 'color': '#F39C12'},
    {'key': 'cloth', 'label': '布料', 'color': '#E74C3C'},
    {'key': 'wood', 'label': '木制品', 'color': '#8E44AD'},
    {'key': 'metal', 'label': '金属罐', 'color': '#95A5A6'},
    {'key': 'tire', 'label': '轮胎', 'color': '#2C3E50'},
    {'key': 'electronic', 'label': '旧电器', 'color': '#E67E22'},
]

CATEGORY_LABELS = [c['label'] for c in CATEGORIES]

CATEGORY_FEATURE_PROFILES = {
    '塑料瓶': [0.02] * 10 + [0.08] * 6 + [0.0] * 16 + [0.06] * 10 + [0.02] * 6 + [0.01] * 10,
    '玻璃瓶': [0.01] * 6 + [0.05] * 10 + [0.0] * 16 + [0.03] * 8 + [0.06] * 8 + [0.04] * 10,
    '纸箱': [0.0] * 4 + [0.03] * 8 + [0.06] * 4 + [0.01] * 10 + [0.05] * 6 + [0.02] * 16,
    '布料': [0.05] * 8 + [0.02] * 8 + [0.0] * 16 + [0.04] * 8 + [0.02] * 8 + [0.01] * 16,
    '木制品': [0.02] * 6 + [0.04] * 10 + [0.01] * 16 + [0.03] * 10 + [0.02] * 6 + [0.02] * 16,
    '金属罐': [0.01] * 4 + [0.02] * 12 + [0.0] * 16 + [0.02] * 6 + [0.03] * 10 + [0.03] * 16,
    '轮胎': [0.0] * 8 + [0.01] * 8 + [0.0] * 16 + [0.01] * 8 + [0.01] * 8 + [0.06] * 16,
    '旧电器': [0.02] * 10 + [0.02] * 6 + [0.01] * 16 + [0.02] * 10 + [0.02] * 6 + [0.02] * 16,
}

INSPIRATION_TITLES = {
    '塑料瓶': [
        '塑料瓶变身垂吊花盆',
        '可乐瓶自制自动喂鸟器',
        '矿泉水瓶改造创意笔筒',
        '塑料瓶DIY儿童存钱罐',
        '废旧塑料瓶制作装饰灯笼',
        '饮料瓶改造成创意收纳盒',
        '塑料瓶制作水培植物容器',
        '大号塑料瓶改造厨房置物架',
        '塑料瓶DIY精美风铃挂饰',
        '塑料瓶改造成艺术花瓶',
    ],
    '玻璃瓶': [
        '玻璃酒瓶改造浪漫烛台',
        '果酱瓶变身多肉植物盆栽',
        '旧玻璃瓶制作梦幻星空瓶',
        '玻璃瓶DIY麻绳装饰花瓶',
        '玻璃罐改造成储物收纳罐',
        '彩色玻璃瓶制作阳光捕手',
        '玻璃瓶自制香薰精油瓶',
        '旧酒瓶改造创意台灯底座',
        '玻璃罐制作雪花水晶球',
        '玻璃瓶DIY干花装饰摆件',
    ],
    '纸箱': [
        '快递箱改造儿童玩具屋',
        '纸箱DIY猫咪城堡乐园',
        '废旧纸箱制作收纳抽屉',
        '纸箱自制桌面文件架',
        '大纸箱改造宝宝游戏围栏',
        '纸箱制作创意展示书架',
        '快递箱变身豪华宠物床',
        '纸箱DIY节日礼品包装盒',
        '纸箱制作3D立体墙面装饰',
        '废旧纸箱改造鞋盒收纳',
    ],
    '布料': [
        '旧T恤改造时尚购物袋',
        '牛仔裤DIY个性抱枕套',
        '废旧布料制作拼布地毯',
        '旧衬衫改造宝宝连衣裙',
        '布料制作布艺钥匙挂件',
        '旧毛衣改造温暖宠物窝',
        '碎布料DIY手工布艺花',
        '旧床单改造多功能盖毯',
        '牛仔裤改造时尚手提包',
        '布料制作杯垫隔热垫套装',
    ],
    '木制品': [
        '旧木梯改造复古置物架',
        '木托盘DIY茶桌茶几',
        '废旧木箱改造收纳柜',
        '木片制作创意墙面装饰',
        '旧木门改造特色餐桌',
        '木棍自制庭院花架爬藤架',
        '木盒DIY精美首饰收纳盒',
        '旧木椅翻新改造花园长椅',
        '木块制作可爱多肉花盆',
        '木板改造厨房刀架砧板',
    ],
    '金属罐': [
        '奶粉罐改造成笔筒收纳',
        '铁罐DIY多肉植物花盆',
        '易拉罐制作创意小椅子',
        '金属罐改造厨房调料罐',
        '铁罐制作复古风格灯笼',
        '旧铁罐DIY精美存钱罐',
        '金属罐制作花园装饰风铃',
        '易拉罐改造创意烟灰缸',
        '铁罐制作香薰蜡烛杯',
        '奶粉罐改造宝宝玩具鼓',
    ],
    '轮胎': [
        '旧轮胎改造户外休闲座椅',
        '轮胎DIY大型花坛花盆',
        '汽车轮胎改造儿童秋千',
        '轮胎制作宠物狗窝猫窝',
        '旧轮胎改造创意茶几',
        '轮胎DIY沙滩草坪躺椅',
        '轮胎制作庭院艺术装饰品',
        '轮胎改造运动健身器材',
        '旧轮胎制作小型沙池',
        '轮胎DIY悬挂式收纳架',
    ],
    '旧电器': [
        '旧电脑主机改造鱼缸水族箱',
        '老式收音机改造成蓝牙音箱',
        '旧电视机改造复古陈列柜',
        '废旧键盘制作创意装饰画',
        '旧风扇改造工业风台灯',
        '电话座机改造复古装饰摆件',
        '旧硬盘制作精美时钟',
        '洗衣机滚筒改造火焰壁炉',
        '废旧电路板制作艺术首饰',
        '旧打印机改造3D打印机',
    ],
}

AUTHORS = ['创意达人小王', '手工艺术家', '环保小能手', '旧物改造大师', '社区居民小李', 'DIY爱好者', '巧手妈妈', '艺术系学生', '退休张老师', '工程师爸爸']

def generate_inspirations():
    inspirations = []
    idx = 1
    for category, titles in INSPIRATION_TITLES.items():
        for title in titles:
            inspirations.append({
                'id': f' insp_{idx}',
                'category': category,
                'title': title,
                'author': random.choice(AUTHORS),
                'likes': random.randint(12, 358),
                'beforeImage': f'https://picsum.photos/seed/before{idx}/400/320',
                'afterImage': f'https://picsum.photos/seed/after{idx}/400/320',
            })
            idx += 1
    return inspirations

ALL_INSPIRATIONS = generate_inspirations()

records_db = []

def cosine_similarity(vec1, vec2):
    if len(vec1) != len(vec2):
        return 0
    dot_product = sum(a * b for a, b in zip(vec1, vec2))
    norm1 = sum(a ** 2 for a in vec1) ** 0.5
    norm2 = sum(b ** 2 for b in vec2) ** 0.5
    if norm1 == 0 or norm2 == 0:
        return 0
    return dot_product / (norm1 * norm2)

@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify(CATEGORIES)

@app.route('/api/identify', methods=['POST'])
def identify_item():
    data = request.get_json()
    features = data.get('features', [])
    
    if not features or len(features) != 48:
        return jsonify({'category': random.choice(CATEGORY_LABELS)})
    
    best_category = None
    best_score = -1
    
    for category, profile in CATEGORY_FEATURE_PROFILES.items():
        score = cosine_similarity(features, profile)
        if score > best_score:
            best_score = score
            best_category = category
    
    if not best_category or best_score < 0.3:
        best_category = random.choice(CATEGORY_LABELS)
    
    return jsonify({'category': best_category})

@app.route('/api/inspirations', methods=['GET'])
def get_inspirations():
    category = request.args.get('category')
    if category:
        filtered = [i for i in ALL_INSPIRATIONS if i['category'] == category]
        return jsonify(filtered)
    return jsonify(ALL_INSPIRATIONS)

@app.route('/api/records', methods=['POST'])
def save_record():
    data = request.get_json()
    record = {
        'id': str(uuid.uuid4()),
        'userId': data.get('userId', 'demo-user'),
        'inspirationId': data.get('inspirationId', ''),
        'category': data.get('category', ''),
        'steps': data.get('steps', {}),
        'createdAt': datetime.now().isoformat(),
    }
    records_db.append(record)
    return jsonify(record), 201

@app.route('/api/records/<user_id>', methods=['GET'])
def get_user_records(user_id):
    user_records = [r for r in records_db if r['userId'] == user_id]
    user_records.sort(key=lambda r: r['createdAt'], reverse=True)
    return jsonify(user_records)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
