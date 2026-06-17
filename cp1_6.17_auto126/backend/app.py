from flask import Flask, jsonify, request, session
from flask_cors import CORS
import uuid
import json
import os
from datetime import datetime

app = Flask(__name__)
app.secret_key = 'rune_guardians_secret_key_2024'
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

USERS_FILE = os.path.join(DATA_DIR, 'users.json')
CARDS_FILE = os.path.join(DATA_DIR, 'cards.json')
MATCHES_FILE = os.path.join(DATA_DIR, 'matches.json')

ELEMENTS = ['fire', 'water', 'earth', 'wind', 'light', 'dark']
RARITIES = ['common', 'rare', 'epic', 'legendary']

def load_data(filepath, default):
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    return default

def save_data(filepath, data):
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def init_cards():
    cards = load_data(CARDS_FILE, [])
    if not cards:
        card_names = {
            'fire': ['火焰精灵', '炎龙', '熔岩巨人', '火球术', '烈焰风暴'],
            'water': ['水元素', '海龙', '冰霜巨人', '冰锥术', '暴风雪'],
            'earth': ['石巨人', '土龙', '山岳守护者', '岩石投射', '地震'],
            'wind': ['风精灵', '飞龙', '风暴领主', '风刃', '龙卷风'],
            'light': ['光天使', '圣龙', '光明守护者', '圣光术', '神圣审判'],
            'dark': ['暗影刺客', '暗龙', '深渊领主', '暗影箭', '黑暗吞噬']
        }
        card_id = 1
        for element in ELEMENTS:
            for i, name in enumerate(card_names[element]):
                for rarity_idx, rarity in enumerate(RARITIES):
                    base_atk = 2 + rarity_idx * 2
                    base_hp = 3 + rarity_idx * 3
                    cost = 1 + rarity_idx
                    is_spell = i >= 3
                    cards.append({
                        'id': card_id,
                        'name': name,
                        'element': element,
                        'rarity': rarity,
                        'cost': cost,
                        'attack': 0 if is_spell else base_atk,
                        'health': 0 if is_spell else base_hp,
                        'is_spell': is_spell,
                        'description': f'{rarity}级{element}属性{name}'
                    })
                    card_id += 1
        save_data(CARDS_FILE, cards)
    return cards

init_cards()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': '符文守护者服务器运行中'})

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    users = load_data(USERS_FILE, {})
    
    if username not in users:
        users[username] = {
            'id': str(uuid.uuid4()),
            'username': username,
            'password': password,
            'level': 1,
            'hp': 30,
            'collection': [],
            'wins': 0,
            'losses': 0,
            'created_at': datetime.now().isoformat()
        }
        all_cards = load_data(CARDS_FILE, [])
        starter_cards = [c['id'] for c in all_cards if c['rarity'] in ['common', 'rare']][:20]
        users[username]['collection'] = starter_cards
        save_data(USERS_FILE, users)
    
    user = users[username]
    if user['password'] == password:
        session['user_id'] = user['id']
        return jsonify({
            'success': True,
            'user': {
                'id': user['id'],
                'username': user['username'],
                'level': user['level'],
                'hp': user['hp'],
                'wins': user['wins'],
                'losses': user['losses']
            }
        })
    
    return jsonify({'success': False, 'message': '密码错误'}), 401

@app.route('/api/cards', methods=['GET'])
def get_all_cards():
    cards = load_data(CARDS_FILE, [])
    return jsonify(cards)

@app.route('/api/user/collection', methods=['GET'])
def get_user_collection():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': '未登录'}), 401
    
    users = load_data(USERS_FILE, {})
    for user in users.values():
        if user['id'] == user_id:
            all_cards = load_data(CARDS_FILE, [])
            collection = [c for c in all_cards if c['id'] in user['collection']]
            return jsonify(collection)
    
    return jsonify({'error': '用户不存在'}), 404

@app.route('/api/matches', methods=['POST'])
def save_match():
    data = request.get_json()
    matches = load_data(MATCHES_FILE, [])
    
    match_record = {
        'id': str(uuid.uuid4()),
        'player1_id': data.get('player1_id'),
        'player2_id': data.get('player2_id'),
        'winner_id': data.get('winner_id'),
        'turns': data.get('turns', 0),
        'cards_played': data.get('cards_played', []),
        'reward_card': data.get('reward_card'),
        'created_at': datetime.now().isoformat()
    }
    
    matches.append(match_record)
    save_data(MATCHES_FILE, matches)
    
    users = load_data(USERS_FILE, {})
    for user in users.values():
        if user['id'] == match_record['winner_id']:
            user['wins'] += 1
            if match_record['reward_card']:
                if match_record['reward_card'] not in user['collection']:
                    user['collection'].append(match_record['reward_card'])
        elif user['id'] == match_record['player1_id'] or user['id'] == match_record['player2_id']:
            user['losses'] += 1
    save_data(USERS_FILE, users)
    
    return jsonify({'success': True, 'match': match_record})

@app.route('/api/matches/<user_id>', methods=['GET'])
def get_user_matches(user_id):
    matches = load_data(MATCHES_FILE, [])
    user_matches = [
        m for m in matches 
        if m['player1_id'] == user_id or m['player2_id'] == user_id
    ]
    return jsonify(user_matches)

@app.route('/api/cards/random', methods=['GET'])
def get_random_card():
    rarity = request.args.get('rarity')
    cards = load_data(CARDS_FILE, [])
    if rarity:
        cards = [c for c in cards if c['rarity'] == rarity]
    if cards:
        import random
        return jsonify(random.choice(cards))
    return jsonify({'error': '没有可用卡牌'}), 404

if __name__ == '__main__':
    print('符文守护者服务器启动在 http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)
