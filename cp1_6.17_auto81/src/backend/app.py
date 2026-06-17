from flask import Flask
from flask_cors import CORS
from routes import api_bp
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

app = Flask(__name__)
CORS(app)

app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

app.register_blueprint(api_bp, url_prefix='/api')

@app.route('/api/health', methods=['GET'])
def health_check():
    return {'status': 'ok', 'message': 'Design Component Annotator API is running'}

if __name__ == '__main__':
    print('Starting Design Component Annotator Backend on port 5000...')
    app.run(host='0.0.0.0', port=5000, debug=True)
