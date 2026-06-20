import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'instance', 'app.db')
SQLALCHEMY_TRACK_MODIFICATIONS = False

UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')

SECRET_KEY = 'secondhand-marketplace-secret-key-2024'

MAX_CONTENT_LENGTH = 16 * 1024 * 1024
