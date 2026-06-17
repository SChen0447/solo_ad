from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import math
import threading
import time
import copy

app = Flask(__name__)
CORS(app)

lock = threading.Lock()

fleet_data = {}
enemy_fleet_data = {}
star_systems = []
routes = []
missions = {}
mission_timers = {}
task_logs = []
MAX_LOGS = 50


def add_log(message):
    global task_logs
    log_entry = {
        "id": len(task_logs),
        "timestamp": time.strftime("%H:%M:%S"),
        "message": message,
    }
    task_logs.append(log_entry)
    if len(task_logs) > MAX_LOGS:
        task_logs = task_logs[-MAX_LOGS:]

SHIP_NAMES = [
    "破晓号", "星尘号", "银河号", "暗影号", "烈焰号", "霜月号",
    "雷鸣号", "风暴号", "幻影号", "铁壁号"
]

ENEMY_SHIP_NAMES = [
    "虚空猎手", "暗星追踪者", "幽灵侦察舰"
]

STAR_NAMES = ["母星·伊甸", "矿星·泰坦", "前哨·守望者", "星港·枢纽", "暗星·深渊", "要塞·壁垒"]

def generate_star_systems():
    global star_systems, routes
    star_systems = []
    types = ["home", "mineral", "outpost", "port", "dark", "fortress"]
    placed = []
    for i in range(6):
        while True:
            x = random.randint(120, 680)
            y = random.randint(80, 420)
            too_close = False
            for px, py in placed:
                if math.hypot(x - px, y - py) < 120:
                    too_close = True
                    break
            if not too_close:
                placed.append((x, y))
                break
        star_systems.append({
            "id": i,
            "name": STAR_NAMES[i],
            "type": types[i],
            "x": x,
            "y": y,
        })
    routes = []
    for i in range(6):
        distances = []
        for j in range(6):
            if i == j:
                continue
            d = math.hypot(star_systems[i]["x"] - star_systems[j]["x"],
                           star_systems[i]["y"] - star_systems[j]["y"])
            distances.append((d, j))
        distances.sort()
        for d, j in distances[:3]:
            edge = tuple(sorted([i, j]))
            if edge not in routes:
                routes.append(edge)


def generate_fleet():
    global fleet_data
    fleet_data = {}
    for i in range(6):
        sid = random.randint(0, 5)
        fleet_data[str(i)] = {
            "id": str(i),
            "name": SHIP_NAMES[i],
            "stars": random.randint(1, 5),
            "hp": random.randint(500, 2000),
            "max_hp": 0,
            "firepower": random.randint(50, 150),
            "speed": random.randint(100, 300),
            "x": star_systems[sid]["x"] + random.randint(-15, 15),
            "y": star_systems[sid]["y"] + random.randint(-15, 15),
            "system_id": sid,
            "status": "idle",
            "faction": "player",
        }
        fleet_data[str(i)]["max_hp"] = fleet_data[str(i)]["hp"]


def generate_enemy_fleet():
    global enemy_fleet_data
    enemy_fleet_data = {}
    for i in range(3):
        sid = random.randint(0, 5)
        enemy_fleet_data[f"e{i}"] = {
            "id": f"e{i}",
            "name": ENEMY_SHIP_NAMES[i],
            "stars": random.randint(2, 4),
            "hp": random.randint(600, 1500),
            "max_hp": 0,
            "firepower": random.randint(60, 130),
            "speed": random.randint(80, 250),
            "x": star_systems[sid]["x"] + random.randint(-20, 20),
            "y": star_systems[sid]["y"] + random.randint(-20, 20),
            "system_id": sid,
            "status": "patrol",
            "faction": "enemy",
        }
        enemy_fleet_data[f"e{i}"]["max_hp"] = enemy_fleet_data[f"e{i}"]["hp"]


