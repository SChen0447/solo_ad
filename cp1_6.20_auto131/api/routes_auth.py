import hashlib
import jwt
from functools import wraps
from flask import Blueprint, request, jsonify
from models import create_user, get_user_by_email, get_user_by_id, update_user_musician

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

SECRET_KEY = "indiewave-secret-2024"


def hash_password(password):
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def generate_token(user_id):
    payload = {"user_id": user_id}
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = auth_header.split(" ", 1)[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            user = get_user_by_id(payload["user_id"])
            if not user:
                return jsonify({"error": "User not found"}), 401
            request.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "Token expired"}), 401
        except jwt.InvalidTokenError:
            return jsonify({"error": "Invalid token"}), 401
        return f(*args, **kwargs)
    return decorated


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username")
    email = data.get("email")
    password = data.get("password")

    if not username or not email or not password:
        return jsonify({"error": "username, email, and password are required"}), 400

    existing = get_user_by_email(email)
    if existing:
        return jsonify({"error": "Email already registered"}), 409

    password_hash = hash_password(password)
    user_id = create_user(username, email, password_hash)
    token = generate_token(user_id)

    return jsonify({
        "message": "Registration successful",
        "token": token,
        "user": {"id": user_id, "username": username, "email": email, "is_musician": 0},
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "email and password are required"}), 400

    user = get_user_by_email(email)
    if not user or user["password_hash"] != hash_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    token = generate_token(user["id"])

    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "is_musician": user["is_musician"],
        },
    }), 200


@auth_bp.route("/become-musician", methods=["POST"])
@token_required
def become_musician():
    user = request.current_user
    if user["is_musician"]:
        return jsonify({"message": "Already a musician"}), 200

    update_user_musician(user["id"])
    return jsonify({
        "message": "Upgraded to musician successfully",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "email": user["email"],
            "is_musician": 1,
        },
    }), 200
