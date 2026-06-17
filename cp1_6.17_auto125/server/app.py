from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import uuid
import mimetypes
from werkzeug.utils import secure_filename

from models import (
    MaterialPreset,
    LightPosition,
    PresetStore,
    preset_store,
    UPLOADS_DIR,
)

ALLOWED_MODEL_EXTENSIONS = {
    '.glb', '.gltf', '.obj', '.fbx', '.stl', '.3ds', '.dae', '.ply'
}
MAX_UPLOAD_SIZE = 100 * 1024 * 1024

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}, r"/uploads/*": {"origins": "*"}})
app.config['MAX_CONTENT_LENGTH'] = MAX_UPLOAD_SIZE
app.config['UPLOAD_FOLDER'] = UPLOADS_DIR

os.makedirs(UPLOADS_DIR, exist_ok=True)


def is_allowed_file(filename: str) -> bool:
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_MODEL_EXTENSIONS


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'service': '3d-material-lab-api',
        'version': '1.0.0',
    }), 200


@app.route('/api/presets', methods=['GET'])
def get_presets():
    presets = preset_store.get_all()
    return jsonify({
        'success': True,
        'count': len(presets),
        'presets': [p.to_dict() for p in presets],
    }), 200


@app.route('/api/presets', methods=['POST'])
def create_preset():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({'success': False, 'error': 'Request body is required'}), 400

        preset = MaterialPreset.from_dict(data)
        errors = preset.validate()
        if errors:
            return jsonify({
                'success': False,
                'error': 'Validation failed',
                'details': errors,
            }), 400

        saved = preset_store.add(preset)
        return jsonify({
            'success': True,
            'message': 'Preset saved successfully',
            'preset': saved.to_dict(),
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}',
        }), 500


@app.route('/api/presets/<preset_id>', methods=['GET'])
def get_preset(preset_id: str):
    preset = preset_store.get_by_id(preset_id)
    if not preset:
        return jsonify({
            'success': False,
            'error': f'Preset with id {preset_id} not found',
        }), 404
    return jsonify({
        'success': True,
        'preset': preset.to_dict(),
    }), 200


@app.route('/api/presets/<preset_id>', methods=['DELETE'])
def delete_preset(preset_id: str):
    deleted = preset_store.delete(preset_id)
    if not deleted:
        return jsonify({
            'success': False,
            'error': f'Preset with id {preset_id} not found',
        }), 404
    return jsonify({
        'success': True,
        'message': 'Preset deleted successfully',
    }), 200


@app.route('/api/material-types', methods=['GET'])
def get_material_types():
    return jsonify({
        'success': True,
        'types': [
            {'key': 'metal', 'label': '金属', 'description': '高反射金属表面'},
            {'key': 'plastic', 'label': '粗糙塑料', 'description': '低反射粗糙表面'},
            {'key': 'glass', 'label': '透明玻璃', 'description': '半透明折射表面'},
            {'key': 'emissive', 'label': '自发光', 'description': '发光材质表面'},
        ],
    }), 200


@app.route('/api/texture-types', methods=['GET'])
def get_texture_types():
    return jsonify({
        'success': True,
        'types': [
            {'key': 'none', 'label': '无纹理'},
            {'key': 'wood', 'label': '木纹'},
            {'key': 'marble', 'label': '大理石'},
            {'key': 'brushed', 'label': '磨砂金属'},
            {'key': 'fabric', 'label': '织物'},
        ],
    }), 200


@app.route('/api/models/upload', methods=['POST'])
def upload_model():
    if 'model' not in request.files:
        return jsonify({
            'success': False,
            'error': 'No model file uploaded (expected field: "model")',
        }), 400

    file = request.files['model']
    if not file or file.filename == '':
        return jsonify({
            'success': False,
            'error': 'Empty file selected',
        }), 400

    filename = file.filename
    if not is_allowed_file(filename):
        return jsonify({
            'success': False,
            'error': f'Unsupported file type. Allowed: {", ".join(sorted(ALLOWED_MODEL_EXTENSIONS))}',
        }), 400

    safe_name = secure_filename(filename)
    ext = os.path.splitext(safe_name)[1].lower()
    unique_name = f'model_{uuid.uuid4().hex[:12]}{ext}'
    save_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_name)

    try:
        file.save(save_path)
        file_size = os.path.getsize(save_path)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Failed to save file: {str(e)}',
        }), 500

    file_url = f'/uploads/{unique_name}'
    mime_type, _ = mimetypes.guess_type(safe_name)

    return jsonify({
        'success': True,
        'message': 'Model uploaded successfully',
        'model': {
            'id': unique_name,
            'originalName': safe_name,
            'storedName': unique_name,
            'size': file_size,
            'type': mime_type or 'application/octet-stream',
            'extension': ext,
            'url': file_url,
        },
    }), 201


@app.route('/api/models', methods=['GET'])
def list_models():
    models = []
    if os.path.isdir(UPLOADS_DIR):
        for fname in os.listdir(UPLOADS_DIR):
            fpath = os.path.join(UPLOADS_DIR, fname)
            if os.path.isfile(fpath) and is_allowed_file(fname):
                stat = os.stat(fpath)
                models.append({
                    'id': fname,
                    'name': fname,
                    'size': stat.st_size,
                    'modified': stat.st_mtime,
                    'url': f'/uploads/{fname}',
                })
    return jsonify({
        'success': True,
        'count': len(models),
        'models': models,
    }), 200


@app.route('/uploads/<filename>', methods=['GET'])
def serve_upload(filename: str):
    return send_from_directory(
        app.config['UPLOAD_FOLDER'],
        filename,
        as_attachment=False,
    )


@app.errorhandler(413)
def request_entity_too_large(error):
    return jsonify({
        'success': False,
        'error': f'File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)}MB',
    }), 413


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found',
    }), 404


if __name__ == '__main__':
    print('=' * 60)
    print('  3D Material Lab - Flask API Server')
    print('=' * 60)
    print(f'  Presets storage: {UPLOADS_DIR}')
    print(f'  Models uploads : {UPLOADS_DIR}')
    print(f'  Listening on   : http://localhost:5000')
    print('=' * 60)
    app.run(
        host='0.0.0.0',
        port=5000,
        debug=True,
    )
