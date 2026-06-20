from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.sqlite import JSON

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(255), nullable=False, unique=True)
    avatar = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'avatar': self.avatar,
        }


project_members = db.Table(
    'project_members',
    db.Column('project_id', db.String(36), db.ForeignKey('projects.id'), primary_key=True),
    db.Column('user_id', db.String(36), db.ForeignKey('users.id'), primary_key=True),
)


class Project(db.Model):
    __tablename__ = 'projects'

    id = db.Column(db.String(36), primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    owner_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = db.relationship('User', backref='owned_projects', foreign_keys=[owner_id])
    members = db.relationship('User', secondary=project_members, backref='projects')
    tasks = db.relationship('Task', backref='project', cascade='all, delete-orphan')
    dependencies = db.relationship('Dependency', backref='project', cascade='all, delete-orphan')

    def to_dict(self, include_members=True):
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'startDate': self.start_date.isoformat() if self.start_date else None,
            'endDate': self.end_date.isoformat() if self.end_date else None,
            'ownerId': self.owner_id,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_members:
            data['members'] = [member.to_dict() for member in self.members]
        return data


class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.String(36), primary_key=True)
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'), nullable=False)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    status = db.Column(db.String(20), nullable=False, default='todo')
    priority = db.Column(db.String(20), nullable=False, default='medium')
    assignee_id = db.Column(db.String(36), db.ForeignKey('users.id'))
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    dependencies = db.Column(JSON, default=list)
    progress = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    assignee = db.relationship('User', backref='tasks')

    def to_dict(self, include_assignee=True):
        data = {
            'id': self.id,
            'projectId': self.project_id,
            'name': self.name,
            'description': self.description,
            'status': self.status,
            'priority': self.priority,
            'assigneeId': self.assignee_id,
            'startDate': self.start_date.isoformat() if self.start_date else None,
            'endDate': self.end_date.isoformat() if self.end_date else None,
            'dependencies': self.dependencies or [],
            'progress': self.progress or 0,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'updatedAt': self.updated_at.isoformat() if self.updated_at else None,
        }
        if include_assignee and self.assignee:
            data['assignee'] = self.assignee.to_dict()
        return data


class Dependency(db.Model):
    __tablename__ = 'dependencies'

    id = db.Column(db.String(36), primary_key=True)
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'), nullable=False)
    from_task_id = db.Column(db.String(36), db.ForeignKey('tasks.id'), nullable=False)
    to_task_id = db.Column(db.String(36), db.ForeignKey('tasks.id'), nullable=False)

    from_task = db.relationship('Task', foreign_keys=[from_task_id])
    to_task = db.relationship('Task', foreign_keys=[to_task_id])

    def to_dict(self):
        return {
            'id': self.id,
            'projectId': self.project_id,
            'fromTaskId': self.from_task_id,
            'toTaskId': self.to_task_id,
        }


class Notification(db.Model):
    __tablename__ = 'notifications'

    id = db.Column(db.String(36), primary_key=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    task_id = db.Column(db.String(36), db.ForeignKey('tasks.id'))
    task_name = db.Column(db.String(200))
    project_id = db.Column(db.String(36), db.ForeignKey('projects.id'))
    project_name = db.Column(db.String(200))
    message = db.Column(db.String(500), nullable=False)
    read = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship('User', backref='notifications')

    def to_dict(self):
        return {
            'id': self.id,
            'userId': self.user_id,
            'taskId': self.task_id,
            'taskName': self.task_name,
            'projectId': self.project_id,
            'projectName': self.project_name,
            'message': self.message,
            'read': self.read,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
        }
