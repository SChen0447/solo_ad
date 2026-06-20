from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_cors import CORS
import uuid
import random
import time
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
app.config["SECRET_KEY"] = "hex-territory-secret"
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

BOARD_SIZE = 10
MAX_HAND_SIZE = 7
DRAW_PER_TURN = 3
PLAY_PER_TURN = 2
VICTORY_PERCENT = 0.60

PLAYER_COLORS = {
    0: "#e74c3c",
    1: "#3498db",
    2: "#2ecc71",
    3: "#9b59b6",
}

CARD_TYPES = ["occupy", "fortify", "move", "block", "lightning"]
CARD_WEIGHTS = [40, 20, 15, 15, 10]


def generate_card_id():
    return str(uuid.uuid4())[:8]


def create_deck():
    deck = []
    for card_type, weight in zip(CARD_TYPES, CARD_WEIGHTS):
        for _ in range(weight):
            deck.append({
                "id": generate_card_id(),
                "type": card_type,
            })
    random.shuffle(deck)
    return deck


def create_initial_board():
    cells = {}
    for q in range(BOARD_SIZE):
        for r in range(BOARD_SIZE):
            key = f"{q},{r}"
            cells[key] = {
                "q": q,
                "r": r,
                "owner": None,
                "durability": 0,
                "blocked": False,
            }
    return cells


@dataclass
class Player:
    id: str
    sid: str
    name: str
    color: str
    ready: bool = False
    hand: List[Dict] = field(default_factory=list)
    territories: int = 0
    cards_played_this_turn: int = 0


@dataclass
class Room:
    id: str
    name: str
    owner_id: str
    players: Dict[str, Player] = field(default_factory=dict)
    board: Dict = field(default_factory=create_initial_board)
    deck: List[Dict] = field(default_factory=create_deck)
    discard_pile: List[Dict] = field(default_factory=list)
    current_turn_index: int = 0
    turn: int = 1
    status: str = "waiting"
    winner: Optional[str] = None
    created_at: float = field(default_factory=time.time)

    def get_player_list(self):
        return [
            {
                "id": p.id,
                "name": p.name,
                "color": p.color,
                "ready": p.ready,
                "territories": p.territories,
                "cardsPlayed": p.cards_played_this_turn,
                "handSize": len(p.hand),
            }
            for p in self.players.values()
        ]

    def get_turn_order(self):
        return list(self.players.keys())


rooms: Dict[str, Room] = {}
sid_to_room: Dict[str, str] = {}
sid_to_player: Dict[str, str] = {}


def get_room_or_404(room_id):
    room = rooms.get(room_id)
    if not room:
        return None, (jsonify({"error": "房间不存在"}), 404)
    return room, None


def check_victory(room: Room) -> Optional[str]:
    total_cells = BOARD_SIZE * BOARD_SIZE
    threshold = total_cells * VICTORY_PERCENT
    for pid, player in room.players.items():
        if player.territories >= threshold:
            return pid
    return None


def recalc_territories(room: Room):
    counts = {pid: 0 for pid in room.players}
    for cell in room.board.values():
        if cell["owner"] and cell["owner"] in counts:
            counts[cell["owner"]] += 1
    for pid, count in counts.items():
        if pid in room.players:
            room.players[pid].territories = count


def broadcast_room_state(room: Room):
    data = {
        "roomId": room.id,
        "roomName": room.name,
        "status": room.status,
        "turn": room.turn,
        "currentTurnIndex": room.current_turn_index,
        "turnOrder": room.get_turn_order(),
        "players": room.get_player_list(),
        "board": room.board,
        "winner": room.winner,
    }
    socketio.emit("room_state", data, room=room.id)


