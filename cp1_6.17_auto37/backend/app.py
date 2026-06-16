import uuid
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")

events = {}
sessions = {}


@app.route("/api/events", methods=["GET"])
def get_events():
    result = []
    for eid, ev in events.items():
        session_count = len(ev.get("sessions", []))
        result.append({
            "id": ev["id"],
            "name": ev["name"],
            "startDate": ev["startDate"],
            "endDate": ev["endDate"],
            "stageCount": ev["stageCount"],
            "sessionCount": session_count,
        })
    return jsonify(result)


@app.route("/api/events", methods=["POST"])
def create_event():
    data = request.get_json()
    name = data.get("name")
    start_date = data.get("startDate")
    end_date = data.get("endDate")
    stage_count = data.get("stageCount", 2)
    if stage_count < 2:
        stage_count = 2
    if stage_count > 5:
        stage_count = 5
    event_id = str(uuid.uuid4())
    stages = []
    for i in range(stage_count):
        stages.append({
            "id": str(uuid.uuid4()),
            "name": f"舞台{i + 1}",
            "order": i + 1,
        })
    event = {
        "id": event_id,
        "name": name,
        "startDate": start_date,
        "endDate": end_date,
        "stageCount": stage_count,
        "stages": stages,
        "sessions": [],
    }
    events[event_id] = event
    return jsonify(event), 201


@app.route("/api/events/<event_id>", methods=["GET"])
def get_event(event_id):
    ev = events.get(event_id)
    if not ev:
        return jsonify({"error": "Event not found"}), 404
    return jsonify(ev)


@app.route("/api/events/<event_id>/sessions", methods=["GET"])
def get_sessions(event_id):
    ev = events.get(event_id)
    if not ev:
        return jsonify({"error": "Event not found"}), 404
    result = []
    for sid in ev.get("sessions", []):
        s = sessions.get(sid)
        if s:
            result.append(s)
    return jsonify(result)


@app.route("/api/events/<event_id>/sessions", methods=["POST"])
def create_session(event_id):
    ev = events.get(event_id)
    if not ev:
        return jsonify({"error": "Event not found"}), 404
    data = request.get_json()
    session_id = str(uuid.uuid4())
    session = {
        "id": session_id,
        "eventId": event_id,
        "bandName": data.get("bandName"),
        "stageId": data.get("stageId"),
        "startTime": data.get("startTime"),
        "duration": data.get("duration", 60),
        "notes": data.get("notes", ""),
        "color": data.get("color", "#4CAF50"),
    }
    sessions[session_id] = session
    ev["sessions"].append(session_id)
    socketio.emit("session_added", session, room=f"event_{event_id}")
    return jsonify(session), 201


@app.route("/api/sessions/<session_id>", methods=["PUT"])
def update_session(session_id):
    session = sessions.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    data = request.get_json()
    if "bandName" in data:
        session["bandName"] = data["bandName"]
    if "stageId" in data:
        session["stageId"] = data["stageId"]
    if "startTime" in data:
        session["startTime"] = data["startTime"]
    if "duration" in data:
        session["duration"] = data["duration"]
    if "notes" in data:
        session["notes"] = data["notes"]
    if "color" in data:
        session["color"] = data["color"]
    socketio.emit("session_updated", session, room=f"event_{session['eventId']}")
    return jsonify(session)


@app.route("/api/sessions/<session_id>", methods=["DELETE"])
def delete_session(session_id):
    session = sessions.get(session_id)
    if not session:
        return jsonify({"error": "Session not found"}), 404
    event_id = session["eventId"]
    ev = events.get(event_id)
    if ev and session_id in ev["sessions"]:
        ev["sessions"].remove(session_id)
    del sessions[session_id]
    socketio.emit("session_deleted", {"id": session_id}, room=f"event_{event_id}")
    return jsonify({"id": session_id})


@socketio.on("join_event")
def on_join_event(data):
    event_id = data.get("eventId")
    if event_id:
        from flask_socketio import join_room
        join_room(f"event_{event_id}")


@socketio.on("session_dragging")
def on_session_dragging(data):
    session_id = data.get("sessionId")
    username = data.get("username")
    session = sessions.get(session_id)
    if session:
        emit("session_dragging", {"sessionId": session_id, "username": username}, room=f"event_{session['eventId']}", include_self=False)


@socketio.on("session_drag_end")
def on_session_drag_end(data):
    session_id = data.get("sessionId")
    session = sessions.get(session_id)
    if session:
        emit("session_drag_end", {"sessionId": session_id}, room=f"event_{session['eventId']}", include_self=False)


if __name__ == "__main__":
    socketio.run(app, debug=True, port=5000, allow_unsafe_werkzeug=True)
