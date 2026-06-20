import os
import io
import uuid
from flask import Blueprint, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename
from PIL import Image
from .config import Config
from .auth import login_required

upload_bp = Blueprint('upload', __name__)

def _allowed_file(filename):
    return '.' in filename and \
        filename.rsplit('.', 1)[1].lower() in Config.ALLOWED_EXTENSIONS

def _compress_image(file_bytes, max_size=(1600, 1600), quality=85):
    try:
        img = Image.open(io.BytesIO(file_bytes))
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGB')
        img.thumbnail(max_size, Image.LANCZOS)
        output = io.BytesIO()
        img.save(output, format='JPEG', quality=quality, optimize=True, progressive=True)
        return output.getvalue(), 'jpg'
    except Exception:
        return file_bytes, 'jpg'

@upload_bp.route('/api/upload/design', methods=['POST'])
@login_required
def upload_design():
    if 'file' not in request.files:
        return jsonify({'error': '未找到文件'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '请选择文件'}), 400
    if not _allowed_file(file.filename):
        return jsonify({'error': '仅支持 PNG/JPG 格式'}), 400

    original_bytes = file.read()
    if len(original_bytes) > Config.MAX_CONTENT_LENGTH:
        return jsonify({'error': '文件大小超过5MB限制'}), 400

    compressed_bytes, ext = _compress_image(original_bytes)
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(Config.UPLOAD_FOLDER, secure_filename(filename))
    with open(filepath, 'wb') as f:
        f.write(compressed_bytes)

    url = f"/uploads/{filename}"
    return jsonify({
        'url': url,
        'filename': filename,
        'size': len(compressed_bytes)
    })

@upload_bp.route('/uploads/<path:filename>')
def serve_upload(filename):
    return send_from_directory(Config.UPLOAD_FOLDER, filename)
