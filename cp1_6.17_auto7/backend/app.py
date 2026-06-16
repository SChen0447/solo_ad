import sqlite3
import os
import json
import csv
import io
from datetime import date
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'recipe_tracker.db')

RECIPES_DB = [
    {
        'id': 1,
        'name': '香煎鸡胸肉配西兰花',
        'ingredients': ['鸡胸肉 200g', '西兰花 150g', '橄榄油 1勺', '蒜末 适量', '盐 少许', '黑胡椒 少许'],
        'steps': [
            '鸡胸肉用盐和黑胡椒腌制15分钟',
            '西兰花切小朵，焯水2分钟捞出',
            '平底锅加热橄榄油，放入蒜末爆香',
            '放入鸡胸肉，每面煎3-4分钟至金黄',
            '加入西兰花翻炒均匀，出锅装盘'
        ],
        'calories': 380,
        'protein': 42,
        'fat': 14,
        'carbs': 18,
        'tags': ['高蛋白', '低卡'],
        'image_url': 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=400',
        'ingredients_key': ['鸡胸肉', '西兰花']
    },
    {
        'id': 2,
        'name': '糙米鸡胸肉蔬菜碗',
        'ingredients': ['糙米 100g', '鸡胸肉 150g', '胡萝卜 50g', '黄瓜 50g', '酱油 1勺', '香油 少许'],
        'steps': [
            '糙米提前浸泡2小时，蒸熟备用',
            '鸡胸肉煮熟撕成丝',
            '胡萝卜和黄瓜切丝',
            '将所有材料放入碗中',
            '淋上酱油和香油，拌匀即可'
        ],
        'calories': 450,
        'protein': 35,
        'fat': 8,
        'carbs': 60,
        'tags': ['高蛋白', '健身餐'],
        'image_url': 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
        'ingredients_key': ['糙米', '鸡胸肉', '胡萝卜', '黄瓜']
    },
    {
        'id': 3,
        'name': '西兰花虾仁炒饭',
        'ingredients': ['糙米饭 150g', '虾仁 100g', '西兰花 100g', '鸡蛋 1个', '葱花 适量', '盐 少许'],
        'steps': [
            '虾仁去虾线，用盐腌制10分钟',
            '西兰花切小朵焯水备用',
            '鸡蛋打散炒成蛋花盛出',
            '锅中放油，炒虾仁至变色',
            '加入糙米饭、西兰花、蛋花翻炒',
            '加盐调味，撒葱花出锅'
        ],
        'calories': 420,
        'protein': 28,
        'fat': 12,
        'carbs': 48,
        'tags': ['高蛋白', '海鲜'],
        'image_url': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400',
        'ingredients_key': ['糙米', '虾仁', '西兰花', '鸡蛋']
    },
    {
        'id': 4,
        'name': '素食糙米蔬菜沙拉',
        'ingredients': ['糙米 80g', '西兰花 100g', '胡萝卜 50g', '黄瓜 50g', '番茄 50g', '橄榄油 1勺', '柠檬汁 1勺'],
        'steps': [
            '糙米蒸熟放凉备用',
            '西兰花焯水切小朵',
            '胡萝卜、黄瓜、番茄切丁',
            '将所有蔬菜和糙米混合',
            '淋上橄榄油和柠檬汁，拌匀即可'
        ],
        'calories': 280,
        'protein': 10,
        'fat': 10,
        'carbs': 40,
        'tags': ['素食', '低卡'],
        'image_url': 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
        'ingredients_key': ['糙米', '西兰花', '胡萝卜', '黄瓜', '番茄']
    },
    {
        'id': 5,
        'name': '清炒时蔬',
        'ingredients': ['西兰花 200g', '胡萝卜 100g', '香菇 3朵', '蒜末 适量', '盐 少许', '生抽 1勺'],
        'steps': [
            '西兰花切小朵焯水',
            '胡萝卜切片，香菇切片',
            '热锅下油，爆香蒜末',
            '先放入胡萝卜和香菇翻炒',
            '加入西兰花继续翻炒',
            '加盐和生抽调味出锅'
        ],
        'calories': 180,
        'protein': 8,
        'fat': 6,
        'carbs': 24,
        'tags': ['素食', '低卡'],
        'image_url': 'https://images.unsplash.com/photo-1583608354155-1082450d6d8b?w=400',
        'ingredients_key': ['西兰花', '胡萝卜', '香菇']
    },
    {
        'id': 6,
        'name': '鸡胸肉蔬菜卷',
        'ingredients': ['鸡胸肉 150g', '生菜 适量', '黄瓜 50g', '胡萝卜 50g', '全麦卷饼 2张', '低脂沙拉酱 少许'],
        'steps': [
            '鸡胸肉煎熟切片',
            '黄瓜和胡萝卜切丝',
            '生菜洗净沥干',
            '卷饼铺平，放入生菜',
            '加入鸡胸肉和蔬菜丝',
            '挤少许沙拉酱，卷起即可'
        ],
        'calories': 350,
        'protein': 32,
        'fat': 10,
        'carbs': 30,
        'tags': ['高蛋白', '低卡'],
        'image_url': 'https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400',
        'ingredients_key': ['鸡胸肉', '生菜', '黄瓜', '胡萝卜']
    },
    {
        'id': 7,
        'name': '番茄鸡蛋糙米饭',
        'ingredients': ['糙米饭 150g', '番茄 150g', '鸡蛋 2个', '葱花 适量', '盐 少许', '生抽 半勺'],
        'steps': [
            '番茄切块，鸡蛋打散',
            '鸡蛋炒熟盛出备用',
            '锅中放油，炒番茄出汁',
            '加入糙米饭翻炒均匀',
            '加入鸡蛋，加盐和生抽调味',
            '撒葱花出锅'
        ],
        'calories': 400,
        'protein': 20,
        'fat': 14,
        'carbs': 52,
        'tags': ['家常', '高蛋白'],
        'image_url': 'https://images.unsplash.com/photo-1604908554199-1baeb2a7a7c9?w=400',
        'ingredients_key': ['糙米', '番茄', '鸡蛋']
    },
    {
        'id': 8,
        'name': '蔬菜豆腐汤',
        'ingredients': ['嫩豆腐 200g', '香菇 3朵', '胡萝卜 50g', '西兰花 100g', '高汤 500ml', '盐 少许', '香油 几滴'],
        'steps': [
            '豆腐切块，香菇切片',
            '胡萝卜切片，西兰花切小朵',
            '高汤煮沸，加入香菇和胡萝卜',
            '煮5分钟后加入豆腐和西兰花',
            '再煮3分钟，加盐调味',
            '滴几滴香油出锅'
        ],
        'calories': 160,
        'protein': 14,
        'fat': 6,
        'carbs': 12,
        'tags': ['素食', '低卡', '汤品'],
        'image_url': 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400',
        'ingredients_key': ['豆腐', '香菇', '胡萝卜', '西兰花']
    },
    {
        'id': 9,
        'name': '黑椒鸡胸肉意面',
        'ingredients': ['全麦意面 100g', '鸡胸肉 150g', '西兰花 100g', '黑胡椒 适量', '蒜末 适量', '橄榄油 1勺', '盐 少许'],
        'steps': [
            '意面按包装说明煮熟沥干',
            '鸡胸肉切条，用黑胡椒和盐腌制',
            '西兰花焯水备用',
            '平底锅加热橄榄油，爆香蒜末',
            '放入鸡胸肉煎至变色',
            '加入意面和西兰花翻炒均匀',
            '撒黑胡椒出锅'
        ],
        'calories': 480,
        'protein': 38,
        'fat': 12,
        'carbs': 55,
        'tags': ['高蛋白', '低卡'],
        'image_url': 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400',
        'ingredients_key': ['意面', '鸡胸肉', '西兰花']
    },
    {
        'id': 10,
        'name': '水果燕麦碗',
        'ingredients': ['燕麦片 50g', '牛奶 200ml', '香蕉 1根', '蓝莓 50g', '坚果碎 10g', '蜂蜜 少许'],
        'steps': [
            '燕麦片加入牛奶，微波炉加热2分钟',
            '香蕉切片备用',
            '将燕麦粥盛入碗中',
            '摆上香蕉片和蓝莓',
            '撒上坚果碎',
            '淋少许蜂蜜即可'
        ],
        'calories': 320,
        'protein': 12,
        'fat': 8,
        'carbs': 52,
        'tags': ['素食', '早餐'],
        'image_url': 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?w=400',
        'ingredients_key': ['燕麦', '牛奶', '香蕉', '蓝莓']
    },
    {
        'id': 11,
        'name': '烤鸡胸肉配蔬菜',
        'ingredients': ['鸡胸肉 250g', '西兰花 150g', '胡萝卜 100g', '橄榄油 1勺', '迷迭香 少许', '盐 少许', '黑胡椒 少许'],
        'steps': [
            '鸡胸肉用盐、黑胡椒、橄榄油和迷迭香腌制20分钟',
            '西兰花和胡萝卜切块',
            '蔬菜用橄榄油和盐拌匀',
            '烤盘铺锡纸，放入鸡胸肉和蔬菜',
            '烤箱预热200度，烤20-25分钟',
            '取出装盘即可'
        ],
        'calories': 420,
        'protein': 48,
        'fat': 16,
        'carbs': 20,
        'tags': ['高蛋白', '低卡', '烤箱'],
        'image_url': 'https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400',
        'ingredients_key': ['鸡胸肉', '西兰花', '胡萝卜']
    },
    {
        'id': 12,
        'name': '日式照烧鸡腿饭',
        'ingredients': ['去骨鸡腿肉 200g', '糙米饭 150g', '西兰花 100g', '照烧酱 2勺', '料酒 1勺', '生抽 1勺', '蜂蜜 半勺'],
        'steps': [
            '鸡腿肉用料酒腌制15分钟',
            '西兰花焯水备用',
            '平底锅不放油，鸡皮朝下煎至金黄',
            '翻面继续煎至熟透',
            '倒入照烧酱、生抽和蜂蜜',
            '小火收汁至浓稠',
            '切片铺在糙米饭上，配西兰花'
        ],
        'calories': 550,
        'protein': 38,
        'fat': 18,
        'carbs': 58,
        'tags': ['高蛋白', '日式'],
        'image_url': 'https://images.unsplash.com/photo-1604908554199-1baeb2a7a7c9?w=400',
        'ingredients_key': ['鸡腿肉', '糙米', '西兰花']
    }
]

