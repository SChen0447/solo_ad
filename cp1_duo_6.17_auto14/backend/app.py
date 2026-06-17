from flask import Flask
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

from config import Config

db = SQLAlchemy()
migrate = Migrate()


def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)

    CORS(app, resources={r"/api/*": {"origins": app.config['CORS_ORIGINS']}})

    db.init_app(app)
    migrate.init_app(app, db)

    from routes.beans import bp as beans_bp
    from routes.notes import bp as notes_bp
    from routes.subscriptions import bp as subscriptions_bp
    from routes.user import bp as user_bp

    app.register_blueprint(beans_bp, url_prefix='/api')
    app.register_blueprint(notes_bp, url_prefix='/api')
    app.register_blueprint(subscriptions_bp, url_prefix='/api')
    app.register_blueprint(user_bp, url_prefix='/api')

    @app.route('/api/health')
    def health_check():
        return {'status': 'ok', 'message': 'Bean Voyage API is running'}

    return app


from models import user, bean, subscription, note
