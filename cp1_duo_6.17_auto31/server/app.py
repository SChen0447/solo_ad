from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DATA_DIR, exist_ok=True)

AFFIXES = [
    {"id": "fire", "name": "火焰", "nameEn": "fire", "color": "#ff4422", "particleColor": "#ff6600",
     "hpMod": 1.0, "atkMod": 1.3, "defMod": 0.8, "attackType": "magical",
     "materials": [{"id": "fire_crystal", "name": "火焰结晶"}, {"id": "ash_powder", "name": "灰烬粉末"}]},
    {"id": "ice", "name": "寒冰", "nameEn": "ice", "color": "#44aaff", "particleColor": "#88ccff",
     "hpMod": 1.2, "atkMod": 1.0, "defMod": 1.2, "attackType": "magical",
     "materials": [{"id": "ice_shard", "name": "寒冰碎片"}, {"id": "frost_essence", "name": "霜华精华"}]},
    {"id": "steel", "name": "钢铁", "nameEn": "steel", "color": "#999999", "particleColor": "#cccccc",
     "hpMod": 1.5, "atkMod": 1.1, "defMod": 1.5, "attackType": "physical",
     "materials": [{"id": "steel_fragment", "name": "钢铁碎片"}, {"id": "iron_dust", "name": "铁尘"}]},
    {"id": "shadow", "name": "暗影", "nameEn": "shadow", "color": "#6622aa", "particleColor": "#9944dd",
     "hpMod": 0.8, "atkMod": 1.5, "defMod": 0.7, "attackType": "magical",
     "materials": [{"id": "shadow_essence", "name": "暗影精华"}, {"id": "void_dust", "name": "虚空之尘"}]},
    {"id": "crystal", "name": "水晶", "nameEn": "crystal", "color": "#dd66ff", "particleColor": "#ff88ff",
     "hpMod": 0.9, "atkMod": 1.4, "defMod": 1.0, "attackType": "magical",
     "materials": [{"id": "crystal_core", "name": "水晶核心"}, {"id": "prism_shard", "name": "棱镜碎片"}]},
    {"id": "root", "name": "树根", "nameEn": "root", "color": "#886633", "particleColor": "#aa8844",
     "hpMod": 1.8, "atkMod": 0.7, "defMod": 1.3, "attackType": "physical",
     "materials": [{"id": "root_fiber", "name": "树根纤维"}, {"id": "bark_scale", "name": "树皮鳞片"}]},
    {"id": "thunder", "name": "雷电", "nameEn": "thunder", "color": "#ffee44", "particleColor": "#ffff88",
     "hpMod": 0.7, "atkMod": 1.6, "defMod": 0.6, "attackType": "magical",
     "materials": [{"id": "thunder_spark", "name": "雷电火花"}, {"id": "storm_core", "name": "风暴核心"}]},
    {"id": "rock", "name": "岩石", "nameEn": "rock", "color": "#887766", "particleColor": "#aa9988",
     "hpMod": 2.0, "atkMod": 0.8, "defMod": 1.8, "attackType": "physical",
     "materials": [{"id": "rock_chunk", "name": "岩石碎块"}, {"id": "granite_dust", "name": "花岗岩粉尘"}]},
    {"id": "dragonblood", "name": "龙血", "nameEn": "dragonblood", "color": "#cc0033", "particleColor": "#ff3355",
     "hpMod": 2.5, "atkMod": 2.0, "defMod": 1.5, "attackType": "magical",
     "materials": [{"id": "dragon_blood", "name": "龙血"}, {"id": "dragon_scale", "name": "龙鳞"}]},
    {"id": "stardust", "name": "星尘", "nameEn": "stardust", "color": "#aaddff", "particleColor": "#ddeeff",
     "hpMod": 1.5, "atkMod": 2.2, "defMod": 1.0, "attackType": "magical",
     "materials": [{"id": "star_dust", "name": "星尘"}, {"id": "comet_fragment", "name": "彗星碎片"}]},
]

