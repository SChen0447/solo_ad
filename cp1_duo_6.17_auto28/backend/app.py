from flask import Flask, request, jsonify
from flask_cors import CORS
import random
import copy
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

leaderboard = []

MODULE_TYPES = {
    'core': {
        'name': '核心舱',
        'size': [1, 1],
        'cost': {},
        'production': {'oxygen': 2, 'power': 3},
        'consumption': {},
        'capacity': 2,
        'description': '空间站核心，提供基础生命支持'
    },
    'life_support': {
        'name': '生命支持',
        'size': [1, 1],
        'cost': {'tech_points': 15, 'materials': 20},
        'production': {'oxygen': 5, 'water': 2},
        'consumption': {'power': 3},
        'capacity': 0,
        'description': '提供氧气和水循环系统'
    },
    'power_core': {
        'name': '能源核心',
        'size': [1, 1],
        'cost': {'tech_points': 20, 'materials': 25},
        'production': {'power': 10},
        'consumption': {},
        'capacity': 0,
        'description': '高效能源供应模块'
    },
    'lab': {
        'name': '实验室',
        'size': [1, 1],
        'cost': {'tech_points': 25, 'materials': 30},
        'production': {'tech_points': 3},
        'consumption': {'power': 4, 'oxygen': 1},
        'capacity': 0,
        'description': '进行科学研究，产出科技点'
    },
    'habitat': {
        'name': '居住舱',
        'size': [1, 2],
        'cost': {'tech_points': 10, 'materials': 15},
        'production': {},
        'consumption': {'oxygen': 2, 'power': 1, 'food': 1},
        'capacity': 4,
        'description': '提供船员居住空间'
    },
    'greenhouse': {
        'name': '温室',
        'size': [1, 1],
        'cost': {'tech_points': 18, 'materials': 22},
        'production': {'food': 4, 'oxygen': 1},
        'consumption': {'power': 2, 'water': 2},
        'capacity': 0,
        'description': '种植食物，净化空气'
    },
    'medical': {
        'name': '医疗站',
        'size': [1, 1],
        'cost': {'tech_points': 22, 'materials': 28},
        'production': {'reputation': 1},
        'consumption': {'power': 2},
        'capacity': 0,
        'description': '治疗伤病，提升声望'
    },
    'solar_panel': {
        'name': '太阳能板',
        'size': [1, 1],
        'cost': {'tech_points': 12, 'materials': 18},
        'production': {'power': 6},
        'consumption': {},
        'capacity': 0,
        'description': '太阳能发电模块'
    },
    'water_recycler': {
        'name': '水循环器',
        'size': [1, 1],
        'cost': {'tech_points': 16, 'materials': 20},
        'production': {'water': 5},
        'consumption': {'power': 2},
        'capacity': 0,
        'description': '回收净化水资源'
    }
}

