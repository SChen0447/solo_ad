import time
import uuid
import random
from flask import Flask, request, jsonify
from flask_cors import CORS

from analyzer import parse_code
from generator import generate_test, generate_coverage_report

app = Flask(__name__)
CORS(app)

random.seed(time.time())

memory_db: list = []
MAX_HISTORY = 10


@app.route('/parse', methods=['POST'])
def parse_endpoint():
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({'error': 'Invalid JSON body'}), 400

    code = data.get('code', '') if isinstance(data, dict) else ''
    if not code.strip():
        return jsonify({'error': 'Code is required'}), 400

    try:
        meta = parse_code(code)
    except Exception as e:
        return jsonify({'error': f'Parse error: {str(e)}'}), 500

    return jsonify(meta)


@app.route('/generate', methods=['POST'])
def generate_endpoint():
    try:
        data = request.get_json(force=True)
    except Exception:
        return jsonify({'error': 'Invalid JSON body'}), 400

    code = data.get('code', '') if isinstance(data, dict) else ''
    with_coverage = isinstance(data, dict) and data.get('withCoverage', False)

    if not code.strip():
        return jsonify({'error': 'Code is required'}), 400

    start_time = time.time()

    try:
        meta = parse_code(code)
        test_code = generate_test(meta, code)
    except Exception as e:
        return jsonify({'error': f'Generation error: {str(e)}'}), 500

    response: dict = {
        'testCode': test_code,
        'functions': meta.get('functions', []),
        'exports': meta.get('exports', []),
        'defaultExport': meta.get('defaultExport'),
    }

    if with_coverage:
        response['coverage'] = generate_coverage_report(meta)

    record = {
        'id': str(uuid.uuid4()),
        'code': code,
        'testCode': test_code,
        'timestamp': time.strftime('%Y-%m-%dT%H:%M:%S.') + f"{int(time.time()*1000)%1000:03d}Z",
        'functions': meta.get('functions', []),
    }
    memory_db.insert(0, record)
    if len(memory_db) > MAX_HISTORY:
        memory_db.pop()

    elapsed = time.time() - start_time
    if elapsed < 0.15:
        time.sleep(0.15 - elapsed)

    return jsonify(response)


@app.route('/history', methods=['GET'])
def history_endpoint():
    start_time = time.time()
    history_list = [dict(item) for item in memory_db]

    elapsed = time.time() - start_time
    if elapsed < 0.02:
        time.sleep(0.02 - elapsed)

    return jsonify({'history': history_list})


@app.route('/health', methods=['GET'])
def health_endpoint():
    return jsonify({'status': 'ok', 'time': time.time()})


if __name__ == '__main__':
    print('🚀 单元测试生成器后端服务启动')
    print('📡 监听端口: 5000')
    print('📚 API 路由: /parse, /generate, /history')
    app.run(host='0.0.0.0', port=5000, debug=True)