def astar(start_id, end_id):
    if start_id == end_id:
        return [start_id]
    adj = {i: [] for i in range(6)}
    for a, b in routes:
        adj[a].append(b)
        adj[b].append(a)
    open_set = [(0, start_id)]
    came_from = {}
    g_score = {i: float('inf') for i in range(6)}
    g_score[start_id] = 0
    f_score = {i: float('inf') for i in range(6)}
    sx, sy = star_systems[start_id]["x"], star_systems[start_id]["y"]
    ex, ey = star_systems[end_id]["x"], star_systems[end_id]["y"]
    f_score[start_id] = math.hypot(sx - ex, sy - ey)
    visited = set()
    while open_set:
        _, current = min(open_set, key=lambda x: x[0])
        open_set = [x for x in open_set if x[1] != current]
        if current in visited:
            continue
        visited.add(current)
        if current == end_id:
            path = []
            while current in came_from:
                path.append(current)
                current = came_from[current]
            path.append(start_id)
            path.reverse()
            return path
        for neighbor in adj[current]:
            if neighbor in visited:
                continue
            nx, ny = star_systems[neighbor]["x"], star_systems[neighbor]["y"]
            cx, cy = star_systems[current]["x"], star_systems[current]["y"]
            tentative_g = g_score[current] + math.hypot(nx - cx, ny - cy)
            if tentative_g < g_score[neighbor]:
                came_from[neighbor] = current
                g_score[neighbor] = tentative_g
                f_score[neighbor] = tentative_g + math.hypot(nx - ex, ny - ey)
                open_set.append((f_score[neighbor], neighbor))
    return [start_id, end_id]


def move_ship_towards(ship, target_x, target_y, step=50):
    dx = target_x - ship["x"]
    dy = target_y - ship["y"]
    dist = math.hypot(dx, dy)
    if dist <= step:
        ship["x"] = target_x
        ship["y"] = target_y
        return True
    ratio = step / dist
    ship["x"] += dx * ratio
    ship["y"] += dy * ratio
    return False


def mission_tick(mission_id):
    m = missions.get(mission_id)
    if not m or m["completed"]:
        return
    ship_id = m["ship_id"]
    path = m["path"]
    path_index = m["path_index"]

    with lock:
        ship = fleet_data.get(ship_id) or enemy_fleet_data.get(ship_id)
        if not ship or ship["hp"] <= 0:
            m["completed"] = True
            return
        if path_index >= len(path):
            m["completed"] = True
            ship["status"] = "idle"
            return

        target_sys = star_systems[path[path_index]]
        arrived = move_ship_towards(ship, target_sys["x"], target_sys["y"], step=50)

        if arrived:
            m["path_index"] += 1
            target_name = star_systems[path[min(m["path_index"], len(path) - 1)]]["name"] if m["path_index"] < len(path) else "目的地"
            if ship["faction"] == "player":
                add_log(f"{ship['name']} 正在前往 {target_name}")
            if m["path_index"] >= len(path):
                m["completed"] = True
                ship["status"] = "idle"
                ship["system_id"] = path[-1]
                if ship["faction"] == "player":
                    add_log(f"{ship['name']} 已抵达 {star_systems[path[-1]]['name']}")

        check_combat()


def check_combat():
    all_ships = list(fleet_data.values()) + list(enemy_fleet_data.values())
    for ps in fleet_data.values():
        if ps["hp"] <= 0:
            continue
        for es in enemy_fleet_data.values():
            if es["hp"] <= 0:
                continue
            dist = math.hypot(ps["x"] - es["x"], ps["y"] - es["y"])
            if dist < 80:
                if ps["status"] != "combat":
                    add_log(f"{ps['name']} 与 {es['name']} 遭遇交火！")
                ps["status"] = "combat"
                es["status"] = "combat"
                ps_dmg = max(1, es["firepower"] - random.randint(0, 20))
                es_dmg = max(1, ps["firepower"] - random.randint(0, 20))
                ps["hp"] = max(0, ps["hp"] - ps_dmg)
                es["hp"] = max(0, es["hp"] - es_dmg)
                if ps["hp"] <= 0 and ps["status"] != "destroyed":
                    add_log(f"{ps['name']} 在战斗中被击毁")
                    ps["status"] = "destroyed"
                if es["hp"] <= 0 and es["status"] != "destroyed":
                    add_log(f"{ps['name']} 击毁了 {es['name']}")
                    es["status"] = "destroyed"


