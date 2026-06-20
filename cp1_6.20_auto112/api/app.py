import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from flask import Flask
from flask_cors import CORS

from api.config import Config
from api.database import init_db
from api.routes_auth import auth_bp
from api.routes_product import product_bp
from api.routes_order import order_bp
from api.routes_pricing import pricing_bp
from api.routes_upload import upload_bp

app = Flask(__name__)
app.config.from_object(Config)
CORS(app, supports_credentials=True)

app.register_blueprint(auth_bp)
app.register_blueprint(product_bp)
app.register_blueprint(order_bp)
app.register_blueprint(pricing_bp)
app.register_blueprint(upload_bp)

@app.route('/api/health')
def health():
    return {'status': 'ok', 'service': 'custom-workshop-api'}

@app.errorhandler(413)
def too_large(e):
    return {'error': '文件超过最大限制5MB'}, 413

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
