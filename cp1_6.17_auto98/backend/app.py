from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime

app = Flask(__name__)
CORS(app)

EXPORT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'exports')
os.makedirs(EXPORT_DIR, exist_ok=True)


@app.route('/api/export', methods=['POST'])
def export_scene():
    try:
        data = request.get_json()
        filename = data.get('filename') or f'scene_{datetime.now().strftime("%Y%m%d_%H%M%S")}.scene'
        if not filename.endswith('.scene'):
            filename += '.scene'

        filepath = os.path.join(EXPORT_DIR, filename)

        scene_data = {
            'version': data.get('version', '1.0'),
            'curves': data.get('curves', []),
            'exportTime': data.get('exportTime', datetime.now().isoformat())
        }

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(scene_data, f, indent=2, ensure_ascii=False)

        return jsonify({
            'success': True,
            'filename': filename,
            'downloadUrl': f'/api/download/{filename}'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/import', methods=['POST'])
def import_scene():
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': '未找到上传文件'
            }), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': '文件名为空'
            }), 400

        content = file.read().decode('utf-8')
        scene_data = json.loads(content)

        return jsonify({
            'success': True,
            'data': {
                'version': scene_data.get('version', '1.0'),
                'curves': scene_data.get('curves', []),
                'exportTime': scene_data.get('exportTime', '')
            }
        })
    except json.JSONDecodeError as e:
        return jsonify({
            'success': False,
            'error': f'JSON解析错误: {str(e)}'
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/download/<path:filename>', methods=['GET'])
def download_file(filename):
    try:
        filepath = os.path.join(EXPORT_DIR, filename)
        if not os.path.exists(filepath):
            return jsonify({'success': False, 'error': '文件不存在'}), 404

        return send_file(
            filepath,
            as_attachment=True,
            download_name=filename,
            mimetype='application/json'
        )
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    print('Flask 后端启动: http://localhost:5000')
    print(f'导出目录: {EXPORT_DIR}')
    app.run(host='0.0.0.0', port=5000, debug=True)
