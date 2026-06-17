from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import time
from datetime import datetime

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

BATTLE_RECORDS_FILE = os.path.join(DATA_DIR, 'battle_records.json')
HEROES_FILE = os.path.join(DATA_DIR, 'heroes.json')

PRESET_HEROES = [
    {
        "id": "warrior-1",
        "name": "狂战士",
        "heroClass": "warrior",
        "maxHp": 800,
        "hp": 800,
        "attack": 120,
        "defense": 60,
        "speed": 50,
        "skills": [
            {"id": "slash", "name": "猛击", "description": "对单体造成150%攻击力伤害", "damage": 1.5, "cooldown": 2, "range": 1, "type": "damage", "icon": "⚔️"},
            {"id": "whirlwind", "name": "旋风斩", "description": "对周围敌人造成80%攻击力伤害", "damage": 0.8, "cooldown": 3, "range": 2, "type": "damage", "icon": "🌀"},
            {"id": "berserk", "name": "狂暴", "description": "提升自身攻击力30%持续3回合", "damage": 0, "cooldown": 5, "range": 0, "type": "buff", "icon": "💢"}
        ],
        "avatar": "🗡️",
        "kills": 0,
        "damageDealt": 0,
        "damageTaken": 0
    },
    {
        "id": "mage-1",
        "name": "火法师",
        "heroClass": "mage",
        "maxHp": 500,
        "hp": 500,
        "attack": 180,
        "defense": 30,
        "speed": 45,
        "skills": [
            {"id": "fireball", "name": "火球术", "description": "发射火球造成180%攻击力伤害", "damage": 1.8, "cooldown": 2, "range": 5, "type": "damage", "icon": "🔥"},
            {"id": "frostbolt", "name": "冰霜箭", "description": "造成120%伤害并减速目标", "damage": 1.2, "cooldown": 2, "range": 4, "type": "damage", "icon": "❄️"},
            {"id": "meteor", "name": "陨石术", "description": "对区域造成250%攻击力伤害", "damage": 2.5, "cooldown": 5, "range": 6, "type": "damage", "icon": "☄️"}
        ],
        "avatar": "🧙",
        "kills": 0,
        "damageDealt": 0,
        "damageTaken": 0
    },
    {
        "id": "archer-1",
        "name": "神射手",
        "heroClass": "archer",
        "maxHp": 600,
        "hp": 600,
        "attack": 150,
        "defense": 40,
        "speed": 70,
        "skills": [
            {"id": "arrow", "name": "精准射击", "description": "远程攻击造成130%伤害", "damage": 1.3, "cooldown": 1, "range": 6, "type": "damage", "icon": "🏹"},
            {"id": "multishot", "name": "多重射击", "description": "同时攻击3个目标各造成80%伤害", "damage": 0.8, "cooldown": 3, "range": 5, "type": "damage", "icon": "🎯"},
            {"id": "trap", "name": "陷阱", "description": "放置陷阱造成200%伤害", "damage": 2.0, "cooldown": 4, "range": 4, "type": "damage", "icon": "🪤"}
        ],
        "avatar": "🏹",
        "kills": 0,
        "damageDealt": 0,
        "damageTaken": 0
    },
    {
        "id": "tank-1",
        "name": "圣骑士",
        "heroClass": "tank",
        "maxHp": 1200,
        "hp": 1200,
        "attack": 80,
        "defense": 120,
        "speed": 30,
        "skills": [
            {"id": "shieldbash", "name": "盾击", "description": "造成100%伤害并眩晕", "damage": 1.0, "cooldown": 3, "range": 1, "type": "damage", "icon": "🛡️"},
            {"id": "taunt", "name": "嘲讽", "description": "吸引所有敌人攻击自己", "damage": 0, "cooldown": 4, "range": 0, "type": "buff", "icon": "😤"},
            {"id": "fortify", "name": "坚守", "description": "提升防御力50%持续2回合", "damage": 0, "cooldown": 4, "range": 0, "type": "buff", "icon": "🏰"}
        ],
        "avatar": "🛡️",
        "kills": 0,
        "damageDealt": 0,
        "damageTaken": 0
    },
    {
        "id": "assassin-1",
        "name": "暗影刺客",
        "heroClass": "assassin",
        "maxHp": 550,
        "hp": 550,
        "attack": 200,
        "defense": 35,
        "speed": 90,
        "skills": [
            {"id": "backstab", "name": "背刺", "description": "造成200%暴击伤害", "damage": 2.0, "cooldown": 2, "range": 1, "type": "damage", "icon": "🗡️"},
            {"id": "shadowstep", "name": "暗影步", "description": "瞬移到目标身后并攻击", "damage": 1.5, "cooldown": 3, "range": 3, "type": "damage", "icon": "👤"},
            {"id": "poisonblade", "name": "毒刃", "description": "造成伤害并附加持续毒伤", "damage": 0.8, "cooldown": 2, "range": 1, "type": "debuff", "icon": "☠️"}
        ],
        "avatar": "🥷",
        "kills": 0,
        "damageDealt": 0,
        "damageTaken": 0
    },
    {
        "id": "support-1",
        "name": "光明祭司",
        "heroClass": "support",
        "maxHp": 650,
        "hp": 650,
        "attack": 60,
        "defense": 50,
        "speed": 55,
        "skills": [
            {"id": "heal", "name": "治疗术", "description": "恢复目标30%最大生命值", "damage": -0.3, "cooldown": 2, "range": 3, "type": "heal", "icon": "💚"},
            {"id": "blessing", "name": "祝福", "description": "提升全体攻防15%", "damage": 0, "cooldown": 5, "range": 0, "type": "buff", "icon": "✨"},
            {"id": "revive", "name": "复活", "description": "复活一名阵亡英雄恢复50%生命", "damage": -0.5, "cooldown": 8, "range": 5, "type": "heal", "icon": "💫"}
        ],
        "avatar": "💫",
        "kills": 0,
        "damageDealt": 0,
        "damageTaken": 0
    }
]