VEGETARIAN_INGREDIENTS = ['鸡胸肉', '鸡腿肉', '虾仁', '牛肉', '猪肉', '鱼', '虾']


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS favorites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            recipe_id INTEGER NOT NULL,
            recipe_data TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS daily_tracker (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            track_date DATE NOT NULL,
            calories INTEGER DEFAULT 0,
            protein REAL DEFAULT 0,
            fat REAL DEFAULT 0,
            carbs REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(track_date)
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS tracker_recipes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tracker_id INTEGER NOT NULL,
            recipe_id INTEGER NOT NULL,
            recipe_name TEXT NOT NULL,
            calories INTEGER DEFAULT 0,
            protein REAL DEFAULT 0,
            fat REAL DEFAULT 0,
            carbs REAL DEFAULT 0,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (tracker_id) REFERENCES daily_tracker(id)
        )
    ''')
    
    conn.commit()
    conn.close()


init_db()


def match_recipes(ingredients, diet_goal, limit=5):
    matched = []
    normalized_ingredients = [ing.strip() for ing in ingredients if ing.strip()]
    
    for recipe in RECIPES_DB:
        if diet_goal == 'vegetarian':
            has_non_veg = any(
                any(veg_ing.lower() in key.lower() for veg_ing in VEGETARIAN_INGREDIENTS)
                for key in recipe['ingredients_key']
            )
            if has_non_veg:
                continue
        
        if diet_goal == 'low_cal' and recipe['calories'] > 400:
            continue
        if diet_goal == 'high_protein' and recipe['protein'] < 25:
            continue
        
        score = 0
        for user_ing in normalized_ingredients:
            for key in recipe['ingredients_key']:
                if user_ing.lower() in key.lower() or key.lower() in user_ing.lower():
                    score += 1
        
        if score > 0 or len(normalized_ingredients) == 0:
            matched.append((recipe, score if normalized_ingredients else 0))
    
    matched.sort(key=lambda x: x[1], reverse=True)
    return [m[0] for m in matched[:limit if limit >= 3 else 3]]


@app.route('/api/recipes/search', methods=['POST'])
def search_recipes():
    data = request.get_json()
    ingredients = data.get('ingredients', [])
    diet_goal = data.get('diet_goal', 'balanced')
    
    recipes = match_recipes(ingredients, diet_goal, limit=5)
    
    if len(recipes) < 3:
        recipes = match_recipes([], diet_goal, limit=5)
    
    return jsonify({
        'success': True,
        'data': recipes,
        'count': len(recipes)
    })


@app.route('/api/recipes/analyze', methods=['POST'])
def analyze_recipe():
    data = request.get_json()
    recipe_id = data.get('recipe_id')
    action = data.get('action', 'view')
    
    recipe = None
    for r in RECIPES_DB:
        if r['id'] == recipe_id:
            recipe = r
            break
    
    if not recipe:
        return jsonify({'success': False, 'message': 'Recipe not found'}), 404
    
    today = date.today().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM daily_tracker WHERE track_date = ?', (today,))
    row = cursor.fetchone()
    
    if row:
        tracker_id = row['id']
    else:
        cursor.execute(
            'INSERT INTO daily_tracker (track_date) VALUES (?)',
            (today,)
        )
        tracker_id = cursor.lastrowid
    
    if action in ('view', 'favorite'):
        cursor.execute(
            'INSERT INTO tracker_recipes (tracker_id, recipe_id, recipe_name, calories, protein, fat, carbs) VALUES (?, ?, ?, ?, ?, ?, ?)',
            (tracker_id, recipe['id'], recipe['name'], recipe['calories'], recipe['protein'], recipe['fat'], recipe['carbs'])
        )
        
        cursor.execute('''
            UPDATE daily_tracker 
            SET calories = calories + ?,
                protein = protein + ?,
                fat = fat + ?,
                carbs = carbs + ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (recipe['calories'], recipe['protein'], recipe['fat'], recipe['carbs'], tracker_id))
    
    conn.commit()
    
    cursor.execute('SELECT * FROM daily_tracker WHERE id = ?', (tracker_id,))
    tracker = dict(cursor.fetchone())
    
    conn.close()
    
    return jsonify({
        'success': True,
        'tracker': tracker
    })


