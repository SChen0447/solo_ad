import os
import json
import random
import time
from datetime import datetime
from typing import Dict, List, Optional, Any
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

from word_library import WordLibrary, THEME_LIBRARY, PLAYER_COLORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", ping_timeout=120, ping_interval=25, async_mode='threading')

word_library = WordLibrary()

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
HISTORY_DIR = os.path.join(DATA_DIR, 'history')
os.makedirs(HISTORY_DIR, exist_ok=True)

PLAYER_COLORS_LIST = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#FF8C42', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E9', '#F1948A',
]

THEME_PALETTES: Dict[str, List[str]] = {
    'fantasy': ['#FFF8E7', '#FFE4B5', '#FFDAB9', '#FFEFD5', '#FFF0DB', '#FFFAF0', '#FDF5E6', '#FFEBCD'],
    'scifi': ['#FFF8E7', '#E0F7FA', '#B2EBF2', '#E0F2F1', '#E8F5E9', '#F1F8E9', '#FFFDE7', '#FFF8E1'],
    'mythology': ['#FFF8E7', '#F3E5F5', '#EDE7F6', '#E8EAF6', '#E3F2FD', '#E1F5FE', '#FCE4EC', '#FFF3E0'],
    'kitchen': ['#FFF8E7', '#FFF3E0', '#FFE0B2', '#FFCC80', '#FFE082', '#FFF59D', '#F0F4C3', '#DCEDC8'],
    'animals': ['#FFF8E7', '#E8F5E9', '#C8E6C9', '#DCEDC8', '#F0F4C3', '#FFF9C4', '#FFECB3', '#FFE0B2'],
    'superhero': ['#FFF8E7', '#FCE4EC', '#F8BBD0', '#E1BEE7', '#D1C4E9', '#C5CAE9', '#BBDEFB', '#B3E5FC'],
    'custom': ['#FFF8E7', '#F5F5F5', '#EEEEEE', '#E0E0E0', '#BDBDBD', '#9E9E9E', '#757575', '#616161'],
}

TOTAL_ROUNDS = 8
ROUND_DURATION = 60

rooms: Dict[str, Dict[str, Any]] = {}
game_states: Dict[str, Dict[str, Any]] = {}


def generate_room_id() -> str:
    existing = set(rooms.keys())
    while True:
        rid = ''.join(str(random.randint(0, 9)) for _ in range(6))
        if rid not in existing:
            return rid


def generate_player_id() -> str:
    return f'p{int(time.time() * 1000)}_{random.randint(1000, 9999)}'


def get_available_color(room_id: str) -> str:
    used = {p['color'] for p in rooms.get(room_id, {}).get('players', [])}
    for c in PLAYER_COLORS_LIST:
        if c not in used:
            return c
    return random.choice(PLAYER_COLORS_LIST)


def serialize_player(p: Dict) -> Dict:
    return {
        'id': p['id'],
        'nickname': p['nickname'],
        'color': p['color'],
        'score': p['score'],
        'isHost': p.get('isHost', False),
    }


def serialize_all_players(room_id: str) -> List[Dict]:
    return [serialize_player(p) for p in rooms[room_id]['players']]


def broadcast_players(room_id: str):
    socketio.emit('player:joined', serialize_all_players(room_id), room=room_id)


def get_player_by_id(room_id: str, player_id: str) -> Optional[Dict]:
    for p in rooms[room_id]['players']:
        if p['id'] == player_id:
            return p
    return None


