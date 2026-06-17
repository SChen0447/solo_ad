from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid
import random
import json
from typing import Dict, List, Any, Optional

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

rooms: Dict[str, Dict[str, Any]] = {}
scoreboard: Dict[str, Dict[str, int]] = {}

RUNE_TYPES = ['fire', 'ice', 'thunder', 'shadow', 'light', 'nature']

RUNE_EFFECTS = {
    'fire': {'attack': 3, 'defense': 1, 'health': 5, 'mana': 2},
    'ice': {'attack': 1, 'defense': 3, 'health': 8, 'mana': 2},
    'thunder': {'attack': 4, 'defense': 0, 'health': 3, 'mana': 3},
    'shadow': {'attack': 2, 'defense': 2, 'health': 4, 'mana': 3},
    'light': {'attack': 2, 'defense': 2, 'health': 10, 'mana': 1},
    'nature': {'attack': 2, 'defense': 3, 'health': 7, 'mana': 2}
}

RUNE_COUNTERS = {
    'fire': 'nature',
    'nature': 'thunder',
    'thunder': 'ice',
    'ice': 'fire',
    'light': 'shadow',
    'shadow': 'light'
}

CARD_TEMPLATES = {
    'fire': [
        {'id': 'fireball', 'name': '火球术', 'type': 'spell', 'cost': 2, 'damage': 4, 'element': 'fire', 'rarity': 'common', 'description': '对敌方英雄造成4点伤害'},
        {'id': 'flame_burst', 'name': '烈焰爆发', 'type': 'spell', 'cost': 3, 'damage': 3, 'target_all': True, 'element': 'fire', 'rarity': 'rare', 'description': '对所有敌方生物造成3点伤害'},
        {'id': 'fire_elemental', 'name': '火元素', 'type': 'creature', 'cost': 3, 'attack': 4, 'health': 3, 'element': 'fire', 'rarity': 'common', 'description': '召唤一个4攻3血的火元素'},
        {'id': 'phoenix', 'name': '凤凰', 'type': 'creature', 'cost': 5, 'attack': 5, 'health': 4, 'element': 'fire', 'rarity': 'epic', 'description': '召唤一只5攻4血的凤凰'},
        {'id': 'inferno', 'name': '地狱火', 'type': 'spell', 'cost': 6, 'damage': 8, 'element': 'fire', 'rarity': 'legendary', 'description': '对敌方英雄造成8点伤害'}
    ],
    'ice': [
        {'id': 'ice_spike', 'name': '冰锥术', 'type': 'spell', 'cost': 2, 'damage': 2, 'freeze': True, 'element': 'ice', 'rarity': 'common', 'description': '造成2点伤害并冻结一个格子'},
        {'id': 'frost_nova', 'name': '霜冻新星', 'type': 'spell', 'cost': 3, 'damage': 1, 'freeze_all': True, 'element': 'ice', 'rarity': 'rare', 'description': '冻结所有敌方生物'},
        {'id': 'ice_golem', 'name': '冰霜巨人', 'type': 'creature', 'cost': 4, 'attack': 3, 'health': 6, 'element': 'ice', 'rarity': 'common', 'description': '召唤一个3攻6血的冰霜巨人'},
        {'id': 'frost_mage', 'name': '冰霜法师', 'type': 'creature', 'cost': 3, 'attack': 2, 'health': 4, 'element': 'ice', 'rarity': 'rare', 'description': '召唤一个2攻4血的冰霜法师'},
        {'id': 'absolute_zero', 'name': '绝对零度', 'type': 'spell', 'cost': 7, 'freeze_all': True, 'damage': 4, 'element': 'ice', 'rarity': 'legendary', 'description': '冻结所有敌方生物并造成4点伤害'}
    ],
    'thunder': [
        {'id': 'lightning_bolt', 'name': '闪电箭', 'type': 'spell', 'cost': 1, 'damage': 3, 'element': 'thunder', 'rarity': 'common', 'description': '对一个目标造成3点伤害'},
        {'id': 'chain_lightning', 'name': '闪电链', 'type': 'spell', 'cost': 3, 'damage': 2, 'chain_count': 3, 'element': 'thunder', 'rarity': 'rare', 'description': '闪电在3个敌方目标间跳跃'},
        {'id': 'thunder_wolf', 'name': '雷狼', 'type': 'creature', 'cost': 2, 'attack': 3, 'health': 2, 'element': 'thunder', 'rarity': 'common', 'description': '召唤一只3攻2血的雷狼'},
        {'id': 'storm_elemental', 'name': '风暴元素', 'type': 'creature', 'cost': 4, 'attack': 5, 'health': 3, 'element': 'thunder', 'rarity': 'epic', 'description': '召唤一个5攻3血的风暴元素'},
        {'id': 'divine_thunder', 'name': '神雷', 'type': 'spell', 'cost': 5, 'damage': 6, 'target_all': True, 'element': 'thunder', 'rarity': 'legendary', 'description': '天降神雷，对所有敌人造成6点伤害'}
    ],
    'shadow': [
        {'id': 'shadow_bolt', 'name': '暗影箭', 'type': 'spell', 'cost': 2, 'damage': 3, 'element': 'shadow', 'rarity': 'common', 'description': '发射暗影箭造成3点伤害'},
        {'id': 'drain_life', 'name': '生命汲取', 'type': 'spell', 'cost': 3, 'damage': 2, 'heal': 2, 'element': 'shadow', 'rarity': 'rare', 'description': '造成2点伤害并恢复2点生命'},
        {'id': 'shadow_wraith', 'name': '暗影幽灵', 'type': 'creature', 'cost': 2, 'attack': 2, 'health': 2, 'element': 'shadow', 'rarity': 'common', 'description': '召唤一个2攻2血的暗影幽灵'},
        {'id': 'demon_lord', 'name': '恶魔领主', 'type': 'creature', 'cost': 5, 'attack': 6, 'health': 5, 'element': 'shadow', 'rarity': 'epic', 'description': '召唤一个6攻5血的恶魔领主'},
        {'id': 'void_embrace', 'name': '虚空拥抱', 'type': 'spell', 'cost': 6, 'damage': 5, 'destroy_creature': True, 'element': 'shadow', 'rarity': 'legendary', 'description': '消灭一个敌方生物并对英雄造成5点伤害'}
    ],
    'light': [
        {'id': 'holy_light', 'name': '圣光术', 'type': 'spell', 'cost': 1, 'heal': 3, 'element': 'light', 'rarity': 'common', 'description': '恢复3点生命值'},
        {'id': 'holy_smite', 'name': '神圣惩击', 'type': 'spell', 'cost': 2, 'damage': 3, 'heal': 1, 'element': 'light', 'rarity': 'rare', 'description': '造成3点伤害并恢复1点生命'},
        {'id': 'holy_knight', 'name': '圣光骑士', 'type': 'creature', 'cost': 3, 'attack': 3, 'health': 4, 'element': 'light', 'rarity': 'common', 'description': '召唤一个3攻4血的圣光骑士'},
        {'id': 'angel', 'name': '天使', 'type': 'creature', 'cost': 5, 'attack': 4, 'health': 6, 'element': 'light', 'rarity': 'epic', 'description': '召唤一只4攻6血的天使'},
        {'id': 'divine_blessing', 'name': '神圣祝福', 'type': 'spell', 'cost': 4, 'heal': 8, 'buff_all': True, 'element': 'light', 'rarity': 'legendary', 'description': '恢复8点生命并使所有友方生物+1/+1'}
    ],
    'nature': [
        {'id': 'vine_trap', 'name': '藤蔓陷阱', 'type': 'spell', 'cost': 1, 'freeze': True, 'element': 'nature', 'rarity': 'common', 'description': '用藤蔓缠绕一个敌方单位'},
        {'id': 'healing_spring', 'name': '治愈之泉', 'type': 'spell', 'cost': 2, 'heal': 4, 'element': 'nature', 'rarity': 'common', 'description': '恢复4点生命值'},
        {'id': 'forest_wolf', 'name': '森林狼', 'type': 'creature', 'cost': 1, 'attack': 2, 'health': 1, 'element': 'nature', 'rarity': 'common', 'description': '召唤一只2攻1血的森林狼'},
        {'id': 'treant', 'name': '树人', 'type': 'creature', 'cost': 4, 'attack': 3, 'health': 7, 'element': 'nature', 'rarity': 'rare', 'description': '召唤一个3攻7血的树人'},
        {'id': 'ancient_of_war', 'name': '战争古树', 'type': 'creature', 'cost': 6, 'attack': 5, 'health': 10, 'element': 'nature', 'rarity': 'legendary', 'description': '召唤一棵5攻10血的战争古树'}
    ]
}


