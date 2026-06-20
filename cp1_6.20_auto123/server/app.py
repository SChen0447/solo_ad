import os
import json
import uuid
import math
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from PIL import Image, ExifTags
from werkzeug.utils import secure_filename

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
DATA_FILE = os.path.join(BASE_DIR, 'photos.json')
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'gif'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024


def load_photos():
    if not os.path.exists(DATA_FILE):
        return []
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return []


def save_photos(photos):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(photos, f, ensure_ascii=False, indent=2)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def convert_to_degrees(value):
    d = float(value[0][0]) / float(value[0][1])
    m = float(value[1][0]) / float(value[1][1])
    s = float(value[2][0]) / float(value[2][1])
    return d + (m / 60.0) + (s / 3600.0)


def get_exif_data(image_path):
    try:
        img = Image.open(image_path)
        exif_data = img._getexif()
        if not exif_data:
            return {}
        exif = {}
        for tag_id, value in exif_data.items():
            tag = ExifTags.TAGS.get(tag_id, tag_id)
            exif[tag] = value
        return exif
    except Exception:
        return {}


def extract_gps(exif):
    gps_tag = next((k for k, v in ExifTags.TAGS.items() if v == 'GPSInfo'), None)
    if not gps_tag or gps_tag not in exif:
        return None
    gps_info = exif[gps_tag]
    gps_latitude = gps_info.get(2)
    gps_latitude_ref = gps_info.get(1)
    gps_longitude = gps_info.get(4)
    gps_longitude_ref = gps_info.get(3)
    if not all([gps_latitude, gps_latitude_ref, gps_longitude, gps_longitude_ref]):
        return None
    lat = convert_to_degrees(gps_latitude)
    if gps_latitude_ref in ('S', b'S'):
        lat = -lat
    lon = convert_to_degrees(gps_longitude)
    if gps_longitude_ref in ('W', b'W'):
        lon = -lon
    return {'latitude': round(lat, 6), 'longitude': round(lon, 6)}


def extract_datetime(exif):
    dt = exif.get('DateTimeOriginal') or exif.get('DateTime') or exif.get('DateTimeDigitized')
    if dt:
        if isinstance(dt, bytes):
            dt = dt.decode('utf-8', errors='ignore')
        try:
            return datetime.strptime(dt, '%Y:%m:%d %H:%M:%S').isoformat()
        except (ValueError, TypeError):
            return dt
    return datetime.now().isoformat()


def extract_exif_details(exif):
    make = exif.get('Make', '')
    model = exif.get('Model', '')
    if isinstance(make, bytes):
        make = make.decode('utf-8', errors='ignore').strip('\x00')
    if isinstance(model, bytes):
        model = model.decode('utf-8', errors='ignore').strip('\x00')
    device = ' '.join(filter(None, [make, model])).strip() or '未知设备'
    focal_length = exif.get('FocalLength')
    if focal_length:
        try:
            focal_length = f"{focal_length[0] / focal_length[1]}mm"
        except (TypeError, ZeroDivisionError):
            focal_length = ''
    aperture = exif.get('FNumber')
    if aperture:
        try:
            aperture = f"f/{aperture[0] / aperture[1]:.1f}"
        except (TypeError, ZeroDivisionError):
            aperture = ''
    iso = exif.get('ISOSpeedRatings', '')
    return {
        'device': device,
        'focalLength': focal_length,
        'aperture': aperture,
        'iso': str(iso) if iso else ''
    }


def haversine_distance(lat1, lon1, lat2, lon2):
    R = 6371000
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    return 2 * R * math.atan2(math.sqrt(a), math.sqrt(1 - a))


