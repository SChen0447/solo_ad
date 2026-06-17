import random
import time
import threading
from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room
from game_engine import GameEngine

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

rooms: dict = {}
room_timers: dict = {}


def generate_room_code() -> str:
    while True:
        code = str(random.randint(100000, 999999))
        if code not in rooms:
            return code


@app.route("/api/rooms", methods=["POST"])
def create_room():
    data = request.json or {}
    nickname = data.get("nickname", "").strip()
    if not nickname or len(nickname) < 2 or len(nickname) > 8:
        return jsonify({"error": "昵称需要2-8个字符"}), 400

    room_code = generate_room_code()
    engine = GameEngine(
        round_duration=data.get("round_duration", 5.0),
        total_rounds=data.get("total_rounds", 10),
    )
    rooms[room_code] = {
        "engine": engine,
        "host_id": None,
        "players": {},
        "settings": {
            "round_duration": data.get("round_duration", 5.0),
            "total_rounds": data.get("total_rounds", 10),
        },
        "started": False,
        "finished": False,
        "replay_id": None,
    }

    return jsonify({
        "room_code": room_code,
        "settings": rooms[room_code]["settings"],
    })


@app.route("/api/rooms/<room_code>", methods=["GET"])
def get_room(room_code):
    if room_code not in rooms:
        return jsonify({"error": "房间不存在"}), 404
    room = rooms[room_code]
    return jsonify({
        "room_code": room_code,
        "settings": room["settings"],
        "started": room["started"],
        "player_count": len(room["players"]),
    })


@app.route("/api/replay/<replay_id>", methods=["GET"])
def get_replay(replay_id):
    for room_code, room in rooms.items():
        if room.get("replay_id") == replay_id:
            return jsonify({
                "room_code": room_code,
                "replay": room["engine"].replay_data,
                "rankings": room["engine"].get_rankings(),
            })
    return jsonify({"error": "回放不存在"}), 404


@socketio.on("connect")
def on_connect():
    pass


@socketio.on("disconnect")
def on_disconnect():
    sid = request.sid
    for room_code, room in list(rooms.items()):
        if sid in room["players"]:
            player_id = sid
            nickname = room["players"][player_id]
            leave_room(room_code)
            del room["players"][player_id]
            room["engine"].remove_player(player_id)
            emit("player_left", {
                "player_id": player_id,
                "nickname": nickname,
                "players": {
                    pid: {"nickname": n} for pid, n in room["players"].items()
                },
            }, room=room_code)
            break


@socketio.on("join_room")
def on_join_room(data):
    room_code = data.get("room_code", "")
    nickname = data.get("nickname", "").strip()
    sid = request.sid

    if not nickname or len(nickname) < 2 or len(nickname) > 8:
        emit("error", {"message": "昵称需要2-8个字符"})
        return

    if room_code not in rooms:
        emit("error", {"message": "房间不存在"})
        return

    room = rooms[room_code]
    if room["started"]:
        emit("error", {"message": "游戏已经开始"})
        return

    if len(room["players"]) >= 4:
        emit("error", {"message": "房间已满"})
        return

    join_room(room_code)
    room["players"][sid] = nickname
    room["engine"].add_player(sid, nickname)

    is_host = room["host_id"] is None
    if is_host:
        room["host_id"] = sid

    players_info = {
        pid: {
            "nickname": n,
            "is_host": pid == room["host_id"],
            "color": room["engine"].players[pid].color if pid in room["engine"].players else "#888",
        }
        for pid, n in room["players"].items()
    }

    emit("room_joined", {
        "room_code": room_code,
        "player_id": sid,
        "nickname": nickname,
        "is_host": is_host,
        "players": players_info,
        "settings": room["settings"],
    })

    emit("player_joined", {
        "player_id": sid,
        "nickname": nickname,
        "is_host": is_host,
        "players": players_info,
    }, room=room_code, include_self=False)


@socketio.on("update_settings")
def on_update_settings(data):
    room_code = data.get("room_code", "")
    sid = request.sid

    if room_code not in rooms:
        return

    room = rooms[room_code]
    if room["host_id"] != sid:
        return

    round_duration = data.get("round_duration", room["settings"]["round_duration"])
    total_rounds = data.get("total_rounds", room["settings"]["total_rounds"])

    round_duration = max(3.0, min(8.0, float(round_duration)))
    total_rounds = max(5, min(15, int(total_rounds)))

    room["settings"]["round_duration"] = round_duration
    room["settings"]["total_rounds"] = total_rounds
    room["engine"].round_duration = round_duration
    room["engine"].total_rounds = total_rounds

    emit("settings_updated", room["settings"], room=room_code)