EVENT_TEMPLATES = [
    {
        'id': 'meteor_strike',
        'type': 'disaster',
        'icon_color': '#FF6B35',
        'title': '陨石撞击',
        'description': '一颗小型陨石正在接近空间站，需要立即做出决定！',
        'options': [
            {
                'text': '紧急维修（消耗资源）',
                'cost': {'materials': 15, 'tech_points': 5},
                'effects': {'reputation': 2},
                'result_text': '成功抵御了陨石撞击，空间站声誉提升！'
            },
            {
                'text': '弃置受损模块',
                'cost': {},
                'effects': {'remove_random_module': True},
                'result_text': '受损模块被安全分离，但损失了部分设施。'
            }
        ]
    },
    {
        'id': 'crew_illness',
        'type': 'medical',
        'icon_color': '#00FF9D',
        'title': '成员生病',
        'description': '一名船员出现了不适症状，需要医疗处理。',
        'options': [
            {
                'text': '全面治疗',
                'cost': {'tech_points': 8},
                'effects': {'morale_boost': 5},
                'result_text': '船员完全康复，士气有所提升！'
            },
            {
                'text': '简单休养',
                'cost': {'food': 3},
                'effects': {'morale_decrease': 10},
                'result_text': '船员缓慢恢复，但士气有所下降。'
            }
        ]
    },
    {
        'id': 'alien_signal',
        'type': 'research',
        'icon_color': '#A855F7',
        'title': '外星信号',
        'description': '接收到一段神秘的外星信号，是否要投入资源研究？',
        'options': [
            {
                'text': '深入研究',
                'cost': {'tech_points': 15},
                'effects': {'tech_points': 25, 'reputation': 5},
                'result_text': '破译了信号中的科学信息，获得重大突破！'
            },
            {
                'text': '简单记录',
                'cost': {},
                'effects': {'tech_points': 3},
                'result_text': '记录了信号数据，获得少量研究点数。'
            },
            {
                'text': '忽略信号',
                'cost': {},
                'effects': {},
                'result_text': '信号逐渐消失，没有任何收获。'
            }
        ]
    },
    {
        'id': 'equipment_failure',
        'type': 'malfunction',
        'icon_color': '#EF4444',
        'title': '设备故障',
        'description': '空间站的关键设备出现故障，需要立即处理！',
        'options': [
            {
                'text': '紧急修复',
                'cost': {'power': 5, 'tech_points': 5},
                'effects': {},
                'result_text': '设备成功修复，生产恢复正常。'
            },
            {
                'text': '暂停生产',
                'cost': {},
                'effects': {'production_penalty_days': 2},
                'result_text': '设备停机维修，生产效率暂时下降。'
            }
        ]
    },
    {
        'id': 'supply_ship',
        'type': 'positive',
        'icon_color': '#00D4FF',
        'title': '补给飞船',
        'description': '地球派遣了一艘补给飞船，可以选择接收物资。',
        'options': [
            {
                'text': '接收物资补给',
                'cost': {},
                'effects': {'food': 10, 'water': 8, 'materials': 10},
                'result_text': '成功接收补给物资！'
            },
            {
                'text': '请求科研设备',
                'cost': {},
                'effects': {'tech_points': 12},
                'result_text': '获得了宝贵的科研设备！'
            }
        ]
    },
    {
        'id': 'space_debris',
        'type': 'disaster',
        'icon_color': '#FF6B35',
        'title': '太空垃圾',
        'description': '大量太空垃圾正在靠近空间站轨道。',
        'options': [
            {
                'text': '变轨规避',
                'cost': {'power': 8},
                'effects': {'reputation': 3},
                'result_text': '成功规避太空垃圾，展示了出色的操控能力！'
            },
            {
                'text': '主动清除',
                'cost': {'tech_points': 10},
                'effects': {'materials': 15, 'reputation': 5},
                'result_text': '成功回收太空垃圾，转化为有用材料！'
            }
        ]
    }
]

FIRST_NAMES = ['张伟', '李娜', '王强', '刘洋', '陈明', '杨静', '赵磊', '周芳', '吴涛', '郑霞',
               '孙浩', '马琳', '朱军', '胡雪', '林峰', '何婷', '罗明', '梁宇', '宋佳', '唐杰']

PROFESSIONS = ['工程师', '生物学家', '医生', '厨师', '宇航员', '维修工', '通信员', '指挥官']

SKILLS = ['工程', '科研', '医疗', '烹饪', '驾驶', '维修', '通信', '领导']

AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD',
                 '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1']


def generate_crew_member():
    name = random.choice(FIRST_NAMES)
    profession = random.choice(PROFESSIONS)
    avatar_color = random.choice(AVATAR_COLORS)
    
    skill_names = random.sample(SKILLS, 3)
    skills = {}
    for skill in skill_names:
        skills[skill] = random.randint(1, 5)
    
    return {
        'id': str(uuid.uuid4()),
        'name': name,
        'profession': profession,
        'avatar_color': avatar_color,
        'morale': 80,
        'skills': skills
    }


def create_initial_state():
    return {
        'day': 1,
        'modules': [
            {
                'id': 'core_0',
                'type': 'core',
                'x': 2,
                'y': 2,
                'rotation': 0,
                'health': 100
            }
        ],
        'resources': {
            'oxygen': 50,
            'water': 50,
            'food': 50,
            'power': 50,
            'tech_points': 20,
            'reputation': 10,
            'materials': 30
        },
        'max_resources': {
            'oxygen': 100,
            'water': 100,
            'food': 100,
            'power': 100,
            'tech_points': 200,
            'reputation': 200,
            'materials': 200
        },
        'crew': [],
        'zero_resource_days': {'oxygen': 0, 'water': 0, 'food': 0, 'power': 0},
        'game_over': False,
        'score': 0,
        'next_event_day': random.randint(3, 5),
        'production_penalty_days': 0
    }


