from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

storage = {
    'grid': None,
    'speciesCounts': None
}


@app.route('/api/save', methods=['POST'])
def save_state():
    data = request.get_json()
    storage['grid'] = data.get('grid')
    storage['speciesCounts'] = data.get('speciesCounts')
    return jsonify({'status': 'ok'}), 200


@app.route('/api/load', methods=['GET'])
def load_state():
    return jsonify({
        'grid': storage['grid'],
        'speciesCounts': storage['speciesCounts']
    }), 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
