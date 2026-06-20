from flask import Blueprint, request, jsonify
from models import get_db, deduct_points, add_points, record_transaction

points_bp = Blueprint('points', __name__)

@points_bp.route('/<int:user_id>', methods=['GET'])
def get_user_points(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT points FROM users WHERE id = ?', (user_id,))
    user = cursor.fetchone()
    conn.close()

    if not user:
        return jsonify({'error': '用户不存在'}), 404

    return jsonify({'user_id': user_id, 'points': user['points']})

@points_bp.route('/<int:user_id>/history', methods=['GET'])
def get_transaction_history(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('''
        SELECT t.*,
               fu.username as from_username,
               fu.avatar as from_avatar,
               tu.username as to_username,
               tu.avatar as to_avatar
        FROM transactions t
        JOIN users fu ON t.from_user_id = fu.id
        JOIN users tu ON t.to_user_id = tu.id
        WHERE t.from_user_id = ? OR t.to_user_id = ?
        ORDER BY t.created_at DESC
        LIMIT 20
    ''', (user_id, user_id))
    transactions = cursor.fetchall()
    conn.close()

    return jsonify([{
        'id': t['id'],
        'from_user_id': t['from_user_id'],
        'from_username': t['from_username'],
        'from_avatar': t['from_avatar'],
        'to_user_id': t['to_user_id'],
        'to_username': t['to_username'],
        'to_avatar': t['to_avatar'],
        'amount': t['amount'],
        'type': t['type'],
        'plot_id': t['plot_id'],
        'created_at': t['created_at']
    } for t in transactions])

@points_bp.route('/transfer', methods=['POST'])
def transfer_points():
    data = request.get_json()
    from_user_id = data.get('from_user_id')
    to_user_id = data.get('to_user_id')
    amount = data.get('amount', 0)
    trans_type = data.get('type', 'transfer')

    if not from_user_id or not to_user_id:
        return jsonify({'error': '缺少用户信息'}), 400

    if not deduct_points(from_user_id, amount):
        return jsonify({'error': '积分不足'}), 400

    add_points(to_user_id, amount)
    record_transaction(from_user_id, to_user_id, amount, trans_type)

    conn = get_db()
    cursor = conn.cursor()
    cursor.execute('SELECT points FROM users WHERE id = ?', (from_user_id,))
    from_user = cursor.fetchone()
    cursor.execute('SELECT points FROM users WHERE id = ?', (to_user_id,))
    to_user = cursor.fetchone()
    conn.close()

    return jsonify({
        'message': '转账成功',
        'from_user_points': from_user['points'],
        'to_user_points': to_user['points']
    })

@points_bp.route('/like', methods=['POST'])
def like_diary():
    data = request.get_json()
    diary_id = data.get('diary_id')
    from_user_id = data.get('user_id', 1)

    if not diary_id:
        return jsonify({'error': '缺少日记ID'}), 400

    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('SELECT user_id, likes FROM diaries WHERE id = ?', (diary_id,))
    diary = cursor.fetchone()

    if not diary:
        conn.close()
        return jsonify({'error': '日记不存在'}), 404

    to_user_id = diary['user_id']

    if from_user_id == to_user_id:
        cursor.execute('UPDATE diaries SET likes = likes + 1 WHERE id = ?', (diary_id,))
        conn.commit()
        cursor.execute('SELECT points FROM users WHERE id = ?', (from_user_id,))
        user_points = cursor.fetchone()
        conn.close()
        return jsonify({
            'message': '点赞成功',
            'likes': diary['likes'] + 1,
            'user_points': user_points['points']
        })

    if not deduct_points(from_user_id, 1):
        conn.close()
        return jsonify({'error': '积分不足'}), 400

    add_points(to_user_id, 1)
    record_transaction(from_user_id, to_user_id, 1, 'like', None)

    cursor.execute('UPDATE diaries SET likes = likes + 1 WHERE id = ?', (diary_id,))
    conn.commit()

    cursor.execute('SELECT points FROM users WHERE id = ?', (from_user_id,))
    from_user_points = cursor.fetchone()

    conn.close()

    return jsonify({
        'message': '点赞成功',
        'likes': diary['likes'] + 1,
        'user_points': from_user_points['points']
    })
