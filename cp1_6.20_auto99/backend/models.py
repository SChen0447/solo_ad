from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(80), nullable=False)
    avatar = db.Column(db.String(200))
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    online = db.Column(db.Boolean, default=False)
    
    plans = db.relationship('Plan', secondary='plan_members', back_populates='members')
    expenses_paid = db.relationship('Expense', foreign_keys='Expense.paid_by', back_populates='payer')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'name': self.name,
            'avatar': self.avatar or f'https://api.dicebear.com/7.x/avataaars/svg?seed={self.id}',
            'online': self.online
        }


class Plan(db.Model):
    __tablename__ = 'plans'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    total_budget = db.Column(db.Float, default=0.0)
    cover_image = db.Column(db.String(500))
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    members = db.relationship('User', secondary='plan_members', back_populates='plans')
    items = db.relationship('Item', back_populates='plan', cascade='all, delete-orphan')
    expenses = db.relationship('Expense', back_populates='plan', cascade='all, delete-orphan')
    settlements = db.relationship('Settlement', back_populates='plan', cascade='all, delete-orphan')
    
    def to_dict(self, include_details=False):
        total_spent = sum(expense.amount for expense in self.expenses)
        data = {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'start_date': self.start_date.isoformat(),
            'end_date': self.end_date.isoformat(),
            'total_budget': self.total_budget,
            'total_spent': round(total_spent, 2),
            'cover_image': self.cover_image,
            'created_by': self.created_by,
            'created_at': self.created_at.isoformat(),
            'members': [member.to_dict() for member in self.members]
        }
        if include_details:
            data['items'] = [item.to_dict() for item in sorted(self.items, key=lambda x: x.order)]
            data['expenses'] = [expense.to_dict() for expense in self.expenses]
            data['settlements'] = [settlement.to_dict() for settlement in self.settlements]
        return data


plan_members = db.Table(
    'plan_members',
    db.Column('plan_id', db.Integer, db.ForeignKey('plans.id'), primary_key=True),
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('joined_at', db.DateTime, default=datetime.utcnow)
)


class Item(db.Model):
    __tablename__ = 'items'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=False)
    type = db.Column(db.String(20), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    date = db.Column(db.Date, nullable=False)
    time = db.Column(db.Time)
    location = db.Column(db.String(200))
    cost = db.Column(db.Float, default=0.0)
    responsible_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    order = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    plan = db.relationship('Plan', back_populates='items')
    responsible = db.relationship('User', foreign_keys=[responsible_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'plan_id': self.plan_id,
            'type': self.type,
            'title': self.title,
            'description': self.description,
            'date': self.date.isoformat(),
            'time': self.time.isoformat() if self.time else None,
            'location': self.location,
            'cost': self.cost,
            'responsible_id': self.responsible_id,
            'responsible': self.responsible.to_dict() if self.responsible else None,
            'order': self.order,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Expense(db.Model):
    __tablename__ = 'expenses'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    currency = db.Column(db.String(3), default='CNY')
    paid_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    split_type = db.Column(db.String(20), default='equal')
    splits = db.Column(db.JSON)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    settled = db.Column(db.Boolean, default=False)
    
    plan = db.relationship('Plan', back_populates='expenses')
    payer = db.relationship('User', foreign_keys=[paid_by], back_populates='expenses_paid')
    
    def to_dict(self):
        return {
            'id': self.id,
            'plan_id': self.plan_id,
            'title': self.title,
            'amount': self.amount,
            'currency': self.currency,
            'paid_by': self.paid_by,
            'payer': self.payer.to_dict() if self.payer else None,
            'split_type': self.split_type,
            'splits': self.splits,
            'created_at': self.created_at.isoformat(),
            'settled': self.settled
        }


class Settlement(db.Model):
    __tablename__ = 'settlements'
    
    id = db.Column(db.Integer, primary_key=True)
    plan_id = db.Column(db.Integer, db.ForeignKey('plans.id'), nullable=False)
    from_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    to_user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    completed = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    plan = db.relationship('Plan', back_populates='settlements')
    from_user = db.relationship('User', foreign_keys=[from_user_id])
    to_user = db.relationship('User', foreign_keys=[to_user_id])
    
    def to_dict(self):
        return {
            'id': self.id,
            'plan_id': self.plan_id,
            'from_user_id': self.from_user_id,
            'to_user_id': self.to_user_id,
            'from_user': self.from_user.to_dict() if self.from_user else None,
            'to_user': self.to_user.to_dict() if self.to_user else None,
            'amount': self.amount,
            'completed': self.completed,
            'created_at': self.created_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
