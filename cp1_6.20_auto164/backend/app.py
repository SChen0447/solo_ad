import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from flask import Flask
from flask_cors import CORS
from database.db import init_db, seed_data
from routes.questions import questions_bp
from routes.quiz import quiz_bp
from routes.results import results_bp
from routes.admin import admin_bp

app = Flask(__name__)
CORS(app)

app.register_blueprint(questions_bp)
app.register_blueprint(quiz_bp)
app.register_blueprint(results_bp)
app.register_blueprint(admin_bp)


@app.route('/api/health')
def health():
    return {'status': 'ok'}


if __name__ == '__main__':
    init_db()
    seed_data()
    app.run(debug=True, port=5000)
