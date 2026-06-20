import uuid
import random
import time
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

USER_COLORS = [
    "#1a73e8",
    "#34a853",
    "#fbbc04",
    "#ea4335",
    "#9334e6",
    "#e91e63",
    "#00bcd4",
    "#ff9800",
]

rooms = {}
users = {}


def generate_room_id():
    return uuid.uuid4().hex[:8].upper()


def generate_user_id():
    return uuid.uuid4().hex


def get_random_color():
    return random.choice(USER_COLORS)


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()
    nickname = data.get("nickname", "").strip()

    if not nickname:
        return jsonify({"error": "Nickname is required"}), 400

    user_id = generate_user_id()
    color = get_random_color()
    token = uuid.uuid4().hex

    users[token] = {
        "id": user_id,
        "nickname": nickname,
        "avatar": color,
        "color": color,
        "token": token,
    }

    return jsonify(
        {
            "token": token,
            "user": {
                "id": user_id,
                "nickname": nickname,
                "avatar": color,
            },
        }
    )


@app.route("/api/rooms", methods=["POST"])
def create_room():
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized"}), 401

    token = auth_header[7:]
    if token not in users:
        return jsonify({"error": "Invalid token"}), 401

    data = request.get_json()
    room_name = data.get("roomName", "New Mind Map").strip()

    room_id = generate_room_id()

    rooms[room_id] = {
        "id": room_id,
        "name": room_name,
        "created_at": time.time(),
        "users": [],
        "mind_map_data": None,
        "cursors": {},
    }

    return jsonify(
        {
            "roomId": room_id,
            "roomName": room_name,
        }
    )


@app.route("/api/rooms/<room_id>/join", methods=["POST"])
def join_room_api(room_id):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized"}), 401

    token = auth_header[7:]
    if token not in users:
        return jsonify({"error": "Invalid token"}), 401

    if room_id not in rooms:
        return jsonify({"error": "Room not found"}), 404

    room = rooms[room_id]

    return jsonify(
        {
            "roomId": room_id,
            "roomName": room["name"],
        }
    )


@app.route("/api/rooms/<room_id>/users", methods=["GET"])
def get_room_users(room_id):
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return jsonify({"error": "Unauthorized"}), 401

    token = auth_header[7:]
    if token not in users:
        return jsonify({"error": "Invalid token"}), 401

    if room_id not in rooms:
        return jsonify({"error": "Room not found"}), 404

    room = rooms[room_id]
    user_list = []
    for token_key in room["users"]:
        if token_key in users:
            user = users[token_key]
            user_list.append(
                {
                    "id": user["id"],
                    "nickname": user["nickname"],
                    "avatar": user["avatar"],
                    "color": user["color"],
                }
            )

    return jsonify(user_list)


@socketio.on("connect")
def handle_connect():
    token = request.args.get("token", "")
    room_id = request.args.get("roomId", "")

    if token not in users or room_id not in rooms:
        return False

    user = users[token]
    room = rooms[room_id]

    if token not in room["users"]:
        room["users"].append(token)

    join_room(room_id)

    user_info = {
        "id": user["id"],
        "nickname": user["nickname"],
        "avatar": user["avatar"],
        "color": user["color"],
    }

    emit("user_joined", user_info, room=room_id)

    if room["mind_map_data"]:
        emit("mindmap_update", room["mind_map_data"])

    _broadcast_cursors(room_id)


@socketio.on("disconnect")
def handle_disconnect():
    token = request.args.get("token", "")
    room_id = request.args.get("roomId", "")

    if token in users and room_id in rooms:
        room = rooms[room_id]
        if token in room["users"]:
            room["users"].remove(token)

        if token in room["cursors"]:
            del room["cursors"][token]

        user = users[token]
        emit("user_left", user["id"], room=room_id)
        _broadcast_cursors(room_id)

        leave_room(room_id)


@socketio.on("cursor_move")
def handle_cursor_move(data):
    token = request.args.get("token", "")
    room_id = request.args.get("roomId", "")

    if token not in users or room_id not in rooms:
        return

    user = users[token]
    room = rooms[room_id]

    x = data.get("x", 0)
    y = data.get("y", 0)

    room["cursors"][token] = {
        "userId": user["id"],
        "nickname": user["nickname"],
        "avatar": user["avatar"],
        "color": user["color"],
        "position": {"x": x, "y": y},
    }

    _broadcast_cursors(room_id)


def _broadcast_cursors(room_id):
    if room_id not in rooms:
        return

    room = rooms[room_id]
    cursors_list = list(room["cursors"].values())
    emit("cursors_update", cursors_list, room=room_id)


@socketio.on("mindmap_update")
def handle_mindmap_update(data):
    token = request.args.get("token", "")
    room_id = request.args.get("roomId", "")

    if token not in users or room_id not in rooms:
        return

    user = users[token]
    room = rooms[room_id]

    mind_map_data = data.get("data")
    operation_type = data.get("operationType", "edit")
    node_id = data.get("nodeId", "")

    room["mind_map_data"] = mind_map_data

    emit("mindmap_update", mind_map_data, room=room_id)

    notification = {
        "id": uuid.uuid4().hex,
        "userId": user["id"],
        "nickname": user["nickname"],
        "avatar": user["avatar"],
        "type": operation_type,
        "nodeId": node_id,
        "timestamp": time.time(),
    }

    emit("operation", notification, room=room_id)


if __name__ == "__main__":
    print("Starting Collaborative Mind Map Server...")
    print("Server running on http://localhost:5000")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