def find_funniest_answer(rounds: List[Dict], players: List[Dict]) -> Optional[Dict]:
    if not rounds:
        return None

    candidates_rule1 = []
    candidates_rule2 = []

    for r in rounds:
        keyword = r['keyword']
        answers = r['answers']

        for a in answers:
            if a.get('correct') and a['answer'] and keyword:
                answer_lower = a['answer'].lower()
                keyword_lower = keyword.lower()
                if answer_lower != keyword_lower and keyword_lower not in answer_lower and answer_lower not in keyword_lower:
                    max_len = max(len(answer_lower), len(keyword_lower))
                    common = sum(1 for c in keyword_lower if c in answer_lower)
                    if max_len > 0 and common / max_len < 0.3:
                        candidates_rule1.append({
                            'playerId': a['playerId'],
                            'nickname': a['nickname'],
                            'answer': a['answer'],
                            'keyword': keyword,
                            'reason': '猜的答案与关键词完全无关但被出题者选为正确',
                            'score': 100 - int((common / max_len) * 100),
                        })

        if len(answers) >= 3:
            unique_answers = set(a['answer'] for a in answers if a['answer'])
            if len(unique_answers) >= len(answers) * 0.8:
                for a in answers:
                    if a['answer']:
                        candidates_rule2.append({
                            'playerId': a['playerId'],
                            'nickname': a['nickname'],
                            'answer': a['answer'],
                            'keyword': keyword,
                            'reason': '多人猜了完全不同的词，这局思维碰撞最精彩',
                            'score': len(unique_answers) * 10,
                        })

    rule = random.choice([1, 2])
    pool = candidates_rule1 if rule == 1 else candidates_rule2
    if not pool:
        pool = candidates_rule1 or candidates_rule2
    if not pool:
        return None

    pool.sort(key=lambda x: x['score'], reverse=True)
    selected = pool[0]
    return {
        'playerId': selected['playerId'],
        'nickname': selected['nickname'],
        'answer': selected['answer'],
        'keyword': selected['keyword'],
        'reason': selected['reason'],
    }


def save_game_history(room_id: str, game_result: Dict):
    history_path = os.path.join(HISTORY_DIR, f'{room_id}.json')
    with open(history_path, 'w', encoding='utf-8') as f:
        json.dump(game_result, f, ensure_ascii=False, indent=2)


@socketio.on('connect')
def handle_connect():
    print(f'Client connected: {request.sid}')


@socketio.on('disconnect')
def handle_disconnect():
    player_id = request.sid
    for room_id in list(rooms.keys()):
        room = rooms[room_id]
        player = get_player_by_id(room_id, player_id)
        if player:
            room['players'] = [p for p in room['players'] if p['id'] != player_id]
            broadcast_players(room_id)
            if not room['players']:
                word_library.clear_room(room_id)
                if room_id in game_states:
                    del game_states[room_id]
                del rooms[room_id]
            elif room.get('hostId') == player_id and room['players']:
                room['hostId'] = room['players'][0]['id']
                room['players'][0]['isHost'] = True
                broadcast_players(room_id)
            break
    print(f'Client disconnected: {player_id}')


@socketio.on('room:create')
def handle_create_room(data):
    nickname = data.get('nickname', '').strip()
    theme = data.get('theme', 'fantasy')
    custom_words = data.get('customThemeWords') or []

    if not nickname:
        emit('room:error', {'message': '昵称不能为空'})
        return

    room_id = generate_room_id()
    player_id = request.sid
    color = get_available_color(room_id)

    player = {
        'id': player_id,
        'nickname': nickname,
        'color': color,
        'score': 0,
        'isHost': True,
    }

    rooms[room_id] = {
        'id': room_id,
        'theme': theme,
        'hostId': player_id,
        'players': [player],
        'status': 'waiting',
        'customWords': custom_words,
        'createdAt': time.time(),
    }

    join_room(room_id)
    emit('room:created', {
        'roomId': room_id,
        'player': serialize_player(player),
        'players': serialize_all_players(room_id),
    })


@socketio.on('room:join')
def handle_join_room(data):
    room_id = data.get('roomId', '').strip()
    nickname = data.get('nickname', '').strip()

    if not nickname:
        emit('room:error', {'message': '昵称不能为空'})
        return

    if room_id not in rooms:
        emit('room:error', {'message': '房间不存在'})
        return

    room = rooms[room_id]
    if room['status'] != 'waiting':
        emit('room:error', {'message': '游戏已开始，无法加入'})
        return

    if len(room['players']) >= 10:
        emit('room:error', {'message': '房间人数已满（最多10人）'})
        return

    for p in room['players']:
        if p['nickname'].lower() == nickname.lower():
            emit('room:error', {'message': '该昵称已在房间中使用'})
            return

    player_id = request.sid
    color = get_available_color(room_id)
    player = {
        'id': player_id,
        'nickname': nickname,
        'color': color,
        'score': 0,
        'isHost': False,
    }

    room['players'].append(player)
    join_room(room_id)

    emit('room:joined', {
        'roomId': room_id,
        'player': serialize_player(player),
        'players': serialize_all_players(room_id),
        'theme': room['theme'],
    })
    broadcast_players(room_id)


