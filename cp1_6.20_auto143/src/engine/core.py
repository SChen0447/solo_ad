import random
import hashlib
from typing import List, Dict, Any, Optional


MONSTERS: Dict[str, Dict[str, Any]] = {
    "slime": {
        "name": "史莱姆",
        "icon": "🟢",
        "drops": [
            {"item": "史莱姆凝胶", "weight": 40, "rarity": "common", "icon": "💧", "description": "黏糊糊的史莱姆分泌物"},
            {"item": "绿色粘液", "weight": 30, "rarity": "common", "icon": "🟩", "description": "基础炼金材料"},
            {"item": "软质皮革", "weight": 15, "rarity": "rare", "icon": "🟫", "description": "经过处理的史莱姆表皮"},
            {"item": "粘液核心", "weight": 10, "rarity": "epic", "icon": "💚", "description": "蕴含史莱姆生命能量的核心"},
            {"item": "史莱姆王冠", "weight": 5, "rarity": "legendary", "icon": "👑", "description": "传说中史莱姆王的王冠"},
        ],
    },
    "goblin": {
        "name": "哥布林",
        "icon": "👺",
        "drops": [
            {"item": "破旧匕首", "weight": 35, "rarity": "common", "icon": "🗡️", "description": "哥布林使用的劣质武器"},
            {"item": "金币袋", "weight": 25, "rarity": "common", "icon": "💰", "description": "装有少量金币的小袋子"},
            {"item": "哥布林耳朵", "weight": 20, "rarity": "common", "icon": "👂", "description": "任务物品"},
            {"item": "狼牙棒", "weight": 12, "rarity": "rare", "icon": "🔨", "description": "粗糙但威力不俗的钝器"},
            {"item": "哥布林护符", "weight": 6, "rarity": "epic", "icon": "🔮", "description": "蕴含微弱魔力的护身符"},
            {"item": "哥布林王权杖", "weight": 2, "rarity": "legendary", "icon": "🏆", "description": "哥布林部落首领的权杖"},
        ],
    },
    "wolf": {
        "name": "狼人",
        "icon": "🐺",
        "drops": [
            {"item": "狼毛", "weight": 35, "rarity": "common", "icon": "🐾", "description": "柔软的狼类毛发"},
            {"item": "狼牙", "weight": 25, "rarity": "common", "icon": "🦷", "description": "锋利的狼牙"},
            {"item": "狼爪", "weight": 20, "rarity": "rare", "icon": "🐕", "description": "坚硬的狼爪"},
            {"item": "月光碎片", "weight": 12, "rarity": "rare", "icon": "🌙", "description": "狼人变身时遗留的月光能量"},
            {"item": "狼人心核", "weight": 6, "rarity": "epic", "icon": "❤️", "description": "蕴含狂暴力量的心脏"},
            {"item": "月神之泪", "weight": 2, "rarity": "legendary", "icon": "💎", "description": "传说中月神为狼人落下的眼泪"},
        ],
    },
    "dragon": {
        "name": "龙",
        "icon": "🐉",
        "drops": [
            {"item": "龙鳞", "weight": 30, "rarity": "rare", "icon": "🛡️", "description": "坚不可摧的龙之鳞片"},
            {"item": "龙爪", "weight": 20, "rarity": "rare", "icon": "🦅", "description": "削铁如泥的龙之爪"},
            {"item": "龙牙", "weight": 18, "rarity": "rare", "icon": "🦷", "description": "珍贵的龙之牙"},
            {"item": "龙血", "weight": 15, "rarity": "epic", "icon": "🩸", "description": "蕴含强大魔力的龙之血"},
            {"item": "龙心", "weight": 10, "rarity": "epic", "icon": "💖", "description": "龙之心脏，力量的源泉"},
            {"item": "龙魂宝珠", "weight": 7, "rarity": "legendary", "icon": "🔷", "description": "封印着龙魂的神秘宝珠"},
        ],
    },
    "skeleton": {
        "name": "骷髅兵",
        "icon": "💀",
        "drops": [
            {"item": "骨头碎片", "weight": 40, "rarity": "common", "icon": "🦴", "description": "普通的骨头碎片"},
            {"item": "生锈剑", "weight": 25, "rarity": "common", "icon": "⚔️", "description": "早已锈蚀的铁剑"},
            {"item": "骷髅头", "weight": 15, "rarity": "common", "icon": "💀", "description": "会咯咯作响的骷髅头"},
            {"item": "亡灵护符", "weight": 12, "rarity": "rare", "icon": "📿", "description": "保护亡灵不受阳光伤害"},
            {"item": "死灵法典", "weight": 6, "rarity": "epic", "icon": "📖", "description": "记载着禁忌死灵法术的法典"},
            {"item": "巫妖王之冠", "weight": 2, "rarity": "legendary", "icon": "👑", "description": "传说中巫妖王的王冠"},
        ],
    },
    "golem": {
        "name": "石像鬼",
        "icon": "🗿",
        "drops": [
            {"item": "石块", "weight": 35, "rarity": "common", "icon": "🪨", "description": "普通的岩石碎块"},
            {"item": "魔晶碎片", "weight": 25, "rarity": "common", "icon": "💠", "description": "蕴含魔力的水晶碎片"},
            {"item": "核心石", "weight": 18, "rarity": "rare", "icon": "🔶", "description": "驱动石像鬼的能量核心"},
            {"item": "加固铠甲", "weight": 12, "rarity": "rare", "icon": "🛡️", "description": "石像鬼身上的石质铠甲"},
            {"item": "元素之心", "weight": 7, "rarity": "epic", "icon": "💛", "description": "土元素凝聚而成的心脏"},
            {"item": "远古泰坦石", "weight": 3, "rarity": "legendary", "icon": "🏔️", "description": "据说来自远古泰坦的身体"},
        ],
    },
}