def calculate_daily_production(state):
    production = {
        'oxygen': 0, 'water': 0, 'food': 0, 'power': 0,
        'tech_points': 0, 'reputation': 0, 'materials': 0
    }
    consumption = {
        'oxygen': 0, 'water': 0, 'food': 0, 'power': 0,
        'tech_points': 0, 'reputation': 0, 'materials': 0
    }
    
    for module in state['modules']:
        module_type = module['type']
        if module_type in MODULE_TYPES:
            module_info = MODULE_TYPES[module_type]
            
            multiplier = 1.0
            if state.get('production_penalty_days', 0) > 0:
                multiplier = 0.5
            
            for resource, amount in module_info['production'].items():
                production[resource] += amount * multiplier
            
            for resource, amount in module_info['consumption'].items():
                consumption[resource] += amount
    
    for crew in state['crew']:
        consumption['oxygen'] += 1
        consumption['food'] += 1
        consumption['water'] += 0.5
    
    return production, consumption


def generate_event(state):
    eligible_events = EVENT_TEMPLATES.copy()
    
    if len(state['crew']) == 0:
        eligible_events = [e for e in eligible_events if e['id'] != 'crew_illness']
    
    if len(eligible_events) == 0:
        return None
    
    return random.choice(eligible_events)


def apply_option_effects(state, option):
    effects = option.get('effects', {})
    result = {'success': True, 'message': option.get('result_text', '')}
    
    if 'remove_random_module' in effects and effects['remove_random_module']:
        non_core_modules = [m for m in state['modules'] if m['type'] != 'core']
        if non_core_modules:
            module_to_remove = random.choice(non_core_modules)
            state['modules'] = [m for m in state['modules'] if m['id'] != module_to_remove['id']]
            result['removed_module'] = module_to_remove['type']
    
    if 'morale_boost' in effects:
        for crew in state['crew']:
            crew['morale'] = min(100, crew['morale'] + effects['morale_boost'])
    
    if 'morale_decrease' in effects:
        for crew in state['crew']:
            crew['morale'] = max(0, crew['morale'] - effects['morale_decrease'])
    
    if 'production_penalty_days' in effects:
        state['production_penalty_days'] = effects['production_penalty_days']
    
    for resource in ['oxygen', 'water', 'food', 'power', 'tech_points', 'reputation', 'materials']:
        if resource in effects:
            state['resources'][resource] = min(
                state['max_resources'][resource],
                state['resources'][resource] + effects[resource]
            )
    
    return result


@app.route('/api/new-game', methods=['POST'])
def new_game():
    state = create_initial_state()
    return jsonify({
        'success': True,
        'state': state,
        'module_types': MODULE_TYPES
    })


@app.route('/api/tick', methods=['POST'])
def tick():
    data = request.json
    state = data.get('state', {})
    
    if state.get('game_over', False):
        return jsonify({'success': False, 'error': 'Game already over'})
    
    production, consumption = calculate_daily_production(state)
    
    resource_changes = {}
    for resource in state['resources']:
        change = production.get(resource, 0) - consumption.get(resource, 0)
        state['resources'][resource] = max(0, min(
            state['max_resources'][resource],
            state['resources'][resource] + change
        ))
        resource_changes[resource] = change
    
    for resource in ['oxygen', 'water', 'food', 'power']:
        if state['resources'][resource] <= 0:
            state['zero_resource_days'][resource] = state['zero_resource_days'].get(resource, 0) + 1
        else:
            state['zero_resource_days'][resource] = 0
    
    game_over = False
    for resource in ['oxygen', 'water', 'food', 'power']:
        if state['zero_resource_days'].get(resource, 0) >= 3:
            game_over = True
            break
    
    if state.get('production_penalty_days', 0) > 0:
        state['production_penalty_days'] -= 1
    
    state['day'] += 1
    
    event = None
    if state['day'] >= state.get('next_event_day', 3) and not game_over:
        event = generate_event(state)
        if event:
            state['next_event_day'] = state['day'] + random.randint(3, 5)
        else:
            state['next_event_day'] = state['day'] + 1
    
    if game_over:
        state['game_over'] = True
        avg_morale = 0
        if len(state['crew']) > 0:
            avg_morale = sum(c['morale'] for c in state['crew']) / len(state['crew'])
        
        score = (
            state['day'] * 100 +
            state['resources']['tech_points'] * 2 +
            state['resources']['reputation'] * 3 +
            avg_morale * 1.5
        )
        state['score'] = int(score)
    
    return jsonify({
        'success': True,
        'state': state,
        'production': production,
        'consumption': consumption,
        'resource_changes': resource_changes,
        'event': event,
        'game_over': game_over
    })


