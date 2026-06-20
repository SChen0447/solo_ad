from typing import List, Dict, Any, Optional
from collections import Counter


RARITY_COLORS = {
    "common": "#a0a0a0",
    "rare": "#4fc3f7",
    "epic": "#ab47bc",
    "legendary": "#ffa726",
}


RECIPES: Dict[str, Dict[str, Any]] = {
    "皮革护甲": {
        "materials": {"软质皮革": 3, "绿色粘液": 2},
        "result": {
            "name": "皮革护甲",
            "icon": "🥋",
            "rarity": "rare",
            "description": "由史莱姆软皮制成的基础护甲",
            "type": "armor",
            "attributes": {"防御": 15, "生命": 50},
            "level": 0,
        },
    },
    "粘液药水": {
        "materials": {"史莱姆凝胶": 3, "绿色粘液": 1},
        "result": {
            "name": "粘液药水",
            "icon": "🧪",
            "rarity": "common",
            "description": "恢复少量生命值的药水",
            "type": "consumable",
            "attributes": {"治疗": 30},
            "level": 0,
        },
    },
    "狼牙匕首": {
        "materials": {"狼牙": 3, "破旧匕首": 1},
        "result": {
            "name": "狼牙匕首",
            "icon": "🔪",
            "rarity": "rare",
            "description": "用狼牙加固的匕首",
            "type": "weapon",
            "attributes": {"攻击": 25, "暴击": 10},
            "level": 0,
        },
    },
    "月华之刃": {
        "materials": {"月光碎片": 3, "狼牙": 2, "龙鳞": 1},
        "result": {
            "name": "月华之刃",
            "icon": "⚔️",
            "rarity": "epic",
            "description": "蕴含月光能量的魔法剑",
            "type": "weapon",
            "attributes": {"攻击": 80, "暴击": 20, "速度": 15},
            "level": 0,
        },
    },
    "龙鳞盾牌": {
        "materials": {"龙鳞": 5, "核心石": 2},
        "result": {
            "name": "龙鳞盾牌",
            "icon": "🛡️",
            "rarity": "epic",
            "description": "以龙鳞打造的坚不可摧盾牌",
            "type": "armor",
            "attributes": {"防御": 120, "生命": 100},
            "level": 0,
        },
    },
    "龙牙巨剑": {
        "materials": {"龙牙": 3, "龙爪": 2, "龙血": 1},
        "result": {
            "name": "龙牙巨剑",
            "icon": "🗡️",
            "rarity": "epic",
            "description": "用龙牙和龙爪铸造的巨剑",
            "type": "weapon",
            "attributes": {"攻击": 150, "破甲": 30},
            "level": 0,
        },
    },
    "亡灵法杖": {
        "materials": {"死灵法典": 1, "骨头碎片": 5, "魔晶碎片": 3},
        "result": {
            "name": "亡灵法杖",
            "icon": "🪄",
            "rarity": "epic",
            "description": "召唤亡灵的邪恶法杖",
            "type": "weapon",
            "attributes": {"攻击": 60, "魔力": 200},
            "level": 0,
        },
    },
    "星尘": {
        "materials": {"龙魂宝珠": 1, "月神之泪": 1},
        "result": {
            "name": "星尘",
            "icon": "✨",
            "rarity": "legendary",
            "description": "传说中用于升级装备的神奇材料",
            "type": "material",
            "attributes": {},
            "level": 0,
        },
    },
    "王冠法杖": {
        "materials": {"巫妖王之冠": 1, "死灵法典": 1, "龙心": 1},
        "result": {
            "name": "王冠法杖",
            "icon": "👑",
            "rarity": "legendary",
            "description": "巫妖王之力与龙魂结合的究极法杖",
            "type": "weapon",
            "attributes": {"攻击": 300, "魔力": 500, "召唤": 10},
            "level": 0,
        },
    },
    "远古泰坦护手": {
        "materials": {"远古泰坦石": 1, "元素之心": 2, "龙鳞": 3},
        "result": {
            "name": "远古泰坦护手",
            "icon": "🥊",
            "rarity": "legendary",
            "description": "泰坦之力凝聚而成的护手",
            "type": "armor",
            "attributes": {"防御": 300, "攻击": 100, "生命": 300},
            "level": 0,
        },
    },
    "粘液炸弹": {
        "materials": {"史莱姆凝胶": 5, "绿色粘液": 3},
        "result": {
            "name": "粘液炸弹",
            "icon": "💣",
            "rarity": "common",
            "description": "投掷后会爆出粘液的炸弹",
            "type": "consumable",
            "attributes": {"伤害": 20, "减速": 30},
            "level": 0,
        },
    },
    "哥布林手炮": {
        "materials": {"破旧匕首": 2, "狼牙棒": 1, "金币袋": 3},
        "result": {
            "name": "哥布林手炮",
            "icon": "🔫",
            "rarity": "rare",
            "description": "哥布林工匠改装的奇怪武器",
            "type": "weapon",
            "attributes": {"攻击": 40, "射速": 20},
            "level": 0,
        },
    },
    "狼皮披风": {
        "materials": {"狼毛": 5, "狼爪": 2, "软质皮革": 2},
        "result": {
            "name": "狼皮披风",
            "icon": "🧥",
            "rarity": "rare",
            "description": "用狼毛编织的保暖披风",
            "type": "armor",
            "attributes": {"防御": 30, "速度": 10},
            "level": 0,
        },
    },
    "石化铠甲": {
        "materials": {"石块": 10, "加固铠甲": 1, "核心石": 2},
        "result": {
            "name": "石化铠甲",
            "icon": "🦺",
            "rarity": "rare",
            "description": "石像鬼工艺打造的铠甲",
            "type": "armor",
            "attributes": {"防御": 80, "生命": 80},
            "level": 0,
        },
    },
    "龙息药水": {
        "materials": {"龙血": 2, "魔晶碎片": 3, "史莱姆凝胶": 2},
        "result": {
            "name": "龙息药水",
            "icon": "🍷",
            "rarity": "epic",
            "description": "饮下后可喷吐龙息",
            "type": "consumable",
            "attributes": {"伤害": 150, "持续": 10},
            "level": 0,
        },
    },
    "狂暴药剂": {
        "materials": {"狼人心核": 1, "龙血": 1, "绿色粘液": 2},
        "result": {
            "name": "狂暴药剂",
            "icon": "🧫",
            "rarity": "epic",
            "description": "大幅提升攻击力但降低防御",
            "type": "consumable",
            "attributes": {"攻击+": 100, "防御-": 30},
            "level": 0,
        },
    },
    "哥布林王徽章": {
        "materials": {"哥布林王权杖": 1, "哥布林护符": 2, "金币袋": 5},
        "result": {
            "name": "哥布林王徽章",
            "icon": "🎖️",
            "rarity": "epic",
            "description": "象征哥布林部落最高权力",
            "type": "accessory",
            "attributes": {"金币获取": 50, "召唤哥布林": 5},
            "level": 0,
        },
    },
    "骨质项链": {
        "materials": {"骷髅头": 3, "亡灵护符": 1, "骨头碎片": 5},
        "result": {
            "name": "骨质项链",
            "icon": "📿",
            "rarity": "rare",
            "description": "用骷髅碎片串成的项链",
            "type": "accessory",
            "attributes": {"魔力": 80, "亡灵抗性": 30},
            "level": 0,
        },
    },
    "龙魂战甲": {
        "materials": {"龙鳞": 5, "龙心": 1, "龙魂宝珠": 1, "远古泰坦石": 1},
        "result": {
            "name": "龙魂战甲",
            "icon": "🪖",
            "rarity": "legendary",
            "description": "封印龙魂与泰坦之力的究极铠甲",
            "type": "armor",
            "attributes": {"防御": 500, "生命": 500, "攻击": 100, "魔力": 100},
            "level": 0,
        },
    },
    "史莱姆王徽章": {
        "materials": {"史莱姆王冠": 1, "粘液核心": 3, "软质皮革": 5},
        "result": {
            "name": "史莱姆王徽章",
            "icon": "💚",
            "rarity": "legendary",
            "description": "史莱姆一族的至高象征",
            "type": "accessory",
            "attributes": {"生命回复": 50, "粘液伤害": 100, "召唤史莱姆": 10},
            "level": 0,
        },
    },
}


