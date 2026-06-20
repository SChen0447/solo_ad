from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
import time

app = Flask(__name__)
CORS(app)

rune_colors = {
    'fire': '#FF4500',
    'water': '#1E90FF',
    'wind': '#00FA9A',
    'earth': '#8B4513',
    'light': '#FFD700',
    'dark': '#4B0082'
}

combination_rules = [
    {'runes': ['fire', 'fire', 'fire'], 'itemName': '烈焰之杖', 'shape': {'type': 'staff', 'parts': ['sphere', 'torus']}, 'power': 30, 'rarity': 'rare'},
    {'runes': ['water', 'water', 'water'], 'itemName': '海潮之剑', 'shape': {'type': 'sword', 'parts': ['cube', 'cone']}, 'power': 30, 'rarity': 'rare'},
    {'runes': ['earth', 'earth', 'earth'], 'itemName': '大地之盾', 'shape': {'type': 'shield', 'parts': ['cylinder', 'torus']}, 'power': 35, 'rarity': 'rare'},
    {'runes': ['wind', 'wind', 'wind'], 'itemName': '疾风之戒', 'shape': {'type': 'ring', 'parts': ['torus', 'sphere']}, 'power': 25, 'rarity': 'rare'},
    {'runes': ['light', 'light', 'light'], 'itemName': '圣光护符', 'shape': {'type': 'amulet', 'parts': ['octahedron', 'torus']}, 'power': 35, 'rarity': 'epic'},
    {'runes': ['dark', 'dark', 'dark'], 'itemName': '暗影水晶', 'shape': {'type': 'crystal', 'parts': ['octahedron', 'icosahedron']}, 'power': 35, 'rarity': 'epic'},
    {'runes': ['fire', 'water', 'earth'], 'itemName': '元素法杖', 'shape': {'type': 'staff', 'parts': ['sphere', 'cylinder', 'torus']}, 'power': 45, 'rarity': 'epic'},
    {'runes': ['fire', 'wind', 'light'], 'itemName': '炎阳之剑', 'shape': {'type': 'sword', 'parts': ['cone', 'cube', 'sphere']}, 'power': 50, 'rarity': 'epic'},
    {'runes': ['water', 'earth', 'dark'], 'itemName': '深渊之盾', 'shape': {'type': 'shield', 'parts': ['cylinder', 'torus', 'sphere']}, 'power': 55, 'rarity': 'epic'},
    {'runes': ['fire', 'fire', 'light'], 'itemName': '炎爆魔杖', 'shape': {'type': 'staff', 'parts': ['sphere', 'torus']}, 'power': 35, 'rarity': 'rare'},
    {'runes': ['water', 'water', 'wind'], 'itemName': '冰霜之刃', 'shape': {'type': 'sword', 'parts': ['cube', 'cone']}, 'power': 32, 'rarity': 'rare'},
    {'runes': ['earth', 'earth', 'fire'], 'itemName': '熔岩巨锤', 'shape': {'type': 'sword', 'parts': ['cube', 'cylinder']}, 'power': 40, 'rarity': 'rare'},
    {'runes': ['wind', 'light', 'dark'], 'itemName': '虚空法球', 'shape': {'type': 'crystal', 'parts': ['icosahedron', 'sphere']}, 'power': 60, 'rarity': 'legendary'},
    {'runes': ['fire', 'water', 'light'], 'itemName': '曙光之杖', 'shape': {'type': 'staff', 'parts': ['sphere', 'torus', 'cone']}, 'power': 42, 'rarity': 'rare'},
    {'runes': ['earth', 'wind', 'earth'], 'itemName': '岩石铠甲', 'shape': {'type': 'shield', 'parts': ['box', 'cylinder']}, 'power': 38, 'rarity': 'rare'},
    {'runes': ['light', 'light', 'dark'], 'itemName': '暮光圣典', 'shape': {'type': 'book', 'parts': ['box', 'cylinder']}, 'power': 50, 'rarity': 'epic'},
    {'runes': ['fire', 'wind', 'wind'], 'itemName': '风暴之眼', 'shape': {'type': 'ring', 'parts': ['torus', 'sphere']}, 'power': 28, 'rarity': 'common'},
    {'runes': ['water', 'earth', 'light'], 'itemName': '生命之泉', 'shape': {'type': 'potion', 'parts': ['cylinder', 'sphere']}, 'power': 40, 'rarity': 'rare'},
]

inventory = {
    'items': [],
    'gold': 500
}


def hex_to_rgb(hex_color):
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def rgb_to_hex(rgb):
    return '#{:02x}{:02x}{:02x}'.format(*rgb)


