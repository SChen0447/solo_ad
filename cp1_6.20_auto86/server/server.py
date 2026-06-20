from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
from datetime import datetime

app = Flask(__name__, static_folder='../dist', static_url_path='')
CORS(app)

EXPORT_LOG_DIR = os.path.join(os.path.dirname(__file__), 'export_logs')
os.makedirs(EXPORT_LOG_DIR, exist_ok=True)


@app.route('/api/export', methods=['POST'])
def handle_export():
    try:
        data = request.get_json() or {}
        timestamp = data.get('timestamp', datetime.now().timestamp())
        annotations = data.get('annotations', 0)
        cut_height = data.get('cut_height', None)

        log_entry = {
            'timestamp': datetime.fromtimestamp(timestamp).isoformat(),
            'annotations_count': annotations,
            'cut_height': cut_height,
            'success': True
        }

        log_file = os.path.join(EXPORT_LOG_DIR, f'export_{int(timestamp)}.json')
        with open(log_file, 'w', encoding='utf-8') as f:
            json.dump(log_entry, f, ensure_ascii=False, indent=2)

        return jsonify({
            'status': 'success',
            'message': '导出请求已记录',
            'data': log_entry
        }), 200

    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': str(e)
        }), 500


@app.route('/api/exports', methods=['GET'])
def list_exports():
    logs = []
    for filename in sorted(os.listdir(EXPORT_LOG_DIR), reverse=True):
        if filename.endswith('.json'):
            filepath = os.path.join(EXPORT_LOG_DIR, filename)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    logs.append(json.load(f))
            except Exception:
                pass
    return jsonify({'exports': logs})


@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_static(path):
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    print('Starting Flask server on http://localhost:5000')
    app.run(host='0.0.0.0', port=5000, debug=True)
