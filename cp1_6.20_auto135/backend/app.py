import time
import secrets
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

from session_store import store, Session, Card

app = Flask(__name__)
app.config["SECRET_KEY"] = "brainstorm-app-secret-key-2024"
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet", ping_timeout=30)


VOTING_DURATION = 300


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "timestamp": time.time()})


@app.route("/api/sessions", methods=["POST"])
def create_session():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    nickname = (data.get("nickname") or "").strip()

    if not title:
        return jsonify({"error": "标题不能为空"}), 400
    if len(title) > 20:
        return jsonify({"error": "标题最长20字"}), 400
    if len(description) > 60:
        return jsonify({"error": "描述最长60字"}), 400
    if not nickname:
        return jsonify({"error": "昵称不能为空"}), 400

    session_id, host = store.create_session(title, description, nickname)
    session = store.get_session(session_id)

    return jsonify({
        "sessionId": session_id,
        "user": {
            "id": host.id,
            "nickname": host.nickname,
            "avatar": host.avatar,
            "isHost": host.is_host,
            "status": host.status,
        },
        "session": session.to_dict() if session else None,
    })


@app.route("/api/sessions/join", methods=["POST"])
def join_session():
    data = request.get_json(silent=True) or {}
    session_id = (data.get("sessionId") or "").strip().upper()
    nickname = (data.get("nickname") or "").strip()

    if not session_id:
        return jsonify({"error": "会话码不能为空"}), 400
    if len(session_id) != 6:
        return jsonify({"error": "会话码为6位字母数字"}), 400
    if not nickname:
        return jsonify({"error": "昵称不能为空"}), 400

    result = store.join_session(session_id, nickname)
    if not result:
        return jsonify({"error": "会话不存在"}), 404

    session, user = result
    return jsonify({
        "user": {
            "id": user.id,
            "nickname": user.nickname,
            "avatar": user.avatar,
            "isHost": user.is_host,
            "status": user.status,
        },
        "session": session.to_dict(),
    })


@app.route("/api/sessions/<session_id>", methods=["GET"])
def get_session(session_id: str):
    session = store.get_session(session_id.upper())
    if not session:
        return jsonify({"error": "会话不存在"}), 404
    return jsonify(session.to_dict())


def _get_session_from_sid(sid: str):
    for sid_key in request.args if False in [True] else []:
        pass
    return None


@socketio.on("connect")
def on_connect():
    pass


@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    for session_id in list(store._sessions.keys()):
        session = store._sessions[session_id]
        user = None
        for u in list(session.users.values()):
            if u.sid == sid:
                user = u
                break
        if user:
            result = store.remove_user(user.id)
            if result:
                s_id, new_host_id = result
                emit("user_left", {"userId": user.id}, room=s_id)
                if new_host_id:
                    emit("host_changed", {"newHostId": new_host_id}, room=s_id)
            break


@socketio.on("join_session")
def on_join_session(data):
    session_id = (data.get("sessionId") or "").upper()
    user_id = data.get("userId") or ""
    session = store.get_session(session_id)
    if not session:
        emit("error", {"message": "会话不存在"})
        return
    if user_id not in session.users:
        emit("error", {"message": "用户不在此会话中"})
        return

    join_room(session_id)
    store.set_user_sid(session_id, user_id, request.sid)

    new_user = session.users[user_id]
    emit("user_joined", {
        "user": {
            "id": new_user.id,
            "nickname": new_user.nickname,
            "avatar": new_user.avatar,
            "isHost": new_user.is_host,
            "status": new_user.status,
        }
    }, room=session_id, include_self=False)


@socketio.on("update_status")
def on_update_status(data):
    session_id = (data.get("sessionId") or "").upper()
    user_id = data.get("userId") or ""
    status = data.get("status", "browsing")
    session = store.get_session(session_id)
    if not session or user_id not in session.users:
        return
    store.set_user_status(session_id, user_id, status)
    emit("user_status_changed", {"userId": user_id, "status": status}, room=session_id)


@socketio.on("create_card")
def on_create_card(data):
    session_id = (data.get("sessionId") or "").upper()
    user_id = data.get("userId") or ""
    session = store.get_session(session_id)
    if not session or user_id not in session.users:
        return

    card_id = data.get("cardId") or ("c_" + secrets.token_hex(8))
    author = session.users[user_id]
    card = Card(
        id=card_id,
        session_id=session_id,
        content=(data.get("content") or "")[:120],
        author_id=user_id,
        author_name=author.nickname,
        color=data.get("color"),
        x=float(data.get("x", 100)),
        y=float(data.get("y", 100)),
        z_index=len(session.cards) + 1,
        created_at=time.time(),
    )
    store.add_card(session_id, card)

    card_data = {
        "id": card.id,
        "sessionId": card.session_id,
        "content": card.content,
        "authorId": card.author_id,
        "authorName": card.author_name,
        "color": card.color,
        "x": card.x,
        "y": card.y,
        "zIndex": card.z_index,
        "votes": [],
        "createdAt": card.created_at,
    }
    emit("card_created", {"card": card_data}, room=session_id)