def calculate_hero_stats(runes: List[str]) -> Dict[str, int]:
    stats = {'attack': 0, 'defense': 0, 'health': 30, 'mana': 1}
    for rune in runes:
        if rune in RUNE_EFFECTS:
            effect = RUNE_EFFECTS[rune]
            stats['attack'] += effect['attack']
            stats['defense'] += effect['defense']
            stats['health'] += effect['health']
            stats['mana'] += effect['mana']
    return stats


def generate_deck(runes: List[str]) -> List[Dict[str, Any]]:
    deck = []
    for rune in runes:
        if rune in CARD_TEMPLATES:
            templates = CARD_TEMPLATES[rune]
            for template in templates:
                card = template.copy()
                card['uid'] = str(uuid.uuid4())
                card['instance_id'] = str(uuid.uuid4())
                deck.append(card)
    random.shuffle(deck)
    return deck


@app.route('/api/rooms/create', methods=['POST'])
def create_room():
    data = request.json
    player_id = data.get('player_id', str(uuid.uuid4()))
    player_name = data.get('player_name', '玩家')
    room_id = str(uuid.uuid4())[:8]
    
    rooms[room_id] = {
        'id': room_id,
        'players': {},
        'status': 'waiting',
        'turn': 0,
        'current_player': None
    }
    
    return jsonify({
        'success': True,
        'room_id': room_id,
        'player_id': player_id
    })


