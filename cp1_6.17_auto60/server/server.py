from flask import Flask, request, jsonify
from flask_cors import CORS
import re
import math
from collections import defaultdict

app = Flask(__name__)
CORS(app)

recipes = []
next_id = 1

VEGETABLES = ['番茄', '土豆', '胡萝卜', '洋葱', '青椒', '菠菜', '西兰花', '生菜', '白菜', '黄瓜', '茄子', '豆角', '玉米', '蘑菇', '香菇', '金针菇', '韭菜', '芹菜', '蒜苔', '南瓜', '冬瓜', '苦瓜', '丝瓜', '芦笋']
MEATS = ['猪肉', '牛肉', '鸡肉', '羊肉', '鱼肉', '虾', '鸡蛋', '培根', '火腿', '排骨', '鸡翅', '鸡腿', '鸭肉', '鹅肉', '鱿鱼', '蟹']
SEASONINGS = ['盐', '酱油', '生抽', '老抽', '醋', '料酒', '糖', '白糖', '冰糖', '味精', '鸡精', '蚝油', '香油', '花椒', '八角', '桂皮', '香叶', '干辣椒', '辣椒粉', '孜然', '胡椒粉', '生姜', '大蒜', '葱', '香菜', '淀粉', '面粉', '小苏打', '番茄酱', '豆瓣酱', '甜面酱']
GRAINS = ['米饭', '大米', '面条', '面粉', '馒头', '面包', '意大利面', '糙米', '燕麦', '小米', '玉米粉', '红薯', '紫薯', '山药']
DAIRY = ['牛奶', '酸奶', '奶油', '奶酪', '黄油', '芝士']
FRUITS = ['苹果', '香蕉', '橙子', '柠檬', '草莓', '蓝莓', '芒果', '西瓜', '葡萄', '梨', '桃子', '菠萝']
OTHERS = ['油', '食用油', '橄榄油', '花生油', '菜籽油', '水', '高汤', '鸡汤', '鱼汤']

def categorize_ingredient(name):
    n = name.strip()
    for v in VEGETABLES:
        if v in n:
            return '蔬菜类'
    for m in MEATS:
        if m in n:
            return '肉类蛋奶'
    for s in SEASONINGS:
        if s in n:
            return '调味料'
    for g in GRAINS:
        if g in n:
            return '主食谷物'
    for d in DAIRY:
        if d in n:
            return '乳制品'
    for f in FRUITS:
        if f in n:
            return '水果类'
    for o in OTHERS:
        if o in n:
            return '油及其他'
    return '其他食材'

def extract_dominant_color(image_url):
    colors = [
        '#FF7F50', '#FFA07A', '#FA8072', '#E9967A', '#F08080',
        '#CD5C5C', '#DC143C', '#FF6347', '#FF4500', '#FF8C00',
        '#FFD700', '#DAA520', '#B8860B', '#F0E68C', '#FFE4B5',
        '#FFDEAD', '#F5DEB3', '#DEB887', '#D2B48C', '#BC8F8F'
    ]
    import hashlib
    h = int(hashlib.md5(image_url.encode()).hexdigest(), 16)
    return colors[h % len(colors)]

def parse_amount(amount_str):
    match = re.match(r'([\d.]+)\s*(.*)', str(amount_str).strip())
    if match:
        try:
            value = float(match.group(1))
            unit = match.group(2).strip()
            return value, unit
        except ValueError:
            return 0, str(amount_str).strip()
    return 0, str(amount_str).strip()

