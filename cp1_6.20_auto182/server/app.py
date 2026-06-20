from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
import copy

app = Flask(__name__)
CORS(app)

recipes = []
next_id = 1

sample_recipes = [
    {
        "name": "番茄炒蛋",
        "cuisine": "chinese",
        "ingredients": [
            {"name": "番茄", "quantity": 2, "unit": "个"},
            {"name": "鸡蛋", "quantity": 3, "unit": "个"},
            {"name": "葱花", "quantity": 10, "unit": "克"},
            {"name": "盐", "quantity": 3, "unit": "克"},
            {"name": "糖", "quantity": 5, "unit": "克"},
        ],
        "steps": [
            {"description": "番茄洗净切块，鸡蛋打散备用。", "image": None},
            {"description": "热锅冷油，倒入蛋液，炒至半熟盛出。", "image": None},
            {"description": "锅中加少许油，放入番茄翻炒出汁。", "image": None},
            {"description": "加入炒好的鸡蛋，加盐和糖调味，翻炒均匀出锅，撒上葱花。", "image": None},
        ],
        "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tomato%20scrambled%20eggs%20chinese%20home%20style%20dish&image_size=square",
    },
    {
        "name": "意大利肉酱面",
        "cuisine": "western",
        "ingredients": [
            {"name": "意大利面", "quantity": 200, "unit": "克"},
            {"name": "牛肉末", "quantity": 150, "unit": "克"},
            {"name": "番茄", "quantity": 2, "unit": "个"},
            {"name": "洋葱", "quantity": 0.5, "unit": "个"},
            {"name": "大蒜", "quantity": 2, "unit": "瓣"},
            {"name": "番茄酱", "quantity": 30, "unit": "克"},
            {"name": "橄榄油", "quantity": 20, "unit": "毫升"},
            {"name": "盐", "quantity": 5, "unit": "克"},
        ],
        "steps": [
            {"description": "洋葱和大蒜切碎，番茄切丁备用。", "image": None},
            {"description": "锅中加橄榄油，炒香洋葱和大蒜。", "image": None},
            {"description": "加入牛肉末炒至变色。", "image": None},
            {"description": "加入番茄丁和番茄酱，小火炖煮20分钟成肉酱。", "image": None},
            {"description": "另起一锅煮意大利面，煮好后拌入肉酱即可。", "image": None},
        ],
        "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=spaghetti%20bolognese%20italian%20pasta%20meat%20sauce&image_size=square",
    },
    {
        "name": "日式照烧鸡腿",
        "cuisine": "japanese",
        "ingredients": [
            {"name": "鸡腿", "quantity": 2, "unit": "个"},
            {"name": "酱油", "quantity": 30, "unit": "毫升"},
            {"name": "味醂", "quantity": 20, "unit": "毫升"},
            {"name": "清酒", "quantity": 20, "unit": "毫升"},
            {"name": "白糖", "quantity": 15, "unit": "克"},
            {"name": "姜末", "quantity": 5, "unit": "克"},
            {"name": "白芝麻", "quantity": 5, "unit": "克"},
        ],
        "steps": [
            {"description": "鸡腿去骨，用刀背轻拍使其厚薄均匀。", "image": None},
            {"description": "将酱油、味醂、清酒、白糖、姜末混合调成照烧汁。", "image": None},
            {"description": "平底锅不放油，鸡皮朝下煎至金黄。", "image": None},
            {"description": "翻面继续煎至熟透。", "image": None},
            {"description": "倒入照烧汁，小火收汁至浓稠，切片装盘，撒白芝麻。", "image": None},
        ],
        "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=japanese%20teriyaki%20chicken%20rice%20bowl&image_size=square",
    },
    {
        "name": "泰式冬阴功汤",
        "cuisine": "southeast",
        "ingredients": [
            {"name": "虾", "quantity": 200, "unit": "克"},
            {"name": "香茅", "quantity": 2, "unit": "根"},
            {"name": "柠檬叶", "quantity": 5, "unit": "片"},
            {"name": "南姜", "quantity": 3, "unit": "片"},
            {"name": "小米辣", "quantity": 3, "unit": "个"},
            {"name": "椰浆", "quantity": 100, "unit": "毫升"},
            {"name": "鱼露", "quantity": 15, "unit": "毫升"},
            {"name": "青柠", "quantity": 1, "unit": "个"},
            {"name": "蘑菇", "quantity": 100, "unit": "克"},
        ],
        "steps": [
            {"description": "虾去壳留尾，蘑菇切片，香茅切段，南姜切片。", "image": None},
            {"description": "锅中加水，放入香茅、柠檬叶、南姜、小米辣煮10分钟出香味。", "image": None},
            {"description": "放入蘑菇煮2分钟。", "image": None},
            {"description": "加入虾煮至变色变红。", "image": None},
            {"description": "加入椰浆、鱼露调味，关火后挤入青柠汁即可。", "image": None},
        ],
        "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=thai%20tom%20yum%20soup%20shrimp%20spicy&image_size=square",
    },
    {
        "name": "巧克力曲奇",
        "cuisine": "baking",
        "ingredients": [
            {"name": "低筋面粉", "quantity": 150, "unit": "克"},
            {"name": "黄油", "quantity": 100, "unit": "克"},
            {"name": "糖粉", "quantity": 60, "unit": "克"},
            {"name": "鸡蛋", "quantity": 1, "unit": "个"},
            {"name": "可可粉", "quantity": 20, "unit": "克"},
            {"name": "巧克力豆", "quantity": 50, "unit": "克"},
            {"name": "泡打粉", "quantity": 2, "unit": "克"},
            {"name": "盐", "quantity": 1, "unit": "克"},
        ],
        "steps": [
            {"description": "黄油软化后加糖粉打发至蓬松。", "image": None},
            {"description": "分次加入蛋液搅打均匀。", "image": None},
            {"description": "筛入低粉、可可粉、泡打粉和盐，翻拌均匀。", "image": None},
            {"description": "加入巧克力豆拌匀。", "image": None},
            {"description": "分成小团摆在烤盘上，预热烤箱170度，烤12-15分钟。", "image": None},
        ],
        "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chocolate%20chip%20cookies%20freshly%20baked&image_size=square",
    },
    {
        "name": "宫保鸡丁",
        "cuisine": "chinese",
        "ingredients": [
            {"name": "鸡胸肉", "quantity": 200, "unit": "克"},
            {"name": "花生米", "quantity": 50, "unit": "克"},
            {"name": "干辣椒", "quantity": 10, "unit": "个"},
            {"name": "花椒", "quantity": 3, "unit": "克"},
            {"name": "葱", "quantity": 2, "unit": "根"},
            {"name": "姜", "quantity": 3, "unit": "片"},
            {"name": "蒜", "quantity": 3, "unit": "瓣"},
            {"name": "生抽", "quantity": 15, "unit": "毫升"},
            {"name": "醋", "quantity": 10, "unit": "毫升"},
            {"name": "糖", "quantity": 10, "unit": "克"},
            {"name": "淀粉", "quantity": 5, "unit": "克"},
        ],
        "steps": [
            {"description": "鸡胸肉切丁，用生抽、淀粉腌制10分钟。", "image": None},
            {"description": "调碗汁：生抽、醋、糖、淀粉、少许水。", "image": None},
            {"description": "热锅倒油，放入干辣椒和花椒爆香。", "image": None},
            {"description": "加入鸡丁快速翻炒至变色。", "image": None},
            {"description": "加入葱姜蒜炒香，倒入碗汁翻炒均匀。", "image": None},
            {"description": "最后加入花生米翻炒均匀即可出锅。", "image": None},
        ],
        "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=kung%20pao%20chicken%20chinese%20dish%20peanuts&image_size=square",
    },
    {
        "name": "提拉米苏",
        "cuisine": "baking",
        "ingredients": [
            {"name": "马斯卡彭奶酪", "quantity": 250, "unit": "克"},
            {"name": "手指饼干", "quantity": 150, "unit": "克"},
            {"name": "鸡蛋", "quantity": 2, "unit": "个"},
            {"name": "细砂糖", "quantity": 60, "unit": "克"},
            {"name": "浓缩咖啡", "quantity": 200, "unit": "毫升"},
            {"name": "可可粉", "quantity": 10, "unit": "克"},
            {"name": "朗姆酒", "quantity": 10, "unit": "毫升"},
        ],
        "steps": [
            {"description": "蛋黄加糖打发至颜色变浅，加入马斯卡彭奶酪拌匀。", "image": None},
            {"description": "蛋白打发至硬性发泡，分次与蛋黄糊拌匀。", "image": None},
            {"description": "浓缩咖啡放凉，加入朗姆酒。", "image": None},
            {"description": "手指饼干快速蘸咖啡，铺一层在容器底部。", "image": None},
            {"description": "铺一层奶酪糊，重复铺层。", "image": None},
            {"description": "冷藏4小时以上，食用前筛上可可粉。", "image": None},
        ],
        "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tiramisu%20italian%20dessert%20cocoa%20powder&image_size=square",
    },
    {
        "name": "越南春卷",
        "cuisine": "southeast",
        "ingredients": [
            {"name": "春卷皮", "quantity": 10, "unit": "张"},
            {"name": "虾仁", "quantity": 150, "unit": "克"},
            {"name": "米粉", "quantity": 100, "unit": "克"},
            {"name": "生菜", "quantity": 50, "unit": "克"},
            {"name": "薄荷", "quantity": 20, "unit": "克"},
            {"name": "胡萝卜", "quantity": 0.5, "unit": "根"},
            {"name": "黄瓜", "quantity": 0.5, "unit": "根"},
            {"name": "鱼露", "quantity": 20, "unit": "毫升"},
            {"name": "花生酱", "quantity": 30, "unit": "克"},
        ],
        "steps": [
            {"description": "虾仁焯水煮熟，米粉泡软，胡萝卜黄瓜切丝。", "image": None},
            {"description": "春卷皮用温水泡软。", "image": None},
            {"description": "春卷皮摊开，放上生菜、薄荷、米粉、虾仁、胡萝卜丝、黄瓜丝。", "image": None},
            {"description": "从下往上卷起，两边折入，卷紧。", "image": None},
            {"description": "鱼露和花生酱混合调成蘸料。", "image": None},
        ],
        "image": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vietnamese%20fresh%20spring%20rolls%20shrimp%20vegetables&image_size=square",
    },
]

