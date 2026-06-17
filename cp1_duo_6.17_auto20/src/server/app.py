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
player_rooms: Dict[str, str] = {}
game_states: Dict[str, Dict[str, Any]] = {}

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
    print(f'Client connected: {request.sid}')


@socketio.on('disconnect')
def handle_disconnect():
    print(f'Client disconnected: {request.sid}')
    player_id = request.sid
    if player_id in player_rooms:
        room_id = player_rooms[player_id]
        if room_id in rooms:
            room = rooms[room_id]
            if player_id in room['players']:
                del room['players'][player_id]
                emit('player_left', {'player_id': player_id}, room=room_id)
                if len(room['players']) == 0:
                    del rooms[room_id]
                    if room_id in game_states:
                        del game_states[room_id]
        del player_rooms[player_id]


@socketio.on('join_room')
def handle_join_room(data):
    room_id = data.get('room_id')
    player_id = data.get('player_id', request.sid)
    player_name = data.get('player_name', '玩家')
    
    if room_id not in rooms:
        emit('error', {'message': '房间不存在'})
        return
    
    room = rooms[room_id]
    if len(room['players']) >= 2 and player_id not in room['players']:
        emit('error', {'message': '房间已满'})
        return
    
    join_room(room_id)
    player_rooms[player_id] = room_id
    
    room['players'][player_id] = {
        'id': player_id,
        'name': player_name,
        'runes': [],
        'deck': [],
        'hand': [],
        'hero': None,
        'ready': False
    }
    
    emit('player_joined', {
        'player_id': player_id,
        'player_name': player_name,
        'players': list(room['players'].keys())
    }, room=room_id)
    
    emit('room_state', {
        'room_id': room_id,
        'status': room['status'],
        'players': room['players'],
        'current_player': room.get('current_player'),
        'turn': room.get('turn', 0)
    }, to=request.sid)


@socketio.on('select_runes')
def handle_select_runes(data):
    room_id = data.get('room_id')
    player_id = data.get('player_id')
    runes = data.get('runes', [])
    
    if room_id not in rooms:
        emit('error', {'message': '房间不存在'})
        return
    
    room = rooms[room_id]
    if player_id not in room['players']:
        emit('error', {'message': '你不在这个房间里'})
        return
    
    if len(runes) != 3:
        emit('error', {'message': '必须选择3个符文'})
        return
    
    for rune in runes:
        if rune not in RUNE_TYPES:
            emit('error', {'message': f'无效符文: {rune}'})
            return
    
    player = room['players'][player_id]
    player['runes'] = runes
    player['ready'] = True
    
    hero_stats = calculate_hero_stats(runes)
    deck = generate_deck(runes)
    player['hero_stats'] = hero_stats
    player['deck'] = deck
    
    emit('runes_selected', {
        'player_id': player_id,
        'runes': runes,
        'hero_stats': hero_stats
    }, room=room_id)
    
    all_ready = all(p.get('ready', False) for p in room['players'].values())
    
    if all_ready and len(room['players']) == 2:
        room['status'] = 'playing'
        room['turn'] = 1
        player_ids = list(room['players'].keys())
        room['current_player'] = player_ids[0]
        
        game_state = initialize_game_state(room)
        game_states[room_id] = game_state
        
        emit('game_started', {
            'room_id': room_id,
            'game_state': game_state
        }, room=room_id)


def initialize_game_state(room: Dict[str, Any]) -> Dict[str, Any]:
    players = room['players']
    player_ids = list(players.keys())
    
    game_state = {
        'turn': 1,
        'current_player': player_ids[0],
        'phase': 'battle',
        'players': {},
        'event_log': []
    }
    
    for idx, pid in enumerate(player_ids):
        player_data = players[pid]
        deck = player_data.get('deck', [])
        hero_stats = player_data.get('hero_stats', {})
        
        initial_hand = deck[:4]
        remaining_deck = deck[4:]
        
        battlefield = []
        for row in range(3):
            battlefield.append([])
            for col in range(3):
                battlefield[row].append({
                    'row': row,
                    'col': col,
                    'creature': None,
                    'frozen': False,
                    'highlight': False
                })
        
        game_state['players'][pid] = {
            'id': pid,
            'is_player': idx == 0,
            'hero': {
                'runes': player_data.get('runes', []),
                'attack': hero_stats.get('attack', 0),
                'defense': hero_stats.get('defense', 0),
                'health': hero_stats.get('health', 30),
                'max_health': hero_stats.get('health', 30),
                'mana': hero_stats.get('mana', 1),
                'max_mana': hero_stats.get('mana', 1),
                'mana_per_turn': hero_stats.get('mana', 1)
            },
            'deck': remaining_deck,
            'hand': initial_hand,
            'discard_pile': [],
            'battlefield': battlefield
        }
    
    return game_state