sample_recipes = [
    {
        'name': '番茄炒蛋',
        'prepTime': 10,
        'cookTime': 8,
        'ingredients': [
            {'name': '番茄', 'amount': '2个'},
            {'name': '鸡蛋', 'amount': '3个'},
            {'name': '葱', 'amount': '2根'},
            {'name': '盐', 'amount': '1茶匙'},
            {'name': '糖', 'amount': '1茶匙'},
            {'name': '食用油', 'amount': '2汤匙'}
        ],
        'steps': [
            '番茄洗净切块，鸡蛋打散加少许盐搅匀',
            '热锅倒油，倒入蛋液炒至凝固盛出',
            '锅中再加油，放入番茄块翻炒出汁',
            '加入盐和糖调味，倒入炒好的鸡蛋翻炒均匀',
            '撒上葱花即可出锅'
        ],
        'coverUrl': 'https://images.unsplash.com/photo-1607532941433-304659e8198a?w=400',
        'tags': ['家常', '快手', '下饭', '素菜'],
        'description': '经典家常菜，酸甜可口，营养丰富，15分钟搞定'
    },
    {
        'name': '红烧牛肉',
        'prepTime': 30,
        'cookTime': 90,
        'ingredients': [
            {'name': '牛肉', 'amount': '500克'},
            {'name': '土豆', 'amount': '2个'},
            {'name': '胡萝卜', 'amount': '1根'},
            {'name': '洋葱', 'amount': '1个'},
            {'name': '生姜', 'amount': '3片'},
            {'name': '大蒜', 'amount': '5瓣'},
            {'name': '八角', 'amount': '2个'},
            {'name': '桂皮', 'amount': '1小块'},
            {'name': '生抽', 'amount': '2汤匙'},
            {'name': '老抽', 'amount': '1汤匙'},
            {'name': '料酒', 'amount': '2汤匙'},
            {'name': '冰糖', 'amount': '15克'}
        ],
        'steps': [
            '牛肉切块冷水下锅焯水，撇去浮沫捞出洗净',
            '土豆胡萝卜切滚刀块，洋葱切片',
            '热锅倒油，放冰糖小火炒出糖色',
            '下牛肉翻炒上色，加姜蒜八角桂皮',
            '加生抽老抽料酒翻炒均匀',
            '加开水没过牛肉，大火烧开转小火炖60分钟',
            '加入土豆胡萝卜洋葱，继续炖20分钟',
            '大火收汁至浓稠即可'
        ],
        'coverUrl': 'https://images.unsplash.com/photo-1623238913973-21e45cced554?w=400',
        'tags': ['硬菜', '高蛋白', '下饭', '宴客'],
        'description': '软烂入味的红烧牛肉，配上土豆胡萝卜，浓郁醇香'
    },
    {
        'name': '清炒时蔬西兰花',
        'prepTime': 10,
        'cookTime': 5,
        'ingredients': [
            {'name': '西兰花', 'amount': '1颗'},
            {'name': '大蒜', 'amount': '3瓣'},
            {'name': '盐', 'amount': '1茶匙'},
            {'name': '蚝油', 'amount': '1汤匙'},
            {'name': '食用油', 'amount': '1汤匙'}
        ],
        'steps': [
            '西兰花掰小朵，用淡盐水浸泡10分钟后洗净',
            '烧开水加少许盐和油，下西兰花焯水1分钟捞出过凉',
            '热锅倒油爆香蒜末',
            '下西兰花快速翻炒，加盐和蚝油调味',
            '翻炒均匀即可出锅'
        ],
        'coverUrl': 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400',
        'tags': ['素食', '低卡', '快手', '健康'],
        'description': '翠绿爽脆的西兰花，蒜香四溢，低脂健康首选'
    },
    {
        'name': '香菇滑鸡粥',
        'prepTime': 15,
        'cookTime': 45,
        'ingredients': [
            {'name': '大米', 'amount': '150克'},
            {'name': '鸡腿', 'amount': '2只'},
            {'name': '香菇', 'amount': '6朵'},
            {'name': '生姜', 'amount': '3片'},
            {'name': '葱', 'amount': '2根'},
            {'name': '盐', 'amount': '适量'},
            {'name': '生抽', 'amount': '1茶匙'},
            {'name': '淀粉', 'amount': '1茶匙'},
            {'name': '胡椒粉', 'amount': '少许'}
        ],
        'steps': [
            '大米淘洗干净，加水浸泡30分钟',
            '鸡腿去骨切小块，加生抽淀粉胡椒粉腌制15分钟',
            '香菇泡发切片，姜切丝，葱切花',
            '锅中加水烧开，下大米大火煮开转小火熬30分钟',
            '加入香菇姜丝继续煮10分钟',
            '下鸡肉片搅散，煮至鸡肉变色熟透',
            '加盐调味，撒葱花和少许胡椒粉即可'
        ],
        'coverUrl': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400',
        'tags': ['早餐', '养生', '清淡', '暖胃'],
        'description': '软糯绵滑的粥底配上嫩滑鸡肉和鲜香香菇，温暖一整天'
    },
    {
        'name': '酸辣土豆丝',
        'prepTime': 15,
        'cookTime': 6,
        'ingredients': [
            {'name': '土豆', 'amount': '2个'},
            {'name': '青椒', 'amount': '1个'},
            {'name': '干辣椒', 'amount': '5个'},
            {'name': '大蒜', 'amount': '3瓣'},
            {'name': '醋', 'amount': '2汤匙'},
            {'name': '盐', 'amount': '1茶匙'},
            {'name': '糖', 'amount': '半茶匙'},
            {'name': '食用油', 'amount': '2汤匙'}
        ],
        'steps': [
            '土豆去皮切细丝，用清水反复冲洗去淀粉后浸泡',
            '青椒切丝，干辣椒切段，蒜切片',
            '热锅倒油爆香干辣椒和蒜片',
            '下土豆丝大火快炒，沿锅边淋入醋',
            '加青椒丝继续翻炒，加盐糖调味',
            '炒至土豆丝断生即可出锅'
        ],
        'coverUrl': 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=400',
        'tags': ['素食', '快手', '酸辣', '下饭'],
        'description': '爽脆酸辣的土豆丝，经典国民下饭菜，开胃又过瘾'
    },
    {
        'name': '蒜蓉蒸虾',
        'prepTime': 15,
        'cookTime': 8,
        'ingredients': [
            {'name': '虾', 'amount': '500克'},
            {'name': '大蒜', 'amount': '10瓣'},
            {'name': '葱', 'amount': '2根'},
            {'name': '生姜', 'amount': '2片'},
            {'name': '生抽', 'amount': '2汤匙'},
            {'name': '蚝油', 'amount': '1汤匙'},
            {'name': '糖', 'amount': '半茶匙'},
            {'name': '食用油', 'amount': '2汤匙'}
        ],
        'steps': [
            '虾剪去虾须虾枪，开背去虾线，用刀背轻拍铺平',
            '大蒜切末，姜切丝，葱切花',
            '碗中加生抽蚝油糖调成酱汁',
            '虾摆盘，撒姜丝，将蒜蓉铺在虾上',
            '水开后上蒸锅，大火蒸6分钟',
            '取出淋上酱汁，撒葱花',
            '烧热油浇在葱花蒜蓉上激发香味即可'
        ],
        'coverUrl': 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400',
        'tags': ['海鲜', '高蛋白', '宴客', '蒸菜'],
        'description': 'Q弹鲜嫩的大虾裹满金黄蒜蓉，香气扑鼻，宴客必备'
    },
    {
        'name': '意大利肉酱面',
        'prepTime': 20,
        'cookTime': 40,
        'ingredients': [
            {'name': '意大利面', 'amount': '200克'},
            {'name': '牛肉', 'amount': '200克'},
            {'name': '番茄', 'amount': '3个'},
            {'name': '洋葱', 'amount': '半个'},
            {'name': '大蒜', 'amount': '4瓣'},
            {'name': '番茄酱', 'amount': '3汤匙'},
            {'name': '生抽', 'amount': '1汤匙'},
            {'name': '糖', 'amount': '1茶匙'},
            {'name': '盐', 'amount': '适量'},
            {'name': '黑胡椒粉', 'amount': '少许'},
            {'name': '橄榄油', 'amount': '2汤匙'},
            {'name': '奶酪', 'amount': '少许'}
        ],
        'steps': [
            '番茄去皮切块，洋葱大蒜切碎，牛肉剁成肉末',
            '热锅倒橄榄油，爆香洋葱蒜末',
            '下牛肉末炒至变色散开',
            '加番茄块翻炒出汁，加番茄酱',
            '加生抽糖盐黑胡椒，小火炖25分钟成肉酱',
            '另起锅烧水加盐，下意面煮8分钟捞出过凉',
            '意面拌少许橄榄油，浇上肉酱，撒奶酪粉即可'
        ],
        'coverUrl': 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
        'tags': ['西餐', '高蛋白', '主食'],
        'description': '浓郁番茄肉酱包裹弹牙意面，经典意式风味'
    },
    {
        'name': '麻婆豆腐',
        'prepTime': 10,
        'cookTime': 12,
        'ingredients': [
            {'name': '豆腐', 'amount': '1块'},
            {'name': '猪肉', 'amount': '100克'},
            {'name': '豆瓣酱', 'amount': '1汤匙'},
            {'name': '花椒', 'amount': '1茶匙'},
            {'name': '大蒜', 'amount': '3瓣'},
            {'name': '生姜', 'amount': '2片'},
            {'name': '葱', 'amount': '2根'},
            {'name': '生抽', 'amount': '1汤匙'},
            {'name': '糖', 'amount': '半茶匙'},
            {'name': '淀粉', 'amount': '1茶匙'},
            {'name': '辣椒粉', 'amount': '半茶匙'},
            {'name': '食用油', 'amount': '2汤匙'}
        ],
        'steps': [
            '豆腐切小方块，用淡盐水浸泡',
            '猪肉剁末，姜蒜切末，葱切花，花椒炒香碾碎',
            '热锅倒油，下肉末炒散至微黄',
            '加豆瓣酱辣椒粉炒出红油，下姜蒜末',
            '加适量水烧开，下豆腐块轻轻推动',
            '加生抽糖，小火炖5分钟入味',
            '淀粉勾芡，撒花椒粉和葱花，淋热油即可'
        ],
        'coverUrl': 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=400',
        'tags': ['川菜', '麻辣', '下饭', '家常'],
        'description': '麻辣鲜香烫的经典川菜，嫩滑豆腐配酥香肉末'
    },
    {
        'name': '燕麦水果碗',
        'prepTime': 5,
        'cookTime': 3,
        'ingredients': [
            {'name': '燕麦', 'amount': '50克'},
            {'name': '牛奶', 'amount': '200毫升'},
            {'name': '香蕉', 'amount': '半根'},
            {'name': '草莓', 'amount': '5颗'},
            {'name': '蓝莓', 'amount': '30克'},
            {'name': '蜂蜜', 'amount': '1茶匙'}
        ],
        'steps': [
            '燕麦用牛奶或水泡软',
            '微波炉加热2分钟或小火煮3分钟成糊状',
            '香蕉切片，草莓对半切',
            '燕麦盛入碗中，摆上水果',
            '淋上蜂蜜即可享用'
        ],
        'coverUrl': 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?w=400',
        'tags': ['早餐', '素食', '健康', '低卡'],
        'description': '缤纷水果搭配软糯燕麦，高颜值超营养的元气早餐'
    },
    {
        'name': '糖醋排骨',
        'prepTime': 20,
        'cookTime': 40,
        'ingredients': [
            {'name': '排骨', 'amount': '500克'},
            {'name': '生姜', 'amount': '3片'},
            {'name': '葱', 'amount': '2根'},
            {'name': '料酒', 'amount': '2汤匙'},
            {'name': '生抽', 'amount': '1汤匙'},
            {'name': '醋', 'amount': '3汤匙'},
            {'name': '白糖', 'amount': '2汤匙'},
            {'name': '冰糖', 'amount': '15克'},
            {'name': '八角', 'amount': '1个'},
            {'name': '白芝麻', 'amount': '少许'}
        ],
        'steps': [
            '排骨冷水下锅焯水，加料酒姜片，撇浮沫捞出洗净',
            '碗中调糖醋汁：醋3勺、白糖2勺、生抽1勺、料酒1勺、清水适量',
            '热锅倒油，放冰糖小火炒出糖色',
            '下排骨翻炒裹上糖色',
            '加姜片葱段八角炒香',
            '倒入糖醋汁，加开水没过排骨',
            '大火烧开转小火炖30分钟',
            '大火收汁，撒白芝麻即可'
        ],
        'coverUrl': 'https://images.unsplash.com/photo-1563245372-f21724e3856d?w=400',
        'tags': ['酸甜', '宴客', '家常', '下酒'],
        'description': '外酥里嫩酸甜适中，经典国民硬菜，老少皆宜'
    },
    {
        'name': '鲜虾蔬菜沙拉',
        'prepTime': 20,
        'cookTime': 5,
        'ingredients': [
            {'name': '虾', 'amount': '300克'},
            {'name': '生菜', 'amount': '1颗'},
            {'name': '黄瓜', 'amount': '1根'},
            {'name': '番茄', 'amount': '2个'},
            {'name': '牛油果', 'amount': '1个'},
            {'name': '柠檬', 'amount': '半个'},
            {'name': '橄榄油', 'amount': '2汤匙'},
            {'name': '黑胡椒粉', 'amount': '少许'},
            {'name': '盐', 'amount': '适量'},
            {'name': '蜂蜜', 'amount': '1茶匙'}
        ],
        'steps': [
            '虾去壳去虾线，用料酒腌10分钟',
            '烧开水下虾煮至变红捞出过凉',
            '生菜撕小片，黄瓜切片，番茄切块，牛油果切片',
            '蔬菜沥干水分摆入碗中',
            '放上虾仁，淋上柠檬汁',
            '橄榄油、黑胡椒、盐、蜂蜜调成酱汁',
            '淋上沙拉汁拌匀即可'
        ],
        'coverUrl': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
        'tags': ['健康', '低卡', '素食', '高蛋白'],
        'description': '清爽低脂的蔬菜沙拉配上Q弹虾仁，轻盈美味无负担'
    },
    {
        'name': '韭菜鸡蛋饺子',
        'prepTime': 60,
        'cookTime': 10,
        'ingredients': [
            {'name': '面粉', 'amount': '300克'},
            {'name': '韭菜', 'amount': '300克'},
            {'name': '鸡蛋', 'amount': '4个'},
            {'name': '虾仁', 'amount': '100克'},
            {'name': '盐', 'amount': '适量'},
            {'name': '香油', 'amount': '2汤匙'},
            {'name': '食用油', 'amount': '3汤匙'},
            {'name': '胡椒粉', 'amount': '少许'}
        ],
        'steps': [
            '面粉加水揉成光滑面团，醒30分钟',
            '鸡蛋打散炒熟切碎，韭菜切末，虾仁切丁',
            '馅料中先加食用油拌匀韭菜，再加鸡蛋虾仁',
            '加盐香油胡椒粉调味拌匀',
            '面团揉长条切剂子，擀成饺子皮',
            '包入馅料，捏紧封口',
            '烧开水下饺子，点三次凉水，煮至浮起鼓胀即可'
        ],
        'coverUrl': 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400',
        'tags': ['主食', '家常', '手工', '节日'],
        'description': '皮薄馅大的手工饺子，韭菜鸡蛋虾仁三鲜美味'
    }
]