def draw_cards_for_player(room: Room, player_id: str, count: int):
    player = room.players.get(player_id)
    if not player:
        return
    drawn = 0
    for _ in range(count):
        if len(room.deck) == 0:
            room.deck = room.discard_pile
            room.discard_pile = []
            random.shuffle(room.deck)
        if len(room.deck) == 0:
            break
        if len(player.hand) >= MAX_HAND_SIZE:
            idx = random.randint(0, len(player.hand) - 1)
            discarded = player.hand.pop(idx)
            room.discard_pile.append(discarded)
        card = room.deck.pop(0)
        player.hand.append(card)
        drawn += 1
    return drawn


def get_neighbors(q, r):
    dirs = [
        (1, 0), (-1, 0), (0, 1), (0, -1),
        (1, -1), (-1, 1),
    ]
    result = []
    for dq, dr in dirs:
        nq, nr = q + dq, r + dr
        if 0 <= nq < BOARD_SIZE and 0 <= nr < BOARD_SIZE:
            result.append((nq, nr))
    return result


def is_adjacent_to_own(room: Room, player_id: str, q, r):
    neighbors = get_neighbors(q, r)
    for nq, nr in neighbors:
        key = f"{nq},{nr}"
        cell = room.board.get(key)
        if cell and cell["owner"] == player_id and not cell["blocked"]:
            return True
    return False


def has_any_territory(room: Room, player_id: str):
    for cell in room.board.values():
        if cell["owner"] == player_id:
            return True
    return False


@app.route("/api/rooms", methods=["GET"])
def list_rooms():
    result = []
    for rid, room in rooms.items():
        result.append({
            "id": room.id,
            "name": room.name,
            "playerCount": len(room.players),
            "maxPlayers": 4,
            "status": room.status,
        })
    return jsonify(result)


@app.route("/api/rooms", methods=["POST"])
def create_room():
    data = request.get_json() or {}
    name = data.get("name", f"房间-{random.randint(1000,9999)}")
    player_name = data.get("playerName", "玩家1")
    room_id = str(uuid.uuid4())[:6].upper()
    while room_id in rooms:
        room_id = str(uuid.uuid4())[:6].upper()
    player_id = str(uuid.uuid4())
    color = PLAYER_COLORS[0]
    rooms[room_id] = Room(
        id=room_id,
        name=name,
        owner_id=player_id,
    )
    return jsonify({
        "roomId": room_id,
        "playerId": player_id,
        "color": color,
        "playerName": player_name,
    })


@app.route("/api/rooms/<room_id>/join", methods=["POST"])
def join_room_api(room_id):
    room, err = get_room_or_404(room_id)
    if err:
        return err
    if room.status != "waiting":
        return jsonify({"error": "游戏已开始，无法加入"}), 400
    if len(room.players) >= 4:
        return jsonify({"error": "房间已满"}), 400
    data = request.get_json() or {}
    player_name = data.get("playerName", f"玩家{len(room.players)+1}")
    player_id = str(uuid.uuid4())
    used_idx = set()
    for p in room.players.values():
        for idx, c in PLAYER_COLORS.items():
            if c == p.color:
                used_idx.add(idx)
    color_idx = 0
    for i in range(4):
        if i not in used_idx:
            color_idx = i
            break
    color = PLAYER_COLORS[color_idx]
    return jsonify({
        "roomId": room_id,
        "playerId": player_id,
        "color": color,
        "playerName": player_name,
    })


@socketio.on("connect_player")
def handle_connect(data):
    room_id = data.get("roomId")
    player_id = data.get("playerId")
    player_name = data.get("playerName", "玩家")
    color = data.get("color", PLAYER_COLORS[0])
    room = rooms.get(room_id)
    if not room:
        emit("error", {"message": "房间不存在"})
        return
    if player_id in room.players:
        room.players[player_id].sid = request.sid
    else:
        if room.status != "waiting":
            emit("error", {"message": "游戏已开始"})
            return
        if len(room.players) >= 4:
            emit("error", {"message": "房间已满"})
            return
        room.players[player_id] = Player(
            id=player_id,
            sid=request.sid,
            name=player_name,
            color=color,
        )
    sid_to_room[request.sid] = room_id
    sid_to_player[request.sid] = player_id
    join_room(room_id)
    broadcast_room_state(room)


