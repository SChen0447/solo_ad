import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

from engine.core import DropEngine
from engine.recipe import RecipeManager


def create_app() -> Flask:
    app = Flask(__name__, static_folder=None, static_url_path=None)
    CORS(app)

    drop_engine = DropEngine()
    recipe_manager = RecipeManager()

    dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "dist"))
    if os.path.isdir(dist_path):
        app.static_folder = dist_path

        @app.route("/", defaults={"path": ""})
        @app.route("/<path:path>")
        def serve_frontend(path: str):
            if path and os.path.exists(os.path.join(dist_path, path)):
                return send_from_directory(dist_path, path)
            return send_from_directory(dist_path, "index.html")

    @app.route("/api/monsters", methods=["GET"])
    def get_monsters():
        try:
            monsters = drop_engine.get_monsters()
            return jsonify({"success": True, "monsters": monsters})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route("/api/simulate", methods=["POST"])
    def simulate_drops():
        try:
            data = request.get_json(force=True)
            monster_id = data.get("monster_id")
            count = int(data.get("count", 1))
            seed = data.get("seed") or None

            if not monster_id:
                return jsonify({"success": False, "error": "缺少怪物ID"}), 400

            result = drop_engine.simulate(monster_id, count, seed)
            return jsonify({"success": True, "data": result})
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400
        except Exception as e:
            return jsonify({"success": False, "error": f"服务器错误: {str(e)}"}), 500

    @app.route("/api/recipes", methods=["GET"])
    def get_recipes():
        try:
            recipes = recipe_manager.get_all_recipes()
            simplified = {}
            for name, data in recipes.items():
                simplified[name] = {
                    "materials": data["materials"],
                    "result": {
                        "name": data["result"]["name"],
                        "icon": data["result"]["icon"],
                        "rarity": data["result"]["rarity"],
                        "type": data["result"]["type"],
                    },
                }
            return jsonify({"success": True, "recipes": simplified})
        except Exception as e:
            return jsonify({"success": False, "error": str(e)}), 500

    @app.route("/api/craft", methods=["POST"])
    def craft():
        try:
            data = request.get_json(force=True)
            materials = data.get("materials", [])

            if not isinstance(materials, list):
                return jsonify({"success": False, "error": "材料格式错误"}), 400

            result = recipe_manager.craft(materials)
            return jsonify({"success": True, "data": result})
        except Exception as e:
            return jsonify({"success": False, "error": f"服务器错误: {str(e)}"}), 500

    @app.route("/api/upgrade", methods=["POST"])
    def upgrade():
        try:
            data = request.get_json(force=True)
            equipment = data.get("equipment")
            materials = data.get("materials", [])
            gold = int(data.get("gold", 0))
            seed = data.get("seed") or None

            if not equipment:
                return jsonify({"success": False, "error": "缺少装备信息"}), 400

            result = drop_engine.upgrade_equipment(equipment, materials, gold, seed)
            return jsonify({"success": True, "data": result})
        except ValueError as e:
            return jsonify({"success": False, "error": str(e)}), 400
        except Exception as e:
            return jsonify({"success": False, "error": f"服务器错误: {str(e)}"}), 500

    @app.errorhandler(404)
    def not_found(e):
        if app.static_folder and os.path.exists(app.static_folder):
            return send_from_directory(app.static_folder, "index.html")
        return jsonify({"success": False, "error": "Not Found"}), 404

    return app


if __name__ == "__main__":
    flask_app = create_app()
    flask_app.run(host="0.0.0.0", port=5000, debug=True)
