import jwt
import hashlib
from functools import wraps
from datetime import datetime, timedelta, timezone
from flask import request, jsonify, g
from .config import Config
from .database import get_db

def hash_password(password: str) -> str:
    salt = 'custom_workshop_salt_2026'
    return 'pbkdf2_' + hashlib.pbkdf2_hmac(
        'sha256', password.encode('utf-8'), salt.encode('utf-8'), 100000
    ).hex()

def verify_password(password: str, stored_hash: str) -> bool:
    if stored_hash.startswith('pbkdf2_'):
        return hash_password(password) == stored_hash
    return stored_hash == f'pbkdf2_sha256$123456${password}'

def generate_token(user_id: int, role: str) -> str:
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRATION_HOURS),
        'iat': datetime.now(timezone.utc)
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm='HS256')

def decode_token(token: str) -> dict | None:
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=['HS256'])
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': '未授权访问'}), 401
        token = auth_header.split(' ', 1)[1]
        payload = decode_token(token)
        if not payload:
            return jsonify({'error': 'Token无效或已过期'}), 401
        with get_db() as conn:
            user = conn.execute(
                "SELECT id, email, name, role, created_at FROM users WHERE id = ?",
                (payload['user_id'],)
            ).fetchone()
            if not user:
                return jsonify({'error': '用户不存在'}), 401
            g.current_user = dict(user)
        return f(*args, **kwargs)
    return decorated

def role_required(*roles):
    def decorator(f):
        @wraps(f)
        @login_required
        def decorated(*args, **kwargs):
            user = getattr(g, 'current_user', None)
            if not user or user['role'] not in roles:
                return jsonify({'error': f'需要{",".join(roles)}角色权限'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator
