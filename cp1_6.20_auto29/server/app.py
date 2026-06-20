from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid
import time
from datetime import datetime
from collections import defaultdict
import math

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

projects = {}
project_users = defaultdict(dict)

def init_default_project():
    project_id = 'default'
    if project_id not in projects:
        projects[project_id] = {
            'id': project_id,
            'name': '周末聚餐计划',
            'recipes': [
                {
                    'id': '1',
                    'name': '红烧肉',
                    'ingredients': [
                        {'id': '1-1', 'name': '五花肉', 'quantity': 500, 'unit': '克', 'category': '肉类'},
                        {'id': '1-2', 'name': '酱油', 'quantity': 3, 'unit': '勺', 'category': '调味料'},
                        {'id': '1-3', 'name': '冰糖', 'quantity': 30, 'unit': '克', 'category': '调味料'},
                        {'id': '1-4', 'name': '生姜', 'quantity': 3, 'unit': '片', 'category': '蔬菜'}
                    ],
                    'steps': '1. 五花肉切块焯水\n2. 炒糖色\n3. 加入肉块翻炒\n4. 加酱油、料酒、水炖煮40分钟\n5. 大火收汁',
                    'estimatedTime': 60,
                    'createdAt': datetime.now().isoformat(),
                    'updatedAt': datetime.now().isoformat()
                },
                {
                    'id': '2',
                    'name': '番茄炒蛋',
                    'ingredients': [
                        {'id': '2-1', 'name': '鸡蛋', 'quantity': 4, 'unit': '个', 'category': '蛋奶'},
                        {'id': '2-2', 'name': '番茄', 'quantity': 3, 'unit': '个', 'category': '蔬菜'},
                        {'id': '2-3', 'name': '葱花', 'quantity': 1, 'unit': '把', 'category': '蔬菜'},
                        {'id': '2-4', 'name': '盐', 'quantity': 1, 'unit': '茶匙', 'category': '调味料'}
                    ],
                    'steps': '1. 鸡蛋打散\n2. 番茄切块\n3. 炒鸡蛋盛出\n4. 炒番茄出汁\n5. 加入鸡蛋翻炒\n6. 加盐调味撒葱花',
                    'estimatedTime': 15,
                    'createdAt': datetime.now().isoformat(),
                    'updatedAt': datetime.now().isoformat()
                },
                {
                    'id': '3',
                    'name': '清蒸鲈鱼',
                    'ingredients': [
                        {'id': '3-1', 'name': '鲈鱼', 'quantity': 1, 'unit': '条', 'category': '海鲜'},
                        {'id': '3-2', 'name': '生姜', 'quantity': 5, 'unit': '片', 'category': '蔬菜'},
                        {'id': '3-3', 'name': '葱', 'quantity': 2, 'unit': '根', 'category': '蔬菜'},
                        {'id': '3-4', 'name': '蒸鱼豉油', 'quantity': 2, 'unit': '勺', 'category': '调味料'}
                    ],
                    'steps': '1. 鱼处理干净划刀\n2. 放姜片葱结\n3. 水开蒸8分钟\n4. 取出淋蒸鱼豉油\n5. 淋热油激发香味',
                    'estimatedTime': 20,
                    'createdAt': datetime.now().isoformat(),
                    'updatedAt': datetime.now().isoformat()
                }
            ],
            'logs': []
        }

init_default_project()

def generate_id():
    return str(uuid.uuid4())

