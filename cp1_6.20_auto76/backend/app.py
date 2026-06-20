import os
import jwt
import bcrypt
import threading
import PyPDF2
import io
from datetime import datetime, timedelta, timezone
from functools import wraps
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
from dotenv import load_dotenv
from models import db, User, Plan, Task, Reminder
from scheduler import start_scheduler

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'learnflow-secret-key-2024')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///learnflow.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['MAX_CONTENT_LENGTH'] = 5 * 1024 * 1024

CORS(app, resources={r"/api/*": {"origins": "*"}, r"/socket.io/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

db.init_app(app)

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token:
            return jsonify({'message': 'Token is missing'}), 401
        try:
            token = token.replace('Bearer ', '')
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            current_user = User.query.get(data['user_id'])
            if not current_user:
                return jsonify({'message': 'User not found'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'message': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'message': 'Invalid token'}), 401
        return f(current_user, *args, **kwargs)
    return decorated

def create_jwt_token(user_id):
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(hours=24)
    }
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm="HS256")

def parse_pdf_to_text(file_content):
    try:
        pdf_reader = PyPDF2.PdfReader(io.BytesIO(file_content))
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception:
        return ""

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'message': 'Email and password are required'}), 400
    
    if User.query.filter_by(email=data['email']).first():
        return jsonify({'message': 'Email already exists'}), 400
    
    password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = User(email=data['email'], password_hash=password_hash)
    db.session.add(user)
    db.session.commit()
    
    token = create_jwt_token(user.id)
    return jsonify({'token': token, 'user': {'id': user.id, 'email': user.email}}), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({'message': 'Email and password are required'}), 400
    
    user = User.query.filter_by(email=data['email']).first()
    if not user or not bcrypt.checkpw(data['password'].encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({'message': 'Invalid email or password'}), 401
    
    token = create_jwt_token(user.id)
    return jsonify({'token': token, 'user': {'id': user.id, 'email': user.email}}), 200

@app.route('/api/plans', methods=['GET'])
@token_required
def get_plans(current_user):
    plans = Plan.query.filter_by(user_id=current_user.id).order_by(Plan.created_at.desc()).all()
    plans_data = []
    for plan in plans:
        total_days = (plan.end_date - plan.start_date).days + 1
        completed_tasks = Task.query.filter_by(plan_id=plan.id, is_completed=True).count()
        total_tasks = Task.query.filter_by(plan_id=plan.id).count()
        plans_data.append({
            'id': plan.id,
            'name': plan.name,
            'description': plan.description,
            'start_date': plan.start_date.isoformat(),
            'end_date': plan.end_date.isoformat(),
            'time_slots': plan.time_slots,
            'total_days': total_days,
            'completed_tasks': completed_tasks,
            'total_tasks': total_tasks,
            'created_at': plan.created_at.isoformat()
        })
    return jsonify(plans_data), 200

@app.route('/api/plans', methods=['POST'])
@token_required
def create_plan(current_user):
    data = request.get_json()
    required_fields = ['name', 'start_date', 'end_date', 'time_slots']
    if not all(field in data for field in required_fields):
        return jsonify({'message': 'Missing required fields'}), 400
    
    try:
        start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    except ValueError:
        return jsonify({'message': 'Invalid date format'}), 400
    
    plan = Plan(
        user_id=current_user.id,
        name=data['name'],
        description=data.get('description', ''),
        start_date=start_date,
        end_date=end_date,
        time_slots=data['time_slots']
    )
    db.session.add(plan)
    db.session.commit()
    
    return jsonify({
        'id': plan.id,
        'name': plan.name,
        'description': plan.description,
        'start_date': plan.start_date.isoformat(),
        'end_date': plan.end_date.isoformat(),
        'time_slots': plan.time_slots
    }), 201

@app.route('/api/plans/<int:plan_id>', methods=['GET'])
@token_required
def get_plan(current_user, plan_id):
    plan = Plan.query.filter_by(id=plan_id, user_id=current_user.id).first()
    if not plan:
        return jsonify({'message': 'Plan not found'}), 404
    
    tasks = Task.query.filter_by(plan_id=plan.id).order_by(Task.created_at.asc()).all()
    tasks_data = []
    for task in tasks:
        tasks_data.append({
            'id': task.id,
            'name': task.name,
            'estimated_duration': task.estimated_duration,
            'material_link': task.material_link,
            'material_content': task.material_content,
            'is_completed': task.is_completed,
            'is_reviewed': task.is_reviewed,
            'completed_at': task.completed_at.isoformat() if task.completed_at else None,
            'total_time_spent': task.total_time_spent,
            'time_sessions': task.time_sessions,
            'created_at': task.created_at.isoformat(),
            'reviewed_at': task.reviewed_at.isoformat() if task.reviewed_at else None
        })
    
    total_days = (plan.end_date - plan.start_date).days + 1
    completed_tasks = sum(1 for t in tasks if t.is_completed)
    
    return jsonify({
        'id': plan.id,
        'name': plan.name,
        'description': plan.description,
        'start_date': plan.start_date.isoformat(),
        'end_date': plan.end_date.isoformat(),
        'time_slots': plan.time_slots,
        'total_days': total_days,
        'completed_tasks': completed_tasks,
        'total_tasks': len(tasks),
        'tasks': tasks_data,
        'created_at': plan.created_at.isoformat()
    }), 200

@app.route('/api/plans/<int:plan_id>/tasks', methods=['POST'])
@token_required
def create_task(current_user, plan_id):
    plan = Plan.query.filter_by(id=plan_id, user_id=current_user.id).first()
    if not plan:
        return jsonify({'message': 'Plan not found'}), 404
    
    name = request.form.get('name')
    estimated_duration = request.form.get('estimated_duration', type=int)
    
    if not name or not estimated_duration:
        return jsonify({'message': 'Name and estimated_duration are required'}), 400
    
    material_link = request.form.get('material_link', '')
    material_content = ''
    
    if 'file' in request.files:
        file = request.files['file']
        if file and file.filename:
            if len(file.filename) > 0:
                file_ext = os.path.splitext(file.filename)[1].lower()
                if file_ext not in ['.pdf', '.txt']:
                    return jsonify({'message': 'Only PDF and TXT files are allowed'}), 400
                
                file_content = file.read()
                if len(file_content) > 5 * 1024 * 1024:
                    return jsonify({'message': 'File size must be less than 5MB'}), 400
                
                if file_ext == '.pdf':
                    material_content = parse_pdf_to_text(file_content)
                else:
                    try:
                        material_content = file_content.decode('utf-8')
                    except UnicodeDecodeError:
                        material_content = file_content.decode('gbk', errors='ignore')
    
    task = Task(
        plan_id=plan.id,
        name=name,
        estimated_duration=estimated_duration,
        material_link=material_link,
        material_content=material_content
    )
    db.session.add(task)
    db.session.commit()
    
    return jsonify({
        'id': task.id,
        'name': task.name,
        'estimated_duration': task.estimated_duration,
        'material_link': task.material_link,
        'material_content': task.material_content,
        'is_completed': task.is_completed,
        'total_time_spent': task.total_time_spent,
        'time_sessions': task.time_sessions,
        'created_at': task.created_at.isoformat()
    }), 201

@app.route('/api/tasks/<int:task_id>/complete', methods=['PUT'])
@token_required
def complete_task(current_user, task_id):
    task = Task.query.join(Plan).filter(
        Task.id == task_id,
        Plan.user_id == current_user.id
    ).first()
    
    if not task:
        return jsonify({'message': 'Task not found'}), 404
    
    data = request.get_json() or {}
    task.is_completed = data.get('is_completed', True)
    task.is_reviewed = False
    
    if task.is_completed:
        task.completed_at = datetime.now(timezone.utc)
        
        review_days = [1, 3, 7, 15]
        for i, days in enumerate(review_days):
            reminder = Reminder(
                user_id=current_user.id,
                task_id=task.id,
                task_name=task.name,
                due_date=datetime.now(timezone.utc) + timedelta(days=days),
                review_stage=i + 1
            )
            db.session.add(reminder)
    else:
        task.completed_at = None
        Reminder.query.filter_by(task_id=task.id).delete()
    
    db.session.commit()
    
    socketio.emit('reminder', {'user_id': current_user.id}, room=f"user_{current_user.id}")
    
    return jsonify({
        'id': task.id,
        'is_completed': task.is_completed,
        'completed_at': task.completed_at.isoformat() if task.completed_at else None
    }), 200

@app.route('/api/tasks/<int:task_id>/time', methods=['PUT'])
@token_required
def update_task_time(current_user, task_id):
    task = Task.query.join(Plan).filter(
        Task.id == task_id,
        Plan.user_id == current_user.id
    ).first()
    
    if not task:
        return jsonify({'message': 'Task not found'}), 404
    
    data = request.get_json()
    if not data:
        return jsonify({'message': 'No data provided'}), 400
    
    action = data.get('action')
    if action == 'start':
        session = {
            'start': datetime.now(timezone.utc).isoformat(),
            'end': None
        }
        task.time_sessions.append(session)
    elif action == 'pause':
        if task.time_sessions and task.time_sessions[-1]['end'] is None:
            session = task.time_sessions[-1]
            session['end'] = datetime.now(timezone.utc).isoformat()
            start_time = datetime.fromisoformat(session['start'])
            end_time = datetime.fromisoformat(session['end'])
            session_duration = int((end_time - start_time).total_seconds())
            task.total_time_spent += session_duration
    elif action == 'update':
        time_spent = data.get('time_spent', 0)
        task.total_time_spent = max(0, time_spent)
    
    db.session.commit()
    
    socketio.emit('progress_update', {
        'user_id': current_user.id,
        'task_id': task.id,
        'total_time_spent': task.total_time_spent
    }, room=f"user_{current_user.id}")
    
    return jsonify({
        'id': task.id,
        'total_time_spent': task.total_time_spent,
        'time_sessions': task.time_sessions
    }), 200

@app.route('/api/tasks/<int:task_id>/review', methods=['PUT'])
@token_required
def review_task(current_user, task_id):
    task = Task.query.join(Plan).filter(
        Task.id == task_id,
        Plan.user_id == current_user.id
    ).first()
    
    if not task:
        return jsonify({'message': 'Task not found'}), 404
    
    task.is_reviewed = True
    task.reviewed_at = datetime.now(timezone.utc)
    
    Reminder.query.filter_by(task_id=task.id, user_id=current_user.id).delete()
    
    db.session.commit()
    
    return jsonify({
        'id': task.id,
        'is_reviewed': task.is_reviewed,
        'reviewed_at': task.reviewed_at.isoformat()
    }), 200

@app.route('/api/stats', methods=['GET'])
@token_required
def get_stats(current_user):
    plans = Plan.query.filter_by(user_id=current_user.id).all()
    tasks = Task.query.join(Plan).filter(Plan.user_id == current_user.id).all()
    
    today = datetime.now(timezone.utc).date()
    week_start = today - timedelta(days=today.weekday())
    
    weekly_data = []
    for i in range(7):
        day = week_start + timedelta(days=i)
        day_minutes = 0
        for task in tasks:
            for session in task.time_sessions:
                if session.get('end'):
                    session_end = datetime.fromisoformat(session['end']).date()
                    if session_end == day:
                        start = datetime.fromisoformat(session['start'])
                        end = datetime.fromisoformat(session['end'])
                        day_minutes += int((end - start).total_seconds() / 60)
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        weekly_data.append({
            'day': day_names[i],
            'minutes': day_minutes
        })
    
    plan_stats = []
    for plan in plans:
        plan_tasks = [t for t in tasks if t.plan_id == plan.id]
        completed = sum(1 for t in plan_tasks if t.is_completed)
        plan_stats.append({
            'name': plan.name,
            'completed': completed,
            'total': len(plan_tasks)
        })
    
    total_days = set()
    for task in tasks:
        for session in task.time_sessions:
            if session.get('end'):
                session_end = datetime.fromisoformat(session['end']).date()
                total_days.add(session_end)
    
    streak = 0
    check_day = today
    while True:
        has_activity = False
        for task in tasks:
            for session in task.time_sessions:
                if session.get('end'):
                    session_end = datetime.fromisoformat(session['end']).date()
                    if session_end == check_day:
                        has_activity = True
                        break
            if has_activity:
                break
        if has_activity:
            streak += 1
            check_day -= timedelta(days=1)
        else:
            break
    
    return jsonify({
        'weekly_data': weekly_data,
        'plan_stats': plan_stats,
        'total_learning_days': len(total_days),
        'streak_days': streak
    }), 200

@app.route('/api/reminders', methods=['GET'])
@token_required
def get_reminders(current_user):
    reminders = Reminder.query.filter_by(user_id=current_user.id).order_by(Reminder.due_date.desc()).limit(10).all()
    reminders_data = []
    for reminder in reminders:
        reminders_data.append({
            'id': reminder.id,
            'task_id': reminder.task_id,
            'task_name': reminder.task_name,
            'due_date': reminder.due_date.isoformat(),
            'is_read': reminder.is_read,
            'review_stage': reminder.review_stage,
            'created_at': reminder.created_at.isoformat()
        })
    return jsonify(reminders_data), 200

@app.route('/api/reminders/<int:reminder_id>/read', methods=['PUT'])
@token_required
def mark_reminder_read(current_user, reminder_id):
    reminder = Reminder.query.filter_by(id=reminder_id, user_id=current_user.id).first()
    if not reminder:
        return jsonify({'message': 'Reminder not found'}), 404
    
    reminder.is_read = True
    db.session.commit()
    
    return jsonify({'id': reminder.id, 'is_read': True}), 200

@app.route('/api/reminders/unread-count', methods=['GET'])
@token_required
def get_unread_count(current_user):
    count = Reminder.query.filter_by(user_id=current_user.id, is_read=False).count()
    return jsonify({'unread_count': count}), 200

@socketio.on('connect')
def handle_connect():
    token = request.args.get('token')
    if token:
        try:
            token = token.replace('Bearer ', '')
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=["HS256"])
            user_id = data['user_id']
            from flask_socketio import join_room
            join_room(f"user_{user_id}")
            emit('connected', {'status': 'success', 'user_id': user_id})
        except Exception:
            pass

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    
    scheduler_thread = threading.Thread(target=start_scheduler, args=(app, socketio), daemon=True)
    scheduler_thread.start()
    
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
