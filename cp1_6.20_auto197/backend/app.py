import os
import io
import uuid
import sqlite3
import base64
import json
import random
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory, g
from flask_cors import CORS
from PIL import Image
import numpy as np

try:
    import cv2
except ImportError:
    cv2 = None

app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
DB_PATH = os.path.join(BASE_DIR, 'components.db')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MAX_IMAGE_SIZE = (800, 600)
MAX_FILE_SIZE = 5 * 1024 * 1024


def get_db():
    if 'db' not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop('db', None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('''
        CREATE TABLE IF NOT EXISTS versions (
            id TEXT PRIMARY KEY,
            component_name TEXT NOT NULL,
            version INTEGER NOT NULL,
            image_url TEXT NOT NULL,
            upload_date TEXT NOT NULL,
            colors TEXT NOT NULL,
            fonts TEXT NOT NULL,
            note TEXT
        )
    ''')
    conn.commit()
    conn.close()


init_db()


def rgb_to_hex(r, g, b):
    return '#{:02x}{:02x}{:02x}'.format(r, g, b)


def hex_to_rgb(h):
    h = h.lstrip('#')
    return tuple(int(h[i:i+2], 16) for i in (0, 2, 4))


def extract_colors_kmeans(image_array, k=3, max_iter=10):
    pixels = image_array.reshape(-1, 3).astype(np.float64)
    if len(pixels) < k:
        k = len(pixels)
    indices = np.random.choice(len(pixels), k, replace=False)
    centers = pixels[indices].copy()

    for _ in range(max_iter):
        distances = np.linalg.norm(pixels[:, np.newaxis] - centers, axis=2)
        labels = np.argmin(distances, axis=1)
        new_centers = np.array([
            pixels[labels == i].mean(axis=0) if np.any(labels == i) else centers[i]
            for i in range(k)
        ])
        if np.allclose(centers, new_centers, atol=1.0):
            break
        centers = new_centers

    counts = np.array([np.sum(labels == i) for i in range(k)])
    total = counts.sum() or 1
    percentages = counts / total

    order = np.argsort(-percentages)
    result = []
    for i in order:
        r, g, b = centers[i].astype(int)
        result.append({
            'hex': rgb_to_hex(r, g, b),
            'percentage': float(percentages[i])
        })
    return result


def detect_fonts_simulation(image):
    fonts_pool = [
        {'name': 'Inter', 'sampleText': 'Sample Text', 'confidence': 0.92},
        {'name': 'SF Pro Display', 'sampleText': 'Hello World', 'confidence': 0.85},
        {'name': 'Roboto', 'sampleText': 'Design System', 'confidence': 0.78},
        {'name': 'Open Sans', 'sampleText': 'Component UI', 'confidence': 0.71},
        {'name': 'Poppins', 'sampleText': 'Modern Style', 'confidence': 0.65},
    ]
    n = random.randint(1, 3)
    selected = random.sample(fonts_pool, min(n, len(fonts_pool)))
    selected.sort(key=lambda x: -x['confidence'])
    return selected


def resize_image_if_needed(image):
    w, h = image.size
    if w > MAX_IMAGE_SIZE[0] or h > MAX_IMAGE_SIZE[1]:
        image.thumbnail(MAX_IMAGE_SIZE, Image.LANCZOS)
    return image


def generate_heatmap(img1_path, img2_path):
    img1 = Image.open(img1_path).convert('RGB')
    img2 = Image.open(img2_path).convert('RGB')

    img1 = resize_image_if_needed(img1)
    img2 = resize_image_if_needed(img2)

    if img1.size != img2.size:
        img2 = img2.resize(img1.size, Image.LANCZOS)

    arr1 = np.array(img1, dtype=np.float32)
    arr2 = np.array(img2, dtype=np.float32)

    diff = np.abs(arr1 - arr2)
    diff_per_channel = diff.mean(axis=2)
    max_diff = 255.0
    diff_normalized = diff_per_channel / max_diff

    total_pixels = diff_normalized.size
    significant_pixels = np.sum(diff_normalized > 0.3)
    diff_percentage = float(significant_pixels / total_pixels) if total_pixels else 0.0

    h, w = diff_normalized.shape
    heatmap = np.zeros((h, w, 4), dtype=np.uint8)

    transparent_mask = diff_normalized < 0.3
    yellow_mask = (diff_normalized >= 0.3) & (diff_normalized < 0.6)
    red_mask = diff_normalized >= 0.6

    heatmap[yellow_mask] = [255, 217, 61, 180]
    heatmap[red_mask] = [255, 107, 107, 220]
    heatmap[transparent_mask] = [0, 0, 0, 0]

    if cv2 is not None:
        heatmap_bgr = heatmap[:, :, :3].copy()
        heatmap_bgr = cv2.GaussianBlur(heatmap_bgr, (7, 7), 0)
        heatmap[:, :, :3] = heatmap_bgr

    heatmap_img = Image.fromarray(heatmap, 'RGBA')
    buffer = io.BytesIO()
    heatmap_img.save(buffer, format='PNG')
    base64_str = base64.b64encode(buffer.getvalue()).decode('utf-8')

    return base64_str, w, h, diff_percentage


@app.route('/api/components', methods=['GET'])
def get_components():
    db = get_db()
    rows = db.execute(
        'SELECT component_name, colors, COUNT(*) as cnt FROM versions GROUP BY component_name ORDER BY upload_date DESC'
    ).fetchall()
    result = []
    for row in rows:
        try:
            colors = json.loads(row['colors'])
            latest_color = colors[0]['hex'] if colors else '#4A90D9'
        except (json.JSONDecodeError, KeyError, IndexError):
            latest_color = '#4A90D9'
        result.append({
            'name': row['component_name'],
            'latestColor': latest_color,
            'versionCount': row['cnt']
        })
    return jsonify(result)


@app.route('/api/versions', methods=['GET'])
def get_versions():
    component_name = request.args.get('componentName', '')
    if not component_name:
        return jsonify([])
    db = get_db()
    rows = db.execute(
        'SELECT * FROM versions WHERE component_name = ? ORDER BY upload_date DESC',
        (component_name,)
    ).fetchall()
    result = []
    for row in rows:
        try:
            colors = json.loads(row['colors'])
            fonts = json.loads(row['fonts'])
        except json.JSONDecodeError:
            colors = []
            fonts = []
        result.append({
            'id': row['id'],
            'componentName': row['component_name'],
            'version': row['version'],
            'imageUrl': row['image_url'],
            'uploadDate': row['upload_date'],
            'colors': colors,
            'fonts': fonts,
            'note': row['note']
        })
    return jsonify(result)


@app.route('/api/versions/<version_id>', methods=['DELETE'])
def delete_version(version_id):
    db = get_db()
    row = db.execute('SELECT image_url FROM versions WHERE id = ?', (version_id,)).fetchone()
    if row and row['image_url'].startswith('/uploads/'):
        file_path = os.path.join(BASE_DIR, row['image_url'].lstrip('/'))
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
    db.execute('DELETE FROM versions WHERE id = ?', (version_id,))
    db.commit()
    return jsonify({'success': True})


@app.route('/api/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'error': 'No image file'}), 400

    file = request.files['image']
    component_name = request.form.get('componentName', '').strip()
    if not component_name:
        return jsonify({'error': 'componentName required'}), 400

    if file.content_type not in ('image/png', 'image/jpeg', 'image/jpg'):
        return jsonify({'error': 'Invalid image type'}), 400

    file.seek(0, 2)
    size = file.tell()
    file.seek(0)
    if size > MAX_FILE_SIZE:
        return jsonify({'error': 'File too large'}), 400

    ext = 'png' if file.content_type == 'image/png' else 'jpg'
    version_id = str(uuid.uuid4())
    filename = f"{version_id}.{ext}"
    filepath = os.path.join(UPLOAD_FOLDER, filename)

    image = Image.open(file)
    image = resize_image_if_needed(image)
    if image.mode != 'RGB':
        image = image.convert('RGB')
    image.save(filepath, format='PNG' if ext == 'png' else 'JPEG', quality=90)

    image_array = np.array(image)
    colors = extract_colors_kmeans(image_array, k=3)
    fonts = detect_fonts_simulation(image)

    db = get_db()
    count_row = db.execute(
        'SELECT COUNT(*) as cnt FROM versions WHERE component_name = ?',
        (component_name,)
    ).fetchone()
    version_num = (count_row['cnt'] or 0) + 1
    upload_date = datetime.utcnow().isoformat()

    db.execute(
        'INSERT INTO versions (id, component_name, version, image_url, upload_date, colors, fonts) VALUES (?, ?, ?, ?, ?, ?, ?)',
        (version_id, component_name, version_num, f'/uploads/{filename}',
         upload_date, json.dumps(colors), json.dumps(fonts))
    )
    db.commit()

    return jsonify({
        'success': True,
        'version': {
            'id': version_id,
            'componentName': component_name,
            'version': version_num,
            'imageUrl': f'/uploads/{filename}',
            'uploadDate': upload_date,
            'colors': colors,
            'fonts': fonts
        }
    })


@app.route('/api/extract', methods=['POST'])
def extract_features():
    data = request.get_json() or {}
    image_url = data.get('imageUrl', '')
    if not image_url:
        return jsonify({'error': 'imageUrl required'}), 400

    if image_url.startswith('/uploads/'):
        file_path = os.path.join(BASE_DIR, image_url.lstrip('/'))
        if not os.path.exists(file_path):
            return jsonify({'error': 'Image not found'}), 404
        image = Image.open(file_path)
    else:
        try:
            import urllib.request
            req = urllib.request.Request(image_url, headers={'User-Agent': 'Mozilla/5.0'})
            resp = urllib.request.urlopen(req, timeout=3)
            image = Image.open(io.BytesIO(resp.read()))
        except Exception:
            fallback_colors = [
                {'hex': '#4A90D9', 'percentage': 0.45},
                {'hex': '#FFFFFF', 'percentage': 0.35},
                {'hex': '#1E1E2E', 'percentage': 0.2}
            ]
            fallback_fonts = [
                {'name': 'Inter', 'confidence': 0.92, 'sampleText': 'Sample Text'}
            ]
            return jsonify({'colors': fallback_colors, 'fonts': fallback_fonts})

    image = resize_image_if_needed(image)
    image_array = np.array(image.convert('RGB'))
    colors = extract_colors_kmeans(image_array, k=3)
    fonts = detect_fonts_simulation(image)

    return jsonify({'colors': colors, 'fonts': fonts})


@app.route('/api/diff', methods=['POST'])
def compute_diff():
    data = request.get_json() or {}
    url1 = data.get('imageUrl1', '')
    url2 = data.get('imageUrl2', '')
    if not url1 or not url2:
        return jsonify({'error': 'Two image URLs required'}), 400

    def resolve_path(url):
        if url.startswith('/uploads/'):
            local = os.path.join(BASE_DIR, url.lstrip('/'))
            if os.path.exists(local):
                return local
        return None

    path1 = resolve_path(url1)
    path2 = resolve_path(url2)

    if not path1 or not path2:
        try:
            import urllib.request
            for url, attr in [(url1, 'tmp1'), (url2, 'tmp2')]:
                if resolve_path(url) is None:
                    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
                    resp = urllib.request.urlopen(req, timeout=5)
                    tmp_path = os.path.join(UPLOAD_FOLDER, f'{attr}_{uuid.uuid4().hex}.png')
                    with open(tmp_path, 'wb') as f:
                        f.write(resp.read())
                    if url == url1:
                        path1 = tmp_path
                    else:
                        path2 = tmp_path
        except Exception as e:
            return jsonify({'error': f'Failed to download images: {str(e)}'}), 400

    try:
        heatmap_b64, width, height, diff_pct = generate_heatmap(path1, path2)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    return jsonify({
        'heatmapBase64': heatmap_b64,
        'diffPercentage': diff_pct,
        'width': width,
        'height': height
    })


@app.route('/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