@socketio.on('game_action')
def handle_game_action(data):
    room_id = data.get('room_id')
    player_id = data.get('player_id')
    action = data.get('action')
    action_type = action.get('type') if action else None
    
    if not room_id or not player_id or not action:
        emit('error', {'message': '缺少必要参数'})
        return
    
    if room_id not in rooms or room_id not in game_states:
        emit('error', {'message': '房间不存在'})
        return
    
    room = rooms[room_id]
    game_state = game_states[room_id]
    
    if game_state['current_player'] != player_id:
        emit('error', {'message': '不是你的回合'})
        return
    
    is_valid = validate_action(game_state, player_id, action)
    
    if not is_valid['valid']:
        emit('action_invalid', {
            'action': action,
            'reason': is_valid.get('reason', '无效操作')
        }, to=request.sid)
        return
    
    result = execute_action(game_state, player_id, action)
    
    if result.get('success', False):
        events = result.get('events', [])
        
        emit('game_state_update', {
            'game_state': game_state,
            'events': events,
            'action': action
        }, room=room_id)
        
        if game_state.get('phase') == 'ended':
            room['status'] = 'ended'
            winner = game_state.get('winner')
            if winner:
                if winner in scoreboard:
                    scoreboard[winner]['wins'] += 1
                else:
                    scoreboard[winner] = {'wins': 1, 'losses': 0}
                
                loser = [pid for pid in game_state['players'].keys() if pid != winner][0]
                if loser in scoreboard:
                    scoreboard[loser]['losses'] += 1
                else:
                    scoreboard[loser] = {'wins': 0, 'losses': 1}
            
            emit('game_ended', {
                'winner': winner,
                'game_state': game_state
            }, room=room_id)


def validate_action(game_state: Dict[str, Any], player_id: str, action: Dict[str, Any]) -> Dict[str, Any]:
    action_type = action.get('type')
    
    if game_state['phase'] != 'battle':
        return {'valid': False, 'reason': '游戏不在进行中'}
    
    player_state = game_state['players'].get(player_id)
    if not player_state:
        return {'valid': False, 'reason': '玩家不存在'}
    
    if action_type == 'play_card':
        card_id = action.get('card_id')
        card = next((c for c in player_state['hand'] if c.get('instance_id') == card_id), None)
        if not card:
            return {'valid': False, 'reason': '卡牌不存在'}
        
        if player_state['hero']['mana'] < card.get('cost', 0):
            return {'valid': False, 'reason': '法力值不足'}
        
        return {'valid': True}
    
    elif action_type == 'end_turn':
        return {'valid': True}
    
    elif action_type == 'creature_attack':
        creature_id = action.get('creature_id')
        for row in player_state['battlefield']:
            for cell in row:
                if cell['creature'] and cell['creature']['instance_id'] == creature_id:
                    creature = cell['creature']
                    if creature.get('frozen', False):
                        return {'valid': False, 'reason': '生物被冻结'}
                    if not creature.get('can_attack', False):
                        return {'valid': False, 'reason': '生物本回合无法攻击'}
                    return {'valid': True}
        return {'valid': False, 'reason': '生物不存在'}
    
    elif action_type == 'draw_card':
        if len(player_state['deck']) == 0:
            return {'valid': False, 'reason': '牌堆已空'}
        if len(player_state['hand']) >= 7:
            return {'valid': False, 'reason': '手牌已满'}
        return {'valid': True}
    
    return {'valid': False, 'reason': '未知操作'}