RARITY_ORDER = {"common": 0, "rare": 1, "epic": 2, "legendary": 3}


class DropEngine:
    def __init__(self) -> None:
        self.monsters = MONSTERS

    def _seed_random(self, seed: Optional[str]) -> None:
        if seed:
            seed_hash = int(hashlib.md5(seed.encode("utf-8")).hexdigest(), 16)
            random.seed(seed_hash)
        else:
            random.seed()

    def _weighted_choice(self, drops: List[Dict[str, Any]]) -> Dict[str, Any]:
        total_weight = sum(d["weight"] for d in drops)
        r = random.uniform(0, total_weight)
        cumulative = 0
        for drop in drops:
            cumulative += drop["weight"]
            if r <= cumulative:
                return drop
        return drops[-1]

    def simulate(
        self, monster_id: str, count: int = 1, seed: Optional[str] = None
    ) -> Dict[str, Any]:
        if monster_id not in self.monsters:
            raise ValueError(f"未知怪物: {monster_id}")

        if count < 1 or count > 100:
            raise ValueError("掉落次数必须在1到100之间")

        self._seed_random(seed)
        monster = self.monsters[monster_id]
        drops_data = monster["drops"]

        results: List[Dict[str, Any]] = []
        for _ in range(count):
            chosen = self._weighted_choice(drops_data)
            results.append({
                "name": chosen["item"],
                "icon": chosen["icon"],
                "rarity": chosen["rarity"],
                "description": chosen["description"],
                "quantity": 1,
            })

        results.sort(key=lambda x: RARITY_ORDER.get(x["rarity"], 99))

        return {
            "monster": {
                "id": monster_id,
                "name": monster["name"],
                "icon": monster["icon"],
            },
            "count": count,
            "seed": seed or "",
            "drops": results,
        }

    def get_monsters(self) -> List[Dict[str, str]]:
        return [
            {"id": mid, "name": m["name"], "icon": m["icon"]}
            for mid, m in self.monsters.items()
        ]

    def upgrade_equipment(
        self, equipment: Dict[str, Any], materials: List[Dict[str, Any]], gold: int, seed: Optional[str] = None
    ) -> Dict[str, Any]:
        self._seed_random(seed)
        current_level = equipment.get("level", 0)
        base_success = 0.5 - (current_level * 0.1)
        base_success = max(base_success, 0.05)

        required_materials = ["龙鳞", "星尘"]
        material_names = [m["name"] for m in materials]
        has_required = all(rm in material_names for rm in required_materials)
        required_gold = (current_level + 1) * 100

        if not has_required:
            return {
                "success": False,
                "reason": f"升级需要材料: {', '.join(required_materials)}",
                "equipment": equipment,
            }

        if gold < required_gold:
            return {
                "success": False,
                "reason": f"升级需要 {required_gold} 金币",
                "equipment": equipment,
            }

        roll = random.random()
        if roll < base_success:
            new_level = current_level + 1
            multiplier = 1 + (new_level * 0.1)
            new_attributes = {}
            for k, v in equipment.get("attributes", {}).items():
                if isinstance(v, (int, float)):
                    new_attributes[k] = int(v * multiplier)
                else:
                    new_attributes[k] = v
            upgraded = dict(equipment)
            upgraded["level"] = new_level
            upgraded["attributes"] = new_attributes
            return {
                "success": True,
                "success_rate": base_success,
                "required_gold": required_gold,
                "equipment": upgraded,
            }
        else:
            return {
                "success": False,
                "reason": "升级失败！材料已消耗，装备保留。",
                "success_rate": base_success,
                "required_gold": required_gold,
                "equipment": equipment,
                "materials_consumed": True,
            }
