import random
import math
import threading
import time
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

fleet = []
enemy_fleet = []
star_systems = []
missions = {}
battles = []
update_lock = threading.Lock()

SHIP_NAMES = [
    "Vanguard", "Aegis", "Nemesis", "Phoenix", "Starbound", "Infinity",
    "Odyssey", "Endeavour", "Resolute", "Valiant", "Defiant", "Reliant"
]

ENEMY_NAMES = [
    "Razor", "Viper", "Shadow", "Wraith", "Reaper", "Havoc"
]

SYSTEM_TYPES = ["home", "mining", "outpost", "outpost", "mining", "outpost"]


def init_star_systems():
    global star_systems
    star_systems = []
    positions = [
        (100, 100), (350, 180), (600, 120),
        (200, 350), (500, 400), (700, 300)
    ]
    for i in range(6):
        star_systems.append({
            "id": f"sys_{i}",
            "name": f"System {chr(65 + i)}",
            "type": SYSTEM_TYPES[i],
            "x": positions[i][0],
            "y": positions[i][1],
            "connections": []
        })
    for i in range(len(star_systems)):
        for j in range(i + 1, len(star_systems)):
            dist = math.sqrt(
                (star_systems[i]["x"] - star_systems[j]["x"]) ** 2 +
                (star_systems[i]["y"] - star_systems[j]["y"]) ** 2
            )
            if dist < 400 and random.random() > 0.3:
                star_systems[i]["connections"].append(star_systems[j]["id"])
                star_systems[j]["connections"].append(star_systems[i]["id"])

    for sys_node in star_systems:
        if not sys_node["connections"]:
            nearest = min(
                [s for s in star_systems if s["id"] != sys_node["id"]],
                key=lambda s: math.sqrt(
                    (s["x"] - sys_node["x"]) ** 2 + (s["y"] - sys_node["y"]) ** 2
                )
            )
            sys_node["connections"].append(nearest["id"])
            nearest["connections"].append(sys_node["id"])


def init_fleet():
    global fleet
    fleet = []
    used_names = random.sample(SHIP_NAMES, 6)
    home_system = star_systems[0] if star_systems else {"x": 100, "y": 100}
    for i in range(6):
        stars = random.randint(1, 5)
        ship = {
            "id": f"ship_{i}",
            "name": used_names[i],
            "stars": stars,
            "maxHull": random.randint(500, 2000),
            "hull": 0,
            "firepower": random.randint(50, 150),
            "speed": random.randint(100, 300),
            "x": home_system["x"] + random.uniform(-30, 30),
            "y": home_system["y"] + random.uniform(-30, 30),
            "faction": "player",
            "status": "idle",
            "target_x": None,
            "target_y": None,
            "path": [],
            "path_index": 0,
            "mission_id": None,
            "mission_type": None,
            "alive": True,
            "last_attack_time": 0
        }
        ship["hull"] = ship["maxHull"]
        fleet.append(ship)
    return fleet


def init_enemy_fleet():
    global enemy_fleet
    enemy_fleet = []
    used_names = random.sample(ENEMY_NAMES, 3)
    far_system = star_systems[5] if len(star_systems) > 5 else {"x": 700, "y": 300}
    for i in range(3):
        ship = {
            "id": f"enemy_{i}",
            "name": used_names[i],
            "stars": random.randint(2, 4),
            "maxHull": random.randint(400, 1500),
            "hull": 0,
            "firepower": random.randint(40, 120),
            "speed": random.randint(120, 250),
            "x": far_system["x"] + random.uniform(-40, 40),
            "y": far_system["y"] + random.uniform(-40, 40),
            "faction": "enemy",
            "status": "patrol",
            "patrol_target_idx": random.randint(0, len(star_systems) - 1) if star_systems else 0,
            "alive": True,
            "last_attack_time": 0
        }
        ship["hull"] = ship["maxHull"]
        enemy_fleet.append(ship)
    return enemy_fleet


def astar(start_id, goal_id):
    nodes = {s["id"]: s for s in star_systems}
    if start_id not in nodes or goal_id not in nodes:
        return []

    open_set = {start_id}
    came_from = {}
    g_score = {sid: float("inf") for sid in nodes}
    g_score[start_id] = 0
    f_score = {sid: float("inf") for sid in nodes}
    f_score[start_id] = _heuristic(nodes[start_id], nodes[goal_id])

    while open_set:
        current = min(open_set, key=lambda sid: f_score[sid])
        if current == goal_id:
            path = []
            while current in came_from:
                path.append(nodes[current])
                current = came_from[current]
            path.append(nodes[start_id])
            path.reverse()
            return path

        open_set.remove(current)
        for neighbor_id in nodes[current]["connections"]:
            tentative = g_score[current] + _dist(nodes[current], nodes[neighbor_id])
            if tentative < g_score[neighbor_id]:
                came_from[neighbor_id] = current
                g_score[neighbor_id] = tentative
                f_score[neighbor_id] = tentative + _heuristic(nodes[neighbor_id], nodes[goal_id])
                open_set.add(neighbor_id)
    return []


def _heuristic(a, b):
    return _dist(a, b)


def _dist(a, b):
    return math.sqrt((a["x"] - b["x"]) ** 2 + (a["y"] - b["y"]) ** 2)


