import os
import uuid
import random
import string
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", path="/socket.io")

UPLOAD_FOLDER = "uploads"
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg"}
MAX_CONTENT_LENGTH = 2 * 1024 * 1024

app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
app.config["MAX_CONTENT_LENGTH"] = MAX_CONTENT_LENGTH

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

events = {}
messages = {}
signin_codes = {}


def generate_signin_code():
    while True:
        code = "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if code not in signin_codes:
            return code


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route("/api/events", methods=["POST"])
def create_event():
    data = request.json
    name = data.get("name", "").strip()
    description = data.get("description", "").strip()

    if not name or len(name) > 50:
        return jsonify({"error": "活动名称无效"}), 400
    if len(description) > 200:
        return jsonify({"error": "活动描述过长"}), 400

    event_id = str(uuid.uuid4())
    signin_code = generate_signin_code()

    event = {
        "id": event_id,
        "name": name,
        "description": description,
        "signinCode": signin_code,
        "createdAt": datetime.utcnow().isoformat(),
    }

    events[event_id] = event
    messages[event_id] = []
    signin_codes[signin_code] = event_id

    return jsonify(event), 201


@app.route("/api/events/<event_id>", methods=["GET"])
def get_event(event_id):
    event = events.get(event_id)
    if not event:
        return jsonify({"error": "活动不存在"}), 404
    return jsonify(event)


@app.route("/api/events/code/<signin_code>", methods=["GET"])
def get_event_by_code(signin_code):
    signin_code = signin_code.upper()
    event_id = signin_codes.get(signin_code)
    if not event_id:
        return jsonify({"error": "签到码无效"}), 404
    event = events.get(event_id)
    if not event:
        return jsonify({"error": "活动不存在"}), 404
    return jsonify(event)


@app.route("/api/events/<event_id>/signin", methods=["POST"])
def signin(event_id):
    event = events.get(event_id)
    if not event:
        return jsonify({"error": "活动不存在"}), 404

    data = request.json
    nickname = data.get("nickname", "").strip()

    if not nickname or len(nickname) > 20:
        return jsonify({"error": "昵称无效"}), 400

    return jsonify({"success": True, "eventId": event_id, "nickname": nickname})


@app.route("/api/events/<event_id>/messages", methods=["GET"])
def get_messages(event_id):
    event = events.get(event_id)
    if not event:
        return jsonify({"error": "活动不存在"}), 404

    msgs = messages.get(event_id, [])
    sorted_msgs = sorted(msgs, key=lambda x: (not x["isPinned"], x["timestamp"]), reverse=False)

    pinned = sorted([m for m in msgs if m["isPinned"]], key=lambda x: x["timestamp"], reverse=True)
    unpinned = sorted([m for m in msgs if not m["isPinned"]], key=lambda x: x["timestamp"], reverse=True)

    return jsonify(pinned + unpinned)


@app.route("/api/events/<event_id>/messages", methods=["POST"])
def send_message(event_id):
    event = events.get(event_id)
    if not event:
        return jsonify({"error": "活动不存在"}), 404

    nickname = request.form.get("nickname", "").strip()
    content = request.form.get("content", "").strip()

    if not nickname or len(nickname) > 20:
        return jsonify({"error": "昵称无效"}), 400
    if len(content) > 200:
        return jsonify({"error": "消息内容过长"}), 400

    image_url = None
    if "image" in request.files:
        file = request.files["image"]
        if file and allowed_file(file.filename):
            filename = secure_filename(f"{uuid.uuid4()}_{file.filename}")
            filepath = os.path.join(app.config["UPLOAD_FOLDER"], filename)
            file.save(filepath)
            image_url = f"/uploads/{filename}"

    message = {
        "id": str(uuid.uuid4()),
        "eventId": event_id,
        "nickname": nickname,
        "content": content,
        "imageUrl": image_url,
        "timestamp": datetime.utcnow().isoformat(),
        "isPinned": False,
    }

    if event_id not in messages:
        messages[event_id] = []
    messages[event_id].append(message)

    socketio.emit("new_message", message, room=event_id)

    return jsonify(message), 201


@app.route("/api/events/<event_id>/messages/<message_id>/pin", methods=["POST"])
def pin_message(event_id, message_id):
    event = events.get(event_id)
    if not event:
        return jsonify({"error": "活动不存在"}), 404

    msgs = messages.get(event_id, [])
    message = next((m for m in msgs if m["id"] == message_id), None)

    if not message:
        return jsonify({"error": "消息不存在"}), 404

    message["isPinned"] = True
    socketio.emit("message_pinned", message, room=event_id)

    return jsonify(message)


@app.route("/api/events/<event_id>/messages/<message_id>", methods=["DELETE"])
def delete_message(event_id, message_id):
    event = events.get(event_id)
    if not event:
        return jsonify({"error": "活动不存在"}), 404

    msgs = messages.get(event_id, [])
    message_idx = next((i for i, m in enumerate(msgs) if m["id"] == message_id), None)

    if message_idx is None:
        return jsonify({"error": "消息不存在"}), 404

    del msgs[message_idx]
    socketio.emit("message_deleted", message_id, room=event_id)

    return jsonify({"success": True})


@app.route("/uploads/<filename>")
def uploaded_file(filename):
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)


@socketio.on("join_event")
def handle_join_event(event_id):
    join_room(event_id)


@socketio.on("connect")
def handle_connect():
    pass


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
