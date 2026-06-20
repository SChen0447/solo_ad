import uuid
from datetime import datetime, date
from flask import Blueprint, request, jsonify
from models import db, Project, Task, Dependency, User, Notification

project_bp = Blueprint('project', __name__, url_prefix='/api')


def parse_date(date_str):
    if isinstance(date_str, date):
        return date_str
    return datetime.strptime(date_str, '%Y-%m-%d').date()


@project_bp.route('/projects', methods=['GET'])
def get_projects():
    projects = Project.query.all()
    return jsonify([p.to_dict() for p in projects])


@project_bp.route('/projects', methods=['POST'])
def create_project():
    data = request.get_json()
    project_id = str(uuid.uuid4())
    project = Project(
        id=project_id,
        name=data['name'],
        description=data.get('description', ''),
        start_date=parse_date(data['startDate']),
        end_date=parse_date(data['endDate']),
        owner_id=data.get('ownerId', 'user-1'),
    )
    db.session.add(project)
    db.session.commit()
    return jsonify(project.to_dict()), 201


@project_bp.route('/projects/<project_id>', methods=['GET'])
def get_project(project_id):
    project = Project.query.get_or_404(project_id)
    return jsonify(project.to_dict())


@project_bp.route('/projects/<project_id>', methods=['PUT'])
def update_project(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json()
    if 'name' in data:
        project.name = data['name']
    if 'description' in data:
        project.description = data['description']
    if 'startDate' in data:
        project.start_date = parse_date(data['startDate'])
    if 'endDate' in data:
        project.end_date = parse_date(data['endDate'])
    db.session.commit()
    return jsonify(project.to_dict())


@project_bp.route('/projects/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    project = Project.query.get_or_404(project_id)
    db.session.delete(project)
    db.session.commit()
    return '', 204


@project_bp.route('/projects/<project_id>/tasks', methods=['GET'])
def get_project_tasks(project_id):
    Project.query.get_or_404(project_id)
    tasks = Task.query.filter_by(project_id=project_id).all()
    return jsonify([t.to_dict() for t in tasks])


@project_bp.route('/projects/<project_id>/tasks', methods=['POST'])
def create_task(project_id):
    Project.query.get_or_404(project_id)
    data = request.get_json()
    task_id = str(uuid.uuid4())
    task = Task(
        id=task_id,
        project_id=project_id,
        name=data['name'],
        description=data.get('description', ''),
        status=data.get('status', 'todo'),
        priority=data.get('priority', 'medium'),
        assignee_id=data.get('assigneeId'),
        start_date=parse_date(data['startDate']),
        end_date=parse_date(data['endDate']),
        dependencies=data.get('dependencies', []),
        progress=data.get('progress', 0),
    )
    db.session.add(task)
    db.session.commit()

    if task.assignee_id:
        notification_id = str(uuid.uuid4())
        project = Project.query.get(project_id)
        notification = Notification(
            id=notification_id,
            user_id=task.assignee_id,
            task_id=task_id,
            task_name=task.name,
            project_id=project_id,
            project_name=project.name if project else None,
            message=f'您被分配了一个新任务: {task.name}',
        )
        db.session.add(notification)
        db.session.commit()

    return jsonify(task.to_dict()), 201


@project_bp.route('/tasks/<task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()

    previous_assignee = task.assignee_id

    if 'name' in data:
        task.name = data['name']
    if 'description' in data:
        task.description = data['description']
    if 'status' in data:
        task.status = data['status']
        if data['status'] == 'done':
            task.progress = 100
    if 'priority' in data:
        task.priority = data['priority']
    if 'assigneeId' in data:
        task.assignee_id = data['assigneeId']
    if 'startDate' in data:
        task.start_date = parse_date(data['startDate'])
    if 'endDate' in data:
        task.end_date = parse_date(data['endDate'])
    if 'progress' in data:
        task.progress = data['progress']

    db.session.commit()

    if task.assignee_id and task.assignee_id != previous_assignee:
        notification_id = str(uuid.uuid4())
        project = Project.query.get(task.project_id)
        notification = Notification(
            id=notification_id,
            user_id=task.assignee_id,
            task_id=task_id,
            task_name=task.name,
            project_id=task.project_id,
            project_name=project.name if project else None,
            message=f'您被分配了一个新任务: {task.name}',
        )
        db.session.add(notification)
        db.session.commit()

    return jsonify(task.to_dict())


@project_bp.route('/tasks/<task_id>/status', methods=['PATCH'])
def update_task_status(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json()
    task.status = data['status']
    if task.status == 'done':
        task.progress = 100
    db.session.commit()
    return jsonify(task.to_dict())


@project_bp.route('/tasks/<task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return '', 204


@project_bp.route('/projects/<project_id>/dependencies', methods=['GET'])
def get_dependencies(project_id):
    Project.query.get_or_404(project_id)
    deps = Dependency.query.filter_by(project_id=project_id).all()
    return jsonify([d.to_dict() for d in deps])


@project_bp.route('/projects/<project_id>/dependencies', methods=['POST'])
def create_dependency(project_id):
    Project.query.get_or_404(project_id)
    data = request.get_json()
    dep_id = str(uuid.uuid4())
    dep = Dependency(
        id=dep_id,
        project_id=project_id,
        from_task_id=data['fromTaskId'],
        to_task_id=data['toTaskId'],
    )
    db.session.add(dep)
    db.session.commit()
    return jsonify(dep.to_dict()), 201


@project_bp.route('/dependencies/<dependency_id>', methods=['DELETE'])
def delete_dependency(dependency_id):
    dep = Dependency.query.get_or_404(dependency_id)
    db.session.delete(dep)
    db.session.commit()
    return '', 204


@project_bp.route('/users', methods=['GET'])
def get_users():
    search = request.args.get('search', '')
    query = User.query
    if search:
        query = query.filter(
            (User.name.ilike(f'%{search}%')) | (User.email.ilike(f'%{search}%'))
        )
    users = query.all()
    return jsonify([u.to_dict() for u in users])


@project_bp.route('/projects/<project_id>/members', methods=['POST'])
def add_project_member(project_id):
    project = Project.query.get_or_404(project_id)
    data = request.get_json()
    user = User.query.get_or_404(data['userId'])
    if user not in project.members:
        project.members.append(user)
        db.session.commit()
    return jsonify(project.to_dict())


@project_bp.route('/projects/<project_id>/members/<user_id>', methods=['DELETE'])
def remove_project_member(project_id, user_id):
    project = Project.query.get_or_404(project_id)
    user = User.query.get_or_404(user_id)
    if user in project.members:
        project.members.remove(user)
        db.session.commit()
    return '', 204


@project_bp.route('/notifications', methods=['GET'])
def get_notifications():
    notifications = Notification.query.order_by(Notification.created_at.desc()).all()
    return jsonify([n.to_dict() for n in notifications])


@project_bp.route('/notifications/<notification_id>/read', methods=['PATCH'])
def mark_notification_read(notification_id):
    notification = Notification.query.get_or_404(notification_id)
    notification.read = True
    db.session.commit()
    return '', 204


@project_bp.route('/projects/<project_id>/dashboard', methods=['GET'])
def get_dashboard_stats(project_id):
    Project.query.get_or_404(project_id)
    tasks = Task.query.filter_by(project_id=project_id).all()
    total = len(tasks)
    completed = len([t for t in tasks if t.status == 'done'])
    progress = int((completed / total * 100) if total > 0 else 0)

    member_stats = {}
    for task in tasks:
        if task.assignee_id and task.assignee:
            uid = task.assignee_id
            if uid not in member_stats:
                member_stats[uid] = {
                    'userId': uid,
                    'userName': task.assignee.name,
                    'taskCount': 0,
                    'completedCount': 0,
                }
            member_stats[uid]['taskCount'] += 1
            if task.status == 'done':
                member_stats[uid]['completedCount'] += 1

    return jsonify({
        'totalTasks': total,
        'completedTasks': completed,
        'progress': progress,
        'memberStats': list(member_stats.values()),
    })


@project_bp.route('/projects/<project_id>/export', methods=['GET'])
def export_project_report(project_id):
    project = Project.query.get_or_404(project_id)
    tasks = Task.query.filter_by(project_id=project_id).all()

    report_content = f"""Project: {project.name}
Description: {project.description}
Start: {project.start_date}
End: {project.end_date}

Tasks:
"""
    for task in tasks:
        report_content += f"- {task.name} [{task.status}] - {task.priority}]n"

    response = jsonify({'report': report_content, 'project': project.to_dict()})
    response.headers['Content-Disposition'] = f'attachment; filename="{project.name}_report.json'
    return response