def execute_action(game_state: Dict[str, Any], player_id: str, action: Dict[str, Any]) -> Dict[str, Any]:
    action_type = action.get('type')
    events = []
    
    if action_type == 'play_card':
        card_id = action.get('card_id')
        position = action.get('position')
        target_is_hero = action.get('target_is_hero', False)
        
        player_state = game_state['players'][player_id]
        card_index = next((i for i, c in enumerate(player_state['hand']) if c.get('instance_id') == card_id), -1)
        
        if card_index == -1:
            return {'success': False}
        
        card = player_state['hand'].pop(card_index)
        player_state['hero']['mana'] -= card['cost']
        player_state['discard_pile'].append(card)
        
        events.append({
            'type': 'card_played',
            'data': {'player': player_id, 'card': card},
            'timestamp': int(time.time() * 1000)
        })
        
        if card.get('type') == 'creature' and position:
            row, col = position['row'], position['col']
            cell = player_state['battlefield'][row][col]
            
            if not cell['creature'] and not cell['frozen']:
                creature = {
                    'instance_id': card['instance_id'],
                    'card_id': card['id'],
                    'name': card['name'],
                    'attack': card.get('attack', 0),
                    'health': card.get('health', 1),
                    'max_health': card.get('health', 1),
                    'element': card['element'],
                    'rarity': card['rarity'],
                    'frozen': False,
                    'position': position,
                    'owner': player_id,
                    'can_attack': False
                }
                cell['creature'] = creature
                
                events.append({
                    'type': 'creature_summoned',
                    'data': {'player': player_id, 'creature': creature, 'position': position},
                    'timestamp': int(time.time() * 1000)
                })
        
        elif card.get('type') == 'spell':
            events.append({
                'type': 'spell_cast',
                'data': {'player': player_id, 'card': card},
                'timestamp': int(time.time() * 1000)
            })
            
            opponent_id = next(pid for pid in game_state['players'] if pid != player_id)
            opponent_state = game_state['players'][opponent_id]
            
            if card.get('damage'):
                if target_is_hero:
                    damage = max(0, card['damage'] - opponent_state['hero']['defense'])
                    opponent_state['hero']['health'] = max(0, opponent_state['hero']['health'] - damage)
                    
                    events.append({
                        'type': 'hero_attacked',
                        'data': {'player': opponent_id, 'damage': damage},
                        'timestamp': int(time.time() * 1000)
                    })
                
                elif position:
                    row, col = position['row'], position['col']
                    cell = opponent_state['battlefield'][row][col]
                    if cell['creature']:
                        cell['creature']['health'] -= card['damage']
                        
                        events.append({
                            'type': 'damage_dealt',
                            'data': {'target': 'creature', 'creature_id': cell['creature']['instance_id'], 'damage': card['damage']},
                            'timestamp': int(time.time() * 1000)
                        })
                        
                        if cell['creature']['health'] <= 0:
                            events.append({
                                'type': 'creature_died',
                                'data': {'creature': cell['creature']},
                                'timestamp': int(time.time() * 1000)
                            })
                            cell['creature'] = None
                
                if card.get('target_all'):
                    for row in range(3):
                        for col in range(3):
                            cell = opponent_state['battlefield'][row][col]
                            if cell['creature']:
                                cell['creature']['health'] -= card['damage']
                                if cell['creature']['health'] <= 0:
                                    events.append({
                                        'type': 'creature_died',
                                        'data': {'creature': cell['creature']},
                                        'timestamp': int(time.time() * 1000)
                                    })
                                    cell['creature'] = None
            
            if card.get('heal'):
                player_state['hero']['health'] = min(
                    player_state['hero']['max_health'],
                    player_state['hero']['health'] + card['heal']
                )
                events.append({
                    'type': 'heal_performed',
                    'data': {'player': player_id, 'amount': card['heal']},
                    'timestamp': int(time.time() * 1000)
                })
            
            if card.get('freeze') and position:
                row, col = position['row'], position['col']
                cell = opponent_state['battlefield'][row][col]
                cell['frozen'] = True
                if cell['creature']:
                    cell['creature']['frozen'] = True
                events.append({
                    'type': 'cell_frozen',
                    'data': {'position': position, 'player': opponent_id},
                    'timestamp': int(time.time() * 1000)
                })
    
    elif action_type == 'end_turn':
        next_player = next(pid for pid in game_state['players'] if pid != player_id)
        
        events.append({
            'type': 'turn_end',
            'data': {'player': player_id},
            'timestamp': int(time.time() * 1000)
        })
        
        game_state['current_player'] = next_player
        game_state['turn'] += 1
        
        next_state = game_state['players'][next_player]
        next_state['hero']['max_mana'] = min(10, next_state['hero']['max_mana'] + 1)
        next_state['hero']['mana'] = next_state['hero']['max_mana']
        
        if next_state['deck'] and len(next_state['hand']) < 7:
            drawn_card = next_state['deck'].pop(0)
            next_state['hand'].append(drawn_card)
            events.append({
                'type': 'card_drawn',
                'data': {'player': next_player, 'card': drawn_card},
                'timestamp': int(time.time() * 1000)
            })
        
        for row in range(3):
            for col in range(3):
                cell = next_state['battlefield'][row][col]
                cell['frozen'] = False
                if cell['creature']:
                    cell['creature']['frozen'] = False
                    cell['creature']['can_attack'] = True
        
        events.append({
            'type': 'turn_start',
            'data': {'turn': game_state['turn'], 'player': next_player},
            'timestamp': int(time.time() * 1000)
        })
    
    elif action_type == 'creature_attack':
        creature_id = action.get('creature_id')
        target_position = action.get('target_position')
        target_is_hero = action.get('target_is_hero', False)
        
        player_state = game_state['players'][player_id]
        opponent_id = next(pid for pid in game_state['players'] if pid != player_id)
        opponent_state = game_state['players'][opponent_id]
        
        attacker = None
        for row in range(3):
            for col in range(3):
                cell = player_state['battlefield'][row][col]
                if cell['creature'] and cell['creature']['instance_id'] == creature_id:
                    attacker = cell['creature']
                    break
            if attacker:
                break
        
        if not attacker:
            return {'success': False}
        
        if target_is_hero:
            damage = max(0, attacker['attack'] - opponent_state['hero']['defense'])
            opponent_state['hero']['health'] = max(0, opponent_state['hero']['health'] - damage)
            
            events.append({
                'type': 'hero_attacked',
                'data': {'player': opponent_id, 'damage': damage, 'attacker': attacker['name']},
                'timestamp': int(time.time() * 1000)
            })
        
        elif target_position:
            row, col = target_position['row'], target_position['col']
            cell = opponent_state['battlefield'][row][col]
            if cell['creature']:
                target = cell['creature']
                
                events.append({
                    'type': 'creature_attacked',
                    'data': {'attacker': attacker, 'target': target},
                    'timestamp': int(time.time() * 1000)
                })
                
                target['health'] -= attacker['attack']
                attacker['health'] -= target['attack']
                
                if target['health'] <= 0:
                    events.append({
                        'type': 'creature_died',
                        'data': {'creature': target},
                        'timestamp': int(time.time() * 1000)
                    })
                    cell['creature'] = None
                
                if attacker['health'] <= 0:
                    for r in range(3):
                        for c in range(3):
                            acell = player_state['battlefield'][r][c]
                            if acell['creature'] and acell['creature']['instance_id'] == creature_id:
                                events.append({
                                    'type': 'creature_died',
                                    'data': {'creature': attacker},
                                    'timestamp': int(time.time() * 1000)
                                })
                                acell['creature'] = None
                                break
        
        attacker['can_attack'] = False
    
    check_win_condition(game_state, events)
    
    game_state['event_log'].extend(events)
    
    return {'success': True, 'events': events}


