import random
import uuid
import json
from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

match_queue = []
game_rooms = {}
game_history = []

MAX_HAND_SIZE = 8
INITIAL_HAND_SIZE = 5
MAX_ENERGY = 3
INITIAL_HP = 100


def generate_card(card_id=None):
    card_types = ['attack', 'defense', 'heal', 'special']
    card_type = random.choice(card_types)
    
    card = {
        'id': card_id or str(uuid.uuid4()),
        'type': card_type,
        'name': '',
        'description': '',
        'value': 0,
        'cost': 1
    }
    
    if card_type == 'attack':
        card['name'] = random.choice(['火焰斩', '冰霜刺', '闪电击', '暗影刃', '破甲击'])
        card['value'] = random.randint(5, 15)
        card['description'] = f'造成 {card["value"]} 点伤害'
        card['cost'] = random.randint(1, 2)
    elif card_type == 'defense':
        card['name'] = random.choice(['能量护盾', '冰霜护甲', '神圣守护', '反射壁'])
        card['value'] = 50
        card['description'] = '减少50%伤害'
        card['cost'] = 1
    elif card_type == 'heal':
        card['name'] = random.choice(['生命汲取', '治愈之光', '再生术', '自然祝福'])
        card['value'] = random.randint(10, 20)
        card['description'] = f'恢复 {card["value"]} 点生命'
        card['cost'] = random.randint(1, 2)
    elif card_type == 'special':
        special_type = random.choice(['draw', 'discard'])
        if special_type == 'draw':
            card['name'] = random.choice(['智慧之眼', '知识探索', '命运抽取'])
            card['value'] = 2
            card['description'] = f'抽 {card["value"]} 张牌'
            card['special_type'] = 'draw'
            card['cost'] = 2
        else:
            card['name'] = random.choice(['混乱风暴', '思维扰乱', '丢弃诅咒'])
            card['value'] = 1
            card['description'] = '对方随机弃1张牌'
            card['special_type'] = 'discard'
            card['cost'] = 2
    
    return card


def generate_deck(count=20):
    deck = []
    for i in range(count):
        deck.append(generate_card())
    return deck


def draw_cards(deck, hand, count):
    drawn = []
    for _ in range(count):
        if len(hand) >= MAX_HAND_SIZE:
            break
        if len(deck) == 0:
            deck = generate_deck(10)
            random.shuffle(deck)
        if deck:
            card = deck.pop(0)
            hand.append(card)
            drawn.append(card)
    return drawn


def create_game_room(player1, player2):
    room_id = str(uuid.uuid4())
    
    p1_deck = generate_deck(20)
    p2_deck = generate_deck(20)
    random.shuffle(p1_deck)
    random.shuffle(p2_deck)
    
    p1_hand = []
    p2_hand = []
    draw_cards(p1_deck, p1_hand, INITIAL_HAND_SIZE)
    draw_cards(p2_deck, p2_hand, INITIAL_HAND_SIZE)
    
    first_player = random.choice([player1['sid'], player2['sid']])
    
    room = {
        'id': room_id,
        'players': {
            player1['sid']: {
                'sid': player1['sid'],
                'nickname': player1['nickname'],
                'avatar': player1['avatar'],
                'hp': INITIAL_HP,
                'maxHp': INITIAL_HP,
                'energy': MAX_ENERGY,
                'maxEnergy': MAX_ENERGY,
                'deck': p1_deck,
                'hand': p1_hand,
                'defense_active': False,
                'is_first': first_player == player1['sid']
            },
            player2['sid']: {
                'sid': player2['sid'],
                'nickname': player2['nickname'],
                'avatar': player2['avatar'],
                'hp': INITIAL_HP,
                'maxHp': INITIAL_HP,
                'energy': MAX_ENERGY,
                'maxEnergy': MAX_ENERGY,
                'deck': p2_deck,
                'hand': p2_hand,
                'defense_active': False,
                'is_first': first_player == player2['sid']
            }
        },
        'current_turn': first_player,
        'turn_number': 1,
        'battle_log': [],
        'game_over': False,
        'winner': None
    }
    
    game_rooms[room_id] = room
    
    log_entry = {
        'turn': 0,
        'event': 'game_start',
        'message': f'游戏开始！{player1["nickname"]} vs {player2["nickname"]}',
        'first_player': room['players'][first_player]['nickname']
    }
    room['battle_log'].append(log_entry)
    
    return room