for i, recipe in enumerate(sample_recipes):
    r = copy.deepcopy(recipe)
    r["id"] = i + 1
    r["createdAt"] = datetime.now().isoformat()
    recipes.append(r)

next_id = len(recipes) + 1


@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    page = int(request.args.get('page', 1))
    limit = int(request.args.get('limit', 10))
    start = (page - 1) * limit
    end = start + limit
    paginated = recipes[start:end]
    return jsonify(paginated)


@app.route('/api/recipes/<int:recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    for recipe in recipes:
        if recipe['id'] == recipe_id:
            return jsonify(recipe)
    return jsonify({"error": "Recipe not found"}), 404


@app.route('/api/recipes', methods=['POST'])
def create_recipe():
    global next_id
    data = request.get_json()

    if not data.get('name'):
        return jsonify({"error": "Name is required"}), 400

    new_recipe = {
        "id": next_id,
        "name": data['name'],
        "cuisine": data.get('cuisine', 'chinese'),
        "ingredients": data.get('ingredients', []),
        "steps": data.get('steps', []),
        "image": data.get('image', ''),
        "createdAt": datetime.now().isoformat(),
    }

    recipes.append(new_recipe)
    next_id += 1
    return jsonify(new_recipe), 201


@app.route('/api/recommend', methods=['GET'])
def recommend():
    ingredients_param = request.args.get('ingredients', '')
    if not ingredients_param:
        return jsonify([])

    user_ingredients = [i.strip().lower() for i in ingredients_param.split(',') if i.strip()]

    results = []
    for recipe in recipes:
        recipe_ingredients = [ing['name'].lower() for ing in recipe['ingredients']]
        matched = sum(1 for ui in user_ingredients if any(ui in ri for ri in recipe_ingredients))
        total = len(recipe_ingredients)
        if total > 0:
            match_rate = matched / total
            if match_rate >= 0.5:
                recipe_copy = copy.deepcopy(recipe)
                recipe_copy['matchRate'] = round(match_rate, 3)
                results.append(recipe_copy)

    results.sort(key=lambda x: x['matchRate'], reverse=True)
    return jsonify(results)


if __name__ == '__main__':
    print("Food Explorer API running on http://localhost:5001")
    app.run(debug=False, host='127.0.0.1', port=5001)
