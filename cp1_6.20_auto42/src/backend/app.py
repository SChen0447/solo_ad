import os
import io
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image

app = Flask(__name__)
CORS(app)

THUMBNAIL_MAX_SIZE = 600
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/api/upload', methods=['POST'])
def upload():
    files = request.files.getlist('files')
    if not files:
        return jsonify({'error': 'No files provided'}), 400

    thumbnails = []
    for file in files:
        if not allowed_file(file.filename):
            continue

        try:
            img = Image.open(file.stream)
            img = img.convert('RGB')

            original_width, original_height = img.size
            ratio = min(THUMBNAIL_MAX_SIZE / original_width, THUMBNAIL_MAX_SIZE / original_height)
            if ratio < 1:
                new_width = int(original_width * ratio)
                new_height = int(original_height * ratio)
                img = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=85)
            thumbnail_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')

            thumbnails.append({
                'originalName': file.filename or 'unknown.jpg',
                'thumbnailBase64': f'data:image/jpeg;base64,{thumbnail_base64}',
                'width': img.width,
                'height': img.height,
            })
        except Exception as e:
            print(f'Error processing file {file.filename}: {e}')
            continue

    return jsonify({'thumbnails': thumbnails})

if __name__ == '__main__':
    app.run(port=5001, debug=True)
