from flask import Flask, jsonify
from flask_cors import CORS
import random
import time

app = Flask(__name__)
CORS(app)

layer_colors = [
    {'name': '表土层', 'color': '#8B7355'},
    {'name': '粘土层', 'color': '#CD853F'},
    {'name': '砂岩层', 'color': '#D2691E'},
    {'name': '石灰岩层', 'color': '#A0522D'},
    {'name': '基岩层', 'color': '#4A4A4A'}
]

def generate_layers():
    layers = []
    current_depth = 0
    for i, layer_info in enumerate(layer_colors):
        thickness = round(random.uniform(2, 6), 2)
        layer = {
            'id': i,
            'name': layer_info['name'],
            'color': layer_info['color'],
            'thickness': thickness,
            'topDepth': current_depth,
            'bottomDepth': round(current_depth + thickness, 2)
        }
        layers.append(layer)
        current_depth += thickness
    return layers

def generate_drills(layers):
    drills = []
    total_depth = sum(l['thickness'] for l in layers)
    for i in range(20):
        depth = round(random.uniform(3, 12), 2)
        actual_depth = min(depth, total_depth)
        x = round(random.uniform(-15, 15), 2)
        z = round(random.uniform(-15, 15), 2)
        
        lithology = []
        remaining_depth = actual_depth
        for layer in layers:
            if remaining_depth <= 0:
                break
            layer_thickness = min(layer['thickness'], remaining_depth)
            lithology.append({
                'layerId': layer['id'],
                'layerName': layer['name'],
                'color': layer['color'],
                'thickness': round(layer_thickness, 2)
            })
            remaining_depth -= layer_thickness
        
        drill = {
            'id': i,
            'wellNo': f'ZK-{str(i+1).zfill(3)}',
            'x': x,
            'y': 0,
            'z': z,
            'depth': actual_depth,
            'sampleTime': time.strftime('%Y-%m-%d', time.localtime(time.time() - random.randint(0, 365*24*3600))),
            'lithology': lithology
        }
        drills.append(drill)
    return drills

layers_data = generate_layers()
drills_data = generate_drills(layers_data)

@app.route('/api/layers', methods=['GET'])
def get_layers():
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': layers_data
    })

@app.route('/api/drills', methods=['GET'])
def get_drills():
    return jsonify({
        'code': 200,
        'message': 'success',
        'data': drills_data
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
