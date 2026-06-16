import json
import uuid
import time
from flask import Flask, jsonify, request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", path="/socket.io")

MINIMAP_ROOM = "main"

mindmap_state = {
    "nodes": [
        {
            "id": "root-1",
            "x": 400,
            "y": 300,
            "text": "中心主题",
            "color": "#4ECDC4",
            "radius": 40
        }
    ],
    "connections": []
}

history_records = []

online_users = {}


def generate_id():
    return f"{int(time.time() * 1000)}-{uuid.uuid4().hex[:9]}"


def get_action_label(action_type):
    labels = {
        "create": "创建节点",
        "edit": "编辑节点",
        "move": "移动节点",
        "delete": "删除节点",
        "connect": "创建连线",
        "disconnect": "删除连线",
        "rollback": "回退操作"
    }
    return labels.get(action_type, action_type)


def add_history_record(action_type, username, description=""):
    state_copy = json.loads(json.dumps(mindmap_state))
    record = {
        "id": generate_id(),
        "type": action_type,
        "username": username,
        "timestamp": int(time.time() * 1000),
        "description": description or get_action_label(action_type),
        "state": state_copy
    }
    history_records.insert(0, record)
    if len(history_records) > 100:
        history_records.pop()
    return record


@app.route("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/api/mindmap")
def get_mindmap():
    return jsonify(mindmap_state)


@app.route("/api/history")
def get_history():
    return jsonify(history_records)


@app.route("/api/users")
def get_users():
    return jsonify({
        "count": len(online_users),
        "users": list(online_users.values())
    })


@app.route("/api/export/json")
def export_json():
    return jsonify(mindmap_state)


@socketio.on("connect")
def handle_connect():
    username = request.args.get("username", "匿名用户")
    online_users[request.sid] = username
    join_room(MINIMAP_ROOM)
    print(f"User connected: {username} (sid: {request.sid})")
    emit("users:update", {
        "count": len(online_users),
        "users": list(online_users.values())
    }, room=MINIMAP_ROOM)
    emit("mindmap:init", mindmap_state)


@socketio.on("disconnect")
def handle_disconnect():
    username = online_users.pop(request.sid, "匿名用户")
    leave_room(MINIMAP_ROOM)
    print(f"User disconnected: {username} (sid: {request.sid})")
    emit("users:update", {
        "count": len(online_users),
        "users": list(online_users.values())
    }, room=MINIMAP_ROOM)


@socketio.on("node:create")
def handle_node_create(node_data):
    username = online_users.get(request.sid, "匿名用户")
    
    node_exists = any(n["id"] == node_data["id"] for n in mindmap_state["nodes"])
    if node_exists:
        return
    
    mindmap_state["nodes"].append(node_data)
    record = add_history_record("create", username, f"创建节点: {node_data.get('text', '新节点')}")
    
    emit("node:create", {"node": node_data, "username": username}, room=MINIMAP_ROOM)
    emit("history:add", {"record": record}, room=MINIMAP_ROOM)


@socketio.on("node:update")
def handle_node_update(node_data):
    username = online_users.get(request.sid, "匿名用户")
    
    for i, node in enumerate(mindmap_state["nodes"]):
        if node["id"] == node_data["id"]:
            mindmap_state["nodes"][i] = {**node, **node_data}
            break
    
    record = add_history_record("edit", username, f"编辑节点: {node_data.get('text', '节点')}")
    
    emit("node:update", {"node": node_data, "username": username}, room=MINIMAP_ROOM)
    emit("history:add", {"record": record}, room=MINIMAP_ROOM)


@socketio.on("node:move")
def handle_node_move(data):
    username = online_users.get(request.sid, "匿名用户")
    node_id = data["nodeId"]
    x = data["x"]
    y = data["y"]
    
    for node in mindmap_state["nodes"]:
        if node["id"] == node_id:
            node["x"] = x
            node["y"] = y
            break
    
    emit("node:move", {
        "nodeId": node_id,
        "x": x,
        "y": y,
        "username": username
    }, room=MINIMAP_ROOM)


@socketio.on("node:delete")
def handle_node_delete(node_id):
    username = online_users.get(request.sid, "匿名用户")
    
    deleted_node = None
    mindmap_state["nodes"] = [
        n for n in mindmap_state["nodes"]
        if n["id"] != node_id or (deleted_node := n) is None
    ]
    
    mindmap_state["connections"] = [
        c for c in mindmap_state["connections"]
        if c["fromNodeId"] != node_id and c["toNodeId"] != node_id
    ]
    
    node_text = deleted_node["text"] if deleted_node else "节点"
    record = add_history_record("delete", username, f"删除节点: {node_text}")
    
    emit("node:delete", {"nodeId": node_id, "username": username}, room=MINIMAP_ROOM)
    emit("history:add", {"record": record}, room=MINIMAP_ROOM)


@socketio.on("connection:create")
def handle_connection_create(data):
    username = online_users.get(request.sid, "匿名用户")
    from_node_id = data["fromNodeId"]
    to_node_id = data["toNodeId"]
    
    conn_id = generate_id()
    new_connection = {
        "id": conn_id,
        "fromNodeId": from_node_id,
        "toNodeId": to_node_id
    }
    
    exists = any(
        (c["fromNodeId"] == from_node_id and c["toNodeId"] == to_node_id) or
        (c["fromNodeId"] == to_node_id and c["toNodeId"] == from_node_id)
        for c in mindmap_state["connections"]
    )
    
    if not exists:
        mindmap_state["connections"].append(new_connection)
        record = add_history_record("connect", username, "创建连线")
        
        emit("connection:create", {
            "connection": new_connection,
            "username": username
        }, room=MINIMAP_ROOM)
        emit("history:add", {"record": record}, room=MINIMAP_ROOM)


@socketio.on("connection:delete")
def handle_connection_delete(connection_id):
    username = online_users.get(request.sid, "匿名用户")
    
    mindmap_state["connections"] = [
        c for c in mindmap_state["connections"]
        if c["id"] != connection_id
    ]
    
    record = add_history_record("disconnect", username, "删除连线")
    
    emit("connection:delete", {
        "connectionId": connection_id,
        "username": username
    }, room=MINIMAP_ROOM)
    emit("history:add", {"record": record}, room=MINIMAP_ROOM)


@socketio.on("history:rollback")
def handle_history_rollback(data):
    username = online_users.get(request.sid, "匿名用户")
    history_id = data["historyId"]
    
    target_record = None
    for record in history_records:
        if record["id"] == history_id:
            target_record = record
            break
    
    if target_record:
        state_copy = json.loads(json.dumps(target_record["state"]))
        mindmap_state["nodes"] = state_copy["nodes"]
        mindmap_state["connections"] = state_copy["connections"]
        
        rollback_record = add_history_record(
            "rollback",
            username,
            f"回退到: {target_record['description']}"
        )
        
        emit("history:rollback", {
            "state": mindmap_state,
            "record": rollback_record
        }, room=MINIMAP_ROOM)


if __name__ == "__main__":
    print("Starting Collaborative Mindmap Server...")
    print(f"Initial nodes: {len(mindmap_state['nodes'])}")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
