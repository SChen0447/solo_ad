import random
import string
import time
import threading
from datetime import datetime, timedelta
from collections import deque, defaultdict
from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS
from flask_socketio import SocketIO, emit

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="eventlet")

activities = {}
vote_history = defaultdict(lambda: deque(maxlen=1000))
EMOTION_LEVELS = ["very_satisfied", "satisfied", "neutral", "dissatisfied", "very_dissatisfied"]
EMOTION_SCORES = {
    "very_satisfied": 5,
    "satisfied": 4,
    "neutral": 3,
    "dissatisfied": 2,
    "very_dissatisfied": 1,
}
EMOTION_COLORS = {
    "very_satisfied": "#2ECC71",
    "satisfied": "#3498DB",
    "neutral": "#F1C40F",
    "dissatisfied": "#E67E22",
    "very_dissatisfied": "#E74C3C",
}
EMOTION_LABELS = {
    "very_satisfied": "非常满意",
    "satisfied": "满意",
    "neutral": "一般",
    "dissatisfied": "不满意",
    "very_dissatisfied": "非常不满意",
}


def generate_invite_code():
    return "".join(random.choices(string.digits, k=6))


def get_activity_stats(activity_id):
    if activity_id not in activities:
        return None
    activity = activities[activity_id]
    votes = activity["votes"]
    total_votes = sum(votes.values())
    return {
        "activity_id": activity_id,
        "activity_name": activity["name"],
        "topic": activity["topic"],
        "invite_code": activity["invite_code"],
        "total_votes": total_votes,
        "votes": votes,
        "expected_voters": activity["expected_voters"],
        "created_at": activity["created_at"].isoformat(),
    }


def broadcast_stats(activity_id):
    stats = get_activity_stats(activity_id)
    if stats:
        socketio.emit("stats_update", stats, namespace="/ws.stats")


@app.route("/api/activities", methods=["POST"])
def create_activity():
    data = request.get_json() or {}
    name = data.get("name", "未命名活动")
    topic = data.get("topic", "请投票")
    expected_voters = data.get("expected_voters", 100)
    activity_id = "".join(random.choices(string.ascii_lowercase + string.digits, k=12))
    invite_code = generate_invite_code()
    while any(a["invite_code"] == invite_code for a in activities.values()):
        invite_code = generate_invite_code()
    activities[activity_id] = {
        "id": activity_id,
        "name": name,
        "topic": topic,
        "invite_code": invite_code,
        "votes": {level: 0 for level in EMOTION_LEVELS},
        "expected_voters": expected_voters,
        "created_at": datetime.now(),
        "ended": False,
    }
    return jsonify({
        "activity_id": activity_id,
        "invite_code": invite_code,
        "topic": topic,
        "name": name,
    })


@app.route("/api/activities/<activity_id>", methods=["GET"])
def get_activity(activity_id):
    stats = get_activity_stats(activity_id)
    if not stats:
        return jsonify({"error": "Activity not found"}), 404
    return jsonify(stats)


@app.route("/api/activities/code/<invite_code>", methods=["GET"])
def get_activity_by_code(invite_code):
    for aid, activity in activities.items():
        if activity["invite_code"] == invite_code:
            return jsonify(get_activity_stats(aid))
    return jsonify({"error": "Activity not found"}), 404


@app.route("/api/vote", methods=["POST"])
def submit_vote():
    data = request.get_json() or {}
    activity_id = data.get("activity_id")
    emotion = data.get("emotion")
    if activity_id not in activities:
        return jsonify({"error": "Activity not found"}), 404
    if emotion not in EMOTION_LEVELS:
        return jsonify({"error": "Invalid emotion level"}), 400
    activity = activities[activity_id]
    activity["votes"][emotion] += 1
    vote_history[activity_id].append({
        "time": datetime.now(),
        "emotion": emotion,
    })
    stats = get_activity_stats(activity_id)
    socketio.emit("stats_update", stats, namespace="/ws.stats")
    return jsonify(stats)


@app.route("/api/stats/<activity_id>", methods=["GET"])
def get_stats(activity_id):
    stats = get_activity_stats(activity_id)
    if not stats:
        return jsonify({"error": "Activity not found"}), 404
    return jsonify(stats)


@app.route("/api/history/<activity_id>", methods=["GET"])
def get_history(activity_id):
    if activity_id not in activities:
        return jsonify({"error": "Activity not found"}), 404
    now = datetime.now()
    thirty_min_ago = now - timedelta(minutes=30)
    time_buckets = defaultdict(lambda: {level: 0 for level in EMOTION_LEVELS})
    for record in vote_history[activity_id]:
        if record["time"] >= thirty_min_ago:
            bucket = record["time"].strftime("%H:%M")
            time_buckets[bucket][record["emotion"]] += 1
    sorted_times = sorted(time_buckets.keys())
    result = {
        "times": sorted_times,
        "data": {level: [time_buckets[t][level] for t in sorted_times] for level in EMOTION_LEVELS},
    }
    return jsonify(result)


@app.route("/api/activities/<activity_id>/end", methods=["POST"])
def end_activity(activity_id):
    if activity_id not in activities:
        return jsonify({"error": "Activity not found"}), 404
    activities[activity_id]["ended"] = True
    return jsonify({"status": "ended"})


@app.route("/api/report/<activity_id>", methods=["GET"])
def get_report(activity_id):
    if activity_id not in activities:
        return jsonify({"error": "Activity not found"}), 404
    activity = activities[activity_id]
    votes = activity["votes"]
    total = sum(votes.values())
    ratios = {level: (votes[level] / total if total > 0 else 0) for level in EMOTION_LEVELS}
    avg_score = sum(EMOTION_SCORES[level] * votes[level] for level in EMOTION_LEVELS) / total if total > 0 else 0
    now = datetime.now()
    thirty_min_ago = now - timedelta(minutes=30)
    time_buckets = defaultdict(lambda: {level: 0 for level in EMOTION_LEVELS})
    for record in vote_history[activity_id]:
        if record["time"] >= thirty_min_ago:
            bucket = record["time"].strftime("%H:%M")
            time_buckets[bucket][record["emotion"]] += 1
    sorted_times = sorted(time_buckets.keys())
    trend_data = {
        "times": sorted_times,
        "data": {level: [time_buckets[t][level] for t in sorted_times] for level in EMOTION_LEVELS},
    }
    return jsonify({
        "activity_name": activity["name"],
        "activity_id": activity_id,
        "date": activity["created_at"].isoformat(),
        "total_votes": total,
        "votes": votes,
        "ratios": ratios,
        "average_score": round(avg_score, 2),
        "trend": trend_data,
    })


@socketio.on("connect", namespace="/ws.stats")
def handle_connect():
    print("Client connected to stats websocket")


@socketio.on("disconnect", namespace="/ws.stats")
def handle_disconnect():
    print("Client disconnected from stats websocket")


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
