import os
import uuid
from datetime import date, timedelta
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO, join_room, leave_room
from models import db, Project, Task, User, Notification
from routes.project import project_bp


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = 'team-collaboration-secret-key'
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///team_collaboration.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    CORS(app, resources={r'/*': {'origins': '*'}})

    db.init_app(app)

    app.register_blueprint(project_bp)

    socketio = SocketIO(app, cors_allowed_origins='*', async_mode='threading')

    with app.app_context():
        db.create_all()
        seed_data()

    @socketio.on('connect')
    def handle_connect():
        print('Client connected')

    @socketio.on('disconnect')
    def handle_disconnect():
        print('Client disconnected')

    @socketio.on('join_project')
    def handle_join_project(data):
        project_id = data.get('projectId')
        if project_id:
            join_room(f'project_{project_id}')
            print(f'Client joined project room: {project_id}')

    @socketio.on('leave_project')
    def handle_leave_project(data):
        project_id = data.get('projectId')
        if project_id:
            leave_room(f'project_{project_id}')
            print(f'Client left project room: {project_id}')

    @socketio.on('task_update')
    def handle_task_update(data):
        task_data = data.get('task')
        if task_data and 'projectId' in task_data:
            project_id = task_data['projectId']
            socketio.emit('task_updated', task_data, room=f'project_{project_id}')

    @app.route('/')
    def index():
        return {'status': 'running', 'service': 'Team Collaboration API'}

    return app, socketio


def seed_data():
    if User.query.count() == 0:
        users = [
            User(id='user-1', name='张伟', email='zhangwei@example.com'),
            User(id='user-2', name='李娜', email='lina@example.com'),
            User(id='user-3', name='王强', email='wangqiang@example.com'),
            User(id='user-4', name='刘芳', email='liufang@example.com'),
            User(id='user-5', name='陈明', email='chenming@example.com'),
        ]
        db.session.add_all(users)
        db.session.commit()

    if Project.query.count() == 0:
        today = date.today()
        project = Project(
            id='project-1',
            name='在线教育平台迭代开发',
            description='完成平台v2.0版本的核心功能开发与上线',
            start_date=today,
            end_date=today + timedelta(days=60),
            owner_id='user-1',
        )
        project.members = User.query.all()[:4]
        db.session.add(project)
        db.session.commit()

        tasks_data = [
            {
                'name': '需求分析与原型设计',
                'status': 'done',
                'priority': 'high',
                'assignee_id': 'user-1',
                'start_offset': 0,
                'duration': 7,
            },
            {
                'name': '前端架构搭建',
                'status': 'in_progress',
                'priority': 'high',
                'assignee_id': 'user-2',
                'start_offset': 5,
                'duration': 10,
            },
            {
                'name': '后端API开发',
                'status': 'in_progress',
                'priority': 'high',
                'assignee_id': 'user-3',
                'start_offset': 5,
                'duration': 15,
            },
            {
                'name': '数据库设计与优化',
                'status': 'todo',
                'priority': 'medium',
                'assignee_id': 'user-4',
                'start_offset': 3,
                'duration': 8,
            },
            {
                'name': 'UI/UX设计稿评审',
                'status': 'todo',
                'priority': 'medium',
                'assignee_id': 'user-1',
                'start_offset': 8,
                'duration': 5,
            },
            {
                'name': '用户认证模块开发',
                'status': 'todo',
                'priority': 'high',
                'assignee_id': 'user-2',
                'start_offset': 15,
                'duration': 10,
            },
            {
                'name': '课程管理模块开发',
                'status': 'todo',
                'priority': 'medium',
                'assignee_id': 'user-3',
                'start_offset': 20,
                'duration': 12,
            },
            {
                'name': '直播功能集成',
                'status': 'todo',
                'priority': 'low',
                'assignee_id': 'user-4',
                'start_offset': 30,
                'duration': 14,
            },
            {
                'name': '性能测试与优化',
                'status': 'todo',
                'priority': 'medium',
                'assignee_id': 'user-2',
                'start_offset': 40,
                'duration': 10,
            },
            {
                'name': '用户验收测试',
                'status': 'todo',
                'priority': 'high',
                'assignee_id': 'user-1',
                'start_offset': 50,
                'duration': 10,
            },
        ]

        for idx, td in enumerate(tasks_data):
            task = Task(
                id=f'task-{idx + 1}',
                project_id='project-1',
                name=td['name'],
                description=f'{td["name"]}的详细描述信息',
                status=td['status'],
                priority=td['priority'],
                assignee_id=td['assignee_id'],
                start_date=today + timedelta(days=td['start_offset']),
                end_date=today + timedelta(days=td['start_offset'] + td['duration']),
                dependencies=[],
                progress=100 if td['status'] == 'done' else (50 if td['status'] == 'in_progress' else 0),
            )
            db.session.add(task)

        db.session.commit()

        notifications = [
            Notification(
                id=str(uuid.uuid4()),
                user_id='user-2',
                task_id='task-2',
                task_name='前端架构搭建',
                project_id='project-1',
                project_name='在线教育平台迭代开发',
                message='您被分配了一个新任务: 前端架构搭建',
                read=False,
            ),
            Notification(
                id=str(uuid.uuid4()),
                user_id='user-3',
                task_id='task-3',
                task_name='后端API开发',
                project_id='project-1',
                project_name='在线教育平台迭代开发',
                message='您被分配了一个新任务: 后端API开发',
                read=False,
            ),
        ]
        db.session.add_all(notifications)
        db.session.commit()


if __name__ == '__main__':
    app, socketio = create_app()
    socketio.run(app, debug=True, host='0.0.0.0', port=5000)
