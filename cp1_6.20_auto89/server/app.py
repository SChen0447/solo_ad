import os
import datetime
import jwt
import bcrypt
from functools import wraps

from flask import Flask, request, jsonify, send_from_directory, abort
from flask_cors import CORS

from models import db, User, Book, Note
from file_handler import (
    validate_file,
    get_file_type,
    save_uploaded_file,
    extract_metadata
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.path.join(BASE_DIR, 'uploads')
DB_PATH = os.path.join(BASE_DIR, 'app.db')

os.makedirs(UPLOAD_DIR, exist_ok=True)

SECRET_KEY = os.environ.get('SECRET_KEY', 'reader-workbench-secret-key-2024')
JWT_EXPIRATION_HOURS = 24

app = Flask(__name__)
app.config['SECRET_KEY'] = SECRET_KEY
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DB_PATH}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

CORS(app, supports_credentials=True, resources={
    r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}
})

db.init_app(app)


def create_tables():
    with app.app_context():
        db.create_all()


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'message': '缺少认证令牌'}), 401

        token = auth_header.split(' ')[1]
        try:
            data = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
            user = User.query.get(data['user_id'])
            if not user:
                return jsonify({'message': '用户不存在'}), 401
            request.current_user = user
        except jwt.ExpiredSignatureError:
            return jsonify({'message': '令牌已过期'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': '无效的令牌'}), 401

        return f(*args, **kwargs)

    return decorated


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'message': '邮箱和密码不能为空'}), 400

    if len(password) < 6:
        return jsonify({'message': '密码至少需要6位'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'message': '该邮箱已被注册'}), 409

    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    user = User(email=email, password_hash=password_hash)
    db.session.add(user)
    db.session.commit()

    payload = {
        'user_id': user.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')

    return jsonify({
        'token': token,
        'user': user.to_dict(),
        'expires_in': JWT_EXPIRATION_HOURS * 3600
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    if not email or not password:
        return jsonify({'message': '邮箱和密码不能为空'}), 400

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({'message': '邮箱或密码错误'}), 401

    if not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({'message': '邮箱或密码错误'}), 401

    payload = {
        'user_id': user.id,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')

    return jsonify({
        'token': token,
        'user': user.to_dict(),
        'expires_in': JWT_EXPIRATION_HOURS * 3600
    }), 200


@app.route('/api/books', methods=['GET'])
@token_required
def get_books():
    user = request.current_user
    books = Book.query.filter_by(user_id=user.id).order_by(Book.updated_at.desc()).all()
    return jsonify([book.to_dict() for book in books]), 200


@app.route('/api/books/upload', methods=['POST'])
@token_required
def upload_book():
    user = request.current_user

    if 'file' not in request.files:
        return jsonify({'message': '未找到文件'}), 400

    file_storage = request.files['file']

    valid, error = validate_file(file_storage)
    if not valid:
        return jsonify({'message': error}), 400

    file_type = get_file_type(file_storage.filename)

    temp_book = Book(
        user_id=user.id,
        title='Processing...',
        author='Unknown',
        file_path='',
        file_type=file_type,
        file_size=0
    )
    db.session.add(temp_book)
    db.session.flush()

    book_id = temp_book.id

    try:
        file_path = save_uploaded_file(file_storage, UPLOAD_DIR, book_id)
        title, author, total_pages, cover_url = extract_metadata(file_path, file_type)

        file_size = os.path.getsize(file_path)

        temp_book.title = title
        temp_book.author = author
        temp_book.file_path = file_path
        temp_book.file_size = file_size
        temp_book.cover_url = cover_url
        temp_book.total_pages = total_pages
        temp_book.last_read_page = 1
        temp_book.read_progress = 0.0

        db.session.commit()

        return jsonify(temp_book.to_dict()), 201

    except Exception as e:
        db.session.rollback()
        if temp_book.id:
            book_dir = os.path.join(UPLOAD_DIR, str(temp_book.id))
            if os.path.exists(book_dir):
                import shutil
                shutil.rmtree(book_dir, ignore_errors=True)
        print(f"Error uploading book: {e}")
        return jsonify({'message': '文件处理失败'}), 500


@app.route('/api/books/<int:book_id>', methods=['GET'])
@token_required
def get_book(book_id):
    user = request.current_user
    book = Book.query.filter_by(id=book_id, user_id=user.id).first()
    if not book:
        return jsonify({'message': '书籍不存在'}), 404
    return jsonify(book.to_dict()), 200


@app.route('/api/books/<int:book_id>/read-progress', methods=['GET'])
@token_required
def get_read_progress(book_id):
    user = request.current_user
    book = Book.query.filter_by(id=book_id, user_id=user.id).first()
    if not book:
        return jsonify({'message': '书籍不存在'}), 404
    return jsonify({
        'last_read_page': book.last_read_page,
        'read_progress': book.read_progress
    }), 200


@app.route('/api/books/<int:book_id>/read-progress', methods=['PUT'])
@token_required
def update_read_progress(book_id):
    user = request.current_user
    book = Book.query.filter_by(id=book_id, user_id=user.id).first()
    if not book:
        return jsonify({'message': '书籍不存在'}), 404

    data = request.get_json()
    page = data.get('page')
    progress = data.get('progress')

    if page is not None and isinstance(page, int):
        book.last_read_page = max(1, page)
    if progress is not None and isinstance(progress, (int, float)):
        book.read_progress = max(0.0, min(100.0, float(progress)))

    db.session.commit()

    return jsonify({
        'last_read_page': book.last_read_page,
        'read_progress': book.read_progress
    }), 200


@app.route('/api/notes', methods=['POST'])
@token_required
def create_note():
    user = request.current_user
    data = request.get_json()

    book_id = data.get('book_id')
    highlighted_text = data.get('highlighted_text', '')
    note_content = data.get('note_content', '')
    page_number = data.get('page_number', 1)

    if not book_id:
        return jsonify({'message': '缺少书籍ID'}), 400
    if not note_content:
        return jsonify({'message': '笔记内容不能为空'}), 400

    book = Book.query.filter_by(id=book_id, user_id=user.id).first()
    if not book:
        return jsonify({'message': '书籍不存在'}), 404

    note = Note(
        user_id=user.id,
        book_id=book_id,
        highlighted_text=highlighted_text,
        note_content=note_content,
        page_number=page_number
    )
    db.session.add(note)
    db.session.commit()

    return jsonify(note.to_dict()), 201


@app.route('/api/notes/<int:book_id>', methods=['GET'])
@token_required
def get_notes(book_id):
    user = request.current_user
    book = Book.query.filter_by(id=book_id, user_id=user.id).first()
    if not book:
        return jsonify({'message': '书籍不存在'}), 404

    notes = Note.query.filter_by(
        user_id=user.id,
        book_id=book_id
    ).order_by(Note.created_at.desc()).all()

    return jsonify([note.to_dict() for note in notes]), 200


@app.route('/api/notes/export/<int:book_id>', methods=['GET'])
@token_required
def export_notes(book_id):
    user = request.current_user
    book = Book.query.filter_by(id=book_id, user_id=user.id).first()
    if not book:
        return jsonify({'message': '书籍不存在'}), 404

    notes = Note.query.filter_by(
        user_id=user.id,
        book_id=book_id
    ).order_by(Note.created_at.desc()).all()

    lines = [f"# 《{book.title}》阅读笔记", f"", f"作者：{book.author}", ""]
    lines.append("---")
    lines.append("")

    for note in notes:
        created_at = note.created_at.strftime('%Y-%m-%d %H:%M:%S')
        lines.append(f"### 第 {note.page_number} 页 - {created_at}")
        lines.append("")
        if note.highlighted_text:
            lines.append(f"> {note.highlighted_text}")
            lines.append("")
        lines.append(note.note_content)
        lines.append("")
        lines.append("---")
        lines.append("")

    content = '\n'.join(lines)

    filename = f"{book.title}-notes.md"
    safe_filename = filename.replace('/', '_').replace('\\', '_')

    return jsonify({'content': content, 'filename': safe_filename}), 200


@app.route('/uploads/<int:book_id>/<path:filename>')
def serve_upload(book_id, filename):
    book_dir = os.path.join(UPLOAD_DIR, str(book_id))
    if not os.path.exists(book_dir):
        abort(404)
    return send_from_directory(book_dir, filename, conditional=True)


@app.errorhandler(404)
def not_found(e):
    return jsonify({'message': '资源不存在'}), 404


@app.errorhandler(500)
def server_error(e):
    return jsonify({'message': '服务器内部错误'}), 500


if __name__ == '__main__':
    create_tables()
    app.run(host='0.0.0.0', port=5000, debug=True)
