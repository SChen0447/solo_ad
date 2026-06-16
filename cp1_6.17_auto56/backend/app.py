from flask import Flask, jsonify, request
from flask_cors import CORS
import random
import math
from heatmapInterpolator import HeatmapInterpolator

app = Flask(__name__)
CORS(app)

GRID_SIZE = 8
SPACING = 30
BUILDING_COUNT = GRID_SIZE * GRID_SIZE


def generate_grid_data():
    buildings = []
    building_id = 1

    for row in range(GRID_SIZE):
        for col in range(GRID_SIZE):
            width = random.uniform(12, 22)
            depth = random.uniform(12, 22)
            height = random.uniform(5, 80)

            x = col * SPACING - (GRID_SIZE - 1) * SPACING / 2
            z = row * SPACING - (GRID_SIZE - 1) * SPACING / 2

            x += random.uniform(-4, 4)
            z += random.uniform(-4, 4)

            buildings.append({
                'id': building_id,
                'x': x,
                'y': 0,
                'z': z,
                'width': width,
                'depth': depth,
                'height': height
            })
            building_id += 1

    return buildings


GRID_DATA = generate_grid_data()
interpolator = HeatmapInterpolator(power=2.0)


@app.route('/api/grid', methods=['GET'])
def get_grid():
    return jsonify({
        'buildings': GRID_DATA,
        'gridSize': GRID_SIZE,
        'spacing': SPACING
    })


@app.route('/api/layer/energy', methods=['GET'])
def get_energy_layer():
    radius = float(request.args.get('radius', 40))
    result = interpolator.interpolate_grid(GRID_DATA, 'energy', radius)
    return jsonify({
        'layer': 'energy',
        'values': {str(k): round(v, 2) for k, v in result.items()},
        'minValue': min(result.values()),
        'maxValue': max(result.values())
    })


@app.route('/api/layer/traffic', methods=['GET'])
def get_traffic_layer():
    radius = float(request.args.get('radius', 40))
    result = interpolator.interpolate_grid(GRID_DATA, 'traffic', radius)
    return jsonify({
        'layer': 'traffic',
        'values': {str(k): round(v, 2) for k, v in result.items()},
        'minValue': min(result.values()),
        'maxValue': max(result.values())
    })


@app.route('/api/layer/green', methods=['GET'])
def get_green_layer():
    radius = float(request.args.get('radius', 40))
    result = interpolator.interpolate_grid(GRID_DATA, 'green', radius)
    return jsonify({
        'layer': 'green',
        'values': {str(k): round(v, 2) for k, v in result.items()},
        'minValue': min(result.values()),
        'maxValue': max(result.values())
    })


if __name__ == '__main__':
    print('Starting City Heatmap API Server...')
    print(f'Generated {BUILDING_COUNT} buildings')
    print('API Endpoints:')
    print('  GET /api/grid - City grid data')
    print('  GET /api/layer/energy?radius=40 - Energy consumption layer')
    print('  GET /api/layer/traffic?radius=40 - Traffic flow layer')
    print('  GET /api/layer/green?radius=40 - Green coverage layer')
    app.run(host='0.0.0.0', port=5001, debug=True)