@app.route('/api/recipes/favorites', methods=['GET'])
def get_favorites():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM favorites ORDER BY created_at DESC')
    rows = cursor.fetchall()
    conn.close()
    
    favorites = []
    for row in rows:
        fav = dict(row)
        fav['recipe_data'] = json.loads(fav['recipe_data'])
        favorites.append(fav)
    
    return jsonify({
        'success': True,
        'data': favorites,
        'count': len(favorites)
    })


@app.route('/api/recipes/favorites', methods=['POST'])
def toggle_favorite():
    data = request.get_json()
    recipe_id = data.get('recipe_id')
    recipe_data = data.get('recipe_data')
    
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM favorites WHERE recipe_id = ?', (recipe_id,))
    existing = cursor.fetchone()
    
    if existing:
        cursor.execute('DELETE FROM favorites WHERE recipe_id = ?', (recipe_id,))
        is_favorited = False
    else:
        cursor.execute(
            'INSERT INTO favorites (recipe_id, recipe_data) VALUES (?, ?)',
            (recipe_id, json.dumps(recipe_data, ensure_ascii=False))
        )
        is_favorited = True
    
    conn.commit()
    conn.close()
    
    return jsonify({
        'success': True,
        'favorited': is_favorited
    })


@app.route('/api/tracker/status', methods=['GET'])
def get_tracker_status():
    today = date.today().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM daily_tracker WHERE track_date = ?', (today,))
    row = cursor.fetchone()
    
    if not row:
        cursor.execute(
            'INSERT INTO daily_tracker (track_date) VALUES (?)',
            (today,)
        )
        conn.commit()
        cursor.execute('SELECT * FROM daily_tracker WHERE track_date = ?', (today,))
        row = cursor.fetchone()
    
    tracker = dict(row)
    
    cursor.execute(
        'SELECT * FROM tracker_recipes WHERE tracker_id = ? ORDER BY added_at DESC',
        (tracker['id'],)
    )
    recipes = [dict(r) for r in cursor.fetchall()]
    
    conn.close()
    
    tracker['recipes'] = recipes
    
    return jsonify({
        'success': True,
        'data': tracker
    })


