import re
from typing import List, Dict, Any

INGREDIENT_KEYWORDS = {
    '胡萝卜': {'category': 'vegetable', 'color': '#ff7f00', 'shape': 'cylinder'},
    '土豆': {'category': 'vegetable', 'color': '#d4a574', 'shape': 'sphere'},
    '洋葱': {'category': 'vegetable', 'color': '#c4a484', 'shape': 'sphere'},
    '西红柿': {'category': 'vegetable', 'color': '#ff4444', 'shape': 'sphere'},
    '黄瓜': {'category': 'vegetable', 'color': '#4caf50', 'shape': 'cylinder'},
    '青椒': {'category': 'vegetable', 'color': '#2e7d32', 'shape': 'sphere'},
    '鸡胸肉': {'category': 'meat', 'color': '#f5deb3', 'shape': 'box'},
    '牛肉': {'category': 'meat', 'color': '#8b0000', 'shape': 'box'},
    '猪肉': {'category': 'meat', 'color': '#cd853f', 'shape': 'box'},
    '鸡蛋': {'category': 'protein', 'color': '#fffacd', 'shape': 'sphere'},
    '豆腐': {'category': 'protein', 'color': '#fffacd', 'shape': 'box'},
    '米饭': {'category': 'grain', 'color': '#f5f5dc', 'shape': 'cylinder'},
    '面条': {'category': 'grain', 'color': '#f5deb3', 'shape': 'cylinder'},
    '盐': {'category': 'seasoning', 'color': '#ffffff', 'shape': 'box'},
    '酱油': {'category': 'seasoning', 'color': '#4a2c00', 'shape': 'cylinder'},
    '油': {'category': 'seasoning', 'color': '#ffd700', 'shape': 'cylinder'},
}

TOOL_KEYWORDS = {
    '炒锅': {'type': 'pan', 'color': '#333333'},
    '平底锅': {'type': 'pan', 'color': '#333333'},
    '砧板': {'type': 'board', 'color': '#8b4513'},
    '菜刀': {'type': 'knife', 'color': '#c0c0c0'},
    '碗': {'type': 'bowl', 'color': '#ffffff'},
    '盘子': {'type': 'plate', 'color': '#ffffff'},
    '铲子': {'type': 'spatula', 'color': '#8b4513'},
}

ACTION_KEYWORDS = {
    '切丁': {'action': 'dice', 'duration': 2000},
    '切片': {'action': 'slice', 'duration': 2000},
    '切丝': {'action': 'shred', 'duration': 2000},
    '切碎': {'action': 'chop', 'duration': 1500},
    '翻炒': {'action': 'stir_fry', 'duration': 3000},
    '煎': {'action': 'fry', 'duration': 3000},
    '炒': {'action': 'fry', 'duration': 3000},
    '焖煮': {'action': 'simmer', 'duration': 4000},
    '煮': {'action': 'boil', 'duration': 4000},
    '蒸': {'action': 'steam', 'duration': 4000},
    '搅拌': {'action': 'stir', 'duration': 2000},
    '混合': {'action': 'mix', 'duration': 2000},
    '加入': {'action': 'add', 'duration': 1000},
    '放入': {'action': 'add', 'duration': 1000},
    '倒入': {'action': 'pour', 'duration': 1000},
    '取出': {'action': 'take_out', 'duration': 1000},
    '盛出': {'action': 'serve', 'duration': 1000},
}

STATUS_MAP = {
    'dice': '已切丁',
    'slice': '已切片',
    'shred': '已切丝',
    'chop': '已切碎',
    'fry': '已煎熟',
    'stir_fry': '已炒熟',
    'simmer': '已焖煮',
    'boil': '已煮熟',
    'steam': '已蒸熟',
    'add': '已加入',
    'mix': '已混合',
    'serve': '已盛出',
}


def extract_ingredients(text: str) -> List[Dict[str, Any]]:
    ingredients = []
    found = set()
    for name, info in INGREDIENT_KEYWORDS.items():
        if name in text and name not in found:
            ingredients.append({
                'name': name,
                'category': info['category'],
                'color': info['color'],
                'shape': info['shape'],
                'status': '未处理',
                'position': len(ingredients)
            })
            found.add(name)
    return ingredients


def extract_tools(text: str) -> List[Dict[str, Any]]:
    tools = []
    found = set()
    for name, info in TOOL_KEYWORDS.items():
        if name in text and name not in found:
            tools.append({
                'name': name,
                'type': info['type'],
                'color': info['color']
            })
            found.add(name)
    return tools


def parse_steps(text: str) -> List[Dict[str, Any]]:
    lines = re.split(r'[。；\n]', text)
    steps = []
    step_index = 0
    
    for line in lines:
        line = line.strip()
        if not line or len(line) < 3:
            continue
        
        actions = []
        for action_name, action_info in ACTION_KEYWORDS.items():
            if action_name in line:
                actions.append({
                    'name': action_name,
                    'action': action_info['action'],
                    'duration': action_info['duration']
                })
        
        ingredients_in_step = []
        for ing_name in INGREDIENT_KEYWORDS.keys():
            if ing_name in line:
                ingredients_in_step.append(ing_name)
        
        tools_in_step = []
        for tool_name in TOOL_KEYWORDS.keys():
            if tool_name in line:
                tools_in_step.append(tool_name)
        
        if actions or ingredients_in_step:
            step_index += 1
            steps.append({
                'id': step_index,
                'description': line,
                'actions': actions,
                'ingredients': ingredients_in_step,
                'tools': tools_in_step,
                'status': 'pending'
            })
    
    if not steps:
        steps.append({
            'id': 1,
            'description': text[:50] + '...' if len(text) > 50 else text,
            'actions': [{'name': '准备', 'action': 'prepare', 'duration': 1000}],
            'ingredients': list(INGREDIENT_KEYWORDS.keys())[:3],
            'tools': ['炒锅', '菜刀', '砧板'],
            'status': 'pending'
        })
    
    return steps


def parse_recipe(text: str) -> Dict[str, Any]:
    ingredients = extract_ingredients(text)
    tools = extract_tools(text)
    steps = parse_steps(text)
    
    ingredient_states = {}
    for ing in ingredients:
        ingredient_states[ing['name']] = '未处理'
    
    for step in steps:
        for action in step['actions']:
            action_name = action.get('action', '')
            if action_name in STATUS_MAP:
                for ing_name in step['ingredients']:
                    ingredient_states[ing_name] = STATUS_MAP[action_name]
    
    return {
        'title': text[:20] + '...' if len(text) > 20 else '菜谱',
        'ingredients': ingredients,
        'tools': tools,
        'steps': steps,
        'ingredient_states': ingredient_states
    }
