import os
import time
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from diagnosis import diagnose, generate_sample_cases

app = Flask(__name__)
app.config["SECRET_KEY"] = "plant-health-secret-key"
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

cases_db = []
next_case_id = 0


def init_db():
    global cases_db, next_case_id
    cases_db = generate_sample_cases()
    next_case_id = len(cases_db)


@app.route("/api/submit", methods=["POST"])
def submit_case():
    global next_case_id
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    required = ["plant_name", "symptoms", "temperature", "humidity", "light_hours"]
    for field in required:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    diagnosis_result = diagnose(
        symptoms=data["symptoms"],
        temperature=float(data["temperature"]),
        humidity=float(data["humidity"]),
        light_hours=float(data["light_hours"])
    )

    new_case = {
        "id": str(next_case_id),
        "plant_name": data["plant_name"],
        "symptoms": data["symptoms"],
        "temperature": float(data["temperature"]),
        "humidity": float(data["humidity"]),
        "light_hours": float(data["light_hours"]),
        "image": data.get("image", diagnosis_result.get("image", "")),
        "diagnosis": diagnosis_result,
        "likes": 0,
        "comments": [],
        "timestamp": time.time()
    }

    next_case_id += 1
    cases_db.insert(0, new_case)

    socketio.emit("new_case", new_case)

    return jsonify(new_case), 201


@app.route("/api/cases", methods=["GET"])
def get_cases():
    page = int(request.args.get("page", 0))
    page_size = int(request.args.get("page_size", 10))
    start = page * page_size
    end = start + page_size
    paginated = cases_db[start:end]
    return jsonify({
        "cases": paginated,
        "has_more": end < len(cases_db),
        "total": len(cases_db)
    })


@app.route("/api/cases/<case_id>/like", methods=["POST"])
def like_case(case_id):
    for case in cases_db:
        if case["id"] == case_id:
            case["likes"] += 1
            socketio.emit("like_update", {"case_id": case_id, "likes": case["likes"]})
            return jsonify({"likes": case["likes"]})
    return jsonify({"error": "Case not found"}), 404


@app.route("/api/cases/<case_id>/comment", methods=["POST"])
def add_comment(case_id):
    data = request.get_json()
    if not data or "content" not in data:
        return jsonify({"error": "Missing content"}), 400

    for case in cases_db:
        if case["id"] == case_id:
            comment = {
                "id": str(uuid.uuid4()),
                "author": data.get("author", "匿名用户"),
                "content": data["content"],
                "timestamp": time.time()
            }
            case["comments"].append(comment)
            socketio.emit("comment_update", {"case_id": case_id, "comment": comment})
            return jsonify(comment), 201
    return jsonify({"error": "Case not found"}), 404


@socketio.on("connect")
def handle_connect():
    print("Client connected")


@socketio.on("disconnect")
def handle_disconnect():
    print("Client disconnected")


if __name__ == "__main__":
    init_db()
    print("Starting Plant Health Server on port 5000...")
    socketio.run(app, host="0.0.0.0", port=5000, debug=True)
