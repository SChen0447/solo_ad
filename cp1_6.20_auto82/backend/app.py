import os
import json
import bcrypt
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import Flask, request, jsonify, g
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from werkzeug.utils import secure_filename
from models import db, User, Pet, Favorite, Application, Post, Like, Comment

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///petadoption.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'pawhome-secret-key-2024')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

CORS(app)
db.init_app(app)

UPLOAD_FOLDER = app.config['UPLOAD_FOLDER']
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def generate_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7),
        'iat': datetime.utcnow()
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization', '').replace('Bearer ', '')
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'error': 'User not found'}), 401
            g.current_user = current_user
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    @token_required
    def decorated(*args, **kwargs):
        if not g.current_user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()
    nickname = data.get('nickname', '').strip()

    if not email or not password or not nickname:
        return jsonify({'error': 'All fields are required'}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already registered'}), 400

    password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user = User(email=email, password_hash=password_hash, nickname=nickname)
    db.session.add(user)
    db.session.commit()

    token = generate_token(user.id)
    return jsonify({
        'token': token,
        'user': {'id': user.id, 'email': user.email, 'nickname': user.nickname, 'is_admin': user.is_admin}
    }), 201


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    user = User.query.filter_by(email=email).first()
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({'error': 'Invalid email or password'}), 401

    token = generate_token(user.id)
    return jsonify({
        'token': token,
        'user': {'id': user.id, 'email': user.email, 'nickname': user.nickname, 'is_admin': user.is_admin}
    })


@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_me():
    user = g.current_user
    return jsonify({
        'id': user.id, 'email': user.email, 'nickname': user.nickname,
        'avatar': user.avatar, 'is_admin': user.is_admin
    })


@app.route('/api/pets', methods=['GET'])
def get_pets():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    status = request.args.get('status', 'available')

    query = Pet.query
    if status:
        query = query.filter_by(status=status)
    pets = query.order_by(Pet.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)

    return jsonify({
        'pets': [{
            'id': p.id, 'name': p.name, 'breed': p.breed, 'age': p.age,
            'gender': p.gender, 'personality': p.personality,
            'photos': json.loads(p.photos) if p.photos else [],
            'status': p.status, 'created_at': p.created_at.isoformat()
        } for p in pets.items],
        'total': pets.total, 'page': pets.page, 'pages': pets.pages
    })


@app.route('/api/pets/<int:pet_id>', methods=['GET'])
def get_pet(pet_id):
    pet = Pet.query.get_or_404(pet_id)
    is_favorited = False
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if token:
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            is_favorited = Favorite.query.filter_by(user_id=data['user_id'], pet_id=pet_id).first() is not None
        except Exception:
            pass

    return jsonify({
        'id': pet.id, 'name': pet.name, 'breed': pet.breed, 'age': pet.age,
        'gender': pet.gender, 'personality': pet.personality,
        'requirements': pet.requirements,
        'photos': json.loads(pet.photos) if pet.photos else [],
        'status': pet.status, 'is_favorited': is_favorited,
        'created_at': pet.created_at.isoformat()
    })


@app.route('/api/pets', methods=['POST'])
@admin_required
def create_pet():
    data = request.get_json()
    pet = Pet(
        name=data.get('name'), breed=data.get('breed'), age=data.get('age'),
        gender=data.get('gender'), personality=data.get('personality', ''),
        requirements=data.get('requirements', ''),
        photos=json.dumps(data.get('photos', []))
    )
    db.session.add(pet)
    db.session.commit()
    return jsonify({'id': pet.id, 'message': 'Pet created successfully'}), 201


@app.route('/api/pets/<int:pet_id>', methods=['PUT'])
@admin_required
def update_pet(pet_id):
    pet = Pet.query.get_or_404(pet_id)
    data = request.get_json()
    for field in ['name', 'breed', 'age', 'gender', 'personality', 'requirements', 'status']:
        if field in data:
            setattr(pet, field, data[field])
    if 'photos' in data:
        pet.photos = json.dumps(data['photos'])
    db.session.commit()
    return jsonify({'message': 'Pet updated successfully'})


@app.route('/api/upload', methods=['POST'])
@token_required
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    if not allowed_file(file.filename):
        return jsonify({'error': 'File type not allowed'}), 400

    filename = secure_filename(file.filename)
    timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
    unique_name = f'{timestamp}_{filename}'
    filepath = os.path.join(UPLOAD_FOLDER, unique_name)
    file.save(filepath)
    return jsonify({'url': f'/uploads/{unique_name}'}), 201


@app.route('/api/favorites', methods=['GET'])
@token_required
def get_favorites():
    favorites = Favorite.query.filter_by(user_id=g.current_user.id).all()
    pet_ids = [f.pet_id for f in favorites]
    pets = Pet.query.filter(Pet.id.in_(pet_ids)).all() if pet_ids else []
    return jsonify({
        'pets': [{
            'id': p.id, 'name': p.name, 'breed': p.breed, 'age': p.age,
            'gender': p.gender, 'photos': json.loads(p.photos) if p.photos else [],
            'status': p.status
        } for p in pets]
    })


@app.route('/api/pets/<int:pet_id>/favorite', methods=['POST'])
@token_required
def toggle_favorite(pet_id):
    pet = Pet.query.get_or_404(pet_id)
    existing = Favorite.query.filter_by(user_id=g.current_user.id, pet_id=pet_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({'favorited': False})
    favorite = Favorite(user_id=g.current_user.id, pet_id=pet_id)
    db.session.add(favorite)
    db.session.commit()
    return jsonify({'favorited': True})


@app.route('/api/applications', methods=['POST'])
@token_required
def submit_application():
    data = request.get_json()
    introduction = data.get('introduction', '').strip()
    experience = data.get('experience', '').strip()
    pet_id = data.get('pet_id')

    if not introduction:
        return jsonify({'error': 'Introduction is required'}), 400
    if len(introduction) > 300:
        return jsonify({'error': 'Introduction exceeds 300 characters'}), 400

    pet = Pet.query.get_or_404(pet_id)
    existing = Application.query.filter_by(
        user_id=g.current_user.id, pet_id=pet_id
    ).first()
    if existing:
        return jsonify({'error': 'You have already applied for this pet'}), 400

    application = Application(
        user_id=g.current_user.id, pet_id=pet_id,
        introduction=introduction, experience=experience
    )
    db.session.add(application)
    db.session.commit()
    return jsonify({'id': application.id, 'message': 'Application submitted successfully'}), 201


@app.route('/api/applications', methods=['GET'])
@admin_required
def get_applications():
    status_filter = request.args.get('status')
    query = Application.query
    if status_filter:
        query = query.filter_by(status=status_filter)
    applications = query.order_by(Application.created_at.desc()).all()

    return jsonify({
        'applications': [{
            'id': a.id, 'user_id': a.user_id, 'pet_id': a.pet_id,
            'introduction': a.introduction, 'experience': a.experience,
            'status': a.status, 'created_at': a.created_at.isoformat(),
            'user_nickname': a.user.nickname,
            'pet_name': a.pet.name
        } for a in applications]
    })


@app.route('/api/applications/<int:app_id>', methods=['PUT'])
@admin_required
def update_application(app_id):
    application = Application.query.get_or_404(app_id)
    data = request.get_json()
    new_status = data.get('status')
    if new_status not in ('approved', 'rejected'):
        return jsonify({'error': 'Invalid status'}), 400

    application.status = new_status
    application.updated_at = datetime.utcnow()
    db.session.commit()

    if new_status == 'approved':
        pet = Pet.query.get(application.pet_id)
        pet.status = 'adopted'
        db.session.commit()

    return jsonify({
        'message': f'Application {new_status}',
        'application': {
            'id': application.id, 'status': application.status,
            'user_id': application.user_id, 'pet_id': application.pet_id
        }
    })


@app.route('/api/my-applications', methods=['GET'])
@token_required
def my_applications():
    applications = Application.query.filter_by(
        user_id=g.current_user.id
    ).order_by(Application.created_at.desc()).all()

    return jsonify({
        'applications': [{
            'id': a.id, 'pet_id': a.pet_id, 'pet_name': a.pet.name,
            'status': a.status, 'introduction': a.introduction,
            'created_at': a.created_at.isoformat()
        } for a in applications]
    })


@app.route('/api/posts', methods=['GET'])
def get_posts():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    posts = Post.query.order_by(Post.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        'posts': [{
            'id': p.id, 'content': p.content,
            'images': json.loads(p.images) if p.images else [],
            'created_at': p.created_at.isoformat(),
            'author': {'id': p.author.id, 'nickname': p.author.nickname, 'avatar': p.author.avatar},
            'likes_count': p.likes.count(),
            'comments_count': p.comments.count(),
            'is_liked': _is_post_liked_by_current_user(p.id)
        } for p in posts.items],
        'total': posts.total, 'page': posts.page, 'pages': posts.pages
    })


def _is_post_liked_by_current_user(post_id):
    token = request.headers.get('Authorization', '').replace('Bearer ', '')
    if not token:
        return False
    try:
        data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
        return Like.query.filter_by(user_id=data['user_id'], post_id=post_id).first() is not None
    except Exception:
        return False


@app.route('/api/posts', methods=['POST'])
@token_required
def create_post():
    data = request.get_json()
    content = data.get('content', '').strip()
    images = data.get('images', [])

    if not content:
        return jsonify({'error': 'Content is required'}), 400
    if len(content) > 500:
        return jsonify({'error': 'Content exceeds 500 characters'}), 400

    post = Post(
        user_id=g.current_user.id, content=content,
        images=json.dumps(images)
    )
    db.session.add(post)
    db.session.commit()
    return jsonify({'id': post.id, 'message': 'Post created successfully'}), 201


@app.route('/api/posts/<int:post_id>/like', methods=['POST'])
@token_required
def toggle_like(post_id):
    post = Post.query.get_or_404(post_id)
    existing = Like.query.filter_by(user_id=g.current_user.id, post_id=post_id).first()
    if existing:
        db.session.delete(existing)
        db.session.commit()
        return jsonify({'liked': False, 'likes_count': post.likes.count()})
    like = Like(user_id=g.current_user.id, post_id=post_id)
    db.session.add(like)
    db.session.commit()
    return jsonify({'liked': True, 'likes_count': post.likes.count()})


@app.route('/api/posts/<int:post_id>/comments', methods=['GET'])
def get_comments(post_id):
    post = Post.query.get_or_404(post_id)
    comments = Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.desc()).all()
    return jsonify({
        'comments': [{
            'id': c.id, 'content': c.content,
            'created_at': c.created_at.isoformat(),
            'user': {'id': c.user.id, 'nickname': c.user.nickname, 'avatar': c.user.avatar}
        } for c in comments]
    })


