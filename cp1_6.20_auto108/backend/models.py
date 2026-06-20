from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    nickname = db.Column(db.String(50), nullable=False)
    phone = db.Column(db.String(20))
    avatar = db.Column(db.String(255))
    city = db.Column(db.String(50))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_sitter = db.Column(db.Boolean, default=False)

    sitter_profile = db.relationship('SitterProfile', backref='user', uselist=False, cascade='all, delete-orphan')
    sent_requests = db.relationship('SittingRequest', foreign_keys='SittingRequest.owner_id', backref='owner', lazy='dynamic')
    received_requests = db.relationship('SittingRequest', foreign_keys='SittingRequest.sitter_id', backref='sitter', lazy='dynamic')
    sent_messages = db.relationship('Message', foreign_keys='Message.sender_id', backref='sender', lazy='dynamic')
    received_messages = db.relationship('Message', foreign_keys='Message.receiver_id', backref='receiver', lazy='dynamic')

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self, include_sitter: bool = True) -> dict:
        data = {
            'id': self.id,
            'email': self.email,
            'nickname': self.nickname,
            'phone': self.phone,
            'avatar': self.avatar,
            'city': self.city,
            'is_sitter': self.is_sitter,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'stats': {
                'as_owner': self.sent_requests.filter(SittingRequest.status == 'completed').count(),
                'as_sitter': self.received_requests.filter(SittingRequest.status == 'completed').count()
            }
        }
        if include_sitter and self.sitter_profile:
            data['sitter_profile'] = self.sitter_profile.to_dict()
        return data


class SitterProfile(db.Model):
    __tablename__ = 'sitter_profiles'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), unique=True, nullable=False)
    bio = db.Column(db.String(500))
    rating = db.Column(db.Float, default=0.0)
    review_count = db.Column(db.Integer, default=0)
    experience_years = db.Column(db.Integer, default=0)
    available_from = db.Column(db.Date)
    available_to = db.Column(db.Date)
    verified = db.Column(db.Boolean, default=False)
    pet_types = db.Column(db.String(200), default='dog,cat')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'bio': (self.bio or '')[:50],
            'bio_full': self.bio,
            'rating': self.rating,
            'review_count': self.review_count,
            'experience_years': self.experience_years,
            'available_from': self.available_from.isoformat() if self.available_from else None,
            'available_to': self.available_to.isoformat() if self.available_to else None,
            'verified': self.verified,
            'pet_types': self.pet_types.split(',') if self.pet_types else []
        }


class SittingRequest(db.Model):
    __tablename__ = 'sitting_requests'

    id = db.Column(db.Integer, primary_key=True)
    owner_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    sitter_id = db.Column(db.Integer, db.ForeignKey('users.id'), index=True)
    pet_name = db.Column(db.String(50), nullable=False)
    pet_type = db.Column(db.String(30), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    special_notes = db.Column(db.String(500))
    status = db.Column(db.String(20), default='pending', index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    messages = db.relationship('Message', backref='request', lazy='dynamic', cascade='all, delete-orphan', order_by='Message.created_at.desc()')
    photos = db.relationship('Photo', backref='request', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_relations: bool = True) -> dict:
        data = {
            'id': self.id,
            'owner_id': self.owner_id,
            'sitter_id': self.sitter_id,
            'pet_name': self.pet_name,
            'pet_type': self.pet_type,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'special_notes': self.special_notes,
            'status': self.status,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }
        if include_relations:
            if self.owner:
                data['owner'] = {'id': self.owner.id, 'nickname': self.owner.nickname, 'avatar': self.owner.avatar, 'phone': self.owner.phone}
            if self.sitter:
                data['sitter'] = {'id': self.sitter.id, 'nickname': self.sitter.nickname, 'avatar': self.sitter.avatar, 'phone': self.sitter.phone}
                if self.sitter.sitter_profile:
                    data['sitter']['rating'] = self.sitter.sitter_profile.rating
        return data


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('sitting_requests.id'), nullable=False, index=True)
    sender_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    receiver_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    content = db.Column(db.Text, nullable=False)
    is_photo = db.Column(db.Boolean, default=False)
    photo_url = db.Column(db.String(255))
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    read = db.Column(db.Boolean, default=False)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'request_id': self.request_id,
            'sender_id': self.sender_id,
            'receiver_id': self.receiver_id,
            'content': self.content,
            'is_photo': self.is_photo,
            'photo_url': self.photo_url,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'read': self.read
        }


class Photo(db.Model):
    __tablename__ = 'photos'

    id = db.Column(db.Integer, primary_key=True)
    request_id = db.Column(db.Integer, db.ForeignKey('sitting_requests.id'), nullable=False, index=True)
    uploader_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    url = db.Column(db.String(255), nullable=False)
    description = db.Column(db.String(200))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'request_id': self.request_id,
            'uploader_id': self.uploader_id,
            'filename': self.filename,
            'url': self.url,
            'description': self.description,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
