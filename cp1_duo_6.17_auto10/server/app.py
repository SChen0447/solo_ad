import math
import random
import time
from flask import Flask, jsonify, request, Response
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

targets = []
terrain_cache = {}


def generate_height(x, z, seed=42):
    random.seed(seed + int(x * 1000) + int(z * 1000))
    h = 0
    h += math.sin(x * 0.3) * math.cos(z * 0.3) * 5
    h += math.sin(x * 0.1 + 1.5) * math.cos(z * 0.15) * 8
    h += (random.random() - 0.5) * 2
    h -= 15
    return round(h, 2)


@app.route('/api/simulate-sonar', methods=['GET'])
def simulate_sonar():
    ship_x = float(request.args.get('x', 0))
    ship_z = float(request.args.get('z', 0))
    radius = float(request.args.get('radius', 20))
    scan_angle = float(request.args.get('angle', 0))
    cone_angle = float(request.args.get('coneAngle', 45))

    points = []
    step = 1.0
    cone_rad = math.radians(cone_angle)
    scan_rad = math.radians(scan_angle)

    for d in range(1, int(radius) + 1):
        dist = d * step
        for a in range(-int(cone_angle / 2), int(cone_angle / 2) + 1, 5):
            a_rad = math.radians(a)
            x = ship_x + dist * math.sin(scan_rad + a_rad)
            z = ship_z + dist * math.cos(scan_rad + a_rad)
            height = generate_height(x, z)
            points.append({
                'x': round(x, 2),
                'y': height,
                'z': round(z, 2),
                'depth': abs(height)
            })

    nearby_targets = [
        t for t in targets
        if math.sqrt((t['x'] - ship_x) ** 2 + (t['z'] - ship_z) ** 2) <= radius
    ]

    water_temp = round(4.0 + random.random() * 8.0, 1)
    depth = abs(generate_height(ship_x, ship_z))

    return jsonify({
        'points': points,
        'targets': nearby_targets,
        'waterTemperature': water_temp,
        'currentDepth': round(depth, 2),
        'timestamp': time.time()
    })


@app.route('/api/targets', methods=['GET'])
def get_targets():
    sorted_targets = sorted(targets, key=lambda t: t.get('createdAt', 0), reverse=True)
    return jsonify(sorted_targets)


@app.route('/api/targets', methods=['POST'])
def create_target():
    data = request.get_json()
    target = {
        'id': str(int(time.time() * 1000)),
        'name': data.get('name', '未知目标'),
        'type': data.get('type', 'unidentified'),
        'x': data.get('x', 0),
        'y': data.get('y', 0),
        'z': data.get('z', 0),
        'createdAt': time.time()
    }
    targets.append(target)
    return jsonify(target), 201


@app.route('/api/targets/<target_id>', methods=['GET'])
def get_target(target_id):
    target = next((t for t in targets if t['id'] == target_id), None)
    if target:
        return jsonify(target)
    return jsonify({'error': 'Target not found'}), 404


@app.route('/api/targets/<target_id>', methods=['PUT'])
def update_target(target_id):
    data = request.get_json()
    target = next((t for t in targets if t['id'] == target_id), None)
    if target:
        target.update({
            'name': data.get('name', target['name']),
            'type': data.get('type', target['type']),
            'x': data.get('x', target['x']),
            'y': data.get('y', target['y']),
            'z': data.get('z', target['z'])
        })
        return jsonify(target)
    return jsonify({'error': 'Target not found'}), 404


@app.route('/api/targets/<target_id>', methods=['DELETE'])
def delete_target(target_id):
    global targets
    targets = [t for t in targets if t['id'] != target_id]
    return jsonify({'success': True})


@app.route('/api/export-terrain', methods=['GET'])
def export_terrain():
    size = 100
    step = 2
    vertices = []
    faces = []

    for i in range(0, size + 1, step):
        for j in range(0, size + 1, step):
            x = i - size / 2
            z = j - size / 2
            y = generate_height(x, z)
            vertices.append((x, y, z))

    grid_size = (size // step) + 1
    for i in range(grid_size - 1):
        for j in range(grid_size - 1):
            a = i * grid_size + j + 1
            b = i * grid_size + (j + 1) + 1
            c = (i + 1) * grid_size + (j + 1) + 1
            d = (i + 1) * grid_size + j + 1
            faces.append((a, b, c))
            faces.append((a, c, d))

    obj_lines = []
    obj_lines.append('# Deep Sea Echo Sounder - Terrain Export')
    obj_lines.append(f'# Generated at: {time.ctime()}')
    obj_lines.append('')

    for v in vertices:
        obj_lines.append(f'v {v[0]} {v[1]} {v[2]}')

    obj_lines.append('')

    for f in faces:
        obj_lines.append(f'f {f[0]} {f[1]} {f[2]}')

    obj_content = '\n'.join(obj_lines)

    return Response(
        obj_content,
        mimetype='text/plain',
        headers={'Content-Disposition': 'attachment; filename=terrain.obj'}
    )


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
