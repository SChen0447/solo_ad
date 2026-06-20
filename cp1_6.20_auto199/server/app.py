from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
import uuid
import json
import copy
from datetime import datetime

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

rooms = {}
USERS_COLORS = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"]


def create_default_score():
    return {
        "id": str(uuid.uuid4()),
        "measures": 4,
        "notes": [],
        "annotations": [],
        "versions": [],
        "createdAt": datetime.now().isoformat(),
        "updatedAt": datetime.now().isoformat(),
    }


@app.route("/api/rooms", methods=["GET"])
def list_rooms():
    room_list = []
    for room_id, room_data in rooms.items():
        room_list.append({
            "id": room_id,
            "name": room_data.get("name", room_id),
            "userCount": len(room_data.get("users", [])),
            "maxUsers": 4,
        })
    return jsonify(room_list)


@app.route("/api/rooms/<room_id>", methods=["GET"])
def get_room(room_id):
    if room_id not in rooms:
        return jsonify({"error": "Room not found"}), 404
    room = rooms[room_id]
    return jsonify({
        "id": room_id,
        "name": room.get("name", room_id),
        "userCount": len(room.get("users", [])),
        "maxUsers": 4,
        "users": list(room.get("users", {}).values()),
        "score": room.get("score"),
    })


@app.route("/api/rooms/<room_id>/versions", methods=["GET"])
def get_versions(room_id):
    if room_id not in rooms:
        return jsonify({"error": "Room not found"}), 404
    versions = rooms[room_id].get("score", {}).get("versions", [])
    return jsonify(versions)


@app.route("/api/rooms/<room_id>/snapshot", methods=["POST"])
def create_snapshot(room_id):
    if room_id not in rooms:
        return jsonify({"error": "Room not found"}), 404
    data = request.get_json() or {}
    score = rooms[room_id].get("score", create_default_score())
    snapshot_id = str(uuid.uuid4())
    snapshot = {
        "id": snapshot_id,
        "name": data.get("name", f"版本 {len(score['versions']) + 1}"),
        "notes": copy.deepcopy(score.get("notes", [])),
        "annotations": copy.deepcopy(score.get("annotations", [])),
        "measures": score.get("measures", 4),
        "createdAt": datetime.now().isoformat(),
        "createdBy": data.get("userName", "Unknown"),
    }
    score["versions"].append(snapshot)
    return jsonify(snapshot)


@app.route("/api/rooms/<room_id>/versions/<version_id>", methods=["GET"])
def get_version(room_id, version_id):
    if room_id not in rooms:
        return jsonify({"error": "Room not found"}), 404
    score = rooms[room_id].get("score", {})
    for v in score.get("versions", []):
        if v["id"] == version_id:
            return jsonify(v)
    return jsonify({"error": "Version not found"}), 404


@socketio.on("connect")
def handle_connect():
    print(f"Client connected: {request.sid}")


@socketio.on("disconnect")
def handle_disconnect():
    for room_id, room_data in rooms.items():
        users = room_data.get("users", {})
        if request.sid in users:
            user = users.pop(request.sid)
            emit("user_left", {"user": user, "userCount": len(users)}, room=room_id)
            print(f"User {user.get('name')} left room {room_id}")
            break


@socketio.on("join_room")
def handle_join_room(data):
    room_id = data.get("roomId")
    user_name = data.get("userName")
    if not room_id or not user_name:
        emit("error", {"message": "房间号和昵称必填"})
        return
    if room_id not in rooms:
        rooms[room_id] = {
            "name": data.get("roomName", room_id),
            "users": {},
            "score": create_default_score(),
        }
    room = rooms[room_id]
    if len(room["users"]) >= 4:
        emit("error", {"message": "房间人数已满（最多4人）"})
        return
    color_index = len(room["users"]) % len(USERS_COLORS)
    user = {
        "id": request.sid,
        "name": user_name,
        "color": USERS_COLORS[color_index],
        "joinedAt": datetime.now().isoformat(),
    }
    room["users"][request.sid] = user
    join_room(room_id)
    emit("room_joined", {
        "user": user,
        "users": list(room["users"].values()),
        "score": room["score"],
        "roomId": room_id,
    })
    emit("user_joined", {"user": user, "userCount": len(room["users"])}, room=room_id, include_self=False)
    print(f"User {user_name} joined room {room_id}")


@socketio.on("leave_room")
def handle_leave_room(data):
    room_id = data.get("roomId")
    if room_id in rooms:
        users = rooms[room_id].get("users", {})
        if request.sid in users:
            user = users.pop(request.sid)
            leave_room(room_id)
            emit("user_left", {"user": user, "userCount": len(users)}, room=room_id)


@socketio.on("update_note")
def handle_update_note(data):
    room_id = data.get("roomId")
    if room_id not in rooms:
        return
    score = rooms[room_id]["score"]
    note = data.get("note")
    action = data.get("action", "add")
    timestamp = data.get("timestamp", datetime.now().isoformat())

    if action == "add":
        note["id"] = note.get("id") or str(uuid.uuid4())
        note["updatedAt"] = timestamp
        note["updatedBy"] = data.get("userId")
        score["notes"].append(note)
    elif action == "remove":
        score["notes"] = [n for n in score["notes"] if n.get("id") != note.get("id")]
    elif action == "update":
        for i, n in enumerate(score["notes"]):
            if n.get("id") == note.get("id"):
                score["notes"][i] = {**note, "updatedAt": timestamp, "updatedBy": data.get("userId")}
                break

    score["updatedAt"] = datetime.now().isoformat()
    emit("note_updated", {
        "note": note,
        "action": action,
        "userId": data.get("userId"),
        "timestamp": timestamp,
    }, room=room_id, include_self=False)


@socketio.on("update_annotation")
def handle_update_annotation(data):
    room_id = data.get("roomId")
    if room_id not in rooms:
        return
    score = rooms[room_id]["score"]
    annotation = data.get("annotation")
    action = data.get("action", "add")
    timestamp = data.get("timestamp", datetime.now().isoformat())

    if action == "add":
        annotation["id"] = annotation.get("id") or str(uuid.uuid4())
        annotation["updatedAt"] = timestamp
        annotation["updatedBy"] = data.get("userId")
        score["annotations"].append(annotation)
    elif action == "remove":
        score["annotations"] = [a for a in score["annotations"] if a.get("id") != annotation.get("id")]
    elif action == "update":
        for i, a in enumerate(score["annotations"]):
            if a.get("id") == annotation.get("id"):
                score["annotations"][i] = {**annotation, "updatedAt": timestamp, "updatedBy": data.get("userId")}
                break

    score["updatedAt"] = datetime.now().isoformat()
    emit("annotation_updated", {
        "annotation": annotation,
        "action": action,
        "userId": data.get("userId"),
        "timestamp": timestamp,
    }, room=room_id, include_self=False)


@socketio.on("cursor_position")
def handle_cursor_position(data):
    room_id = data.get("roomId")
    emit("cursor_update", data, room=room_id, include_self=False)


@socketio.on("chat_message")
def handle_chat_message(data):
    room_id = data.get("roomId")
    emit("chat_received", data, room=room_id)


if __name__ == "__main__":
    print("Starting Virtual Music Classroom Server on port 5000...")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
