from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os

app = Flask(__name__)
CORS(app)

SAVED_MARKERS_FILE = os.path.join(os.path.dirname(__file__), 'saved_markers.json')

ELEMENT_NAMES = {
    'H': '氢', 'C': '碳', 'N': '氮', 'O': '氧',
    'F': '氟', 'P': '磷', 'S': '硫', 'Cl': '氯'
}

MOLECULES_DB = {
    'water': {
        'id': 'water',
        'name': '水 (H₂O)',
        'formula': 'H2O',
        'description': '水分子，生命之源',
        'atoms': [
            {'element': 'O', 'x': 0.0, 'y': 0.0, 'z': 0.0},
            {'element': 'H', 'x': 0.757, 'y': 0.586, 'z': 0.0},
            {'element': 'H', 'x': -0.757, 'y': 0.586, 'z': 0.0}
        ],
        'bonds': [
            {'from': 0, 'to': 1, 'type': 1},
            {'from': 0, 'to': 2, 'type': 1}
        ]
    },
    'methane': {
        'id': 'methane',
        'name': '甲烷 (CH₄)',
        'formula': 'CH4',
        'description': '最简单的烷烃，天然气主要成分',
        'atoms': [
            {'element': 'C', 'x': 0.0, 'y': 0.0, 'z': 0.0},
            {'element': 'H', 'x': 0.629, 'y': 0.629, 'z': 0.629},
            {'element': 'H', 'x': -0.629, 'y': -0.629, 'z': 0.629},
            {'element': 'H', 'x': -0.629, 'y': 0.629, 'z': -0.629},
            {'element': 'H', 'x': 0.629, 'y': -0.629, 'z': -0.629}
        ],
        'bonds': [
            {'from': 0, 'to': 1, 'type': 1},
            {'from': 0, 'to': 2, 'type': 1},
            {'from': 0, 'to': 3, 'type': 1},
            {'from': 0, 'to': 4, 'type': 1}
        ]
    },
    'ammonia': {
        'id': 'ammonia',
        'name': '氨 (NH₃)',
        'formula': 'NH3',
        'description': '氨分子，三角锥形结构',
        'atoms': [
            {'element': 'N', 'x': 0.0, 'y': 0.0, 'z': 0.0},
            {'element': 'H', 'x': 0.938, 'y': -0.313, 'z': 0.0},
            {'element': 'H', 'x': -0.469, 'y': -0.313, 'z': 0.812},
            {'element': 'H', 'x': -0.469, 'y': -0.313, 'z': -0.812}
        ],
        'bonds': [
            {'from': 0, 'to': 1, 'type': 1},
            {'from': 0, 'to': 2, 'type': 1},
            {'from': 0, 'to': 3, 'type': 1}
        ]
    },
    'co2': {
        'id': 'co2',
        'name': '二氧化碳 (CO₂)',
        'formula': 'CO2',
        'description': '线性分子，温室气体',
        'atoms': [
            {'element': 'C', 'x': 0.0, 'y': 0.0, 'z': 0.0},
            {'element': 'O', 'x': 1.163, 'y': 0.0, 'z': 0.0},
            {'element': 'O', 'x': -1.163, 'y': 0.0, 'z': 0.0}
        ],
        'bonds': [
            {'from': 0, 'to': 1, 'type': 2},
            {'from': 0, 'to': 2, 'type': 2}
        ]
    },
    'ethanol': {
        'id': 'ethanol',
        'name': '乙醇 (C₂H₆O)',
        'formula': 'C2H6O',
        'description': '酒精，常见有机溶剂',
        'atoms': [
            {'element': 'C', 'x': -0.726, 'y': -0.045, 'z': 0.0},
            {'element': 'C', 'x': 0.726, 'y': 0.045, 'z': 0.0},
            {'element': 'O', 'x': 1.447, 'y': -1.170, 'z': 0.0},
            {'element': 'H', 'x': -1.133, 'y': 0.486, 'z': 0.890},
            {'element': 'H', 'x': -1.133, 'y': 0.486, 'z': -0.890},
            {'element': 'H', 'x': -0.997, 'y': -1.080, 'z': 0.0},
            {'element': 'H', 'x': 1.130, 'y': 0.559, 'z': 0.890},
            {'element': 'H', 'x': 1.130, 'y': 0.559, 'z': -0.890},
            {'element': 'H', 'x': 2.367, 'y': -1.038, 'z': 0.0}
        ],
        'bonds': [
            {'from': 0, 'to': 1, 'type': 1},
            {'from': 1, 'to': 2, 'type': 1},
            {'from': 0, 'to': 3, 'type': 1},
            {'from': 0, 'to': 4, 'type': 1},
            {'from': 0, 'to': 5, 'type': 1},
            {'from': 1, 'to': 6, 'type': 1},
            {'from': 1, 'to': 7, 'type': 1},
            {'from': 2, 'to': 8, 'type': 1}
        ]
    },
    'benzene': {
        'id': 'benzene',
        'name': '苯 (C₆H₆)',
        'formula': 'C6H6',
        'description': '芳香烃，平面六元环',
        'atoms': [
            {'element': 'C', 'x': 1.395, 'y': 0.0, 'z': 0.0},
            {'element': 'C', 'x': 0.697, 'y': 1.208, 'z': 0.0},
            {'element': 'C', 'x': -0.697, 'y': 1.208, 'z': 0.0},
            {'element': 'C', 'x': -1.395, 'y': 0.0, 'z': 0.0},
            {'element': 'C', 'x': -0.697, 'y': -1.208, 'z': 0.0},
            {'element': 'C', 'x': 0.697, 'y': -1.208, 'z': 0.0},
            {'element': 'H', 'x': 2.481, 'y': 0.0, 'z': 0.0},
            {'element': 'H', 'x': 1.240, 'y': 2.150, 'z': 0.0},
            {'element': 'H', 'x': -1.240, 'y': 2.150, 'z': 0.0},
            {'element': 'H', 'x': -2.481, 'y': 0.0, 'z': 0.0},
            {'element': 'H', 'x': -1.240, 'y': -2.150, 'z': 0.0},
            {'element': 'H', 'x': 1.240, 'y': -2.150, 'z': 0.0}
        ],
        'bonds': [
            {'from': 0, 'to': 1, 'type': 1},
            {'from': 1, 'to': 2, 'type': 2},
            {'from': 2, 'to': 3, 'type': 1},
            {'from': 3, 'to': 4, 'type': 2},
            {'from': 4, 'to': 5, 'type': 1},
            {'from': 5, 'to': 0, 'type': 2},
            {'from': 0, 'to': 6, 'type': 1},
            {'from': 1, 'to': 7, 'type': 1},
            {'from': 2, 'to': 8, 'type': 1},
            {'from': 3, 'to': 9, 'type': 1},
            {'from': 4, 'to': 10, 'type': 1},
            {'from': 5, 'to': 11, 'type': 1}
        ]
    },
    'caffeine': {
        'id': 'caffeine',
        'name': '咖啡因 (C₈H₁₀N₄O₂)',
        'formula': 'C8H10N4O2',
        'description': '生物碱，中枢神经兴奋剂',
        'atoms': [
            {'element': 'N', 'x': 0.970, 'y': -1.092, 'z': -0.117},
            {'element': 'C', 'x': 0.371, 'y': -0.080, 'z': 0.077},
            {'element': 'N', 'x': 1.484, 'y': 0.927, 'z': 0.013},
            {'element': 'C', 'x': 1.097, 'y': 2.200, 'z': 0.102},
            {'element': 'C', 'x': 2.943, 'y': 0.604, 'z': -0.178},
            {'element': 'C', 'x': -0.835, 'y': 0.203, 'z': 0.277},
            {'element': 'N', 'x': -1.625, 'y': -0.828, 'z': 0.278},
            {'element': 'C', 'x': -0.627, 'y': -1.886, 'z': 0.083},
            {'element': 'N', 'x': -2.776, 'y': 0.875, 'z': 0.495},
            {'element': 'C', 'x': -1.724, 'y': 1.452, 'z': 0.446},
            {'element': 'O', 'x': 0.501, 'y': 3.303, 'z': 0.188},
            {'element': 'O', 'x': -3.256, 'y': 1.919, 'z': 0.693},
            {'element': 'C', 'x': 2.158, 'y': -1.668, 'z': -0.285},
            {'element': 'C', 'x': 0.108, 'y': -2.874, 'z': 0.008},
            {'element': 'C', 'x': 3.885, 'y': 1.810, 'z': -0.335},
            {'element': 'C', 'x': -1.871, 'y': 2.974, 'z': 0.589},
            {'element': 'H', 'x': 3.054, 'y': -1.483, 'z': -1.344},
            {'element': 'H', 'x': 2.785, 'y': -1.288, 'z': 0.505},
            {'element': 'H', 'x': 1.799, 'y': -2.730, 'z': -0.176},
            {'element': 'H', 'x': -0.249, 'y': -3.299, 'z': 0.940},
            {'element': 'H', 'x': 1.051, 'y': -3.418, 'z': -0.050},
            {'element': 'H', 'x': -0.532, 'y': -2.743, 'z': -0.850},
            {'element': 'H', 'x': 4.810, 'y': 1.423, 'z': 0.105},
            {'element': 'H', 'x': 3.829, 'y': 2.789, 'z': 0.159},
            {'element': 'H', 'x': 3.935, 'y': 1.984, 'z': -1.424},
            {'element': 'H', 'x': -2.909, 'y': 3.250, 'z': 0.406},
            {'element': 'H', 'x': -1.349, 'y': 3.458, 'z': 1.422},
            {'element': 'H', 'x': -1.213, 'y': 3.341, 'z': -0.280}
        ],
        'bonds': [
            {'from': 0, 'to': 1, 'type': 1},
            {'from': 0, 'to': 7, 'type': 1},
            {'from': 0, 'to': 12, 'type': 1},
            {'from': 1, 'to': 2, 'type': 2},
            {'from': 1, 'to': 5, 'type': 1},
            {'from': 2, 'to': 3, 'type': 1},
            {'from': 2, 'to': 4, 'type': 1},
            {'from': 3, 'to': 10, 'type': 2},
            {'from': 4, 'to': 14, 'type': 1},
            {'from': 5, 'to': 6, 'type': 1},
            {'from': 5, 'to': 9, 'type': 2},
            {'from': 6, 'to': 7, 'type': 2},
            {'from': 7, 'to': 13, 'type': 1},
            {'from': 8, 'to': 9, 'type': 1},
            {'from': 8, 'to': 11, 'type': 2},
            {'from': 9, 'to': 15, 'type': 1},
            {'from': 13, 'to': 19, 'type': 1},
            {'from': 13, 'to': 20, 'type': 1},
            {'from': 13, 'to': 21, 'type': 1},
            {'from': 14, 'to': 22, 'type': 1},
            {'from': 14, 'to': 23, 'type': 1},
            {'from': 14, 'to': 24, 'type': 1},
            {'from': 15, 'to': 25, 'type': 1},
            {'from': 15, 'to': 26, 'type': 1},
            {'from': 15, 'to': 27, 'type': 1}
        ]
    },
    'acetic-acid': {
        'id': 'acetic-acid',
        'name': '乙酸 (C₂H₄O₂)',
        'formula': 'C2H4O2',
        'description': '食醋的主要成分',
        'atoms': [
            {'element': 'C', 'x': -0.634, 'y': -0.000, 'z': 0.0},
            {'element': 'C', 'x': 0.778, 'y': 0.000, 'z': 0.0},
            {'element': 'O', 'x': 1.367, 'y': 1.082, 'z': 0.0},
            {'element': 'O', 'x': 1.367, 'y': -1.082, 'z': 0.0},
            {'element': 'H', 'x': 2.367, 'y': -1.028, 'z': 0.0},
            {'element': 'H', 'x': -0.982, 'y': 0.527, 'z': 0.891},
            {'element': 'H', 'x': -0.982, 'y': 0.527, 'z': -0.891},
            {'element': 'H', 'x': -0.982, 'y': -1.055, 'z': 0.0}
        ],
        'bonds': [
            {'from': 0, 'to': 1, 'type': 1},
            {'from': 1, 'to': 2, 'type': 2},
            {'from': 1, 'to': 3, 'type': 1},
            {'from': 3, 'to': 4, 'type': 1},
            {'from': 0, 'to': 5, 'type': 1},
            {'from': 0, 'to': 6, 'type': 1},
            {'from': 0, 'to': 7, 'type': 1}
        ]
    },
    'aspirin': {
        'id': 'aspirin',
        'name': '阿司匹林 (C₉H₈O₄)',
        'formula': 'C9H8O4',
        'description': '乙酰水杨酸，常用解热镇痛药',
        'atoms': [
            {'element': 'C', 'x': 2.331, 'y': 0.940, 'z': 0.0},
            {'element': 'C', 'x': 2.590, 'y': -0.437, 'z': 0.0},
            {'element': 'C', 'x': 1.315, 'y': -1.241, 'z': 0.0},
            {'element': 'C', 'x': -0.032, 'y': -0.679, 'z': 0.0},
            {'element': 'C', 'x': -0.324, 'y': 0.734, 'z': 0.0},
            {'element': 'C', 'x': 0.953, 'y': 1.502, 'z': 0.0},
            {'element': 'C', 'x': -1.422, 'y': 1.511, 'z': 0.0},
            {'element': 'C', 'x': -2.773, 'y': 0.826, 'z': 0.0},
            {'element': 'C', 'x': -3.036, 'y': -0.611, 'z': 0.0},
            {'element': 'O', 'x': 3.516, 'y': 1.704, 'z': 0.0},
            {'element': 'O', 'x': 1.458, 'y': 2.831, 'z': 0.0},
            {'element': 'O', 'x': -4.198, 'y': -1.208, 'z': 0.0},
            {'element': 'O', 'x': -1.934, 'y': -1.292, 'z': 0.0},
            {'element': 'H', 'x': 3.579, 'y': -0.876, 'z': 0.0},
            {'element': 'H', 'x': 1.490, 'y': -2.308, 'z': 0.0},
            {'element': 'H', 'x': 4.458, 'y': 1.347, 'z': 0.0},
            {'element': 'H', 'x': 1.805, 'y': 3.502, 'z': 0.0},
            {'element': 'H', 'x': -3.514, 'y': 1.429, 'z': 0.0},
            {'element': 'H', 'x': -1.420, 'y': 2.591, 'z': 0.0}
        ],
        'bonds': [
            {'from': 0, 'to': 1, 'type': 2},
            {'from': 0, 'to': 5, 'type': 1},
            {'from': 0, 'to': 9, 'type': 1},
            {'from': 1, 'to': 2, 'type': 1},
            {'from': 1, 'to': 13, 'type': 1},
            {'from': 2, 'to': 3, 'type': 2},
            {'from': 2, 'to': 14, 'type': 1},
            {'from': 3, 'to': 4, 'type': 1},
            {'from': 4, 'to': 5, 'type': 2},
            {'from': 4, 'to': 6, 'type': 1},
            {'from': 5, 'to': 10, 'type': 1},
            {'from': 6, 'to': 7, 'type': 1},
            {'from': 6, 'to': 18, 'type': 1},
            {'from': 7, 'to': 8, 'type': 1},
            {'from': 7, 'to': 17, 'type': 1},
            {'from': 8, 'to': 11, 'type': 2},
            {'from': 8, 'to': 12, 'type': 1},
            {'from': 9, 'to': 15, 'type': 1},
            {'from': 10, 'to': 16, 'type': 1}
        ]
    },
    'glucose': {
        'id': 'glucose',
        'name': '葡萄糖 (C₆H₁₂O₆)',
        'formula': 'C6H12O6',
        'description': '人体重要能量来源，六元环结构',
        'atoms': [
            {'element': 'C', 'x': 0.000, 'y': 1.512, 'z': 0.339},
            {'element': 'C', 'x': 1.438, 'y': 1.217, 'z': -0.116},
            {'element': 'C', 'x': 1.888, 'y': -0.280, 'z': 0.148},
            {'element': 'C', 'x': 0.946, 'y': -1.072, 'z': -0.702},
            {'element': 'C', 'x': -0.486, 'y': -0.772, 'z': -0.248},
            {'element': 'C', 'x': -1.026, 'y': 0.722, 'z': -0.517},
            {'element': 'O', 'x': 0.169, 'y': 0.651, 'z': 1.421},
            {'element': 'O', 'x': 2.197, 'y': 1.712, 'z': 0.706},
            {'element': 'O', 'x': 1.940, 'y': -0.381, 'z': 1.586},
            {'element': 'O', 'x': 1.131, 'y': -2.464, 'z': -0.514},
            {'element': 'O', 'x': -1.309, 'y': -1.451, 'z': -1.137},
            {'element': 'O', 'x': -0.781, 'y': 1.812, 'z': -1.422},
            {'element': 'H', 'x': -0.195, 'y': 2.529, 'z': -0.025},
            {'element': 'H', 'x': 1.463, 'y': 1.445, 'z': -1.187},
            {'element': 'H', 'x': 2.898, 'y': -0.623, 'z': -0.136},
            {'element': 'H', 'x': 0.999, 'y': -0.756, 'z': -1.745},
            {'element': 'H', 'x': -1.072, 'y': -1.085, 'z': 0.793},
            {'element': 'H', 'x': -2.111, 'y': 0.857, 'z': -0.454},
            {'element': 'H', 'x': -0.657, 'y': 0.121, 'z': 1.637},
            {'element': 'H', 'x': 2.042, 'y': 2.636, 'z': 0.512},
            {'element': 'H', 'x': 1.195, 'y': -0.049, 'z': 1.826},
            {'element': 'H', 'x': 1.022, 'y': -2.719, 'z': 0.373},
            {'element': 'H', 'x': -2.254, 'y': -1.539, 'z': -0.976},
            {'element': 'H', 'x': -1.051, 'y': 2.749, 'z': -1.231}
        ],
        'bonds': [
            {'from': 0, 'to': 1, 'type': 1},
            {'from': 0, 'to': 6, 'type': 1},
            {'from': 0, 'to': 12, 'type': 1},
            {'from': 1, 'to': 2, 'type': 1},
            {'from': 1, 'to': 7, 'type': 1},
            {'from': 1, 'to': 13, 'type': 1},
            {'from': 2, 'to': 3, 'type': 1},
            {'from': 2, 'to': 8, 'type': 1},
            {'from': 2, 'to': 14, 'type': 1},
            {'from': 3, 'to': 4, 'type': 1},
            {'from': 3, 'to': 9, 'type': 1},
            {'from': 3, 'to': 15, 'type': 1},
            {'from': 4, 'to': 5, 'type': 1},
            {'from': 4, 'to': 10, 'type': 1},
            {'from': 4, 'to': 16, 'type': 1},
            {'from': 5, 'to': 6, 'type': 1},
            {'from': 5, 'to': 11, 'type': 1},
            {'from': 5, 'to': 17, 'type': 1},
            {'from': 6, 'to': 18, 'type': 1},
            {'from': 7, 'to': 19, 'type': 1},
            {'from': 8, 'to': 20, 'type': 1},
            {'from': 9, 'to': 21, 'type': 1},
            {'from': 10, 'to': 22, 'type': 1},
            {'from': 11, 'to': 23, 'type': 1}
        ]
    }
}


