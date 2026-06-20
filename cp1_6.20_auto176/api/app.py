import json
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS
from api.models import db, Plant


def create_app():
    app = Flask(__name__)
    app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///plants.db"
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    CORS(app, origins=["http://localhost:5173"])

    with app.app_context():
        db.create_all()

    @app.route("/api/match", methods=["POST"])
    def match():
        data = request.get_json()
        if not data or "histogram" not in data:
            return jsonify({"error": "histogram field is required"}), 400

        input_hist = np.array(data["histogram"], dtype=np.float64)
        input_norm = np.linalg.norm(input_hist)
        if input_norm == 0:
            return jsonify({"results": []})

        input_hist = input_hist / input_norm

        plants = Plant.query.all()
        results = []

        for plant in plants:
            if not plant.color_histogram_json:
                continue
            plant_hist = np.array(json.loads(plant.color_histogram_json), dtype=np.float64)
            plant_norm = np.linalg.norm(plant_hist)
            if plant_norm == 0:
                continue
            plant_hist_normed = plant_hist / plant_norm
            similarity = float(np.dot(input_hist, plant_hist_normed))
            results.append({
                "id": plant.id,
                "scientific_name": plant.scientific_name,
                "common_name": plant.common_name,
                "family": plant.family,
                "genus": plant.genus,
                "similarity": round(similarity, 6),
                "thumbnail": json.loads(plant.image_urls_json)[0] if plant.image_urls_json else None,
            })

        results.sort(key=lambda x: x["similarity"], reverse=True)
        return jsonify({"results": results[:10]})

    @app.route("/api/plants", methods=["GET"])
    def get_plants():
        plants = Plant.query.all()
        result = []
        for plant in plants:
            image_urls = json.loads(plant.image_urls_json) if plant.image_urls_json else []
            thumbnail = image_urls[0] if image_urls else "https://via.placeholder.com/200x200?text=No+Image"
            result.append({
                "id": plant.id,
                "scientific_name": plant.scientific_name,
                "common_name": plant.common_name,
                "family": plant.family,
                "genus": plant.genus,
                "thumbnail": thumbnail,
            })
        return jsonify(result)

    @app.route("/api/plant/<int:plant_id>", methods=["GET"])
    def get_plant(plant_id):
        plant = Plant.query.get(plant_id)
        if not plant:
            return jsonify({"error": "Plant not found"}), 404
        return jsonify(plant.to_dict())

    @app.route("/api/families", methods=["GET"])
    def get_families():
        families = db.session.query(Plant.family).distinct().all()
        return jsonify([f[0] for f in families])

    return app