@app.route('/api/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    project = projects.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify(project)

@app.route('/api/projects/<project_id>/recipes', methods=['GET'])
def get_recipes(project_id):
    project = projects.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify(project['recipes'])

@app.route('/api/projects/<project_id>/recipes', methods=['POST'])
def add_recipe(project_id):
    project = projects.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    data = request.json
    now = datetime.now().isoformat()
    recipe = {
        'id': generate_id(),
        'name': data.get('name', ''),
        'ingredients': data.get('ingredients', []),
        'steps': data.get('steps', ''),
        'estimatedTime': data.get('estimatedTime', 0),
        'createdAt': now,
        'updatedAt': now
    }
    project['recipes'].append(recipe)
    
    log = {
        'id': generate_id(),
        'userId': data.get('userId', 'system'),
        'userName': data.get('userName', '系统'),
        'userAvatar': data.get('userAvatar', '👤'),
        'action': f'添加了菜谱"{recipe["name"]}"',
        'timestamp': now,
        'type': 'recipe_add'
    }
    project['logs'].insert(0, log)
    
    socketio.emit('activity_log', log, room=project_id)
    
    return jsonify(recipe)

@app.route('/api/projects/<project_id>/recipes/<recipe_id>', methods=['PUT'])
def update_recipe(project_id, recipe_id):
    project = projects.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    recipe = next((r for r in project['recipes'] if r['id'] == recipe_id), None)
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    data = request.json
    old_name = recipe['name']
    recipe.update({
        'name': data.get('name', recipe['name']),
        'ingredients': data.get('ingredients', recipe['ingredients']),
        'steps': data.get('steps', recipe['steps']),
        'estimatedTime': data.get('estimatedTime', recipe['estimatedTime']),
        'updatedAt': datetime.now().isoformat()
    })
    
    if old_name != recipe['name']:
        log = {
            'id': generate_id(),
            'userId': data.get('userId', 'system'),
            'userName': data.get('userName', '系统'),
            'userAvatar': data.get('userAvatar', '👤'),
            'action': f'将菜谱"{old_name}"改名为"{recipe["name"]}"',
            'timestamp': datetime.now().isoformat(),
            'type': 'recipe_edit'
        }
        project['logs'].insert(0, log)
        socketio.emit('activity_log', log, room=project_id)
    
    return jsonify(recipe)

@app.route('/api/projects/<project_id>/recipes/<recipe_id>', methods=['DELETE'])
def delete_recipe(project_id, recipe_id):
    project = projects.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    recipe = next((r for r in project['recipes'] if r['id'] == recipe_id), None)
    if not recipe:
        return jsonify({'error': 'Recipe not found'}), 404
    
    project['recipes'] = [r for r in project['recipes'] if r['id'] != recipe_id]
    
    log = {
        'id': generate_id(),
        'userId': request.args.get('userId', 'system'),
        'userName': request.args.get('userName', '系统'),
        'userAvatar': request.args.get('userAvatar', '👤'),
        'action': f'删除了菜谱"{recipe["name"]}"',
        'timestamp': datetime.now().isoformat(),
        'type': 'recipe_delete'
    }
    project['logs'].insert(0, log)
    socketio.emit('activity_log', log, room=project_id)
    
    return jsonify({'success': True})

@app.route('/api/projects/<project_id>/shopping-list', methods=['GET'])
def get_shopping_list(project_id):
    project = projects.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    ingredient_map = defaultdict(lambda: {
        'totalQuantity': 0,
        'unit': '',
        'category': '',
        'recipes': []
    })
    
    for recipe in project['recipes']:
        for ing in recipe['ingredients']:
            key = ing['name']
            ingredient_map[key]['totalQuantity'] += ing['quantity']
            ingredient_map[key]['unit'] = ing['unit']
            ingredient_map[key]['category'] = ing['category']
            if recipe['name'] not in ingredient_map[key]['recipes']:
                ingredient_map[key]['recipes'].append(recipe['name'])
    
    shopping_list = []
    for name, data in ingredient_map.items():
        shopping_list.append({
            'name': name,
            'totalQuantity': data['totalQuantity'],
            'unit': data['unit'],
            'category': data['category'],
            'recipes': data['recipes']
        })
    
    return jsonify(shopping_list)

def round_to_common_unit(quantity, unit):
    if unit in ['个', '条', '根', '把', '杯']:
        return math.ceil(quantity)
    elif unit in ['克', '千克']:
        return math.ceil(quantity / 100) * 100
    elif unit in ['毫升', '升']:
        return math.ceil(quantity / 50) * 50
    elif unit in ['勺', '茶匙']:
        return math.ceil(quantity)
    else:
        return math.ceil(quantity * 10) / 10

@app.route('/api/projects/<project_id>/optimize', methods=['POST'])
def optimize_shopping_list(project_id):
    project = projects.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    
    data = request.json
    current_list = data.get('items', [])
    
    ingredient_map = defaultdict(lambda: {
        'totalQuantity': 0,
        'unit': '',
        'category': '',
        'recipes': []
    })
    
    for item in current_list:
        key = item['name']
        ingredient_map[key]['totalQuantity'] += item['totalQuantity']
        ingredient_map[key]['unit'] = item['unit']
        ingredient_map[key]['category'] = item['category']
        ingredient_map[key]['recipes'].extend(item['recipes'])
    
    optimized_list = []
    saved_items = []
    
    for name, data in ingredient_map.items():
        original_qty = data['totalQuantity']
        optimized_qty = round_to_common_unit(original_qty, data['unit'])
        optimized_list.append({
            'name': name,
            'totalQuantity': optimized_qty,
            'unit': data['unit'],
            'category': data['category'],
            'recipes': list(set(data['recipes']))
        })
        if optimized_qty != original_qty:
            saved_items.append({
                'name': name,
                'saved': optimized_qty - original_qty
            })
    
    log = {
        'id': generate_id(),
        'userId': 'system',
        'userName': '系统',
        'userAvatar': '🤖',
        'action': f'完成智能采购优化，共优化{len(saved_items)}项食材',
        'timestamp': datetime.now().isoformat(),
        'type': 'shopping_export'
    }
    project['logs'].insert(0, log)
    socketio.emit('activity_log', log, room=project_id)
    
    return jsonify({
        'before': current_list,
        'after': optimized_list,
        'savedItems': saved_items
    })

@app.route('/api/projects/<project_id>/logs', methods=['GET'])
def get_logs(project_id):
    project = projects.get(project_id)
    if not project:
        return jsonify({'error': 'Project not found'}), 404
    return jsonify(project['logs'])

@socketio.on('join_project')
def handle_join(data):
    project_id = data.get('projectId')
    user = data.get('user')
    join_room(project_id)
    
    if project_id not in project_users:
        project_users[project_id] = {}
    
    project_users[project_id][user['id']] = {
        **user,
        'sid': request.sid
    }
    
    users = list(project_users[project_id].values())
    emit('user_presence', users, room=project_id)
    
    log = {
        'id': generate_id(),
        'userId': user['id'],
        'userName': user['name'],
        'userAvatar': user['avatar'],
        'action': f'{user["name"]}加入了项目',
        'timestamp': datetime.now().isoformat(),
        'type': 'recipe_edit'
    }
    emit('activity_log', log, room=project_id)

@socketio.on('leave_project')
def handle_leave(data):
    project_id = data.get('projectId')
    user_id = data.get('userId')
    
    if project_id in project_users and user_id in project_users[project_id]:
        user = project_users[project_id][user_id]
        del project_users[project_id][user_id]
        leave_room(project_id)
        
        users = list(project_users[project_id].values())
        emit('user_presence', users, room=project_id)

@socketio.on('cursor_update')
def handle_cursor(data):
    project_id = get_project_id_from_sid(request.sid)
    if project_id:
        emit('cursor_update', data, room=project_id, include_self=False)

@socketio.on('selection_update')
def handle_selection(data):
    project_id = get_project_id_from_sid(request.sid)
    if project_id:
        emit('selection_update', data, room=project_id, include_self=False)

@socketio.on('recipe_update')
def handle_recipe(data):
    project_id = get_project_id_from_sid(request.sid)
    if project_id:
        emit('recipe_update', data, room=project_id, include_self=False)

@socketio.on('ingredient_update')
def handle_ingredient(data):
    project_id = get_project_id_from_sid(request.sid)
    if project_id:
        project = projects.get(project_id)
        user = get_user_from_sid(request.sid)
        
        ingredient = data.get('ingredient', {})
        log = {
            'id': generate_id(),
            'userId': data.get('userId', 'system'),
            'userName': user.get('name', '系统') if user else '系统',
            'userAvatar': user.get('avatar', '👤') if user else '👤',
            'action': f'修改了"{ingredient.get("name")}"用量从{ingredient.get("oldQuantity")}到{ingredient.get("newQuantity")}',
            'timestamp': datetime.now().isoformat(),
            'type': 'ingredient_edit'
        }
        
        if project:
            project['logs'].insert(0, log)
        
        emit('ingredient_update', data, room=project_id, include_self=False)
        emit('activity_log', log, room=project_id)

def get_project_id_from_sid(sid):
    for project_id, users in project_users.items():
        for user_data in users.values():
            if user_data.get('sid') == sid:
                return project_id
    return None

def get_user_from_sid(sid):
    for users in project_users.values():
        for user_data in users.values():
            if user_data.get('sid') == sid:
                return user_data
    return None

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