RECIPES = [
    {"id": "recipe_blade_1", "name": "烈焰铁刃", "materials": ["fire_crystal", "steel_fragment", "root_fiber"],
     "attack": 35, "defense": 5, "critRate": 0.15, "effect": "攻击时附加火焰伤害，灼烧敌人2回合",
     "iconColor": "#ff4422"},
    {"id": "recipe_blade_2", "name": "寒霜裂刃", "materials": ["ice_shard", "rock_chunk", "thunder_spark"],
     "attack": 40, "defense": 8, "critRate": 0.10, "effect": "攻击时冻结敌人1回合，降低其速度",
     "iconColor": "#44aaff"},
    {"id": "recipe_staff_1", "name": "暗影法杖", "materials": ["shadow_essence", "crystal_core", "void_dust"],
     "attack": 28, "defense": 3, "critRate": 0.25, "effect": "暴击时触发暗影爆发，造成范围伤害",
     "iconColor": "#6622aa"},
    {"id": "recipe_shield_1", "name": "磐石巨盾", "materials": ["rock_chunk", "steel_fragment", "root_fiber"],
     "attack": 10, "defense": 30, "critRate": 0.05, "effect": "格挡成功时反弹20%伤害",
     "iconColor": "#887766"},
    {"id": "recipe_dagger_1", "name": "雷电匕首", "materials": ["thunder_spark", "shadow_essence", "prism_shard"],
     "attack": 30, "defense": 2, "critRate": 0.35, "effect": "攻击速度极快，每次攻击有概率连击",
     "iconColor": "#ffee44"},
    {"id": "recipe_bow_1", "name": "水晶长弓", "materials": ["crystal_core", "root_fiber", "frost_essence"],
     "attack": 32, "defense": 4, "critRate": 0.20, "effect": "箭矢穿透护甲，无视30%防御",
     "iconColor": "#dd66ff"},
    {"id": "recipe_hammer_1", "name": "雷神之锤", "materials": ["thunder_spark", "steel_fragment", "rock_chunk"],
     "attack": 45, "defense": 12, "critRate": 0.08, "effect": "重击地面造成眩晕，使敌人跳过1回合",
     "iconColor": "#ffee44"},
    {"id": "recipe_sword_1", "name": "星尘圣剑", "materials": ["star_dust", "crystal_core", "fire_crystal"],
     "attack": 50, "defense": 10, "critRate": 0.18, "effect": "星辉之力：每回合恢复5%生命值",
     "iconColor": "#aaddff"},
    {"id": "recipe_axe_1", "name": "龙血战斧", "materials": ["dragon_blood", "steel_fragment", "iron_dust"],
     "attack": 55, "defense": 8, "critRate": 0.12, "effect": "击杀敌人时恢复15%最大生命值",
     "iconColor": "#cc0033"},
    {"id": "recipe_wand_1", "name": "龙骨法杖", "materials": ["dragon_blood", "star_dust", "comet_fragment"],
     "attack": 60, "defense": 5, "critRate": 0.22, "effect": "龙息：攻击附带龙焰，持续灼烧3回合",
     "iconColor": "#cc0033"},
    {"id": "recipe_spear_1", "name": "冰岩长枪", "materials": ["ice_shard", "rock_chunk", "granite_dust"],
     "attack": 38, "defense": 15, "critRate": 0.10, "effect": "穿刺攻击，忽略25%护甲值",
     "iconColor": "#44aaff"},
    {"id": "recipe_claw_1", "name": "暗影利爪", "materials": ["shadow_essence", "thunder_spark", "storm_core"],
     "attack": 42, "defense": 3, "critRate": 0.30, "effect": "暗影步：攻击后有30%概率再行动一次",
     "iconColor": "#6622aa"},
]

def _load_collection():
    path = os.path.join(DATA_DIR, 'collection.json')
    if os.path.exists(path):
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    return {"monsters": [], "weapons": []}

def _save_collection(data):
    path = os.path.join(DATA_DIR, 'collection.json')
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

@app.route('/api/bestiary', methods=['GET'])
def get_bestiary():
    return jsonify({"affixes": AFFIXES})

@app.route('/api/recipes', methods=['GET'])
def get_recipes():
    return jsonify({"recipes": RECIPES})

@app.route('/api/recipes/match', methods=['POST'])
def match_recipe():
    data = request.get_json()
    material_ids = sorted(data.get('materials', []))
    for recipe in RECIPES:
        if sorted(recipe['materials']) == material_ids:
            weapon = {
                "id": str(uuid.uuid4()),
                "recipeId": recipe['id'],
                "name": recipe['name'],
                "attack": recipe['attack'],
                "defense": recipe['defense'],
                "critRate": recipe['critRate'],
                "effect": recipe['effect'],
                "iconColor": recipe['iconColor'],
                "forgedAt": datetime.now().isoformat(),
            }
            collection = _load_collection()
            existing = [w for w in collection['weapons'] if w['recipeId'] == recipe['id']]
            if not existing:
                collection['weapons'].append({
                    "recipeId": recipe['id'],
                    "name": recipe['name'],
                    "attack": recipe['attack'],
                    "defense": recipe['defense'],
                    "critRate": recipe['critRate'],
                    "effect": recipe['effect'],
                    "iconColor": recipe['iconColor'],
                    "firstForgedAt": datetime.now().isoformat(),
                })
                _save_collection(collection)
            return jsonify({"matched": True, "weapon": weapon})
    return jsonify({"matched": False})

@app.route('/api/collection', methods=['GET'])
def get_collection():
    collection = _load_collection()
    return jsonify(collection)

@app.route('/api/collection/monster', methods=['POST'])
def add_monster():
    data = request.get_json()
    monster_entry = {
        "id": data.get('id', str(uuid.uuid4())),
        "name": data.get('name', ''),
        "affixes": data.get('affixes', []),
        "hp": data.get('hp', 0),
        "attack": data.get('attack', 0),
        "defense": data.get('defense', 0),
        "drops": data.get('drops', []),
        "defeatedAt": datetime.now().isoformat(),
    }
    collection = _load_collection()
    existing = [m for m in collection['monsters'] if m['name'] == monster_entry['name']
                and sorted(m['affixes']) == sorted(monster_entry['affixes'])]
    if not existing:
        collection['monsters'].append(monster_entry)
        _save_collection(collection)
    return jsonify({"success": True, "collection": collection})

@app.route('/api/collection/unlock', methods=['GET'])
def get_unlocks():
    collection = _load_collection()
    monster_count = len(collection['monsters'])
    weapon_count = len(collection['weapons'])
    unlocked_affixes = []
    if monster_count >= 10:
        unlocked_affixes.append("dragonblood")
    if monster_count >= 20:
        unlocked_affixes.append("stardust")
    forge_slots = 3
    if weapon_count >= 15:
        forge_slots = 4
    return jsonify({
        "monsterCount": monster_count,
        "weaponCount": weapon_count,
        "unlockedAffixes": unlocked_affixes,
        "forgeSlots": forge_slots,
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)
