from flask import Flask, request, jsonify
from recipe_parser import parse_recipe

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization'
    return response

@app.route('/parse_recipe', methods=['POST', 'OPTIONS'])
def parse_recipe_endpoint():
    if request.method == 'OPTIONS':
        return jsonify({}), 200
    data = request.get_json()
    if not data or 'text' not in data:
        return jsonify({'error': '请提供菜谱文本'}), 400
    
    recipe_text = data['text']
    result = parse_recipe(recipe_text)
    
    return jsonify(result)

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
