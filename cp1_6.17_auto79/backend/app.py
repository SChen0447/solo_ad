from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from datetime import datetime
from room_manager import RoomManager
from device_simulator import DeviceSimulator

app = Flask(__name__)
app.config["SECRET_KEY"] = "meethub-secret-key"
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

room_manager = RoomManager()


def on_device_status_change(device):
    socketio.emit("device_update", device.to_dict(), namespace="/")


device_simulator = DeviceSimulator(on_status_change=on_device_status_change)


@app.route("/api/rooms", methods=["GET"])
def get_rooms():
    rooms = room_manager.get_all_rooms()
    return jsonify(rooms)


@app.route("/api/bookings", methods=["POST"])
def create_booking():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    required_fields = ["room_id", "title", "start_time", "end_time", "attendees"]
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    try:
        start_time = datetime.fromisoformat(data["start_time"])
        end_time = datetime.fromisoformat(data["end_time"])
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid time format"}), 400

    if start_time >= end_time:
        return jsonify({"error": "End time must be after start time"}), 400

    if start_time < datetime.now():
        return jsonify({"error": "Start time cannot be in the past"}), 400

    if room_manager.check_conflict(data["room_id"], start_time, end_time):
        return jsonify({"error": "该时间段已被预订"}), 409

    booking = room_manager.create_booking(
        room_id=data["room_id"],
        title=data["title"],
        start_time=start_time,
        end_time=end_time,
        attendees=data["attendees"],
        notes=data.get("notes", ""),
    )

    if not booking:
        return jsonify({"error": "Booking failed"}), 400

    return jsonify({
        "id": booking.id,
        "room_id": booking.room_id,
        "title": booking.title,
        "start_time": booking.start_time.isoformat(),
        "end_time": booking.end_time.isoformat(),
        "attendees": booking.attendees,
        "notes": booking.notes,
    }), 201


@app.route("/api/bookings/<booking_id>", methods=["DELETE"])
def cancel_booking(booking_id):
    success = room_manager.cancel_booking(booking_id)
    if success:
        return jsonify({"message": "Booking cancelled"}), 200
    return jsonify({"error": "Booking not found"}), 404


@app.route("/api/devices", methods=["GET"])
def get_devices():
    devices = device_simulator.get_all_devices()
    return jsonify(devices)


@app.route("/api/devices/<device_id>/control", methods=["POST"])
def control_device(device_id):
    data = request.get_json()
    if not data or "action" not in data:
        return jsonify({"error": "Missing action"}), 400

    valid_actions = ["turn_on", "turn_off", "volume_up", "volume_down"]
    if data["action"] not in valid_actions:
        return jsonify({"error": "Invalid action"}), 400

    device = device_simulator.control_device(device_id, data["action"])
    if not device:
        return jsonify({"error": "Device not found"}), 404

    return jsonify(device.to_dict()), 200


@socketio.on("connect")
def handle_connect():
    print(f"Client connected: {request.sid}")


@socketio.on("disconnect")
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")


if __name__ == "__main__":
    device_simulator.start()
    try:
        socketio.run(app, host="127.0.0.1", port=5001, debug=False, allow_unsafe_werkzeug=True)
    finally:
        device_simulator.stop()