def load_records():
    if os.path.exists(BATTLE_RECORDS_FILE):
        with open(BATTLE_RECORDS_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []


def save_records(records):
    with open(BATTLE_RECORDS_FILE, 'w', encoding='utf-8') as f:
        json.dump(records, f, ensure_ascii=False, indent=2)


@app.route('/api/heroes', methods=['GET'])
def get_heroes():
    return jsonify(PRESET_HEROES)


@app.route('/api/heroes/<hero_id>', methods=['GET'])
def get_hero(hero_id):
    for hero in PRESET_HEROES:
        if hero['id'] == hero_id:
            return jsonify(hero)
    return jsonify({"error": "Hero not found"}), 404


@app.route('/api/battles', methods=['GET'])
def get_battles():
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('page_size', 10))
    
    records = load_records()
    records.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
    
    total = len(records)
    start = (page - 1) * page_size
    end = start + page_size
    paged = records[start:end]
    
    return jsonify({
        "total": total,
        "page": page,
        "page_size": page_size,
        "data": paged
    })


@app.route('/api/battles/<battle_id>', methods=['GET'])
def get_battle(battle_id):
    records = load_records()
    for record in records:
        if record.get('id') == battle_id:
            return jsonify(record)
    return jsonify({"error": "Battle not found"}), 404


@app.route('/api/battles', methods=['POST'])
def add_battle():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid data"}), 400
    
    data['id'] = data.get('id', f'battle-{int(time.time())}')
    data['timestamp'] = data.get('timestamp', int(time.time() * 1000))
    
    records = load_records()
    records.append(data)
    save_records(records)
    
    return jsonify({"success": True, "id": data['id']}), 201


@app.route('/api/battles/<battle_id>', methods=['DELETE'])
def delete_battle(battle_id):
    records = load_records()
    new_records = [r for r in records if r.get('id') != battle_id]
    
    if len(new_records) == len(records):
        return jsonify({"error": "Battle not found"}), 404
    
    save_records(new_records)
    return jsonify({"success": True})