def enemy_ai_tick():
    with lock:
        for eid, eship in enemy_fleet_data.items():
            if eship["hp"] <= 0:
                continue
            if eship["status"] == "destroyed":
                continue
            in_combat = False
            for ps in fleet_data.values():
                if ps["hp"] <= 0:
                    continue
                if math.hypot(ps["x"] - eship["x"], ps["y"] - eship["y"]) < 80:
                    in_combat = True
                    break
            if not in_combat and eship["status"] != "moving":
                target_sys = random.choice(star_systems)
                path = astar(eship["system_id"], target_sys["id"])
                mid = f"enemy_{eid}_{int(time.time())}"
                missions[mid] = {
                    "ship_id": eid,
                    "mission_type": "patrol",
                    "path": path,
                    "path_index": 0,
                    "completed": False,
                }
                eship["status"] = "moving"
                mission_timers[mid] = threading.Event()


def run_mission_loop():
    while True:
        time.sleep(2)
        with lock:
            mids = list(missions.keys())
        for mid in mids:
            m = missions.get(mid)
            if m and not m["completed"]:
                mission_tick(mid)


def run_enemy_ai_loop():
    while True:
        time.sleep(5)
        enemy_ai_tick()


def run_combat_loop():
    while True:
        time.sleep(2)
        with lock:
            check_combat()


@app.route("/api/init_fleet", methods=["POST"])
def init_fleet():
    with lock:
        generate_star_systems()
        generate_fleet()
        generate_enemy_fleet()
        missions.clear()
        task_logs.clear()
        add_log("舰队指挥系统已初始化")
        add_log(f"检测到 {len(fleet_data)} 艘己方战舰和 {len(enemy_fleet_data)} 艘敌舰")
    threading.Thread(target=run_mission_loop, daemon=True).start()
    threading.Thread(target=run_enemy_ai_loop, daemon=True).start()
    threading.Thread(target=run_combat_loop, daemon=True).start()
    return jsonify({
        "fleet": list(fleet_data.values()),
        "enemy_fleet": list(enemy_fleet_data.values()),
        "star_systems": star_systems,
        "routes": routes,
    })


@app.route("/api/assign_mission", methods=["POST"])
def assign_mission():
    data = request.json
    ship_id = data.get("ship_id")
    mission_type = data.get("mission_type")
    path = data.get("path")

    if not ship_id or not mission_type or not path:
        return jsonify({"error": "Missing parameters"}), 400

    with lock:
        ship = fleet_data.get(ship_id) or enemy_fleet_data.get(ship_id)
        if not ship:
            return jsonify({"error": "Ship not found"}), 404
        if ship["hp"] <= 0:
            return jsonify({"error": "Ship destroyed"}), 400

        mid = f"{ship_id}_{int(time.time()*1000)}"
        missions[mid] = {
            "ship_id": ship_id,
            "mission_type": mission_type,
            "path": path,
            "path_index": 0,
            "completed": False,
        }
        ship["status"] = "moving"
        mission_labels = {"patrol": "巡逻", "escort": "护航", "raid": "突袭"}
        label = mission_labels.get(mission_type, mission_type)
        if ship["faction"] == "player":
            add_log(f"{ship['name']} 已分配{label}任务")

    return jsonify({"mission_id": mid, "status": "assigned"})


@app.route("/api/query_status", methods=["GET"])
def query_status():
    with lock:
        fleet = []
        for s in fleet_data.values():
            fleet.append(copy.deepcopy(s))
        enemy = []
        for s in enemy_fleet_data.values():
            enemy.append(copy.deepcopy(s))
        active_missions = []
        for mid, m in missions.items():
            if not m["completed"]:
                active_missions.append({
                    "mission_id": mid,
                    "ship_id": m["ship_id"],
                    "mission_type": m["mission_type"],
                    "path_index": m["path_index"],
                    "completed": m["completed"],
                })
    return jsonify({
        "fleet": fleet,
        "enemy_fleet": enemy,
        "active_missions": active_missions,
        "star_systems": star_systems,
        "routes": routes,
    })


@app.route("/api/calc_path", methods=["POST"])
def calc_path():
    data = request.json
    start_id = data.get("start_id")
    end_id = data.get("end_id")
    if start_id is None or end_id is None:
        return jsonify({"error": "Missing parameters"}), 400
    path = astar(start_id, end_id)
    return jsonify({"path": path})


@app.route("/api/task_logs", methods=["GET"])
def get_task_logs():
    with lock:
        return jsonify({"logs": task_logs[-10:]})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
