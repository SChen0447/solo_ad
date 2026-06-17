from flask import Flask, request, jsonify
from flask_cors import CORS
from molecule_parser import parse_smiles, get_preset_molecules, get_molecule_name

app = Flask(__name__)
CORS(app)

@app.route('/api/molecule/sample', methods=['GET'])
def get_samples():
    try:
        molecules = get_preset_molecules()
        return jsonify({
            'success': True,
            'molecules': molecules
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/molecule/load', methods=['POST'])
def load_molecule():
    try:
        data = request.get_json()
        if not data or 'smiles' not in data:
            return jsonify({
                'success': False,
                'error': 'SMILES string is required'
            }), 400

        smiles = data['smiles'].strip()
        if not smiles:
            return jsonify({
                'success': False,
                'error': 'SMILES string cannot be empty'
            }), 400

        result = parse_smiles(smiles)
        if result is None:
            return jsonify({
                'success': False,
                'error': 'Failed to parse SMILES string'
            }), 400

        if 'name' not in result or result['name'] == 'Unknown':
            result['name'] = get_molecule_name(smiles)

        return jsonify({
            'success': True,
            **result
        })

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'message': 'Molecule parser service is running'
    })

if __name__ == '__main__':
    print('Starting Molecule 3D Viewer Backend...')
    print('Server running on http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)
