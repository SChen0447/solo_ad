import os
import uuid
import json
from datetime import datetime
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
REPORT_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'reports')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
MAX_CONTENT_LENGTH = 10 * 1024 * 1024

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['REPORT_FOLDER'] = REPORT_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_CONTENT_LENGTH

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(REPORT_FOLDER, exist_ok=True)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


@app.route('/api/upload', methods=['POST'])
def upload_image():
    if 'image' not in request.files:
        return jsonify({'success': False, 'error': 'No file provided'}), 400

    file = request.files['image']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No file selected'}), 400

    if not allowed_file(file.filename):
        return jsonify({'success': False, 'error': 'Invalid file type. Only PNG, JPG allowed'}), 400

    if file.content_length and file.content_length > MAX_CONTENT_LENGTH:
        return jsonify({'success': False, 'error': 'File too large. Max 10MB'}), 400

    ext = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(filepath)

    url = f"/uploads/{filename}"
    return jsonify({'success': True, 'url': url})


@app.route('/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/api/report', methods=['POST'])
def generate_report():
    data = request.get_json()
    if not data:
        return jsonify({'success': False, 'error': 'No data provided'}), 400

    image_a = data.get('imageA')
    image_b = data.get('imageB')
    annotations = data.get('annotations', [])

    if not image_a or not image_b:
        return jsonify({'success': False, 'error': 'Both images are required'}), 400

    annotations_a = [a for a in annotations if a.get('target') == 'A']
    annotations_b = [a for a in annotations if a.get('target') == 'B']

    def render_annotations(list_data, target):
        if not list_data:
            return '<p style="color:#888;">暂无注释</p>'
        items = []
        for idx, a in enumerate(list_data, 1):
            items.append(f'''
                <div style="padding:12px;margin-bottom:10px;background:#f8f9fa;border-left:4px solid #3a86ff;border-radius:4px;">
                    <strong style="color:#1d3557;">注释 {idx} ({target})</strong>
                    <p style="margin:8px 0 4px;color:#333;line-height:1.5;">{a.get('text', '（空）')}</p>
                    <small style="color:#666;">坐标: ({round(a.get('x', 0))}, {round(a.get('y', 0))})</small>
                </div>
            ''')
        return ''.join(items)

    def render_markers(list_data):
        items = []
        for a in list_data:
            items.append(f'''
                <div style="position:absolute;left:{a.get('x', 0)}px;top:{a.get('y', 0)}px;transform:translate(-50%,-50%);">
                    <div style="width:20px;height:20px;background:#3a86ff;border:2px solid #fff;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
                </div>
            ''')
        return ''.join(items)

    html = f'''<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>布局方案对比报告</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fafafa; margin: 0; padding: 40px 20px; color: #1d3557; }}
    .container {{ max-width: 1200px; margin: 0 auto; }}
    h1 {{ text-align: center; color: #1d3557; margin-bottom: 40px; font-size: 28px; }}
    .section {{ background: #fff; padding: 24px; border-radius: 8px; margin-bottom: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }}
    .section-title {{ font-size: 20px; color: #1d3557; margin-bottom: 16px; padding-bottom: 10px; border-bottom: 2px solid #a8dadc; }}
    .compare-row {{ display: flex; gap: 20px; }}
    .compare-col {{ flex: 1; }}
    .compare-col h3 {{ margin-bottom: 12px; color: #457b9d; }}
    .thumb-wrap {{ position: relative; display: inline-block; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; }}
    .thumb-wrap img {{ display: block; width: 400px; height: auto; }}
    .annotated-wrap {{ position: relative; display: inline-block; border: 1px solid #e0e0e0; border-radius: 4px; overflow: hidden; }}
    .annotated-wrap img {{ display: block; max-width: 100%; height: auto; }}
    .orig-link {{ display: inline-block; margin-top: 10px; color: #3a86ff; text-decoration: none; font-weight: 500; }}
    .orig-link:hover {{ text-decoration: underline; }}
    .footer {{ text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e0e0e0; color: #888; font-size: 14px; }}
  </style>
</head>
<body>
  <div class="container">
    <h1>布局方案对比报告</h1>
    <div class="section">
      <div class="section-title">缩略图对比</div>
      <div class="compare-row">
        <div class="compare-col">
          <h3>{image_a.get('title', '方案A')}</h3>
          <div class="thumb-wrap">
            <img src="{image_a.get('url', '')}" alt="{image_a.get('title', '方案A')}">
          </div>
          <div style="margin-top:8px;font-size:14px;color:#666;">
            尺寸: {image_a.get('width', 0)} × {image_a.get('height', 0)}px
          </div>
          <a class="orig-link" href="{image_a.get('url', '')}" target="_blank">查看原图 →</a>
        </div>
        <div class="compare-col">
          <h3>{image_b.get('title', '方案B')}</h3>
          <div class="thumb-wrap">
            <img src="{image_b.get('url', '')}" alt="{image_b.get('title', '方案B')}">
          </div>
          <div style="margin-top:8px;font-size:14px;color:#666;">
            尺寸: {image_b.get('width', 0)} × {image_b.get('height', 0)}px
          </div>
          <a class="orig-link" href="{image_b.get('url', '')}" target="_blank">查看原图 →</a>
        </div>
      </div>
    </div>
    <div class="section">
      <div class="section-title">方案A - 带注释标注</div>
      <div class="annotated-wrap">
        <img src="{image_a.get('url', '')}" alt="{image_a.get('title', '方案A')}">
        {render_markers(annotations_a)}
      </div>
    </div>
    <div class="section">
      <div class="section-title">方案B - 带注释标注</div>
      <div class="annotated-wrap">
        <img src="{image_b.get('url', '')}" alt="{image_b.get('title', '方案B')}">
        {render_markers(annotations_b)}
      </div>
    </div>
    <div class="section">
      <div class="section-title">注释详情列表</div>
      {render_annotations(annotations_a, '方案A')}
      {render_annotations(annotations_b, '方案B')}
    </div>
    <div class="footer">报告生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
  </div>
</body>
</html>'''

    report_filename = f"report-{uuid.uuid4().hex}.html"
    report_path = os.path.join(app.config['REPORT_FOLDER'], report_filename)
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write(html)

    url = f"/reports/{report_filename}"
    return jsonify({'success': True, 'url': url})


@app.route('/reports/<filename>')
def serve_report(filename):
    return send_from_directory(app.config['REPORT_FOLDER'], filename)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
