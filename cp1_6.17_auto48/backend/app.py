from flask import Flask, request, jsonify, send_file, make_response
from flask_cors import CORS
import io
import os
import uuid
from image_service import generate_image, SIZE_PRESETS, STYLE_PRESETS

app = Flask(__name__)
CORS(app)

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'generated')
os.makedirs(OUTPUT_DIR, exist_ok=True)


def serve_pil_image(img):
    buf = io.BytesIO()
    img.save(buf, format='PNG', optimize=True, quality=85)
    buf.seek(0)
    return buf


@app.route('/api/styles', methods=['GET'])
def get_styles():
    styles = []
    for key, value in STYLE_PRESETS.items():
        styles.append({
            'key': key,
            'name': value['name'],
            'preview': {
                'bg': value.get('bg_color', value.get('bg_color_1', '#FFFFFF')),
                'accent': value['accent_color'],
                'text': value['primary_color'],
            }
        })
    return jsonify(styles)


@app.route('/api/sizes', methods=['GET'])
def get_sizes():
    sizes = []
    for key, value in SIZE_PRESETS.items():
        sizes.append({
            'key': key,
            'name': value['name'],
            'width': value['width'],
            'height': value['height'],
            'sub': value['sub'],
        })
    return jsonify(sizes)


@app.route('/api/image-generate', methods=['POST'])
def image_generate():
    data = request.json
    theme = data.get('theme', '').strip()
    style = data.get('style', 'minimal_white')
    sizes = data.get('sizes', [])

    if not theme:
        return jsonify({'error': '主题文本不能为空'}), 400
    if not sizes:
        return jsonify({'error': '请至少选择一种尺寸'}), 400

    results = []
    for size_key in sizes:
        if size_key not in SIZE_PRESETS:
            continue
        try:
            img = generate_image(theme, style, size_key)
            file_id = f"{uuid.uuid4().hex}_{size_key}.png"
            file_path = os.path.join(OUTPUT_DIR, file_id)
            img.save(file_path, format='PNG', optimize=True, quality=85)
            size_info = SIZE_PRESETS[size_key]
            results.append({
                'id': file_id,
                'url': f'/api/image/{file_id}',
                'size_key': size_key,
                'name': size_info['name'],
                'sub': size_info['sub'],
                'width': size_info['width'],
                'height': size_info['height'],
            })
        except Exception as e:
            print(f"Error generating {size_key}: {e}")
            continue

    return jsonify({'images': results})


@app.route('/api/image-adjust', methods=['POST'])
def image_adjust():
    data = request.json
    theme = data.get('theme', '').strip()
    style = data.get('style', 'minimal_white')
    size_key = data.get('size_key', 'instagram')
    adjustments = data.get('adjustments', {})

    if not theme:
        return jsonify({'error': '主题文本不能为空'}), 400

    try:
        img = generate_image(theme, style, size_key, adjustments)
        buf = serve_pil_image(img)
        response = make_response(send_file(buf, mimetype='image/png'))
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
        return response
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/image/<filename>', methods=['GET'])
def get_image(filename):
    safe_name = os.path.basename(filename)
    file_path = os.path.join(OUTPUT_DIR, safe_name)
    if not os.path.exists(file_path):
        return jsonify({'error': '图片不存在'}), 404
    return send_file(file_path, mimetype='image/png')


@app.route('/api/image/download/<filename>', methods=['GET'])
def download_image(filename):
    safe_name = os.path.basename(filename)
    file_path = os.path.join(OUTPUT_DIR, safe_name)
    if not os.path.exists(file_path):
        return jsonify({'error': '图片不存在'}), 404
    return send_file(file_path, mimetype='image/png', as_attachment=True, download_name=safe_name)


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5001, debug=False)