@app.route('/api/rooms/join', methods=['POST'])
def join_room():
    data = request.json
    room_id = data.get('room_id')
    player_id = data.get('player_id', str(uuid.uuid4()))
    player_name = data.get('player_name', '玩家')
    
    if room_id not in rooms:
        return jsonify({'success': False, 'error': '房间不存在'}), 404
    
    room = rooms[room_id]
    if len(room['players']) >= 2:
        return jsonify({'success': False, 'error': '房间已满'}), 400
    
    room['players'][player_id] = {
        'id': player_id,
        'name': player_name,
        'runes': [],
        'deck': [],
        'hand': [],
        'hero': None,
        'mana': 0,
        'max_mana': 0,
        'health': 0,
        'max_health': 0
    }
    
    return jsonify({
        'success': True,
        'room_id': room_id,
        'player_id': player_id,
        'players': list(room['players'].keys())
    })


@app.route('/api/deck/generate', methods=['POST'])
def generate_deck_api():
    data = request.json
    runes = data.get('runes', [])
    
    if len(runes) != 3:
        return jsonify({'success': False, 'error': '必须选择3个符文'}), 400
    
    for rune in runes:
        if rune not in RUNE_TYPES:
            return jsonify({'success': False, 'error': f'无效的符文类型: {rune}'}), 400
    
    hero_stats = calculate_hero_stats(runes)
    deck = generate_deck(runes)
    
    return jsonify({
        'success': True,
        'hero_stats': hero_stats,
        'deck': deck,
        'rune_counters': RUNE_COUNTERS
    })


@app.route('/api/battle/validate', methods=['POST'])
def validate_battle():
    data = request.json
    action = data.get('action')
    game_state = data.get('game_state')
    
    if not action or not game_state:
        return jsonify({'valid': False, 'error': '缺少必要参数'}), 400
    
    is_valid = True
    reason = ''
    
    if action['type'] == 'play_card':
        player = game_state.get('player', {})
        card = action.get('card', {})
        if player.get('mana', 0) < card.get('cost', 0):
            is_valid = False
            reason = '法力值不足'
    
    return jsonify({
        'valid': is_valid,
        'reason': reason
    })


@app.route('/api/scoreboard', methods=['GET'])
def get_scoreboard():
    player_id = request.args.get('player_id', '')
    stats = scoreboard.get(player_id, {'wins': 0, 'losses': 0})
    return jsonify({
        'success': True,
        'wins': stats['wins'],
        'losses': stats['losses']
    })


@app.route('/api/scoreboard/update', methods=['POST'])
def update_scoreboard():
    data = request.json
    player_id = data.get('player_id')
    result = data.get('result')
    
    if player_id not in scoreboard:
        scoreboard[player_id] = {'wins': 0, 'losses': 0}
    
    if result == 'win':
        scoreboard[player_id]['wins'] += 1
    elif result == 'loss':
        scoreboard[player_id]['losses'] += 1
    
    return jsonify({'success': True})


@socketio.on('connect')
def handle_connect():
    print('Client connected')


@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')


@socketio.on('join_room')
def handle_join_room(data):
    room_id = data.get('room_id')
    player_id = data.get('player_id')
    if room_id in rooms:
        join_room(room_id)
        emit('player_joined', {'player_id': player_id}, room=room_id)


@socketio.on('game_action')
def handle_game_action(data):
    room_id = data.get('room_id')
    action = data.get('action')
    if room_id in rooms:
        emit('game_action', action, room=room_id, include_self=False)


@socketio.on('start_game')
def handle_start_game(data):
    room_id = data.get('room_id')
    if room_id in rooms:
        room = rooms[room_id]
        room['status'] = 'playing'
        emit('game_started', room, room=room_id)


if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
