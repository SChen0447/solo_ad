import os
import time
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS

from poem_analyzer import PoemAnalyzer
from video_generator import VideoGenerator


app = Flask(__name__)
CORS(app)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

analyzer = PoemAnalyzer()
generator = VideoGenerator(BASE_DIR)


@app.route('/api/analyze-poem', methods=['POST'])
def analyze_poem():
    start_time = time.time()
    
    data = request.get_json()
    text = data.get('text', '')
    
    if not text.strip():
        return jsonify({'error': '诗歌文本不能为空'}), 400
    
    features = analyzer.analyze(text)
    
    elapsed = time.time() - start_time
    print(f"诗歌分析完成，耗时: {elapsed:.2f}秒")
    
    return jsonify(features)


@app.route('/api/generate-video', methods=['POST'])
def generate_video():
    start_time = time.time()
    
    data = request.get_json()
    poem_features = data.get('poemFeatures')
    speed = data.get('speed', 1.0)
    volume = data.get('volume', 0.7)
    style = data.get('style', 'nature')
    
    if not poem_features:
        return jsonify({'error': '缺少诗歌特征数据'}), 400
    
    result = generator.generate_preview(poem_features, speed, volume, style)
    
    elapsed = time.time() - start_time
    print(f"视频预览生成完成，耗时: {elapsed:.2f}秒")
    
    return jsonify(result)


@app.route('/api/export-video', methods=['POST'])
def export_video():
    start_time = time.time()
    
    data = request.get_json()
    poem_features = data.get('poemFeatures')
    video_data = data.get('videoData')
    speed = data.get('speed', 1.0)
    volume = data.get('volume', 0.7)
    style = data.get('style', 'nature')
    
    if not poem_features or not video_data:
        return jsonify({'error': '缺少必要数据'}), 400
    
    output_path = generator.export_mp4(poem_features, video_data, speed, volume, style)
    
    if os.path.exists(output_path):
        elapsed = time.time() - start_time
        print(f"视频导出完成，耗时: {elapsed:.2f}秒")
        return send_file(output_path, as_attachment=True, download_name=f'poem_video_{int(time.time())}.mp4')
    else:
        return jsonify({'error': '视频生成失败'}), 500


@app.route('/background/<style>.mp4')
def serve_background(style):
    video_path = os.path.join(BASE_DIR, 'background_videos', f'{style}.mp4')
    if os.path.exists(video_path):
        return send_file(video_path, mimetype='video/mp4')
    else:
        default_path = os.path.join(BASE_DIR, 'background_videos', 'nature.mp4')
        return send_file(default_path, mimetype='video/mp4')


@app.route('/static/<path:filename>')
def serve_static(filename):
    static_dir = os.path.join(BASE_DIR, 'static')
    return send_from_directory(static_dir, filename)


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'timestamp': time.time()})


if __name__ == '__main__':
    print("正在启动诗韵 PoemVerse 后端服务...")
    print("服务地址: http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)