def get_public_player_state(player):
    return {
        'sid': player['sid'],
        'nickname': player['nickname'],
        'avatar': player['avatar'],
        'hp': player['hp'],
        'maxHp': player['maxHp'],
        'energy': player['energy'],
        'maxEnergy': player['maxEnergy'],
        'handSize': len(player['hand']),
        'defenseActive': player['defense_active'],
        'isFirst': player['is_first'],
        'hand': player['hand']
    }


def get_room_state_for_player(room, sid):
    player = room['players'][sid]
    opponent_sid = [s for s in room['players'] if s != sid][0]
    opponent = room['players'][opponent_sid]
    
    return {
        'roomId': room['id'],
        'turnNumber': room['turn_number'],
        'currentTurn': room['current_turn'],
        'isMyTurn': room['current_turn'] == sid,
        'gameOver': room['game_over'],
        'winner': room['winner'],
        'me': get_public_player_state(player),
        'opponent': {
            'sid': opponent['sid'],
            'nickname': opponent['nickname'],
            'avatar': opponent['avatar'],
            'hp': opponent['hp'],
            'maxHp': opponent['maxHp'],
            'energy': opponent['energy'],
            'maxEnergy': opponent['maxEnergy'],
            'handSize': len(opponent['hand']),
            'defenseActive': opponent['defense_active'],
            'isFirst': opponent['is_first']
        }
    }


def process_card_effect(room, player_sid, card):
    player = room['players'][player_sid]
    opponent_sid = [s for s in room['players'] if s != player_sid][0]
    opponent = room['players'][opponent_sid]
    
    result = {
        'card': card,
        'damage': 0,
        'heal': 0,
        'drawCount': 0,
        'discardCount': 0,
        'defenseActivated': False,
        'playerHp': player['hp'],
        'opponentHp': opponent['hp']
    }
    
    if card['type'] == 'attack':
        damage = card['value']
        if opponent['defense_active']:
            damage = damage // 2
            opponent['defense_active'] = False
        opponent['hp'] = max(0, opponent['hp'] - damage)
        result['damage'] = damage
        result['opponentHp'] = opponent['hp']
        
        log_entry = {
            'turn': room['turn_number'],
            'event': 'attack',
            'player': player['nickname'],
            'card': card['name'],
            'damage': damage,
            'message': f'{player["nickname"]} 使用 {card["name"]} 造成 {damage} 点伤害'
        }
        room['battle_log'].append(log_entry)
    
    elif card['type'] == 'defense':
        player['defense_active'] = True
        result['defenseActivated'] = True
        
        log_entry = {
            'turn': room['turn_number'],
            'event': 'defense',
            'player': player['nickname'],
            'card': card['name'],
            'message': f'{player["nickname"]} 使用 {card["name"]} 进入防御状态'
        }
        room['battle_log'].append(log_entry)
    
    elif card['type'] == 'heal':
        heal_amount = card['value']
        player['hp'] = min(player['maxHp'], player['hp'] + heal_amount)
        result['heal'] = heal_amount
        result['playerHp'] = player['hp']
        
        log_entry = {
            'turn': room['turn_number'],
            'event': 'heal',
            'player': player['nickname'],
            'card': card['name'],
            'heal': heal_amount,
            'message': f'{player["nickname"]} 使用 {card["name"]} 恢复 {heal_amount} 点生命'
        }
        room['battle_log'].append(log_entry)
    
    elif card['type'] == 'special':
        if card.get('special_type') == 'draw':
            drawn = draw_cards(player['deck'], player['hand'], card['value'])
            result['drawCount'] = len(drawn)
            result['drawnCards'] = drawn
            
            log_entry = {
                'turn': room['turn_number'],
                'event': 'draw',
                'player': player['nickname'],
                'card': card['name'],
                'count': len(drawn),
                'message': f'{player["nickname"]} 使用 {card["name"]} 抽了 {len(drawn)} 张牌'
            }
            room['battle_log'].append(log_entry)
        elif card.get('special_type') == 'discard':
            if len(opponent['hand']) > 0:
                discarded = opponent['hand'].pop(random.randint(0, len(opponent['hand']) - 1))
                result['discardCount'] = 1
                result['discardedCard'] = discarded
                
                log_entry = {
                    'turn': room['turn_number'],
                    'event': 'discard',
                    'player': player['nickname'],
                    'card': card['name'],
                    'discarded': discarded['name'],
                    'message': f'{player["nickname"]} 使用 {card["name"]}，对方弃掉了 {discarded["name"]}'
                }
                room['battle_log'].append(log_entry)
    
    if opponent['hp'] <= 0:
        room['game_over'] = True
        room['winner'] = player_sid
        
        history_entry = {
            'id': str(uuid.uuid4()),
            'timestamp': None,
            'players': [
                {'nickname': player['nickname'], 'avatar': player['avatar'], 'result': 'win'},
                {'nickname': opponent['nickname'], 'avatar': opponent['avatar'], 'result': 'lose'}
            ],
            'winner': player['nickname'],
            'turnCount': room['turn_number'],
            'battleLog': room['battle_log']
        }
        game_history.insert(0, history_entry)
        if len(game_history) > 10:
            game_history.pop()
    
    return result