for r in sample_recipes:
    r['id'] = next_id
    r['dominantColor'] = extract_dominant_color(r['coverUrl'])
    recipes.append(r)
    next_id += 1


@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    return jsonify({'recipes': recipes})


@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    recipe = next((r for r in recipes if r['id'] == recipe_id), None)
    if recipe:
        return jsonify({'recipe': recipe})
    return jsonify({'error': 'Recipe not found'}), 404


@app.route('/api/recipes', methods=['POST'])
def create_recipe():
    global next_id
    data = request.json
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    required = ['name', 'ingredients', 'steps', 'coverUrl']
    for field in required:
        if field not in data:
            return jsonify({'error': f'Missing required field: {field}'}), 400
    
    recipe = {
        'id': next_id,
        'name': data['name'],
        'prepTime': data.get('prepTime', 0),
        'cookTime': data.get('cookTime', 0),
        'ingredients': data['ingredients'],
        'steps': data['steps'],
        'coverUrl': data['coverUrl'],
        'tags': data.get('tags', []),
        'description': data.get('description', '')
    }
    recipe['dominantColor'] = extract_dominant_color(recipe['coverUrl'])
    recipes.append(recipe)
    next_id += 1
    return jsonify({'recipe': recipe}), 201


@app.route('/api/recipes/<int:recipe_id>', methods=['PUT'])
def update_recipe(recipe_id):
    data = request.json
    recipe = next((r for r in recipes if r['id'] == recipe_id), None)
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    for key in ['name', 'prepTime', 'cookTime', 'ingredients', 'steps', 'coverUrl', 'tags', 'description']:
        if key in data:
            recipe[key] = data[key]
    
    if 'coverUrl' in data:
        recipe['dominantColor'] = extract_dominant_color(data['coverUrl'])
    
    return jsonify({'recipe': recipe})


