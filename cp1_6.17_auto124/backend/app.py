import os
import uuid
import base64
import string
import random
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder=None)

share_store = {}

FILTER_PRESETS = [
    {
        "id": "pixelate_default",
        "name": "Pixelate",
        "type": "pixelate",
        "params": {"pixelSize": 8},
    },
    {
        "id": "pixelate_fine",
        "name": "Fine Pixelate",
        "type": "pixelate",
        "params": {"pixelSize": 3},
    },
    {
        "id": "pixelate_coarse",
        "name": "Coarse Pixelate",
        "type": "pixelate",
        "params": {"pixelSize": 16},
    },
    {
        "id": "oil_default",
        "name": "Oil Painting",
        "type": "oil",
        "params": {"oilBrushSize": 10, "oilDetail": 3},
    },
    {
        "id": "oil_bold",
        "name": "Bold Oil",
        "type": "oil",
        "params": {"oilBrushSize": 20, "oilDetail": 2},
    },
    {
        "id": "watercolor_default",
        "name": "Watercolor",
        "type": "watercolor",
        "params": {"watercolorSpread": 6, "watercolorEdgeBlur": 2},
    },
    {
        "id": "watercolor_soft",
        "name": "Soft Watercolor",
        "type": "watercolor",
        "params": {"watercolorSpread": 12, "watercolorEdgeBlur": 4},
    },
    {
        "id": "sketch_default",
        "name": "Sketch",
        "type": "sketch",
        "params": {"sketchLineWidth": 3, "sketchShadow": 1.2},
    },
    {
        "id": "sketch_bold",
        "name": "Bold Sketch",
        "type": "sketch",
        "params": {"sketchLineWidth": 6, "sketchShadow": 1.8},
    },
]


def generate_short_code(length=8):
    chars = string.ascii_lowercase + string.digits
    return "".join(random.choices(chars, k=length))


@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


@app.route("/api/presets", methods=["GET"])
def get_presets():
    return jsonify({"presets": FILTER_PRESETS})


@app.route("/api/upload", methods=["POST"])
def upload_image():
    if "file" not in request.files:
        return jsonify({"error": "No file provided"}), 400

    file = request.files["file"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    allowed_ext = {".jpg", ".jpeg", ".png", ".webp"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_ext:
        return jsonify({"error": "Unsupported format"}), 400

    file_id = str(uuid.uuid4())
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    save_path = os.path.join(upload_dir, f"{file_id}{ext}")
    file.save(save_path)

    return jsonify({
        "id": file_id,
        "filename": file.filename,
        "url": f"/api/images/{file_id}{ext}",
    })


@app.route("/api/images/<path:filename>", methods=["GET"])
def get_image(filename):
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
    return send_from_directory(upload_dir, filename)


@app.route("/api/share", methods=["POST"])
def create_share():
    data = request.get_json()
    if not data or "image" not in data:
        return jsonify({"error": "No image data provided"}), 400

    image_data = data["image"]
    filter_type = data.get("filter", "unknown")

    short_code = generate_short_code()

    if image_data.startswith("data:"):
        header, b64 = image_data.split(",", 1)
        image_bytes = base64.b64decode(b64)
    else:
        image_bytes = base64.b64decode(image_data)

    share_dir = os.path.join(os.path.dirname(__file__), "shares")
    os.makedirs(share_dir, exist_ok=True)
    share_path = os.path.join(share_dir, f"{short_code}.png")
    with open(share_path, "wb") as f:
        f.write(image_bytes)

    share_store[short_code] = {
        "filter": filter_type,
        "path": share_path,
    }

    share_url = f"/api/shared/{short_code}"

    return jsonify({
        "url": share_url,
        "code": short_code,
    })


@app.route("/api/shared/<code>", methods=["GET"])
def get_shared(code):
    if code not in share_store:
        return jsonify({"error": "Share not found"}), 404

    entry = share_store[code]
    share_dir = os.path.dirname(entry["path"])
    filename = os.path.basename(entry["path"])
    return send_from_directory(share_dir, filename)


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