@socketio.on("toggle_ready")
def handle_toggle_ready(data):
    room_id = data.get("roomId")
    player_id = data.get("playerId")
    room = rooms.get(room_id)
    if not room or player_id not in room.players:
        return
    if room.status != "waiting":
        return
    player = room.players[player_id]
    player.ready = not player.ready
    all_ready = len(room.players) >= 2 and all(p.ready for p in room.players.values())
    if all_ready:
        start_game(room)
    broadcast_room_state(room)


def start_game(room: Room):
    room.status = "playing"
    room.board = create_initial_board()
    room.deck = create_deck()
    room.discard_pile = []
    room.turn = 1
    room.current_turn_index = 0
    room.winner = None
    pids = list(room.players.keys())
    corners = [(0, 0), (BOARD_SIZE - 1, BOARD_SIZE - 1), (0, BOARD_SIZE - 1), (BOARD_SIZE - 1, 0)]
    for i, pid in enumerate(pids):
        p = room.players[pid]
        p.ready = True
        p.hand = []
        p.cards_played_this_turn = 0
        q, r = corners[i]
        key = f"{q},{r}"
        room.board[key]["owner"] = pid
        room.board[key]["durability"] = 1
        draw_cards_for_player(room, pid, 5)
    recalc_territories(room)
    socketio.emit("game_started", {"roomId": room.id}, room=room.id)


@socketio.on("play_card")
def handle_play_card(data):
    room_id = data.get("roomId")
    player_id = data.get("playerId")
    card_id = data.get("cardId")
    target = data.get("target")
    room = rooms.get(room_id)
    if not room or player_id not in room.players:
        return
    if room.status != "playing":
        return
    pids = room.get_turn_order()
    current_pid = pids[room.current_turn_index % len(pids)] if pids else None
    if current_pid != player_id:
        emit("action_error", {"message": "不是你的回合"})
        return
    player = room.players[player_id]
    if player.cards_played_this_turn >= PLAY_PER_TURN:
        emit("action_error", {"message": "本回合已出满2张牌"})
        return
    card_idx = None
    for i, c in enumerate(player.hand):
        if c["id"] == card_id:
            card_idx = i
            break
    if card_idx is None:
        emit("action_error", {"message": "卡牌不存在"})
        return
    card = player.hand[card_idx]
    success = apply_card_effect(room, player_id, card, target)
    if not success:
        emit("action_error", {"message": "出牌失败，目标无效"})
        return
    used_card = player.hand.pop(card_idx)
    room.discard_pile.append(used_card)
    player.cards_played_this_turn += 1
    recalc_territories(room)
    winner = check_victory(room)
    if winner:
        room.winner = winner
        room.status = "ended"
        socketio.emit("victory", {
            "roomId": room.id,
            "winnerId": winner,
            "winnerName": room.players[winner].name,
        }, room=room.id)
    emit("card_played", {
        "playerId": player_id,
        "cardType": card["type"],
        "target": target,
    }, room=room.id)
    broadcast_room_state(room)