@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/upload', methods=['POST'])
def upload_photo():
    if 'file' not in request.files:
        return jsonify({'error': '未找到文件'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': '不支持的文件格式'}), 400

    photo_id = str(uuid.uuid4())
    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = secure_filename(f"{photo_id}.{ext}")
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    exif = get_exif_data(filepath)
    gps = extract_gps(exif)
    captured_at = extract_datetime(exif)
    details = extract_exif_details(exif)

    photo = {
        'id': photo_id,
        'filename': filename,
        'url': f'/uploads/{filename}',
        'originalName': file.filename,
        'gps': gps,
        'hasGps': gps is not None,
        'capturedAt': captured_at,
        'tags': [],
        'device': details['device'],
        'focalLength': details['focalLength'],
        'aperture': details['aperture'],
        'iso': details['iso'],
        'uploadedAt': datetime.now().isoformat()
    }

    photos = load_photos()
    photos.append(photo)
    save_photos(photos)
    return jsonify(photo), 201


@app.route('/photos', methods=['GET'])
def get_photos():
    photos = load_photos()
    return jsonify(photos)


@app.route('/detail/<photo_id>', methods=['GET'])
def get_photo_detail(photo_id):
    photos = load_photos()
    photo = next((p for p in photos if p['id'] == photo_id), None)
    if not photo:
        return jsonify({'error': '照片不存在'}), 404
    nearby = []
    if photo.get('gps'):
        for p in photos:
            if p['id'] != photo_id and p.get('gps'):
                dist = haversine_distance(
                    photo['gps']['latitude'], photo['gps']['longitude'],
                    p['gps']['latitude'], p['gps']['longitude']
                )
                if dist <= 500:
                    np = dict(p)
                    np['distance'] = round(dist, 1)
                    nearby.append(np)
        nearby.sort(key=lambda x: x['distance'])
        nearby = nearby[:6]
    result = dict(photo)
    result['nearby'] = nearby
    return jsonify(result)


@app.route('/photos/<photo_id>/gps', methods=['PUT'])
def update_photo_gps(photo_id):
    photos = load_photos()
    idx = next((i for i, p in enumerate(photos) if p['id'] == photo_id), None)
    if idx is None:
        return jsonify({'error': '照片不存在'}), 404
    data = request.get_json()
    lat = data.get('latitude')
    lon = data.get('longitude')
    if lat is None or lon is None:
        return jsonify({'error': '缺少坐标参数'}), 400
    photos[idx]['gps'] = {'latitude': float(lat), 'longitude': float(lon)}
    photos[idx]['hasGps'] = True
    save_photos(photos)
    return jsonify(photos[idx])


@app.route('/photos/<photo_id>/tags', methods=['GET'])
def get_tags(photo_id):
    photos = load_photos()
    photo = next((p for p in photos if p['id'] == photo_id), None)
    if not photo:
        return jsonify({'error': '照片不存在'}), 404
    return jsonify(photo.get('tags', []))


@app.route('/photos/<photo_id>/tags', methods=['POST'])
def add_tag(photo_id):
    photos = load_photos()
    idx = next((i for i, p in enumerate(photos) if p['id'] == photo_id), None)
    if idx is None:
        return jsonify({'error': '照片不存在'}), 404
    data = request.get_json()
    tag = (data.get('tag') or '').strip()
    if not tag:
        return jsonify({'error': '标签不能为空'}), 400
    if tag not in photos[idx].get('tags', []):
        photos[idx].setdefault('tags', []).append(tag)
    save_photos(photos)
    return jsonify(photos[idx]['tags'])


@app.route('/photos/<photo_id>/tags/<tag>', methods=['DELETE'])
def delete_tag(photo_id, tag):
    photos = load_photos()
    idx = next((i for i, p in enumerate(photos) if p['id'] == photo_id), None)
    if idx is None:
        return jsonify({'error': '照片不存在'}), 404
    if tag in photos[idx].get('tags', []):
        photos[idx]['tags'].remove(tag)
    save_photos(photos)
    return jsonify(photos[idx]['tags'])


@app.route('/tags', methods=['GET'])
def get_all_tags():
    photos = load_photos()
    all_tags = set()
    for p in photos:
        for t in p.get('tags', []):
            all_tags.add(t)
    return jsonify(sorted(all_tags))


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
