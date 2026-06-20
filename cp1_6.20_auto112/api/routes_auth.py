from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from .auth import hash_password, verify_password, generate_token, login_required
from .database import get_db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    name = (data.get('name') or '').strip()
    role = data.get('role') or 'customer'

    if not email or not password or not name:
        return jsonify({'error': '请填写所有必填项'}), 400
    if len(password) < 6:
        return jsonify({'error': '密码长度至少6位'}), 400
    if role not in ('designer', 'customer'):
        return jsonify({'error': '角色无效'}), 400

    pw_hash = hash_password(password)
    now = datetime.now(timezone.utc).isoformat()

    with get_db() as conn:
        existing = conn.execute("SELECT id FROM users WHERE email = ?", (email,)).fetchone()
        if existing:
            return jsonify({'error': '该邮箱已被注册'}), 409
        cur = conn.execute(
            "INSERT INTO users (email, password_hash, name, role, created_at) VALUES (?,?,?,?,?)",
            (email, pw_hash, name, role, now)
        )
        user_id = cur.lastrowid
        user = conn.execute(
            "SELECT id, email, name, role, created_at FROM users WHERE id = ?",
            (user_id,)
        ).fetchone()

    user_dict = dict(user)
    token = generate_token(user_dict['id'], user_dict['role'])
    return jsonify({'token': token, 'user': user_dict}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    if not email or not password:
        return jsonify({'error': '请输入邮箱和密码'}), 400

    with get_db() as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        if not row:
            return jsonify({'error': '邮箱或密码错误'}), 401
        if not verify_password(password, row['password_hash']):
            return jsonify({'error': '邮箱或密码错误'}), 401

    user_dict = {
        'id': row['id'],
        'email': row['email'],
        'name': row['name'],
        'role': row['role'],
        'createdAt': row['created_at']
    }
    token = generate_token(user_dict['id'], user_dict['role'])
    return jsonify({'token': token, 'user': user_dict})

@auth_bp.route('/me', methods=['GET'])
@login_required
def me():
    user = dict(g.current_user)
    user['createdAt'] = user.pop('created_at')
    return jsonify({'user': user})