@socketio.on('game:start')
def handle_game_start(data):
    room_id = data.get('roomId')
    if room_id not in rooms:
        return

    room = rooms[room_id]
    player_id = request.sid
    if room['hostId'] != player_id:
        return

    if len(room['players']) < 3:
        return

    room['status'] = 'playing'
    random.shuffle(room['players'])

    for p in room['players']:
        p['score'] = 0

    describer_index = 0
    game_states[room_id] = {
        'round': 0,
        'totalRounds': TOTAL_ROUNDS,
        'describerIndex': describer_index,
        'phase': 'describing',
        'keyword': '',
        'forbiddenWords': [],
        'answers': [],
        'rounds': [],
        'startedAt': time.time(),
    }

    socketio.emit('game:started', {
        'players': serialize_all_players(room_id),
    }, room=room_id)

    socketio.sleep(0.8)
    start_new_round(room_id)


def start_new_round(room_id: str):
    if room_id not in rooms or room_id not in game_states:
        return

    room = rooms[room_id]
    gs = game_states[room_id]

    if gs['round'] >= gs['totalRounds']:
        end_game(room_id)
        return

    if gs['describerIndex'] >= len(room['players']):
        gs['describerIndex'] = 0

    gs['round'] += 1
    theme = room['theme']
    custom_words = room.get('customWords', [])

    if theme == 'custom' and custom_words:
        used = gs.get('usedKeywords', set())
        available = [w for w in custom_words if w not in used]
        if not available:
            used.clear()
            available = custom_words
        keyword = random.choice(available)
        used.add(keyword)
        gs['usedKeywords'] = used
        keyword, forbidden = word_library.generate_custom_card(keyword)
    else:
        keyword, forbidden = word_library.get_random_card(theme, room_id)

    gs['keyword'] = keyword
    gs['forbiddenWords'] = forbidden
    gs['answers'] = []
    gs['phase'] = 'answering'

    describer = room['players'][gs['describerIndex']]
    palette = THEME_PALETTES.get(theme, THEME_PALETTES['fantasy'])

    round_data = {
        'round': gs['round'],
        'totalRounds': gs['totalRounds'],
        'describerId': describer['id'],
        'describerNickname': describer['nickname'],
        'keyword': keyword,
        'forbiddenWords': forbidden,
        'duration': ROUND_DURATION,
        'palette': palette,
        'serverTimestamp': time.time() * 1000,
    }

    socketio.emit('round:start', round_data, room=room_id)

    gs['roundStartTime'] = time.time()
    gs['timeoutId'] = socketio.start_background_task(countdown_task, room_id)


def countdown_task(room_id: str):
    socketio.sleep(ROUND_DURATION + 0.5)
    if room_id in game_states and game_states[room_id]['phase'] == 'answering':
        end_round_answering(room_id)


def end_round_answering(room_id: str):
    if room_id not in game_states:
        return

    gs = game_states[room_id]
    if gs['phase'] != 'answering':
        return

    gs['phase'] = 'revealing'

    answers = []
    room = rooms[room_id]
    describer = room['players'][gs['describerIndex']]
    for a in gs['answers']:
        player = get_player_by_id(room_id, a['playerId'])
        if player:
            answers.append({
                'playerId': a['playerId'],
                'nickname': player['nickname'],
                'answer': a['answer'],
                'correct': None,
            })

    for p in room['players']:
        if p['id'] != describer['id']:
            found = False
            for a in answers:
                if a['playerId'] == p['id']:
                    found = True
                    break
            if not found:
                answers.append({
                    'playerId': p['id'],
                    'nickname': p['nickname'],
                    'answer': '(未作答)',
                    'correct': False,
                })

    random.shuffle(answers)
    gs['answers'] = answers

    socketio.emit('round:ended', answers, room=room_id)


@socketio.on('countdown:skip')
def handle_skip_countdown(data):
    room_id = data.get('roomId')
    if room_id not in game_states:
        return
    gs = game_states[room_id]
    room = rooms[room_id]
    describer = room['players'][gs['describerIndex']]
    if request.sid != describer['id']:
        return
    if gs['phase'] != 'answering':
        return
    end_round_answering(room_id)


@socketio.on('answer:submit')
def handle_answer_submit(data):
    room_id = data.get('roomId')
    answer = data.get('answer', '').strip()

    if room_id not in game_states or not answer:
        return

    gs = game_states[room_id]
    if gs['phase'] != 'answering':
        return

    player_id = request.sid
    room = rooms[room_id]
    describer = room['players'][gs['describerIndex']]
    if player_id == describer['id']:
        return

    for a in gs['answers']:
        if a['playerId'] == player_id:
            return

    gs['answers'].append({
        'playerId': player_id,
        'answer': answer,
        'submittedAt': time.time(),
    })

    non_describers = [p for p in room['players'] if p['id'] != describer['id']]
    if len(gs['answers']) >= len(non_describers):
        socketio.sleep(0.2)
        end_round_answering(room_id)


