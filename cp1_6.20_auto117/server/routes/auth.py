import jwt
import functools
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, current_app
from models import db, User
from utils import generate_id, hash_password, verify_password

auth_bp = Blueprint('auth', __name__)


def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),
    }
    return jwt.encode(payload, current_app.config['SECRET_KEY'], algorithm='HS256')


def decode_token(token):
    try:
        payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


def login_required(f):
    @functools.wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': '未提供认证令牌'}), 401
        user_id = decode_token(token)
        if not user_id:
            return jsonify({'error': '认证令牌无效或已过期'}), 401
        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': '用户不存在'}), 401
        request.current_user = user
        return f(*args, **kwargs)
    return decorated


@auth_bp.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    phone = data.get('phone', '').strip()
    password = data.get('password', '').strip()
    nickname = data.get('nickname', '').strip()

    if not phone or not password or not nickname:
        return jsonify({'error': '手机号、密码和昵称不能为空'}), 400

    if User.query.filter_by(phone=phone).first():
        return jsonify({'error': '该手机号已注册'}), 400

    user = User(
        id=generate_id(),
        phone=phone,
        password_hash=hash_password(password),
        nickname=nickname,
    )
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id)
    return jsonify({'user': user.to_dict(), 'token': token}), 201


@auth_bp.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json() or {}
    phone = data.get('phone', '').strip()
    password = data.get('password', '').strip()

    if not phone or not password:
        return jsonify({'error': '手机号和密码不能为空'}), 400

    user = User.query.filter_by(phone=phone).first()
    if not user or not verify_password(user.password_hash, password):
        return jsonify({'error': '手机号或密码错误'}), 401

    token = generate_token(user.id)
    return jsonify({'user': user.to_dict(), 'token': token})


@auth_bp.route('/api/user/profile', methods=['GET'])
@login_required
def get_profile():
    return jsonify(request.current_user.to_dict())


@auth_bp.route('/api/user/profile', methods=['PUT'])
@login_required
def update_profile():
    user = request.current_user
    data = request.get_json() or {}
    if 'nickname' in data:
        user.nickname = data['nickname']
    if 'avatar' in data:
        user.avatar = data['avatar']
    if 'phone' in data:
        existing = User.query.filter(User.phone == data['phone'], User.id != user.id).first()
        if existing:
            return jsonify({'error': '该手机号已被其他用户使用'}), 400
        user.phone = data['phone']
    db.session.commit()
    return jsonify(user.to_dict())
