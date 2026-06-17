import json
import os
from datetime import datetime, timedelta
from typing import Dict, Optional

from flask import Flask, request, jsonify, send_from_directory
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

from models import (
    StoryRoom, StoryNode, BranchOption, Participant,
    generate_room_code, generate_id
)

app = Flask(__name__)
app.config["SECRET_KEY"] = "story-collab-secret-key"
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

rooms: Dict[str, StoryRoom] = {}
MAX_DEPTH = 5
INACTIVITY_HOURS = 24


def check_room_expiration():
    now = datetime.now()
    expired = []
    for code, room in rooms.items():
        if now - room.last_activity > timedelta(hours=INACTIVITY_HOURS):
            if not room.is_completed:
                room.is_completed = True
    return expired


@app.route("/api/rooms", methods=["POST"])
def create_room():
    data = request.json
    initial_text = data.get("initial_text", "")
    branch_options_data = data.get("branch_options", [])
    theme = data.get("theme", "未命名主题")
    creator_name = data.get("creator_name", "匿名作者")
    creator_avatar = data.get("creator_avatar", "https://api.dicebear.com/7.x/shapes/svg?seed=creator")

    if len(initial_text) < 50:
        return jsonify({"error": "初始故事段落至少需要50字"}), 400

    if len(branch_options_data) < 1 or len(branch_options_data) > 5:
        return jsonify({"error": "分支选项数量必须在1-5之间"}), 400

    for opt in branch_options_data:
        if not opt.get("title") or not opt.get("description"):
            return jsonify({"error": "每个分支选项必须包含标题和描述"}), 400

    room_code = generate_room_code()
    while room_code in rooms:
        room_code = generate_room_code()

    creator_id = generate_id()
    participant = Participant(
        id=creator_id,
        name=creator_name,
        avatar=creator_avatar
    )

    root_node_id = generate_id()
    branch_options = [
        BranchOption(id=generate_id(), title=opt["title"], description=opt["description"])
        for opt in branch_options_data
    ]

    root_node = StoryNode(
        id=root_node_id,
        author=creator_name,
        avatar=creator_avatar,
        text=initial_text,
        timestamp=datetime.now(),
        parent_id=None,
        branch_title=None,
        depth=0,
        branch_options=branch_options
    )

    room = StoryRoom(
        room_code=room_code,
        creator_id=creator_id,
        theme=theme,
        initial_text=initial_text
    )
    room.root_node_id = root_node_id
    room.add_node(root_node)
    room.participants[creator_id] = participant
    rooms[room_code] = room

    return jsonify({
        "room_code": room_code,
        "share_link": f"/room/{room_code}",
        "creator_id": creator_id,
        "room": room.to_dict()
    })


@app.route("/api/rooms/<room_code>", methods=["GET"])
def get_room(room_code):
    room = rooms.get(room_code)
    if not room:
        return jsonify({"error": "房间不存在"}), 404
    check_room_expiration()
    return jsonify(room.to_dict())


@app.route("/api/rooms/<room_code>/export", methods=["GET"])
def export_story(room_code):
    room = rooms.get(room_code)
    if not room:
        return jsonify({"error": "房间不存在"}), 404

    export_data = {
        "room_code": room.room_code,
        "theme": room.theme,
        "created_at": room.created_at.isoformat(),
        "is_completed": room.is_completed,
        "nodes": []
    }

    for node in room.nodes.values():
        export_data["nodes"].append({
            "id": node.id,
            "author": node.author,
            "avatar": node.avatar,
            "text": node.text,
            "timestamp": node.timestamp.isoformat(),
            "parent_id": node.parent_id,
            "branch_title": node.branch_title,
            "depth": node.depth,
            "branch_options": [
                {
                    "title": opt.title,
                    "description": opt.description,
                    "child_node_id": opt.child_node_id
                }
                for opt in node.branch_options
            ]
        })

    return jsonify(export_data)


@app.route("/api/rooms/<room_code>/join", methods=["POST"])
def join_room_api(room_code):
    room = rooms.get(room_code)
    if not room:
        return jsonify({"error": "房间不存在"}), 404

    data = request.json
    name = data.get("name", "匿名作者")
    avatar = data.get("avatar", f"https://api.dicebear.com/7.x/shapes/svg?seed={name}")

    participant_id = generate_id()
    participant = Participant(id=participant_id, name=name, avatar=avatar)
    room.participants[participant_id] = participant

    socketio.emit("participant_joined", {
        "participant": participant.to_dict()
    }, room=room_code)

    return jsonify({
        "participant_id": participant_id,
        "room": room.to_dict()
    })


