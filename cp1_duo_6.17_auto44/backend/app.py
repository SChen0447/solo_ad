import json
import os
import random
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from asteroid_generator import generate_asteroid_field, ORE_TYPES

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

PLAYER_FILE = os.path.join(DATA_DIR, "players.json")
LEADERBOARD_FILE = os.path.join(DATA_DIR, "leaderboard.json")
MARKET_FILE = os.path.join(DATA_DIR, "market.json")

market_state = {
    "last_update": 0,
    "prices": {},
    "sell_history": {},
}

for ore, cfg in ORE_TYPES.items():
    market_state["prices"][ore] = {
        "ore": ore,
        "price": cfg["base_value"],
        "change": 0,
        "history": [cfg["base_value"]] * 24,
    }
    market_state["sell_history"][ore] = 0


def load_json(filepath: str, default=None):
    if os.path.exists(filepath):
        with open(filepath, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return default if default is not None else {}
    return default if default is not None else {}


def save_json(filepath: str, data):
    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def update_market_prices():
    now = time.time()
    if now - market_state["last_update"] < 3600:
        return

    market_state["last_update"] = now

    for ore, cfg in ORE_TYPES.items():
        current = market_state["prices"][ore]
        base = cfg["base_value"]

        sell_pressure = market_state["sell_history"].get(ore, 0)
        pressure_factor = max(0.7, 1.0 - sell_pressure * 0.01)

        random_factor = 1.0 + (random.random() - 0.5) * 0.15
        new_price = max(base * 0.5, base * pressure_factor * random_factor)
        new_price = round(new_price, 2)

        change = new_price - current["price"]
        current["change"] = round(change, 2)
        current["price"] = new_price
        current["history"].append(new_price)
        if len(current["history"]) > 24:
            current["history"] = current["history"][-24:]

        market_state["sell_history"][ore] = max(0, market_state["sell_history"][ore] - 2)

    save_json(MARKET_FILE, market_state)


def init_market():
    global market_state
    saved = load_json(MARKET_FILE)
    if saved and "prices" in saved:
        market_state = saved
    else:
        update_market_prices()


@app.route("/api/player/save", methods=["POST"])
def save_player():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    player_id = data.get("player_id", "default")
    players = load_json(PLAYER_FILE, {})
    players[player_id] = {
        "credits": data.get("credits", 0),
        "level": data.get("level", 1),
        "cargo": data.get("cargo", []),
        "cargoCapacity": data.get("cargoCapacity", 10),
        "engineSpeed": data.get("engineSpeed", 200),
        "smelterEfficiency": data.get("smelterEfficiency", 1.0),
        "totalOreMined": data.get("totalOreMined", 0),
        "upgrades": data.get("upgrades", []),
        "last_save": datetime.now().isoformat(),
    }
    save_json(PLAYER_FILE, players)

    leaderboard = load_json(LEADERBOARD_FILE, [])
    entry = {
        "name": f"矿工_{player_id[:6]}",
        "credits": players[player_id]["credits"],
        "totalOreMined": players[player_id]["totalOreMined"],
        "level": players[player_id]["level"],
    }
    found = False
    for i, e in enumerate(leaderboard):
        if e.get("name") == entry["name"]:
            leaderboard[i] = entry
            found = True
            break
    if not found:
        leaderboard.append(entry)
    leaderboard.sort(key=lambda x: x.get("credits", 0), reverse=True)
    leaderboard = leaderboard[:50]
    save_json(LEADERBOARD_FILE, leaderboard)

    return jsonify({"status": "ok"})


@app.route("/api/player/load", methods=["GET"])
def load_player():
    player_id = request.args.get("player_id", "default")
    players = load_json(PLAYER_FILE, {})
    if player_id in players:
        return jsonify(players[player_id])
    return jsonify({}), 404


@app.route("/api/market/prices", methods=["GET"])
def get_market_prices():
    update_market_prices()
    prices = list(market_state["prices"].values())
    return jsonify(prices)


@app.route("/api/market/sell", methods=["POST"])
def sell_ore():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400

    ore = data.get("ore")
    amount = data.get("amount", 0)

    if ore not in ORE_TYPES:
        return jsonify({"error": "Invalid ore type"}), 400

    market_state["sell_history"][ore] = market_state["sell_history"].get(ore, 0) + amount

    price = market_state["prices"][ore]["price"]
    total = price * amount * 0.95

    return jsonify({
        "status": "ok",
        "ore": ore,
        "amount": amount,
        "unit_price": price,
        "total": round(total, 2),
        "fee": round(price * amount * 0.05, 2),
    })


@app.route("/api/leaderboard", methods=["GET"])
def get_leaderboard():
    leaderboard = load_json(LEADERBOARD_FILE, [])
    return jsonify(leaderboard[:10])


@app.route("/api/asteroids/generate", methods=["GET"])
def generate_asteroids():
    count = int(request.args.get("count", 18))
    field = generate_asteroid_field(count=count)
    return jsonify(field)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "time": datetime.now().isoformat()})


init_market()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
