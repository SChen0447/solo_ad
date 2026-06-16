from flask import Flask, request, jsonify
from flask_cors import CORS
from cluster_service import cluster_texts

app = Flask(__name__)
CORS(app)


@app.route('/api/cluster', methods=['POST'])
def api_cluster():
    try:
        data = request.get_json()
        if not data or 'texts' not in data:
            return jsonify({'error': 'Missing texts parameter'}), 400
        
        texts = data.get('texts', [])
        method = data.get('method', 'similarity')
        n_clusters = data.get('n_clusters')
        
        if not isinstance(texts, list):
            return jsonify({'error': 'texts must be a list'}), 400
        
        result = cluster_texts(texts, method=method, n_clusters=n_clusters)
        return jsonify(result)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