def check_win_condition(game_state: Dict[str, Any], events: List[Dict[str, Any]]):
    for player_id, player_state in game_state['players'].items():
        if player_state['hero']['health'] <= 0:
            game_state['phase'] = 'ended'
            winner = next(pid for pid in game_state['players'] if pid != player_id)
            game_state['winner'] = winner
            
            events.append({
                'type': 'game_end',
                'data': {'winner': winner},
                'timestamp': int(time.time() * 1000)
            })
            break


@socketio.on('request_state')
def handle_request_state(data):
    room_id = data.get('room_id')
    player_id = data.get('player_id')
    
    if room_id in game_states:
        emit('game_state_update', {
            'game_state': game_states[room_id],
            'events': []
        }, to=request.sid)


@socketio.on('start_game')
def handle_start_game(data):
    room_id = data.get('room_id')
    if room_id in rooms:
        room = rooms[room_id]
        
        all_ready = all(p.get('ready', False) for p in room['players'].values())
        if all_ready and len(room['players']) == 2:
            room['status'] = 'playing'
            
            game_state = initialize_game_state(room)
            game_states[room_id] = game_state
            
            emit('game_started', {
                'room_id': room_id,
                'game_state': game_state
            }, room=room_id)


if __name__ == '__main__':
    socketio.run(app, debug=True, port=5000)