def switch_turn(room):
    current_sid = room['current_turn']
    next_sid = [s for s in room['players'] if s != current_sid][0]
    
    room['current_turn'] = next_sid
    room['turn_number'] += 1
    
    next_player = room['players'][next_sid]
    next_player['energy'] = MAX_ENERGY
    next_player['defense_active'] = False
    
    drawn = draw_cards(next_player['deck'], next_player['hand'], 1)
    
    log_entry = {
        'turn': room['turn_number'],
        'event': 'turn_start',
        'player': next_player['nickname'],
        'message': f'第 {room["turn_number"]} 回合，{next_player["nickname"]} 的回合'
    }
    room['battle_log'].append(log_entry)
    
    return drawn


@app.route('/api/get_history')
def get_history():
    return jsonify(game_history)


@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')


@socketio.on('disconnect')
def handle_disconnect():
    global match_queue
    match_queue = [p for p in match_queue if p['sid'] != request.sid]
    
    for room_id, room in list(game_rooms.items()):
        if request.sid in room['players']:
            opponent_sid = [s for s in room['players'] if s != request.sid][0]
            emit('opponent_left', room=room_id)
            del game_rooms[room_id]
            break
    
    print(f'Client disconnected: {request.sid}')


@socketio.on('join_match')
def handle_join_match(data):
    nickname = data.get('nickname', '玩家')
    avatar = data.get('avatar', '👤')
    
    player = {
        'sid': request.sid,
        'nickname': nickname,
        'avatar': avatar
    }
    
    match_queue.append(player)
    emit('match_status', {'status': 'waiting', 'queueSize': len(match_queue)})
    
    if len(match_queue) >= 2:
        player1 = match_queue.pop(0)
        player2 = match_queue.pop(0)
        
        room = create_game_room(player1, player2)
        room_id = room['id']
        
        join_room(room_id, sid=player1['sid'])
        join_room(room_id, sid=player2['sid'])
        
        p1_state = get_room_state_for_player(room, player1['sid'])
        p2_state = get_room_state_for_player(room, player2['sid'])
        
        emit('match_found', p1_state, room=player1['sid'])
        emit('match_found', p2_state, room=player2['sid'])


@socketio.on('cancel_match')
def handle_cancel_match():
    global match_queue
    match_queue = [p for p in match_queue if p['sid'] != request.sid]
    emit('match_cancelled')


@socketio.on('play_card')
def handle_play_card(data):
    room_id = data.get('roomId')
    card_id = data.get('cardId')
    
    room = game_rooms.get(room_id)
    if not room or room['game_over']:
        return
    
    if room['current_turn'] != request.sid:
        return
    
    player = room['players'][request.sid]
    
    card_index = None
    card = None
    for i, c in enumerate(player['hand']):
        if c['id'] == card_id:
            card_index = i
            card = c
            break
    
    if not card:
        return
    
    if player['energy'] < card['cost']:
        emit('error', {'message': '能量不足'})
        return
    
    player['energy'] -= card['cost']
    player['hand'].pop(card_index)
    
    result = process_card_effect(room, request.sid, card)
    
    opponent_sid = [s for s in room['players'] if s != request.sid][0]
    
    my_state = get_room_state_for_player(room, request.sid)
    opponent_state = get_room_state_for_player(room, opponent_sid)
    
    emit('card_played', {
        **result,
        'playerSid': request.sid,
        'gameState': my_state
    }, room=request.sid)
    
    emit('opponent_played_card', {
        **result,
        'playerSid': request.sid,
        'gameState': opponent_state
    }, room=opponent_sid)


@socketio.on('end_turn')
def handle_end_turn(data):
    room_id = data.get('roomId')
    
    room = game_rooms.get(room_id)
    if not room or room['game_over']:
        return
    
    if room['current_turn'] != request.sid:
        return
    
    drawn = switch_turn(room)
    
    next_sid = room['current_turn']
    
    my_state = get_room_state_for_player(room, request.sid)
    next_state = get_room_state_for_player(room, next_sid)
    
    emit('turn_ended', {'gameState': my_state}, room=request.sid)
    emit('turn_started', {'gameState': next_state, 'drawnCards': drawn}, room=next_sid)


if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=False)