@app.route('/api/posts/<int:post_id>/comments', methods=['POST'])
@token_required
def add_comment(post_id):
    post = Post.query.get_or_404(post_id)
    data = request.get_json()
    content = data.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Comment content is required'}), 400

    comment = Comment(user_id=g.current_user.id, post_id=post_id, content=content)
    db.session.add(comment)
    db.session.commit()
    return jsonify({
        'id': comment.id, 'content': comment.content,
        'created_at': comment.created_at.isoformat(),
        'user': {'id': g.current_user.id, 'nickname': g.current_user.nickname, 'avatar': g.current_user.avatar}
    }), 201


@app.route('/api/notifications', methods=['GET'])
@token_required
def get_notifications():
    approved = Application.query.filter_by(
        user_id=g.current_user.id, status='approved'
    ).order_by(Application.updated_at.desc()).all()

    return jsonify({
        'notifications': [{
            'id': a.id, 'type': 'application_approved',
            'message': f'Your adoption application for {a.pet.name} has been approved!',
            'pet_id': a.pet_id, 'created_at': a.updated_at.isoformat()
        } for a in approved]
    })


with app.app_context():
    db.create_all()
    if User.query.filter_by(is_admin=True).first() is None:
        admin_hash = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        admin = User(email='admin@pawhome.com', password_hash=admin_hash, nickname='Admin', is_admin=True)
        db.session.add(admin)

        sample_pets = [
            Pet(name='Buddy', breed='Golden Retriever', age='2 years', gender='Male',
                personality='Friendly and energetic, loves playing fetch and swimming. Great with kids and other dogs.',
                requirements='Needs a yard with space to run. Daily exercise required.',
                photos=json.dumps(['/uploads/sample1.jpg']), status='available'),
            Pet(name='Luna', breed='Siamese Cat', age='1 year', gender='Female',
                personality='Calm and affectionate, enjoys lounging by the window and gentle petting sessions.',
                requirements='Indoor only. Needs regular vet checkups.',
                photos=json.dumps(['/uploads/sample2.jpg']), status='available'),
            Pet(name='Max', breed='German Shepherd', age='3 years', gender='Male',
                personality='Loyal and protective, well-trained. Good with families but needs experienced owner.',
                requirements='Experienced dog owner preferred. Needs daily training sessions.',
                photos=json.dumps(['/uploads/sample3.jpg']), status='available'),
            Pet(name='Mochi', breed='British Shorthair', age='6 months', gender='Female',
                personality='Playful and curious, loves exploring and chasing toy mice. Very social kitten.',
                requirements='Indoor only. Needs interactive toys and companionship.',
                photos=json.dumps(['/uploads/sample4.jpg']), status='available'),
            Pet(name='Charlie', breed='Beagle', age='4 years', gender='Male',
                personality='Cheerful and curious, follows every interesting scent. Loves long walks.',
                requirements='Secure fenced yard needed. Must be leashed on walks.',
                photos=json.dumps(['/uploads/sample5.jpg']), status='available'),
            Pet(name='Nala', breed='Ragdoll', age='2 years', gender='Female',
                personality='Gentle and relaxed, goes limp when held. Perfect lap cat.',
                requirements='Indoor only home. Gentle handling required.',
                photos=json.dumps(['/uploads/sample6.jpg']), status='available'),
        ]
        for pet in sample_pets:
            db.session.add(pet)

        sample_posts = [
            Post(user_id=1, content='Welcome to PawHome community! Share your pet adoption stories and daily moments here. 🐾',
                 images=json.dumps([])),
        ]
        for post in sample_posts:
            db.session.add(post)

        db.session.commit()


if __name__ == '__main__':
    app.run(debug=True, port=5000)
