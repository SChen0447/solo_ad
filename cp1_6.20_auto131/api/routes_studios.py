from flask import Blueprint, request, jsonify
from routes_auth import token_required
from models import create_studio, get_active_studios, get_studio_by_id

studios_bp = Blueprint("studios", __name__, url_prefix="/api/studios")


@studios_bp.route("/", methods=["GET"])
def list_studios():
    studios = get_active_studios()
    return jsonify({"studios": studios}), 200


@studios_bp.route("/", methods=["POST"])
@token_required
def add_studio():
    data = request.get_json()
    track_id = data.get("track_id")
    duration = data.get("duration", 1800)

    if not track_id:
        return jsonify({"error": "track_id is required"}), 400

    user = request.current_user
    studio_id = create_studio(track_id, user["id"], duration)
    studio = get_studio_by_id(studio_id)

    return jsonify({"message": "Studio created", "studio": studio}), 201


@studios_bp.route("/<int:studio_id>", methods=["GET"])
def get_studio(studio_id):
    studio = get_studio_by_id(studio_id)
    if not studio:
        return jsonify({"error": "Studio not found"}), 404
    return jsonify({"studio": studio}), 200
