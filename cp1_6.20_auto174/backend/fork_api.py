import json
import sqlite3
import os
from datetime import datetime
from flask import Blueprint, request, jsonify

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, 'story.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

fork_bp = Blueprint('fork', __name__)

@fork_bp.route('/worlds/<int:world_id>/chapters', methods=['GET'])
def get_chapters(world_id):
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM worlds WHERE id = ?', (world_id,))
    world_row = cursor.fetchone()
    if not world_row:
        conn.close()
        return jsonify({'error': '世界观不存在'}), 404

    chapters = json.loads(world_row['chapters'])

    cursor.execute(
        'SELECT * FROM story_fork WHERE world_id = ? ORDER BY chapter_index, created_at',
        (world_id,)
    )
    fork_rows = cursor.fetchall()
    conn.close()

    forks_by_chapter = {}
    for fork in fork_rows:
        idx = fork['chapter_index']
        if idx not in forks_by_chapter:
            forks_by_chapter[idx] = []
        forks_by_chapter[idx].append({
            'id': fork['id'],
            'author': fork['author'],
            'content': fork['content'],
            'created_at': fork['created_at']
        })

    result = []
    for i, chapter in enumerate(chapters):
        forks = forks_by_chapter.get(i, [])
        is_completed = len(forks) > 0
        last_fork = forks[-1] if forks else None
        result.append({
            'index': i,
            'title': chapter['title'],
            'description': chapter['description'],
            'completed': is_completed,
            'author': last_fork['author'] if last_fork else None,
            'content': last_fork['content'] if last_fork else None,
            'created_at': last_fork['created_at'] if last_fork else None
        })

    return jsonify({
        'world': {
            'id': world_row['id'],
            'name': world_row['name'],
            'description': world_row['description'],
            'characters': json.loads(world_row['characters'])
        },
        'chapters': result
    })

@fork_bp.route('/worlds/<int:world_id>/chapters/<int:chapter_index>/fork', methods=['POST'])
def submit_fork(world_id, chapter_index):
    data = request.get_json()
    author = data.get('author', '匿名作者')
    content = data.get('content', '')

    if len(content) < 100 or len(content) > 2000:
        return jsonify({'error': '续写内容需在100-2000字之间'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM worlds WHERE id = ?', (world_id,))
    world_row = cursor.fetchone()
    if not world_row:
        conn.close()
        return jsonify({'error': '世界观不存在'}), 404

    chapters = json.loads(world_row['chapters'])
    if chapter_index < 0 or chapter_index >= len(chapters):
        conn.close()
        return jsonify({'error': '章节不存在'}), 404

    created_at = datetime.now().strftime('%Y-%m-%d %H:%M')

    cursor.execute(
        'INSERT INTO story_fork (world_id, chapter_index, author, content, created_at) VALUES (?, ?, ?, ?, ?)',
        (world_id, chapter_index, author, content, created_at)
    )
    fork_id = cursor.lastrowid
    conn.commit()
    conn.close()

    return jsonify({
        'id': fork_id,
        'message': '续写成功',
        'chapter_index': chapter_index,
        'author': author,
        'created_at': created_at
    }), 201

@fork_bp.route('/worlds/<int:world_id>/chapters/<int:chapter_index>/forks', methods=['GET'])
def get_forks(world_id, chapter_index):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        'SELECT * FROM story_fork WHERE world_id = ? AND chapter_index = ? ORDER BY created_at',
        (world_id, chapter_index)
    )
    rows = cursor.fetchall()
    conn.close()

    forks = []
    for row in rows:
        forks.append({
            'id': row['id'],
            'author': row['author'],
            'content': row['content'],
            'created_at': row['created_at']
        })

    return jsonify(forks)
