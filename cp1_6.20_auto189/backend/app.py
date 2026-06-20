import io
import csv
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

achievements = {}

MONSTER_TYPES = {
    "哥布林": "人形",
    "兽人": "人形",
    "骷髅兵": "亡灵",
    "僵尸": "亡灵",
    "幽灵": "亡灵",
    "狼": "野兽",
    "熊": "野兽",
    "蜘蛛": "野兽",
    "火元素": "元素",
    "水元素": "元素",
    "雷元素": "元素",
    "恶魔": "恶魔",
    "地狱犬": "恶魔",
    "小鬼": "恶魔",
}


def get_monster_type(monster_name):
    for key in MONSTER_TYPES:
        if key in monster_name:
            return MONSTER_TYPES[key]
    return "人形"


@app.route('/api/parse-logs', methods=['POST'])
def parse_logs():
    if 'file' not in request.files:
        return jsonify({"error": "未找到文件"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "未选择文件"}), 400

    try:
        content = file.read().decode('utf-8')
        lines = content.strip().split('\n')

        events = []
        for line in lines:
            line = line.strip()
            if not line or line.lower().startswith('时间戳') or line.lower().startswith('timestamp'):
                continue

            parts = line.split(',')
            if len(parts) < 5:
                continue

            try:
                timestamp = parts[0].strip()
                monster_name = parts[1].strip()
                damage = int(float(parts[2].strip()))
                is_kill = parts[3].strip().lower() in ['1', 'true', '是', 'yes']
                heal = int(float(parts[4].strip())) if len(parts) > 4 else 0

                monster_type = get_monster_type(monster_name)

                events.append({
                    "timestamp": timestamp,
                    "monster_name": monster_name,
                    "monster_type": monster_type,
                    "damage": damage,
                    "is_kill": is_kill,
                    "heal": heal
                })
            except (ValueError, IndexError):
                continue

        return jsonify({
            "success": True,
            "total": len(events),
            "events": events
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/achievements', methods=['GET'])
def get_achievements():
    return jsonify({
        "success": True,
        "achievements": list(achievements.values())
    })


@app.route('/api/achievements', methods=['POST'])
def create_achievement():
    data = request.json
    achievement_id = f"goal_{len(achievements) + 1}"

    achievement = {
        "id": achievement_id,
        "name": data.get("name", ""),
        "monster_type": data.get("monster_type", "人形"),
        "target_count": data.get("target_count", 100),
        "deadline": data.get("deadline", ""),
        "current_count": 0,
        "created_at": datetime.now().isoformat()
    }

    achievements[achievement_id] = achievement
    return jsonify({
        "success": True,
        "achievement": achievement
    }), 201


@app.route('/api/achievements/<achievement_id>', methods=['PUT'])
def update_achievement(achievement_id):
    if achievement_id not in achievements:
        return jsonify({"error": "成就不存在"}), 404

    data = request.json
    achievement = achievements[achievement_id]

    if "name" in data:
        achievement["name"] = data["name"]
    if "monster_type" in data:
        achievement["monster_type"] = data["monster_type"]
    if "target_count" in data:
        achievement["target_count"] = data["target_count"]
    if "deadline" in data:
        achievement["deadline"] = data["deadline"]
    if "current_count" in data:
        achievement["current_count"] = data["current_count"]

    return jsonify({
        "success": True,
        "achievement": achievement
    })


@app.route('/api/achievements/<achievement_id>', methods=['DELETE'])
def delete_achievement(achievement_id):
    if achievement_id not in achievements:
        return jsonify({"error": "成就不存在"}), 404

    del achievements[achievement_id]
    return jsonify({"success": True})


@app.route('/api/achievements/calculate-progress', methods=['POST'])
def calculate_progress():
    data = request.json
    events = data.get("events", [])

    for achievement in achievements.values():
        monster_type = achievement["monster_type"]
        kill_count = sum(1 for e in events if e.get("monster_type") == monster_type and e.get("is_kill"))
        achievement["current_count"] = kill_count

    return jsonify({
        "success": True,
        "achievements": list(achievements.values())
    })


if __name__ == '__main__':
    app.run(debug=False, port=5000)
