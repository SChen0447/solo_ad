import json
import sqlite3
import os
from flask import Blueprint, request, jsonify

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'story.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

world_bp = Blueprint('world', __name__)

@world_bp.route('/worlds', methods=['POST'])
def create_world():
    data = request.get_json()
    name = data.get('name', '')
    description = data.get('description', '')
    characters = json.dumps(data.get('characters', []))
    chapters = json.dumps(data.get('chapters', []))

    if len(name) < 2 or len(name) > 20:
        return jsonify({'error': '名称长度需在2-20字符之间'}), 400
    if len(description) < 50:
        return jsonify({'error': '背景描述不低于50字符'}), 400
    if len(data.get('characters', [])) < 2:
        return jsonify({'error': '角色至少需要2人'}), 400
    if len(data.get('chapters', [])) < 3:
        return jsonify({'error': '章节至少需要3章'}), 400

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'INSERT INTO worlds (name, description, characters, chapters) VALUES (?, ?, ?, ?)',
        (name, description, characters, chapters)
    )
    world_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({'id': world_id, 'message': '创建成功'}), 201

@world_bp.route('/worlds/<int:world_id>', methods=['GET'])
def get_world(world_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM worlds WHERE id = ?', (world_id,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        return jsonify({'error': '世界观不存在'}), 404

    return jsonify({
        'id': row['id'],
        'name': row['name'],
        'description': row['description'],
        'characters': json.loads(row['characters']),
        'chapters': json.loads(row['chapters'])
    })

@world_bp.route('/worlds', methods=['GET'])
def list_worlds():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT * FROM worlds ORDER BY id DESC')
    rows = cursor.fetchall()
    conn.close()

    worlds = []
    for row in rows:
        worlds.append({
            'id': row['id'],
            'name': row['name'],
            'description': row['description'],
            'characters': json.loads(row['characters']),
            'chapters': json.loads(row['chapters'])
        })

    return jsonify(worlds)

@world_bp.route('/worlds/<int:world_id>', methods=['PUT'])
def update_world(world_id):
    data = request.get_json()
    characters = json.dumps(data.get('characters', []))
    chapters = json.dumps(data.get('chapters', []))

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'UPDATE worlds SET characters = ?, chapters = ? WHERE id = ?',
        (characters, chapters, world_id)
    )
    conn.commit()
    conn.close()

    return jsonify({'message': '更新成功'})
