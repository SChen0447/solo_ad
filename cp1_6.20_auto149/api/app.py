from flask import Flask
from flask_cors import CORS
from models import init_db
from plots import plots_bp
from points import points_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(plots_bp, url_prefix='/api/plots')
app.register_blueprint(points_bp, url_prefix='/api/points')

@app.route('/api/health')
def health():
    return {'status': 'ok'}

if __name__ == '__main__':
    init_db()
    app.run(debug=True, port=5000)
