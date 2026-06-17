import random
import json
import sqlite3
import os
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'game.db')

ELEMENTS = ['fire', 'water', 'earth', 'wind']
ELEMENT_COLORS = {
    'fire': ['#FF4500', '#FF6347'],
    'water': ['#1E90FF', '#00BFFF'],
    'earth': ['#8B4513', '#D2691E'],
    'wind': ['#32CD32', '#00FA9A'],
}
RESOURCE_TYPES = ['wood', 'ore', 'crystal']
FUSION_TOTEMS = {
    'fire+water': 'steam',
    'fire+earth': 'lava',
    'fire+wind': 'smoke',
    'water+earth': 'mud',
    'water+wind': 'mist',
    'earth+wind': 'sand',
}

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS saves (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slot INTEGER UNIQUE NOT NULL,
            player_pos TEXT NOT NULL,
            totems TEXT NOT NULL,
            resources TEXT NOT NULL,
            cleared_rooms TEXT NOT NULL,
            room_config TEXT NOT NULL,
            seed INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

def seeded_random(seed):
    return random.Random(seed)

def generate_room_config(seed):
    rng = seeded_random(seed)
    rooms = {}
    
    for row in range(3):
        for col in range(3):
            room_id = f"{row}_{col}"
            sequence_length = rng.randint(2, 4)
            totem_sequence = [rng.choice(ELEMENTS) for _ in range(sequence_length)]
            
            resource_positions = []
            used_positions = set()
            for _ in range(3):
                while True:
                    rx = rng.uniform(0.2, 0.8)
                    ry = rng.uniform(0.2, 0.8)
                    pos_key = (int(rx * 10), int(ry * 10))
                    if pos_key not in used_positions:
                        used_positions.add(pos_key)
                        break
                resource_type = rng.choice(RESOURCE_TYPES)
                resource_positions.append({
                    'id': f"{room_id}_res_{_}",
                    'type': resource_type,
                    'x': rx,
                    'y': ry,
                    'collected': False
                })
            
            clue_colors = [ELEMENT_COLORS[e][0] for e in totem_sequence]
            
            rooms[room_id] = {
                'id': room_id,
                'row': row,
                'col': col,
                'totem_sequence': totem_sequence,
                'clue_colors': clue_colors,
                'resources': resource_positions,
                'cleared': False,
                'door_open': False,
                'activation_slots': [None] * sequence_length,
                'activation_index': 0
            }
    
    return rooms

def verify_connectivity(rooms):
    start = '0_0'
    visited = set()
    stack = [start]
    
    while stack:
        current = stack.pop()
        if current in visited:
            continue
        visited.add(current)
        
        row, col = map(int, current.split('_'))
        neighbors = [
            (row - 1, col), (row + 1, col),
            (row, col - 1), (row, col + 1)
        ]
        
        for nr, nc in neighbors:
            if 0 <= nr < 3 and 0 <= nc < 3:
                neighbor_id = f"{nr}_{nc}"
                if neighbor_id not in visited:
                    stack.append(neighbor_id)
    
    return len(visited) == 9

def check_line_clear(rooms, line_type, index):
    if line_type == 'row':
        room_ids = [f"{index}_{c}" for c in range(3)]
    elif line_type == 'col':
        room_ids = [f"{r}_{index}" for r in range(3)]
    elif line_type == 'diag1':
        room_ids = [f"{i}_{i}" for i in range(3)]
    elif line_type == 'diag2':
        room_ids = [f"{i}_{2-i}" for i in range(3)]
    else:
        return False
    
    return all(rooms[rid]['cleared'] for rid in room_ids)

def get_line_rooms(line_type, index):
    if line_type == 'row':
        return [f"{index}_{c}" for c in range(3)]
    elif line_type == 'col':
        return [f"{r}_{index}" for r in range(3)]
    elif line_type == 'diag1':
        return [f"{i}_{i}" for i in range(3)]
    elif line_type == 'diag2':
        return [f"{i}_{2-i}" for i in range(3)]
    return []

@app.route('/api/rooms/seed', methods=['POST'])
def generate_seed_rooms():
    data = request.get_json() or {}
    seed = data.get('seed', random.randint(1, 999999))
    
    rooms = generate_room_config(seed)
    connected = verify_connectivity(rooms)
    
    attempts = 0
    while not connected and attempts < 100:
        seed = random.randint(1, 999999)
        rooms = generate_room_config(seed)
        connected = verify_connectivity(rooms)
        attempts += 1
    
    return jsonify({
        'seed': seed,
        'rooms': rooms,
        'connected': connected
    })

@app.route('/api/rooms', methods=['GET'])
def get_rooms():
    seed = random.randint(1, 999999)
    rooms = generate_room_config(seed)
    return jsonify({
        'seed': seed,
        'rooms': rooms
    })

@app.route('/api/totem/validate', methods=['POST'])
def validate_totem():
    data = request.get_json()
    room_id = data.get('room_id')
    totem_sequence = data.get('totem_sequence', [])
    correct_sequence = data.get('correct_sequence', [])
    
    is_correct = totem_sequence == correct_sequence
    
    return jsonify({
        'valid': is_correct,
        'room_id': room_id
    })

@app.route('/api/save', methods=['POST'])
def save_game():
    data = request.get_json()
    slot = data.get('slot', 1)
    
    conn = get_db()
    existing = conn.execute('SELECT id FROM saves WHERE slot = ?', (slot,)).fetchone()
    
    save_data = {
        'player_pos': json.dumps(data.get('player_pos', {'row': 0, 'col': 0})),
        'totems': json.dumps(data.get('totems', [])),
        'resources': json.dumps(data.get('resources', {'wood': 0, 'ore': 0, 'crystal': 0})),
        'cleared_rooms': json.dumps(data.get('cleared_rooms', [])),
        'room_config': json.dumps(data.get('room_config', {})),
        'seed': data.get('seed', 0)
    }
    
    if existing:
        conn.execute('''
            UPDATE saves 
            SET player_pos = ?, totems = ?, resources = ?, cleared_rooms = ?, 
                room_config = ?, seed = ?, updated_at = CURRENT_TIMESTAMP
            WHERE slot = ?
        ''', (
            save_data['player_pos'], save_data['totems'], save_data['resources'],
            save_data['cleared_rooms'], save_data['room_config'], save_data['seed'],
            slot
        ))
    else:
        conn.execute('''
            INSERT INTO saves (slot, player_pos, totems, resources, cleared_rooms, room_config, seed)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            slot, save_data['player_pos'], save_data['totems'], save_data['resources'],
            save_data['cleared_rooms'], save_data['room_config'], save_data['seed']
        ))
    
    conn.commit()
    conn.close()
    
    return jsonify({'success': True, 'slot': slot})

@app.route('/api/load', methods=['GET'])
def load_games():
    conn = get_db()
    saves = conn.execute('SELECT * FROM saves ORDER BY slot').fetchall()
    conn.close()
    
    result = []
    for save in saves:
        result.append({
            'id': save['id'],
            'slot': save['slot'],
            'player_pos': json.loads(save['player_pos']),
            'totems': json.loads(save['totems']),
            'resources': json.loads(save['resources']),
            'cleared_rooms': json.loads(save['cleared_rooms']),
            'room_config': json.loads(save['room_config']),
            'seed': save['seed'],
            'updated_at': save['updated_at']
        })
    
    return jsonify({'saves': result})

@app.route('/api/load/<int:slot>', methods=['GET'])
def load_game(slot):
    conn = get_db()
    save = conn.execute('SELECT * FROM saves WHERE slot = ?', (slot,)).fetchone()
    conn.close()
    
    if not save:
        return jsonify({'error': 'Save not found'}), 404
    
    result = {
        'id': save['id'],
        'slot': save['slot'],
        'player_pos': json.loads(save['player_pos']),
        'totems': json.loads(save['totems']),
        'resources': json.loads(save['resources']),
        'cleared_rooms': json.loads(save['cleared_rooms']),
        'room_config': json.loads(save['room_config']),
        'seed': save['seed'],
        'updated_at': save['updated_at']
    }
    
    return jsonify({'save': result})

@app.route('/api/lines/check', methods=['POST'])
def check_lines():
    data = request.get_json()
    rooms = data.get('rooms', {})
    
    cleared_lines = []
    
    for i in range(3):
        if check_line_clear(rooms, 'row', i):
            cleared_lines.append({'type': 'row', 'index': i, 'rooms': get_line_rooms('row', i)})
    
    for i in range(3):
        if check_line_clear(rooms, 'col', i):
            cleared_lines.append({'type': 'col', 'index': i, 'rooms': get_line_rooms('col', i)})
    
    if check_line_clear(rooms, 'diag1', 0):
        cleared_lines.append({'type': 'diag1', 'index': 0, 'rooms': get_line_rooms('diag1', 0)})
    
    if check_line_clear(rooms, 'diag2', 0):
        cleared_lines.append({'type': 'diag2', 'index': 0, 'rooms': get_line_rooms('diag2', 0)})
    
    return jsonify({'cleared_lines': cleared_lines})

@app.route('/api/fusion/generate', methods=['POST'])
def generate_fusion_totem():
    data = request.get_json()
    elements = data.get('elements', [])
    
    if len(elements) != 2:
        return jsonify({'error': 'Fusion requires exactly 2 elements'}), 400
    
    key1 = f"{elements[0]}+{elements[1]}"
    key2 = f"{elements[1]}+{elements[0]}"
    fusion_type = FUSION_TOTEMS.get(key1) or FUSION_TOTEMS.get(key2)
    
    if not fusion_type:
        return jsonify({'error': 'Invalid fusion combination'}), 400
    
    totem = {
        'id': f"fusion_{fusion_type}_{random.randint(1000, 9999)}",
        'type': fusion_type,
        'elements': sorted(elements),
        'level': 1,
        'exp': 0,
        'is_rare': True,
        'ability': 'activate_adjacent',
        'color': '#9932CC'
    }
    
    return jsonify({'totem': totem})

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
