from flask import Flask, jsonify, request
from flask_cors import CORS
import json
import os
import time

app = Flask(__name__)
CORS(app)

records = []
record_id_counter = 0

DATA_PATH = os.path.join(os.path.dirname(__file__), 'species_data.json')

def load_species():
    with open(DATA_PATH, 'r', encoding='utf-8') as f:
        return json.load(f)

@app.route('/api/species', methods=['GET'])
def get_species():
    species = load_species()
    return jsonify(species)

@app.route('/api/records', methods=['POST'])
def save_record():
    global record_id_counter
    data = request.get_json()
    record_id_counter += 1
    record = {
        'id': record_id_counter,
        'species': data.get('species'),
        'environment': data.get('environment'),
        'stage': data.get('stage'),
        'timestamp': data.get('timestamp', time.strftime('%Y-%m-%dT%H:%M:%S'))
    }
    records.append(record)
    return jsonify({'id': record_id_counter, 'status': 'saved'}), 201

@app.route('/api/records', methods=['GET'])
def get_records():
    species_filter = request.args.get('species')
    if species_filter:
        filtered = [r for r in records if r['species'] == species_filter]
        return jsonify(filtered)
    return jsonify(records)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
