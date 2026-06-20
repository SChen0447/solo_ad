import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'custom-workshop-secret-key-2026')
    DATABASE_PATH = os.path.join(BASE_DIR, 'workshop.db')
    UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
    MAX_CONTENT_LENGTH = 5 * 1024 * 1024
    ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
    JWT_EXPIRATION_HOURS = 24

    PRICE_QUANTITY_EXPONENT = 0.9
    DURATION_QUANTITY_STEP = 100

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
