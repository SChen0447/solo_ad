from flask import Flask, jsonify
from flask_cors import CORS
import requests
import time
import threading

app = Flask(__name__)
CORS(app)

cache = {
    'data': None,
    'timestamp': 0,
    'lock': threading.Lock()
}

CACHE_DURATION = 30
USGS_URL = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_hour.geojson'


def fetch_usgs_data():
    try:
        response = requests.get(USGS_URL, timeout=10)
        if response.status_code == 200:
            return response.json()
    except Exception as e:
        print(f'Error fetching USGS data: {e}')
    return None


def get_cached_data():
    now = time.time()
    with cache['lock']:
        if cache['data'] is None or (now - cache['timestamp']) > CACHE_DURATION:
            data = fetch_usgs_data()
            if data is not None:
                cache['data'] = data
                cache['timestamp'] = now
        return cache['data']


@app.route('/api/earthquakes')
def get_earthquakes():
    data = get_cached_data()
    if data is None:
        return jsonify({'error': 'Failed to fetch earthquake data'}), 500
    return jsonify(data)


@app.route('/api/earthquakes/filter')
def filter_earthquakes():
    from flask import request
    before = request.args.get('before', type=float)
    after = request.args.get('after', type=float)
    data = get_cached_data()
    if data is None:
        return jsonify({'error': 'Failed to fetch earthquake data'}), 500

    features = data.get('features', [])
    filtered = []
    for feature in features:
        time_ms = feature.get('properties', {}).get('time', 0)
        time_s = time_ms / 1000.0
        if before is not None and time_s > before:
            continue
        if after is not None and time_s < after:
            continue
        filtered.append(feature)

    result = dict(data)
    result['features'] = filtered
    result['metadata'] = dict(data.get('metadata', {}))
    result['metadata']['count'] = len(filtered)
    return jsonify(result)


@app.route('/api/health')
def health():
    return jsonify({'status': 'ok', 'timestamp': time.time()})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