@socketio.on("connect")
def handle_connect():
    print(f"Client connected: {request.sid}")


@socketio.on("disconnect")
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    for room_code, room in rooms.items():
        for pid, participant in room.participants.items():
            if participant.sid == request.sid:
                participant.sid = None
                socketio.emit("participant_left", {
                    "participant_id": pid
                }, room=room_code)
                break


@socketio.on("join_room")
def handle_join_room(data):
    room_code = data.get("room_code")
    participant_id = data.get("participant_id")
    room = rooms.get(room_code)
    if not room:
        emit("error", {"message": "房间不存在"})
        return

    if participant_id in room.participants:
        room.participants[participant_id].sid = request.sid
        join_room(room_code)
        emit("room_joined", {
            "message": "成功加入房间",
            "room": room.to_dict()
        })


@socketio.on("submit_node")
def handle_submit_node(data):
    check_room_expiration()

    room_code = data.get("room_code")
    participant_id = data.get("participant_id")
    parent_id = data.get("parent_id")
    branch_option_id = data.get("branch_option_id")
    text = data.get("text", "")
    new_branch_options_data = data.get("branch_options", [])

    room = rooms.get(room_code)
    if not room:
        emit("error", {"message": "房间不存在"})
        return

    if room.is_completed:
        emit("error", {"message": "故事已完成，无法继续续写"})
        return

    if participant_id not in room.participants:
        emit("error", {"message": "未加入该房间"})
        return

    if len(text) < 100 or len(text) > 200:
        emit("error", {"message": "续写内容需在100-200字之间"})
        return

    parent_node = room.nodes.get(parent_id)
    if not parent_node:
        emit("error", {"message": "父节点不存在"})
        return

    selected_branch = None
    for opt in parent_node.branch_options:
        if opt.id == branch_option_id:
            selected_branch = opt
            break

    if not selected_branch:
        emit("error", {"message": "未选择有效的分支选项"})
        return

    if selected_branch.child_node_id:
        emit("error", {"message": "该分支已被续写"})
        return

    if parent_node.depth >= MAX_DEPTH:
        emit("error", {"message": "已达到最大故事深度"})
        return

    participant = room.participants[participant_id]

    new_branch_options = []
    if parent_node.depth + 1 < MAX_DEPTH:
        if new_branch_options_data and len(new_branch_options_data) >= 1:
            for opt in new_branch_options_data[:5]:
                if opt.get("title") and opt.get("description"):
                    new_branch_options.append(BranchOption(
                        id=generate_id(),
                        title=opt["title"],
                        description=opt["description"]
                    ))

    if not new_branch_options and parent_node.depth + 1 < MAX_DEPTH:
        default_options = [
            BranchOption(id=generate_id(), title="继续发展", description="延续当前情节继续发展"),
            BranchOption(id=generate_id(), title="发生转折", description="引入意外的情节转折"),
            BranchOption(id=generate_id(), title="引入新角色", description="让新的角色加入故事")
        ]
        new_branch_options = default_options

    new_node_id = generate_id()
    new_node = StoryNode(
        id=new_node_id,
        author=participant.name,
        avatar=participant.avatar,
        text=text,
        timestamp=datetime.now(),
        parent_id=parent_id,
        branch_title=selected_branch.title,
        depth=parent_node.depth + 1,
        branch_options=new_branch_options
    )

    selected_branch.child_node_id = new_node_id
    room.add_node(new_node)

    if room.check_completion(MAX_DEPTH):
        room.is_completed = True

    socketio.emit("node_added", {
        "node": new_node.to_dict(),
        "parent_id": parent_id,
        "branch_option_id": branch_option_id,
        "room_is_completed": room.is_completed
    }, room=room_code)


if __name__ == "__main__":
    print("启动协作故事接龙平台后端服务...")
    print("WebSocket 服务运行在 http://localhost:5000")
    socketio.run(app, host="0.0.0.0", port=5000, debug=False, allow_unsafe_werkzeug=True)
