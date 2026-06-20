from flask import Flask, jsonify
from flask_cors import CORS
from species_data import SPECIES_DATA

app = Flask(__name__)
CORS(app)


@app.route("/api/species", methods=["GET"])
def get_all_species():
    species_list = []
    for sid, data in SPECIES_DATA.items():
        species_list.append(
            {
                "id": data["id"],
                "name": data["name"],
                "nameEn": data["nameEn"],
                "thumbnail": data["thumbnail"],
                "description": data["description"],
            }
        )
    return jsonify(species_list)


@app.route("/api/species/<species_id>", methods=["GET"])
def get_species_detail(species_id):
    data = SPECIES_DATA.get(species_id)
    if data is None:
        return jsonify({"error": "Species not found"}), 404
    return jsonify(data)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