@app.route('/api/handle-event', methods=['POST'])
def handle_event():
    data = request.json
    state = data.get('state', {})
    option_index = data.get('option_index', 0)
    event_data = data.get('event', {})
    
    if not event_data or 'options' not in event_data:
        return jsonify({'success': False, 'error': 'Invalid event data'})
    
    if option_index >= len(event_data['options']):
        return jsonify({'success': False, 'error': 'Invalid option index'})
    
    option = event_data['options'][option_index]
    
    cost = option.get('cost', {})
    can_afford = True
    for resource, amount in cost.items():
        if state['resources'].get(resource, 0) < amount:
            can_afford = False
            break
    
    if not can_afford:
        return jsonify({
            'success': False,
            'error': '资源不足'
        })
    
    for resource, amount in cost.items():
        state['resources'][resource] -= amount
    
    result = apply_option_effects(state, option)
    
    return jsonify({
        'success': True,
        'state': state,
        'result': result
    })


@app.route('/api/build-module', methods=['POST'])
def build_module():
    data = request.json
    state = data.get('state', {})
    module_type = data.get('module_type', '')
    x = data.get('x', 0)
    y = data.get('y', 0)
    
    if module_type not in MODULE_TYPES:
        return jsonify({'success': False, 'error': '未知模块类型'})
    
    module_info = MODULE_TYPES[module_type]
    cost = module_info.get('cost', {})
    
    for resource, amount in cost.items():
        if state['resources'].get(resource, 0) < amount:
            return jsonify({'success': False, 'error': f'{resource}不足'})
    
    for resource, amount in cost.items():
        state['resources'][resource] -= amount
    
    new_module = {
        'id': f'{module_type}_{len(state["modules"])}',
        'type': module_type,
        'x': x,
        'y': y,
        'rotation': 0,
        'health': 100
    }
    state['modules'].append(new_module)
    
    return jsonify({
        'success': True,
        'state': state,
        'module': new_module
    })


@app.route('/api/recruit-crew', methods=['POST'])
def recruit_crew():
    data = request.json
    state = data.get('state', {})
    
    cost_tech = 10
    cost_food = 5
    
    if state['resources'].get('tech_points', 0) < cost_tech:
        return jsonify({'success': False, 'error': '科技点不足'})
    if state['resources'].get('food', 0) < cost_food:
        return jsonify({'success': False, 'error': '食物不足'})
    
    total_capacity = sum(
        MODULE_TYPES.get(m['type'], {}).get('capacity', 0)
        for m in state['modules']
    )
    
    if len(state['crew']) >= total_capacity:
        return jsonify({'success': False, 'error': '居住空间不足'})
    
    state['resources']['tech_points'] -= cost_tech
    state['resources']['food'] -= cost_food
    
    new_crew = generate_crew_member()
    state['crew'].append(new_crew)
    
    return jsonify({
        'success': True,
        'state': state,
        'crew_member': new_crew
    })


@app.route('/api/leaderboard', methods=['GET'])
def get_leaderboard():
    sorted_leaderboard = sorted(leaderboard, key=lambda x: x['score'], reverse=True)[:20]
    return jsonify({
        'success': True,
        'leaderboard': sorted_leaderboard
    })


@app.route('/api/leaderboard', methods=['POST'])
def submit_score():
    data = request.json
    name = data.get('name', '匿名玩家')
    score = data.get('score', 0)
    days = data.get('days', 0)
    
    entry = {
        'id': str(uuid.uuid4()),
        'name': name,
        'score': score,
        'days': days,
        'date': datetime.now().strftime('%Y-%m-%d')
    }
    
    leaderboard.append(entry)
    
    return jsonify({
        'success': True,
        'entry': entry
    })


@app.route('/api/random-crew', methods=['GET'])
def random_crew():
    member = generate_crew_member()
    return jsonify({
        'success': True,
        'crew_member': member
    })


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