@socketio.on("start_game")
def on_start_game(data):
    room_code = data.get("room_code", "")
    sid = request.sid

    if room_code not in rooms:
        return

    room = rooms[room_code]
    if room["host_id"] != sid:
        return

    if len(room["players"]) < 2:
        emit("error", {"message": "至少需要2名玩家"})
        return

    room["started"] = True
    emit("game_started", {
        "settings": room["settings"],
        "players": {
            pid: {
                "nickname": n,
                "color": room["engine"].players[pid].color if pid in room["engine"].players else "#888",
            }
            for pid, n in room["players"].items()
        },
    }, room=room_code)

    start_next_round(room_code)


def start_next_round(room_code: str):
    if room_code not in rooms:
        return

    room = rooms[room_code]
    engine = room["engine"]

    instruction = engine.start_round()
    if instruction is None:
        end_game(room_code)
        return

    emit("round_start", {
        "round": engine.current_round,
        "total_rounds": engine.total_rounds,
        "instruction": engine.instruction_to_dict(instruction),
        "prep_time": 0.5,
    }, room=room_code)

    timer = threading.Timer(
        instruction.time_limit + 0.5,
        on_round_timeout,
        args=[room_code],
    )
    room_timers[room_code] = timer
    timer.start()


def on_round_timeout(room_code: str):
    if room_code not in rooms:
        return

    room = rooms[room_code]
    engine = room["engine"]

    for pid, player in engine.players.items():
        if not player.eliminated and pid in room["players"]:
            already_submitted = False
            if engine.replay_data and pid in engine.replay_data[-1].get("player_results", {}):
                already_submitted = True
            if not already_submitted:
                engine.submit_result(pid, success=False, reaction_time=None)

    round_result_data = build_round_result(room_code)
    emit("round_end", round_result_data, room=room_code)

    if engine.is_game_over():
        timer = threading.Timer(2.0, end_game, args=[room_code])
        timer.start()
    else:
        timer = threading.Timer(2.0, start_next_round, args=[room_code])
        timer.start()


def build_round_result(room_code: str) -> dict:
    room = rooms[room_code]
    engine = room["engine"]

    player_results = {}
    if engine.replay_data:
        last_round = engine.replay_data[-1]
        player_results = last_round.get("player_results", {})

    return {
        "round": engine.current_round,
        "results": player_results,
        "rankings": engine.get_rankings(),
        "players_state": {
            pid: {
                "nickname": p.nickname,
                "score": p.score,
                "fail_count": p.fail_count,
                "eliminated": p.eliminated,
                "color": p.color if hasattr(p, "color") else "#888",
            }
            for pid, p in engine.players.items()
        },
    }


@socketio.on("submit_answer")
def on_submit_answer(data):
    room_code = data.get("room_code", "")
    sid = request.sid
    success = data.get("success", False)
    reaction_time = data.get("reaction_time", None)

    if room_code not in rooms:
        return

    room = rooms[room_code]
    engine = room["engine"]

    result = engine.submit_result(sid, success, reaction_time)
    if result is None:
        return

    emit("player_answered", {
        "player_id": sid,
        "nickname": result.nickname,
        "success": result.success,
        "reaction_time": result.reaction_time,
        "score": result.score,
        "round": engine.current_round,
    }, room=room_code)

    active_players = engine.get_active_players()
    submitted_count = 0
    if engine.replay_data:
        submitted_count = len(engine.replay_data[-1].get("player_results", {}))

    if submitted_count >= len(active_players):
        if room_code in room_timers:
            room_timers[room_code].cancel()
            del room_timers[room_code]

        round_result_data = build_round_result(room_code)
        emit("round_end", round_result_data, room=room_code)

        if engine.is_game_over():
            timer = threading.Timer(2.0, end_game, args=[room_code])
            timer.start()
        else:
            timer = threading.Timer(2.0, start_next_round, args=[room_code])
            timer.start()


def end_game(room_code: str):
    if room_code not in rooms:
        return

    room = rooms[room_code]
    room["finished"] = True
    engine = room["engine"]

    replay_id = str(random.randint(100000, 999999))
    room["replay_id"] = replay_id

    emit("game_over", {
        "rankings": engine.get_rankings(),
        "replay_id": replay_id,
        "replay_data": engine.replay_data,
        "players_state": {
            pid: {
                "nickname": p.nickname,
                "score": p.score,
                "fail_count": p.fail_count,
                "eliminated": p.eliminated,
            }
            for pid, p in engine.players.items()
        },
    }, room=room_code)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
