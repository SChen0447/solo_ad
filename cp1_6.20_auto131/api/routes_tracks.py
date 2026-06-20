from flask import Blueprint, request, jsonify
from routes_auth import token_required
from models import (
    create_track,
    get_all_tracks,
    get_track_by_id,
    update_track,
    delete_track,
    get_track_lyrics,
    get_danmakus_by_track,
)

tracks_bp = Blueprint("tracks", __name__, url_prefix="/api/tracks")


@tracks_bp.route("/", methods=["GET"])
def list_tracks():
    search = request.args.get("search")
    tracks = get_all_tracks(search)
    return jsonify({"tracks": tracks}), 200


@tracks_bp.route("/", methods=["POST"])
@token_required
def add_track():
    data = request.get_json()
    title = data.get("title")
    artist = data.get("artist")
    cover_url = data.get("cover_url", "")
    audio_url = data.get("audio_url", "")
    lyrics = data.get("lyrics", "")

    if not title or not artist:
        return jsonify({"error": "title and artist are required"}), 400

    user = request.current_user
    track_id = create_track(title, artist, cover_url, audio_url, lyrics, user["id"])
    track = get_track_by_id(track_id)

    return jsonify({"message": "Track created", "track": track}), 201


@tracks_bp.route("/<int:track_id>", methods=["GET"])
def get_track(track_id):
    track = get_track_by_id(track_id)
    if not track:
        return jsonify({"error": "Track not found"}), 404
    return jsonify({"track": track}), 200


@tracks_bp.route("/<int:track_id>", methods=["PUT"])
@token_required
def edit_track(track_id):
    track = get_track_by_id(track_id)
    if not track:
        return jsonify({"error": "Track not found"}), 404

    user = request.current_user
    if track["user_id"] != user["id"]:
        return jsonify({"error": "Permission denied"}), 403

    data = request.get_json()
    title = data.get("title", track["title"])
    artist = data.get("artist", track["artist"])
    cover_url = data.get("cover_url", track["cover_url"])
    audio_url = data.get("audio_url", track["audio_url"])
    lyrics = data.get("lyrics", track["lyrics"])

    update_track(track_id, title, artist, cover_url, audio_url, lyrics)
    updated = get_track_by_id(track_id)

    return jsonify({"message": "Track updated", "track": updated}), 200


@tracks_bp.route("/<int:track_id>", methods=["DELETE"])
@token_required
def remove_track(track_id):
    track = get_track_by_id(track_id)
    if not track:
        return jsonify({"error": "Track not found"}), 404

    user = request.current_user
    if track["user_id"] != user["id"]:
        return jsonify({"error": "Permission denied"}), 403

    delete_track(track_id)
    return jsonify({"message": "Track deleted"}), 200


@tracks_bp.route("/<int:track_id>/lyrics", methods=["GET"])
def track_lyrics(track_id):
    lyrics = get_track_lyrics(track_id)
    if lyrics is None:
        return jsonify({"error": "Track not found"}), 404
    return jsonify({"lyrics": lyrics}), 200


@tracks_bp.route("/<int:track_id>/danmakus", methods=["GET"])
def track_danmakus(track_id):
    track = get_track_by_id(track_id)
    if not track:
        return jsonify({"error": "Track not found"}), 404
    danmakus = get_danmakus_by_track(track_id)
    return jsonify({"danmakus": danmakus}), 200