@app.route('/api/tracker/clear', methods=['POST'])
def clear_tracker():
    today = date.today().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT id FROM daily_tracker WHERE track_date = ?', (today,))
    row = cursor.fetchone()
    
    if row:
        tracker_id = row['id']
        cursor.execute('DELETE FROM tracker_recipes WHERE tracker_id = ?', (tracker_id,))
        cursor.execute('''
            UPDATE daily_tracker 
            SET calories = 0, protein = 0, fat = 0, carbs = 0, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        ''', (tracker_id,))
    
    conn.commit()
    
    cursor.execute('SELECT * FROM daily_tracker WHERE track_date = ?', (today,))
    tracker = dict(cursor.fetchone())
    tracker['recipes'] = []
    conn.close()
    
    return jsonify({
        'success': True,
        'data': tracker
    })


@app.route('/api/tracker/export', methods=['GET'])
def export_tracker():
    today = date.today().isoformat()
    conn = get_db()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM daily_tracker WHERE track_date = ?', (today,))
    tracker_row = cursor.fetchone()
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow(['日期', today])
    writer.writerow([])
    
    if tracker_row:
        writer.writerow(['营养汇总'])
        writer.writerow(['热量(kcal)', tracker_row['calories']])
        writer.writerow(['蛋白质(g)', tracker_row['protein']])
        writer.writerow(['脂肪(g)', tracker_row['fat']])
        writer.writerow(['碳水化合物(g)', tracker_row['carbs']])
        writer.writerow([])
        
        cursor.execute(
            'SELECT recipe_name, calories, protein, fat, carbs, added_at FROM tracker_recipes WHERE tracker_id = ? ORDER BY added_at ASC',
            (tracker_row['id'],)
        )
        recipes = cursor.fetchall()
        
        writer.writerow(['食谱记录'])
        writer.writerow(['食谱名称', '热量(kcal)', '蛋白质(g)', '脂肪(g)', '碳水化合物(g)', '添加时间'])
        for r in recipes:
            writer.writerow([
                r['recipe_name'],
                r['calories'],
                r['protein'],
                r['fat'],
                r['carbs'],
                r['added_at']
            ])
    
    conn.close()
    
    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=f'nutrition_tracker_{today}.csv'
    )


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