def mix_colors(colors):
    if not colors:
        return '#FFFFFF'
    if len(colors) == 1:
        return colors[0]
    
    total_r, total_g, total_b = 0, 0, 0
    for color in colors:
        r, g, b = hex_to_rgb(color)
        total_r += r
        total_g += g
        total_b += b
    
    n = len(colors)
    return rgb_to_hex((total_r // n, total_g // n, total_b // n))


@app.route('/api/runes/combinations', methods=['GET'])
def get_combinations():
    time.sleep(0.5)
    return jsonify(combination_rules)


@app.route('/api/craft', methods=['POST'])
def craft_item():
    time.sleep(0.5)
    data = request.get_json()
    runes = data.get('runes', [])
    
    if not runes:
        return jsonify({'success': False, 'message': '请选择符文'}), 400
    
    sorted_runes = sorted(runes)
    
    matched_rule = None
    for rule in combination_rules:
        sorted_rule = sorted(rule['runes'])
        if len(sorted_rule) == len(sorted_runes) and all(r == sr for r, sr in zip(sorted_rule, sorted_runes)):
            matched_rule = rule
            break
    
    colors = [rune_colors.get(r, '#FFFFFF') for r in runes]
    mixed_color = mix_colors(colors)
    
    if matched_rule:
        item = {
            'id': f'item_{int(time.time())}_{uuid.uuid4().hex[:9]}',
            'name': matched_rule['itemName'],
            'runes': runes,
            'shape': matched_rule['shape'],
            'color': mixed_color,
            'power': matched_rule['power'],
            'level': 1,
            'isPlaced': False
        }
    else:
        import random
        default_names = ['神秘护符', '奇异水晶', '符文之石', '魔法宝珠']
        shapes = [
            {'type': 'amulet', 'parts': ['sphere', 'torus']},
            {'type': 'crystal', 'parts': ['octahedron', 'sphere']},
            {'type': 'ring', 'parts': ['torus', 'sphere']},
            {'type': 'potion', 'parts': ['cylinder', 'sphere']},
        ]
        shape_index = random.randint(0, len(shapes) - 1)
        avg_power = len(runes) * 10 + random.randint(0, 10)
        
        item = {
            'id': f'item_{int(time.time())}_{uuid.uuid4().hex[:9]}',
            'name': default_names[random.randint(0, len(default_names) - 1)],
            'runes': runes,
            'shape': shapes[shape_index],
            'color': mixed_color,
            'power': avg_power,
            'level': 1,
            'isPlaced': False
        }
    
    inventory['items'].append(item)
    
    return jsonify({
        'success': True,
        'item': item
    })


@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    time.sleep(0.5)
    return jsonify(inventory)


@app.route('/api/upgrade', methods=['POST'])
def upgrade_item():
    time.sleep(0.5)
    data = request.get_json()
    item1_id = data.get('item1Id')
    item2_id = data.get('item2Id')
    
    item1 = next((item for item in inventory['items'] if item['id'] == item1_id), None)
    item2 = next((item for item in inventory['items'] if item['id'] == item2_id), None)
    
    if not item1 or not item2:
        return jsonify({'success': False, 'message': '物品不存在'}), 404
    
    all_runes = (item1['runes'] + item2['runes'])[:3]
    new_power = int((item1['power'] + item2['power']) * 1.5)
    new_level = max(item1['level'], item2['level']) + 1
    
    sorted_runes = sorted(all_runes)
    matched_rule = None
    for rule in combination_rules:
        sorted_rule = sorted(rule['runes'])
        if len(sorted_rule) == len(sorted_runes) and all(r == sr for r, sr in zip(sorted_rule, sorted_runes)):
            matched_rule = rule
            break
    
    colors = [rune_colors.get(r, '#FFFFFF') for r in all_runes]
    mixed_color = mix_colors(colors)
    
    inventory['items'] = [item for item in inventory['items'] if item['id'] not in (item1_id, item2_id)]
    
    if matched_rule:
        new_item = {
            'id': f'item_{int(time.time())}_{uuid.uuid4().hex[:9]}',
            'name': f'强化·{matched_rule["itemName"]}',
            'runes': all_runes,
            'shape': matched_rule['shape'],
            'color': mixed_color,
            'power': new_power,
            'level': new_level,
            'isPlaced': False
        }
    else:
        new_item = {
            'id': f'item_{int(time.time())}_{uuid.uuid4().hex[:9]}',
            'name': f'强化·{item1["name"]}',
            'runes': all_runes,
            'shape': item1['shape'],
            'color': mixed_color,
            'power': new_power,
            'level': new_level,
            'isPlaced': False
        }
    
    inventory['items'].append(new_item)
    
    return jsonify({
        'success': True,
        'item': new_item
    })


@app.route('/api/save', methods=['POST'])
def save_game():
    time.sleep(0.3)
    data = request.get_json()
    inventory['items'] = data.get('items', [])
    inventory['gold'] = data.get('gold', 500)
    return jsonify({'success': True})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
