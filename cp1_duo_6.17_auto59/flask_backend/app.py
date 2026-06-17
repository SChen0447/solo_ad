from flask import Flask, request, jsonify
from flask_cors import CORS
from parser import CSSParser
from conflict_engine import ConflictEngine, generate_repair

app = Flask(__name__)
CORS(app)


@app.route('/api/analyze', methods=['POST'])
def analyze():
    try:
        data = request.get_json()
        html_text = data.get('html', '')
        css_text = data.get('css', '')

        if not html_text or not css_text:
            return jsonify({
                'error': '请输入HTML和CSS内容',
                'conflicts': []
            }), 400

        parser = CSSParser(css_text)
        rules = parser.parse()

        engine = ConflictEngine(html_text, rules)
        conflicts = engine.detect_conflicts()

        return jsonify({
            'conflicts': conflicts,
            'total_rules': len(rules),
            'total_conflicts': len(conflicts)
        })

    except Exception as e:
        return jsonify({
            'error': f'解析错误: {str(e)}',
            'conflicts': []
        }), 500


@app.route('/api/repair', methods=['POST'])
def repair():
    try:
        data = request.get_json()
        conflicts = data.get('conflicts', [])
        original_css = data.get('css', '')

        result = generate_repair(conflicts, original_css)

        return jsonify(result)

    except Exception as e:
        return jsonify({
            'error': f'修复生成错误: {str(e)}',
            'modifications': [],
            'diff_blocks': [],
            'repaired_css_hint': ''
        }), 500


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')
