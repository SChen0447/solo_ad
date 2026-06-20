from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Text, primary_key=True)
    phone = db.Column(db.Text, unique=True, nullable=False)
    password_hash = db.Column(db.Text, nullable=False)
    nickname = db.Column(db.Text, nullable=False)
    avatar = db.Column(db.Text, default='')
    created_at = db.Column(db.Text, default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    items = db.relationship('Item', backref='user', lazy=True)
    sent_messages = db.relationship('Message', foreign_keys='Message.from_user_id', backref='from_user', lazy=True)
    received_messages = db.relationship('Message', foreign_keys='Message.to_user_id', backref='to_user', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'phone': self.phone,
            'nickname': self.nickname,
            'avatar': self.avatar,
            'created_at': self.created_at,
        }


class Item(db.Model):
    __tablename__ = 'items'

    id = db.Column(db.Text, primary_key=True)
    user_id = db.Column(db.Text, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text, default='')
    original_price = db.Column(db.Float, default=0)
    sale_price = db.Column(db.Float, default=0)
    category = db.Column(db.Text, default='')
    city = db.Column(db.Text, default='')
    district = db.Column(db.Text, default='')
    lat = db.Column(db.Float, default=0)
    lng = db.Column(db.Float, default=0)
    images = db.Column(db.Text, default='[]')
    status = db.Column(db.Text, default='pending')
    phone = db.Column(db.Text, default='')
    created_at = db.Column(db.Text, default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    messages = db.relationship('Message', backref='item', lazy=True)

    def to_dict(self, include_user=False):
        import json
        data = {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'description': self.description,
            'original_price': self.original_price,
            'sale_price': self.sale_price,
            'category': self.category,
            'city': self.city,
            'district': self.district,
            'lat': self.lat,
            'lng': self.lng,
            'images': json.loads(self.images) if self.images else [],
            'status': self.status,
            'phone': self.phone,
            'created_at': self.created_at,
        }
        if include_user and self.user:
            data['user'] = self.user.to_dict()
        return data


class Message(db.Model):
    __tablename__ = 'messages'

    id = db.Column(db.Text, primary_key=True)
    item_id = db.Column(db.Text, db.ForeignKey('items.id'), nullable=False)
    from_user_id = db.Column(db.Text, db.ForeignKey('users.id'), nullable=False)
    to_user_id = db.Column(db.Text, db.ForeignKey('users.id'), nullable=False)
    content = db.Column(db.Text, default='')
    read = db.Column(db.Boolean, default=False)
    timestamp = db.Column(db.Text, default=lambda: datetime.now().strftime('%Y-%m-%d %H:%M:%S'))

    def to_dict(self):
        return {
            'id': self.id,
            'item_id': self.item_id,
            'from_user_id': self.from_user_id,
            'to_user_id': self.to_user_id,
            'content': self.content,
            'read': self.read,
            'timestamp': self.timestamp,
        }
