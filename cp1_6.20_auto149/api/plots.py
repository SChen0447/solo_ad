from flask import Blueprint, request, jsonify
from datetime import datetime
from models import get_db, deduct_points, add_points, record_transaction

plots_bp = Blueprint('plots', __name__)

@plots_bp.route('', methods=['GET'])
def get_plots():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT p.*, u.username, u.avatar
        FROM plots p
        LEFT JOIN users u ON p.user_id = u.id
        ORDER BY p.grid_y, p.grid_x
    ''')
    plots = cursor.fetchall()
    conn.close()
    return jsonify([{
        'id': p['id'],
        'grid_x': p['grid_x'],
        'grid_y': p['grid_y'],
        'user_id': p['user_id'],
        'username': p['username'],
        'avatar': p['avatar'],
        'water_level': p['water_level'],
        'fertilizer_level': p['fertilizer_level'],
        'claimed_at': p['claimed_at']
    } for p in plots])

@plots_bp.route('/<int:plot_id>/claim', methods=['POST'])
def claim_plot(plot_id):
    data = request.get_json()
    user_id = data.get('user_id', 1)

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM plots WHERE id = ?', (plot_id,))
    plot = cursor.fetchone()

    if not plot:
        conn.close()
        return jsonify({'error': '地块不存在'}), 404

    if plot['user_id'] is not None:
        conn.close()
        return jsonify({'error': '该地块已被认领'}), 400

    cursor.execute('''
        UPDATE plots
        SET user_id = ?, claimed_at = ?
        WHERE id = ?
    ''', (user_id, datetime.now(), plot_id))

    conn.commit()

    cursor.execute('''
        SELECT p.*, u.username, u.avatar
        FROM plots p
        LEFT JOIN users u ON p.user_id = u.id
        WHERE p.id = ?
    ''', (plot_id,))
    updated_plot = cursor.fetchone()

    cursor.execute('SELECT points FROM users WHERE id = ?', (user_id,))
    user_points = cursor.fetchone()

    conn.close()

    return jsonify({
        'message': '认领成功',
        'plot': {
            'id': updated_plot['id'],
            'grid_x': updated_plot['grid_x'],
            'grid_y': updated_plot['grid_y'],
            'user_id': updated_plot['user_id'],
            'username': updated_plot['username'],
            'avatar': updated_plot['avatar'],
            'water_level': updated_plot['water_level'],
            'fertilizer_level': updated_plot['fertilizer_level'],
            'claimed_at': updated_plot['claimed_at']
        },
        'points': user_points['points']
    })

@plots_bp.route('/<int:plot_id>/water', methods=['POST'])
def water_plot(plot_id):
    data = request.get_json()
    from_user_id = data.get('user_id', 1)

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM plots WHERE id = ?', (plot_id,))
    plot = cursor.fetchone()

    if not plot:
        conn.close()
        return jsonify({'error': '地块不存在'}), 404

    if plot['user_id'] is None:
        conn.close()
        return jsonify({'error': '该地块尚未被认领'}), 400

    to_user_id = plot['user_id']

    if not deduct_points(from_user_id, 5):
        conn.close()
        return jsonify({'error': '积分不足'}), 400

    add_points(to_user_id, 3)
    record_transaction(from_user_id, to_user_id, 3, 'water', plot_id)

    new_water_level = min(100, plot['water_level'] + 20)
    cursor.execute('UPDATE plots SET water_level = ? WHERE id = ?', (new_water_level, plot_id))
    conn.commit()

    cursor.execute('SELECT points FROM users WHERE id = ?', (from_user_id,))
    from_user_points = cursor.fetchone()

    cursor.execute('SELECT points FROM users WHERE id = ?', (to_user_id,))
    to_user_points = cursor.fetchone()

    conn.close()

    return jsonify({
        'message': '浇水成功',
        'water_level': new_water_level,
        'from_user_points': from_user_points['points'],
        'to_user_points': to_user_points['points']
    })

@plots_bp.route('/<int:plot_id>/fertilize', methods=['POST'])
def fertilize_plot(plot_id):
    data = request.get_json()
    from_user_id = data.get('user_id', 1)

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT * FROM plots WHERE id = ?', (plot_id,))
    plot = cursor.fetchone()

    if not plot:
        conn.close()
        return jsonify({'error': '地块不存在'}), 404

    if plot['user_id'] is None:
        conn.close()
        return jsonify({'error': '该地块尚未被认领'}), 400

    to_user_id = plot['user_id']

    if not deduct_points(from_user_id, 5):
        conn.close()
        return jsonify({'error': '积分不足'}), 400

    add_points(to_user_id, 3)
    record_transaction(from_user_id, to_user_id, 3, 'fertilize', plot_id)

    new_fertilizer_level = min(100, plot['fertilizer_level'] + 20)
    cursor.execute('UPDATE plots SET fertilizer_level = ? WHERE id = ?', (new_fertilizer_level, plot_id))
    conn.commit()

    cursor.execute('SELECT points FROM users WHERE id = ?', (from_user_id,))
    from_user_points = cursor.fetchone()

    cursor.execute('SELECT points FROM users WHERE id = ?', (to_user_id,))
    to_user_points = cursor.fetchone()

    conn.close()

    return jsonify({
        'message': '施肥成功',
        'fertilizer_level': new_fertilizer_level,
        'from_user_points': from_user_points['points'],
        'to_user_points': to_user_points['points']
    })

@plots_bp.route('/<int:plot_id>/diary', methods=['POST'])
def add_diary(plot_id):
    data = request.get_json()
    user_id = data.get('user_id', 1)
    content = data.get('content', '')
    image_url = data.get('image_url', '')

    if not content:
        return jsonify({'error': '日记内容不能为空'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        INSERT INTO diaries (user_id, plot_id, content, image_url)
        VALUES (?, ?, ?, ?)
    ''', (user_id, plot_id, content, image_url))

    conn.commit()
    diary_id = cursor.lastrowid

    cursor.execute('''
        SELECT d.*, u.username, u.avatar
        FROM diaries d
        JOIN users u ON d.user_id = u.id
        WHERE d.id = ?
    ''', (diary_id,))
    diary = cursor.fetchone()

    conn.close()

    return jsonify({
        'id': diary['id'],
        'user_id': diary['user_id'],
        'plot_id': diary['plot_id'],
        'content': diary['content'],
        'image_url': diary['image_url'],
        'likes': diary['likes'],
        'created_at': diary['created_at'],
        'username': diary['username'],
        'avatar': diary['avatar']
    })

@plots_bp.route('/diaries', methods=['GET'])
def get_diaries():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 5))
    offset = (page - 1) * per_page

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT COUNT(*) as total FROM diaries')
    total = cursor.fetchone()['total']

    cursor.execute('''
        SELECT d.*, u.username, u.avatar
        FROM diaries d
        JOIN users u ON d.user_id = u.id
        ORDER BY d.created_at DESC
        LIMIT ? OFFSET ?
    ''', (per_page, offset))

    diaries = cursor.fetchall()
    conn.close()

    return jsonify({
        'diaries': [{
            'id': d['id'],
            'user_id': d['user_id'],
            'plot_id': d['plot_id'],
            'content': d['content'],
            'image_url': d['image_url'],
            'likes': d['likes'],
            'created_at': d['created_at'],
            'username': d['username'],
            'avatar': d['avatar']
        } for d in diaries],
        'total': total,
        'page': page,
        'per_page': per_page,
        'has_more': offset + per_page < total
    })
