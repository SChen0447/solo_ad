from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

BASE_ELEMENTS = {
    "fire": {"name": "火", "color1": "#FF4500", "color2": "#FF8C00"},
    "water": {"name": "水", "color1": "#1E90FF", "color2": "#8A2BE2"},
    "earth": {"name": "土", "color1": "#8B4513", "color2": "#2E8B57"},
    "wind": {"name": "风", "color1": "#00CED1", "color2": "#F0F8FF"},
    "light": {"name": "光", "color1": "#FFD700", "color2": "#FFF8DC"},
    "dark": {"name": "暗", "color1": "#4B0082", "color2": "#191970"}
}

SYNTHESIS_TABLE = {
    "earth+water": "mud",
    "water+earth": "mud",
    "fire+wind": "lightning",
    "wind+fire": "lightning",
    "light+dark": "chaos",
    "dark+light": "chaos",
    "fire+earth": "lava",
    "earth+fire": "lava",
    "water+wind": "mist",
    "wind+water": "mist",
    "fire+water": "steam",
    "water+fire": "steam",
    "light+fire": "solar_flare",
    "fire+light": "solar_flare",
    "dark+water": "abyss",
    "water+dark": "abyss",
    "mud+lightning": "life",
    "lightning+mud": "life",
    "lava+water": "obsidian",
    "water+lava": "obsidian",
    "chaos+light": "creation",
    "light+chaos": "creation"
}

COMPOUNDS = {
    "mud": {"name": "泥", "color1": "#8B7355", "color2": "#5C4033"},
    "lightning": {"name": "雷电", "color1": "#FFFF00", "color2": "#00FFFF"},
    "chaos": {"name": "混沌", "color1": "#8B008B", "color2": "#FF1493"},
    "lava": {"name": "熔岩", "color1": "#FF4500", "color2": "#FFD700"},
    "mist": {"name": "迷雾", "color1": "#E0FFFF", "color2": "#B0C4DE"},
    "steam": {"name": "蒸汽", "color1": "#F5F5F5", "color2": "#DCDCDC"},
    "solar_flare": {"name": "日焰", "color1": "#FF6347", "color2": "#FFD700"},
    "abyss": {"name": "深渊", "color1": "#000080", "color2": "#2F0040"},
    "life": {"name": "生命", "color1": "#00FF00", "color2": "#32CD32"},
    "obsidian": {"name": "黑曜石", "color1": "#2F2F2F", "color2": "#696969"},
    "creation": {"name": "创世", "color1": "#FFFFFF", "color2": "#FFD700"}
}

MAGIC_CIRCLE_RECIPES = {
    "chaos": {"level": 2, "unlocks": ["mud+lightning", "lava+water"]},
    "life": {"level": 3, "unlocks": ["chaos+light"]},
    "creation": {"level": 4, "unlocks": []}
}

WORKSHOP_CONFIG = {
    "grid_radius": 3,
    "hex_size": 50,
    "magic_circle_positions": [
        {"q": 0, "r": 0},
        {"q": 2, "r": -1},
        {"q": -2, "r": 1}
    ],
    "initial_element_count": 5
}

PROGRESS_FILE = "progress.json"


def load_progress():
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            return json.load(f)
    return {
        "knowledge_level": 1,
        "unlocked_recipes": [],
        "elements": {elem: 5 for elem in BASE_ELEMENTS},
        "discovered_compounds": []
    }


def save_progress(progress):
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


@app.route("/api/synthesis-table", methods=["GET"])
def get_synthesis_table():
    return jsonify({
        "base_elements": BASE_ELEMENTS,
        "compounds": COMPOUNDS,
        "synthesis_table": SYNTHESIS_TABLE,
        "magic_circle_recipes": MAGIC_CIRCLE_RECIPES,
        "workshop_config": WORKSHOP_CONFIG
    })


@app.route("/api/save-progress", methods=["POST"])
def save_progress_api():
    progress = request.json
    save_progress(progress)
    return jsonify({"status": "success"})


@app.route("/api/load-progress", methods=["GET"])
def load_progress_api():
    progress = load_progress()
    return jsonify(progress)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