@app.route('/api/waves', methods=['GET'])
def get_waves():
    waves = [
        {
            "id": "wave-easy",
            "name": "新手试炼",
            "difficulty": "easy",
            "enemies": [
                {"id": "goblin-1", "name": "哥布林战士", "maxHp": 400, "attack": 60, "defense": 20, "speed": 40, "avatar": "👺", "startPosition": {"x": 7, "y": 2}},
                {"id": "goblin-2", "name": "哥布林弓手", "maxHp": 300, "attack": 70, "defense": 15, "speed": 50, "avatar": "🏹", "startPosition": {"x": 7, "y": 4}},
                {"id": "goblin-3", "name": "哥布林战士", "maxHp": 400, "attack": 60, "defense": 20, "speed": 35, "avatar": "👹", "startPosition": {"x": 6, "y": 3}}
            ]
        },
        {
            "id": "wave-normal",
            "name": "兽人入侵",
            "difficulty": "normal",
            "enemies": [
                {"id": "orc-1", "name": "兽人战士", "maxHp": 700, "attack": 100, "defense": 50, "speed": 35, "avatar": "👹", "startPosition": {"x": 7, "y": 1}},
                {"id": "orc-2", "name": "兽人萨满", "maxHp": 500, "attack": 130, "defense": 30, "speed": 45, "avatar": "🧟", "startPosition": {"x": 7, "y": 3}},
                {"id": "orc-3", "name": "兽人战士", "maxHp": 700, "attack": 100, "defense": 50, "speed": 35, "avatar": "👹", "startPosition": {"x": 7, "y": 5}},
                {"id": "wolf-1", "name": "座狼", "maxHp": 450, "attack": 90, "defense": 25, "speed": 70, "avatar": "🐺", "startPosition": {"x": 6, "y": 2}},
                {"id": "wolf-2", "name": "座狼", "maxHp": 450, "attack": 90, "defense": 25, "speed": 70, "avatar": "🐺", "startPosition": {"x": 6, "y": 4}}
            ]
        },
        {
            "id": "wave-hard",
            "name": "魔王降临",
            "difficulty": "hard",
            "enemies": [
                {"id": "demon-lord", "name": "魔王", "maxHp": 2000, "attack": 180, "defense": 80, "speed": 40, "avatar": "😈", "startPosition": {"x": 7, "y": 3}},
                {"id": "demon-1", "name": "恶魔卫士", "maxHp": 900, "attack": 130, "defense": 60, "speed": 45, "avatar": "👿", "startPosition": {"x": 6, "y": 1}},
                {"id": "demon-2", "name": "恶魔卫士", "maxHp": 900, "attack": 130, "defense": 60, "speed": 45, "avatar": "👿", "startPosition": {"x": 6, "y": 5}},
                {"id": "imp-1", "name": "小恶魔", "maxHp": 400, "attack": 100, "defense": 20, "speed": 80, "avatar": "😈", "startPosition": {"x": 5, "y": 2}},
                {"id": "imp-2", "name": "小恶魔", "maxHp": 400, "attack": 100, "defense": 20, "speed": 80, "avatar": "😈", "startPosition": {"x": 5, "y": 4}},
                {"id": "skeleton-1", "name": "骷髅兵", "maxHp": 350, "attack": 80, "defense": 30, "speed": 50, "avatar": "💀", "startPosition": {"x": 7, "y": 0}},
                {"id": "skeleton-2", "name": "骷髅兵", "maxHp": 350, "attack": 80, "defense": 30, "speed": 50, "avatar": "💀", "startPosition": {"x": 7, "y": 6}}
            ]
        }
    ]
    return jsonify(waves)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})


if __name__ == '__main__':
    print("=== 战术编队战棋推演 API ===")
    print("服务器启动在 http://localhost:5000")
    print("")
    print("API 列表:")
    print("  GET  /api/heroes         - 获取所有英雄")
    print("  GET  /api/heroes/<id>    - 获取单个英雄")
    print("  GET  /api/waves          - 获取敌方波次")
    print("  GET  /api/battles        - 获取战斗记录列表")
    print("  GET  /api/battles/<id>   - 获取单场战斗详情")
    print("  POST /api/battles        - 保存战斗记录")
    print("  DELETE /api/battles/<id> - 删除战斗记录")
    print("")
    app.run(debug=True, port=5000)
