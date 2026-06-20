from flask import Flask, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

FLOOR_COUNT = 6
CONSUMPTION_MIN = 0.2
CONSUMPTION_MAX = 1.0

current_data = [
    {"floor": i, "consumption": round(random.uniform(CONSUMPTION_MIN, CONSUMPTION_MAX), 2)}
    for i in range(FLOOR_COUNT)
]


@app.route("/api/energy-data", methods=["GET"])
def get_energy_data():
    global current_data
    for item in current_data:
        delta = random.uniform(-0.08, 0.08)
        new_val = item["consumption"] + delta
        new_val = max(CONSUMPTION_MIN, min(CONSUMPTION_MAX, new_val))
        item["consumption"] = round(new_val, 2)
    return jsonify(current_data)


@app.route("/api/energy-data/<int:floor>", methods=["GET"])
def get_floor_data(floor: int):
    if 0 <= floor < FLOOR_COUNT:
        return jsonify(current_data[floor])
    return jsonify({"error": "Floor not found"}), 404


if __name__ == "__main__":
    print("建筑能耗模拟数据服务启动")
    print("API端点: http://localhost:5000/api/energy-data")
    app.run(host="0.0.0.0", port=5000, debug=False)