def apply_card_effect(room: Room, player_id: str, card: Dict, target: Optional[Dict]) -> bool:
    if not target:
        return False
    ctype = card["type"]
    q = target.get("q")
    r = target.get("r")
    if q is None or r is None:
        return False
    if not (0 <= q < BOARD_SIZE and 0 <= r < BOARD_SIZE):
        return False
    key = f"{q},{r}"
    cell = room.board.get(key)
    if not cell:
        return False

    if ctype == "occupy":
        if cell["owner"] is not None:
            return False
        if not is_adjacent_to_own(room, player_id, q, r) and not has_any_territory(room, player_id):
            if has_any_territory(room, player_id):
                return False
        cell["owner"] = player_id
        cell["durability"] = 1
        return True

    elif ctype == "fortify":
        if cell["owner"] != player_id:
            return False
        if cell["blocked"]:
            return False
        if cell["durability"] >= 3:
            return False
        cell["durability"] += 1
        return True

    elif ctype == "move":
        from_q = target.get("fromQ")
        from_r = target.get("fromR")
        if from_q is None or from_r is None:
            return False
        if not (0 <= from_q < BOARD_SIZE and 0 <= from_r < BOARD_SIZE):
            return False
        from_key = f"{from_q},{from_r}"
        from_cell = room.board.get(from_key)
        if not from_cell or from_cell["owner"] != player_id or from_cell["blocked"]:
            return False
        if cell["owner"] is not None:
            return False
        neighbors = get_neighbors(from_q, from_r)
        if (q, r) not in neighbors:
            return False
        cell["owner"] = player_id
        cell["durability"] = max(1, from_cell["durability"])
        from_cell["owner"] = None
        from_cell["durability"] = 0
        from_cell["blocked"] = False
        return True

    elif ctype == "block":
        if cell["owner"] is None or cell["owner"] == player_id:
            return False
        if cell["blocked"]:
            return False
        cell["blocked"] = True
        return True

    elif ctype == "lightning":
        if cell["owner"] is None or cell["owner"] == player_id:
            return False
        if cell["durability"] > 1:
            cell["durability"] -= 1
        else:
            cell["owner"] = player_id
            cell["durability"] = 1
            cell["blocked"] = False
        return True

    return False


@socketio.on("end_turn")
def handle_end_turn(data):
    room_id = data.get("roomId")
    player_id = data.get("playerId")
    room = rooms.get(room_id)
    if not room or player_id not in room.players:
        return
    if room.status != "playing":
        return
    pids = room.get_turn_order()
    if not pids:
        return
    current_pid = pids[room.current_turn_index % len(pids)]
    if current_pid != player_id:
        return
    for cell in room.board.values():
        cell["blocked"] = False
    room.current_turn_index += 1
    if room.current_turn_index % len(pids) == 0:
        room.turn += 1
    next_pid = pids[room.current_turn_index % len(pids)]
    next_player = room.players[next_pid]
    next_player.cards_played_this_turn = 0
    draw_cards_for_player(room, next_pid, DRAW_PER_TURN)
    recalc_territories(room)
    winner = check_victory(room)
    if winner:
        room.winner = winner
        room.status = "ended"
        socketio.emit("victory", {
            "roomId": room.id,
            "winnerId": winner,
            "winnerName": room.players[winner].name,
        }, room=room.id)
    socketio.emit("turn_changed", {
        "roomId": room.id,
        "newTurnPlayerId": next_pid,
        "turn": room.turn,
    }, room=room.id)
    broadcast_room_state(room)


@socketio.on("request_hand")
def handle_request_hand(data):
    room_id = data.get("roomId")
    player_id = data.get("playerId")
    room = rooms.get(room_id)
    if not room or player_id not in room.players:
        return
    player = room.players[player_id]
    if player.sid == request.sid:
        emit("hand_update", {"hand": player.hand})


@socketio.on("disconnect")
def handle_disconnect():
    room_id = sid_to_room.pop(request.sid, None)
    player_id = sid_to_player.pop(request.sid, None)
    if not room_id or not player_id:
        return
    room = rooms.get(room_id)
    if not room:
        return
    if player_id in room.players:
        del room.players[player_id]
    if len(room.players) == 0:
        del rooms[room_id]
    else:
        if room.owner_id == player_id:
            room.owner_id = next(iter(room.players.keys()))
        if room.status == "playing":
            remaining = list(room.players.keys())
            if len(remaining) == 1:
                room.winner = remaining[0]
                room.status = "ended"
                socketio.emit("victory", {
                    "roomId": room.id,
                    "winnerId": remaining[0],
                    "winnerName": room.players[remaining[0]].name,
                }, room=room.id)
        broadcast_room_state(room)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=False)