class RecipeManager:
    def __init__(self) -> None:
        self.recipes = RECIPES

    def get_all_recipes(self) -> Dict[str, Dict[str, Any]]:
        return self.recipes

    def get_recipe(self, name: str) -> Optional[Dict[str, Any]]:
        return self.recipes.get(name)

    def craft(self, materials: List[Dict[str, Any]]) -> Dict[str, Any]:
        if not materials or all(m is None for m in materials):
            return {"success": False, "reason": "合成槽为空，请放入材料"}

        material_counts: Counter = Counter()
        for mat in materials:
            if mat and "name" in mat:
                material_counts[mat["name"]] += mat.get("quantity", 1)

        if not material_counts:
            return {"success": False, "reason": "合成槽为空，请放入材料"}

        for recipe_name, recipe_data in self.recipes.items():
            required = recipe_data["materials"]
            required_counter = Counter(required)

            if material_counts == required_counter:
                result = dict(recipe_data["result"])
                return {
                    "success": True,
                    "recipe": recipe_name,
                    "result": result,
                    "rarity_color": RARITY_COLORS.get(result["rarity"], "#a0a0a0"),
                }

        close_matches = []
        for recipe_name, recipe_data in self.recipes.items():
            required = Counter(recipe_data["materials"])
            overlap = sum((material_counts & required).values())
            total_required = sum(required.values())
            if overlap > 0:
                close_matches.append((recipe_name, overlap, total_required))

        close_matches.sort(key=lambda x: x[1] / x[2] if x[2] > 0 else 0, reverse=True)

        hint = ""
        if close_matches:
            closest = close_matches[0]
            if closest[1] / closest[2] >= 0.5:
                hint = f"提示：与「{closest[0]}」配方接近"

        return {
            "success": False,
            "reason": f"未知的配方组合。{hint}".strip(),
            "close_matches": [cm[0] for cm in close_matches[:3]],
        }