def load_saved_markers():
    if os.path.exists(SAVED_MARKERS_FILE):
        try:
            with open(SAVED_MARKERS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return []
    return []


def save_markers(markers):
    with open(SAVED_MARKERS_FILE, 'w', encoding='utf-8') as f:
        json.dump(markers, f, ensure_ascii=False, indent=2)


@app.route('/api/molecules', methods=['GET'])
def get_molecules_list():
    molecule_list = []
    for mol_id, mol_data in MOLECULES_DB.items():
        molecule_list.append({
            'id': mol_data['id'],
            'name': mol_data['name'],
            'formula': mol_data['formula'],
            'description': mol_data['description'],
            'atom_count': len(mol_data['atoms']),
            'bond_count': len(mol_data['bonds'])
        })
    return jsonify(molecule_list)


@app.route('/api/molecule/<molecule_id>', methods=['GET'])
def get_molecule(molecule_id):
    if molecule_id not in MOLECULES_DB:
        return jsonify({'error': 'Molecule not found'}), 404
    mol = MOLECULES_DB[molecule_id]
    return jsonify({
        'id': mol['id'],
        'name': mol['name'],
        'formula': mol['formula'],
        'description': mol['description'],
        'atoms': mol['atoms'],
        'bonds': mol['bonds']
    })


@app.route('/api/elements', methods=['GET'])
def get_elements():
    return jsonify(ELEMENT_NAMES)


@app.route('/api/save-molecule', methods=['POST'])
def save_molecule_marker():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        required_fields = ['moleculeId', 'cameraPosition', 'cameraRotation', 'zoom']
        for field in required_fields:
            if field not in data:
                return jsonify({'error': f'Missing field: {field}'}), 400

        markers = load_saved_markers()
        marker = {
            'id': len(markers) + 1,
            'moleculeId': data['moleculeId'],
            'moleculeName': MOLECULES_DB.get(data['moleculeId'], {}).get('name', data['moleculeId']),
            'cameraPosition': data['cameraPosition'],
            'cameraRotation': data['cameraRotation'],
            'zoom': data.get('zoom', 1.0),
            'note': data.get('note', ''),
            'createdAt': data.get('createdAt', '')
        }
        markers.append(marker)
        save_markers(markers)

        return jsonify({'success': True, 'marker': marker, 'total': len(markers)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/markers', methods=['GET'])
def get_markers():
    molecule_id = request.args.get('moleculeId')
    markers = load_saved_markers()
    if molecule_id:
        markers = [m for m in markers if m.get('moleculeId') == molecule_id]
    return jsonify(markers)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'molecules_count': len(MOLECULES_DB)})


if __name__ == '__main__':
    print('=' * 50)
    print('  分子结构查看器 - Flask Backend')
    print('  Available molecules:')
    for mol_id, mol in MOLECULES_DB.items():
        print(f'    - {mol_id}: {mol["name"]} ({len(mol["atoms"])} atoms)')
    print('=' * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)