@socketio.on("update_card")
def on_update_card(data):
    session_id = (data.get("sessionId") or "").upper()
    card_id = data.get("cardId") or ""
    session = store.get_session(session_id)
    if not session or card_id not in session.cards:
        return

    updates = {}
    if "content" in data:
        updates["content"] = str(data["content"])[:120]
    if "color" in data:
        updates["color"] = data.get("color")

    if not updates:
        return

    card = store.update_card(session_id, card_id, updates)
    if card:
        emit("card_updated", {
            "cardId": card_id,
            "updates": updates,
        }, room=session_id)


@socketio.on("move_card")
def on_move_card(data):
    session_id = (data.get("sessionId") or "").upper()
    card_id = data.get("cardId") or ""
    session = store.get_session(session_id)
    if not session or card_id not in session.cards:
        return

    x = float(data.get("x", 0))
    y = float(data.get("y", 0))
    z_index = int(data.get("zIndex", len(session.cards)))

    card = store.move_card(session_id, card_id, x, y, z_index)
    if card:
        emit("card_moved", {
            "cardId": card_id,
            "x": x,
            "y": y,
            "zIndex": z_index,
        }, room=session_id)


@socketio.on("delete_card")
def on_delete_card(data):
    session_id = (data.get("sessionId") or "").upper()
    card_id = data.get("cardId") or ""
    user_id = data.get("userId") or ""
    session = store.get_session(session_id)
    if not session or card_id not in session.cards:
        return

    card = session.cards[card_id]
    if card.author_id != user_id:
        host = session.users.get(session.host_id)
        if not host or host.id != user_id:
            emit("error", {"message": "无权限删除此卡片"})
            return

    if store.delete_card(session_id, card_id):
        emit("card_deleted", {"cardId": card_id}, room=session_id)


@socketio.on("add_vote")
def on_add_vote(data):
    session_id = (data.get("sessionId") or "").upper()
    card_id = data.get("cardId") or ""
    user_id = data.get("userId") or ""
    session = store.get_session(session_id)
    if not session or session.phase != "voting":
        emit("error", {"message": "当前不在投票阶段"})
        return
    if card_id not in session.cards:
        return

    if store.add_vote(session_id, card_id, user_id):
        emit("vote_added", {"cardId": card_id, "userId": user_id}, room=session_id)


@socketio.on("remove_vote")
def on_remove_vote(data):
    session_id = (data.get("sessionId") or "").upper()
    card_id = data.get("cardId") or ""
    user_id = data.get("userId") or ""
    session = store.get_session(session_id)
    if not session or card_id not in session.cards:
        return

    if store.remove_vote(session_id, card_id, user_id):
        emit("vote_removed", {"cardId": card_id, "userId": user_id}, room=session_id)


@socketio.on("start_voting")
def on_start_voting(data):
    session_id = (data.get("sessionId") or "").upper()
    user_id = data.get("userId") or ""
    session = store.get_session(session_id)
    if not session:
        return
    if session.host_id != user_id:
        emit("error", {"message": "仅创建者可发起投票"})
        return

    voting_end_at = time.time() + VOTING_DURATION
    store.set_phase(session_id, "voting", voting_end_at)
    emit("phase_changed", {
        "phase": "voting",
        "votingEndAt": voting_end_at,
    }, room=session_id)

    socketio.start_background_task(_voting_countdown, session_id, voting_end_at)


def _voting_countdown(session_id: str, end_at: float):
    while True:
        remaining = end_at - time.time()
        if remaining <= 0:
            break
        socketio.sleep(min(remaining, 5))
    session = store.get_session(session_id)
    if session and session.phase == "voting":
        store.set_phase(session_id, "result")
        socketio.emit("phase_changed", {
            "phase": "result",
            "votingEndAt": None,
        }, room=session_id)


@socketio.on("reset_to_brainstorm")
def on_reset_to_brainstorm(data):
    session_id = (data.get("sessionId") or "").upper()
    user_id = data.get("userId") or ""
    session = store.get_session(session_id)
    if not session or session.host_id != user_id:
        emit("error", {"message": "仅创建者可重置"})
        return

    for card_id in list(session.votes.keys()):
        session.votes[card_id].clear()
    store.set_phase(session_id, "brainstorm")
    emit("phase_changed", {
        "phase": "brainstorm",
        "votingEndAt": None,
    }, room=session_id)
    emit("votes_cleared", {}, room=session_id)


@socketio.on("heartbeat")
def on_heartbeat(_data=None):
    emit("heartbeat_ack", {"timestamp": time.time()})


if __name__ == "__main__":
    print("Brainstorm Backend Server starting on http://localhost:5000")
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