@socketio.on('answer:judge')
def handle_answer_judge(data):
    room_id = data.get('roomId')
    answer_index = data.get('answerIndex')
    correct = data.get('correct')

    if room_id not in game_states:
        return

    gs = game_states[room_id]
    room = rooms[room_id]
    describer = room['players'][gs['describerIndex']]

    if request.sid != describer['id']:
        return
    if gs['phase'] != 'revealing':
        return
    if answer_index < 0 or answer_index >= len(gs['answers']):
        return
    if gs['answers'][answer_index]['correct'] is not None:
        return

    gs['answers'][answer_index]['correct'] = correct

    socketio.emit('answer:revealed', {
        'answerIndex': answer_index,
        'correct': correct,
    }, room=room_id)

    if all(a['correct'] is not None for a in gs['answers']):
        socketio.sleep(0.5)
        process_round_result(room_id)


def process_round_result(room_id: str):
    if room_id not in game_states:
        return

    gs = game_states[room_id]
    room = rooms[room_id]
    describer = room['players'][gs['describerIndex']]

    correct_guessers = []
    for a in gs['answers']:
        if a['correct']:
            p = get_player_by_id(room_id, a['playerId'])
            if p:
                p['score'] += 1
                correct_guessers.append(p['nickname'])
                socketio.emit('score:update', {
                    'players': serialize_all_players(room_id),
                    'changedPlayerId': p['id'],
                }, room=room_id)
                socketio.sleep(0.15)

    if correct_guessers:
        describer['score'] += 1
        socketio.emit('score:update', {
            'players': serialize_all_players(room_id),
            'changedPlayerId': describer['id'],
        }, room=room_id)

    round_result = {
        'round': gs['round'],
        'keyword': gs['keyword'],
        'forbiddenWords': gs['forbiddenWords'],
        'describerId': describer['id'],
        'describerNickname': describer['nickname'],
        'answers': list(gs['answers']),
        'correctGuessers': correct_guessers,
    }

    gs['rounds'].append(round_result)
    socketio.emit('round:result', round_result, room=room_id)

    gs['describerIndex'] += 1

    socketio.sleep(2.0)
    start_new_round(room_id)


def end_game(room_id: str):
    if room_id not in rooms or room_id not in game_states:
        return

    room = rooms[room_id]
    gs = game_states[room_id]

    final_players = serialize_all_players(room_id)
    final_players_sorted = sorted(final_players, key=lambda p: p['score'], reverse=True)

    funniest = find_funniest_answer(gs['rounds'], room['players'])

    final_result = {
        'roomId': room_id,
        'theme': room['theme'],
        'players': final_players_sorted,
        'rounds': gs['rounds'],
        'funniestAnswer': funniest,
    }

    history_data = {
        'roomId': room_id,
        'theme': room['theme'],
        'players': final_players_sorted,
        'rounds': gs['rounds'],
        'funniestAnswer': funniest,
        'finishedAt': datetime.now().isoformat(),
    }
    save_game_history(room_id, history_data)

    socketio.emit('game:ended', final_result, room=room_id)

    word_library.clear_room(room_id)


@app.route('/api/history/<room_id>', methods=['GET'])
def get_history(room_id):
    history_path = os.path.join(HISTORY_DIR, f'{room_id}.json')
    if not os.path.exists(history_path):
        return jsonify({'error': '历史记录不存在'}), 404
    with open(history_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return jsonify(data)


@app.route('/api/themes', methods=['GET'])
def get_themes():
    themes = []
    for tid, cards in THEME_LIBRARY.items():
        themes.append({
            'id': tid,
            'cardCount': len(cards),
        })
    return jsonify(themes)


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'activeRooms': len(rooms),
        'activeGames': len(game_states),
    })


if __name__ == '__main__':
    print('🎮 猜词同乐桌游后端启动')
    print(f'   房间数: {len(rooms)}')
    print(f'   词库: {len(THEME_LIBRARY)} 个主题')
    for theme, cards in THEME_LIBRARY.items():
        print(f'     - {theme}: {len(cards)} 张词卡')
    socketio.run(app, host='0.0.0.0', port=5000, debug=False, allow_unsafe_werkzeug=True)