def update_simulation():
    with update_lock:
        now = time.time()
        move_speed = 50

        for ship in fleet:
            if not ship["alive"]:
                continue
            if ship["status"] == "moving" and ship["path"] and ship["path_index"] < len(ship["path"]):
                target = ship["path"][ship["path_index"]]
                dx = target["x"] - ship["x"]
                dy = target["y"] - ship["y"]
                dist = math.sqrt(dx * dx + dy * dy)
                if dist <= move_speed:
                    ship["x"] = target["x"]
                    ship["y"] = target["y"]
                    ship["path_index"] += 1
                    if ship["path_index"] >= len(ship["path"]):
                        ship["status"] = "idle"
                        ship["path"] = []
                        ship["path_index"] = 0
                else:
                    ship["x"] += (dx / dist) * move_speed
                    ship["y"] += (dy / dist) * move_speed

        for enemy in enemy_fleet:
            if not enemy["alive"]:
                continue
            if not star_systems:
                continue
            target_system = star_systems[enemy["patrol_target_idx"]]
            dx = target_system["x"] - enemy["x"]
            dy = target_system["y"] - enemy["y"]
            dist = math.sqrt(dx * dx + dy * dy)
            if dist <= move_speed * 0.8:
                enemy["patrol_target_idx"] = random.randint(0, len(star_systems) - 1)
            else:
                spd = move_speed * 0.8
                enemy["x"] += (dx / dist) * spd
                enemy["y"] += (dy / dist) * spd

        _check_battles(now)


def _check_battles(now):
    all_ships = [s for s in fleet if s["alive"]] + [s for s in enemy_fleet if s["alive"]]
    battle_distance = 80
    battle_interval = 2.0

    player_in_battle = set()
    enemy_in_battle = set()

    for ship in fleet:
        if not ship["alive"]:
            continue
        for enemy in enemy_fleet:
            if not enemy["alive"]:
                continue
            dist = math.sqrt((ship["x"] - enemy["x"]) ** 2 + (ship["y"] - enemy["y"]) ** 2)
            if dist < battle_distance:
                player_in_battle.add(ship["id"])
                enemy_in_battle.add(enemy["id"])
                if now - ship["last_attack_time"] >= battle_interval:
                    enemy["hull"] -= ship["firepower"]
                    ship["last_attack_time"] = now
                    if enemy["hull"] <= 0:
                        enemy["hull"] = 0
                        enemy["alive"] = False
                if now - enemy["last_attack_time"] >= battle_interval:
                    ship["hull"] -= enemy["firepower"]
                    enemy["last_attack_time"] = now
                    if ship["hull"] <= 0:
                        ship["hull"] = 0
                        ship["alive"] = False

    for ship in fleet:
        if ship["id"] in player_in_battle and ship["alive"]:
            ship["status"] = "battle"
        elif ship["alive"] and ship["status"] == "battle":
            if ship["path"] and ship["path_index"] < len(ship["path"]):
                ship["status"] = "moving"
            else:
                ship["status"] = "idle"

    for enemy in enemy_fleet:
        if enemy["id"] in enemy_in_battle and enemy["alive"]:
            enemy["status"] = "battle"
        elif enemy["alive"] and enemy["status"] == "battle":
            enemy["status"] = "patrol"


def simulation_loop():
    while True:
        time.sleep(2)
        update_simulation()


@app.route("/api/init_fleet", methods=["POST"])
def api_init_fleet():
    init_star_systems()
    init_fleet()
    init_enemy_fleet()
    return jsonify({
        "fleet": fleet,
        "enemyFleet": enemy_fleet,
        "starSystems": star_systems
    })


@app.route("/api/query_status", methods=["GET"])
def api_query_status():
    with update_lock:
        return jsonify({
            "fleet": [s for s in fleet],
            "enemyFleet": [s for s in enemy_fleet],
            "starSystems": star_systems,
            "battles": battles
        })


@app.route("/api/assign_mission", methods=["POST"])
def api_assign_mission():
    data = request.json
    ship_id = data.get("ship_id")
    mission_type = data.get("mission_type")
    target_system_id = data.get("target_system_id")
    path = data.get("path", [])

    ship = next((s for s in fleet if s["id"] == ship_id), None)
    if not ship:
        return jsonify({"error": "Ship not found"}), 404
    if not ship["alive"]:
        return jsonify({"error": "Ship destroyed"}), 400

    with update_lock:
        ship["mission_type"] = mission_type
        ship["path"] = path if path else []
        ship["path_index"] = 0
        ship["status"] = "moving" if ship["path"] else "idle"

    return jsonify({"success": True, "ship": ship})


@app.route("/api/find_path", methods=["POST"])
def api_find_path():
    data = request.json
    start_id = data.get("start_id")
    end_id = data.get("end_id")
    path = astar(start_id, end_id)
    return jsonify({"path": path})


@app.route("/api/star_systems", methods=["GET"])
def api_star_systems():
    return jsonify({"starSystems": star_systems})


if __name__ == "__main__":
    init_star_systems()
    init_fleet()
    init_enemy_fleet()
    sim_thread = threading.Thread(target=simulation_loop, daemon=True)
    sim_thread.start()
    app.run(host="0.0.0.0", port=5000, debug=False)