@app.route('/api/recipes/<int:recipe_id>', methods=['DELETE'])
def delete_recipe(recipe_id):
    global recipes
    recipe = next((r for r in recipes if r['id'] == recipe_id), None)
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    recipes = [r for r in recipes if r['id'] != recipe_id]
    return jsonify({'message': 'Recipe deleted'})


@app.route('/api/color', methods=['POST'])
def get_color():
    data = request.json
    image_url = data.get('imageUrl', '')
    color = extract_dominant_color(image_url)
    return jsonify({'color': color})


@app.route('/api/shopping-list', methods=['POST'])
def generate_shopping_list():
    data = request.json
    recipe_ids = data.get('recipeIds', [])
    
    if not recipe_ids:
        return jsonify({'groups': {}})
    
    ingredient_map = defaultdict(lambda: {'values': [], 'total': 0, 'unit': ''})
    
    for rid in recipe_ids:
        recipe = next((r for r in recipes if r['id'] == rid), None)
        if recipe:
            for ing in recipe['ingredients']:
                name = ing['name'].strip()
                amount_str = str(ing['amount']).strip()
                value, unit = parse_amount(amount_str)
                
                existing = ingredient_map[name]
                if existing['unit'] == '' or existing['unit'] == unit:
                    existing['unit'] = unit
                    existing['total'] += value
                else:
                    existing['values'].append(amount_str)
                    if value > 0:
                        existing['total'] += value
                
                if amount_str:
                    existing['values'].append(amount_str)
    
    groups = defaultdict(list)
    for name, info in ingredient_map.items():
        category = categorize_ingredient(name)
        if info['total'] > 0 and info['unit']:
            if info['total'] == int(info['total']):
                display_amount = f"{int(info['total'])}{info['unit']}"
            else:
                display_amount = f"{info['total']:.1f}{info['unit']}"
        else:
            unique_vals = list(dict.fromkeys(info['values']))
            display_amount = '+'.join(unique_vals) if unique_vals else '适量'
        
        groups[category].append({
            'name': name,
            'amount': display_amount
        })
    
    for cat in groups:
        groups[cat].sort(key=lambda x: x['name'])
    
    ordered = {}
    preferred_order = ['蔬菜类', '肉类蛋奶', '主食谷物', '调味料', '乳制品', '水果类', '油及其他', '其他食材']
    for cat in preferred_order:
        if cat in groups:
            ordered[cat] = groups[cat]
    for cat, items in groups.items():
        if cat not in ordered:
            ordered[cat] = items
    
    return jsonify({'groups': ordered})


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'recipeCount': len(recipes)})


if __name__ == '__main__':
    print('🍳 美食工坊后端服务启动中...')
    print(f'📚 已加载 {len(recipes)} 个示例食谱')
    print('🚀 服务地址: http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)
