from datetime import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    books = db.relationship('Book', backref='user', cascade='all, delete-orphan', lazy=True)
    notes = db.relationship('Note', backref='user', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'created_at': self.created_at.isoformat()
        }


class Book(db.Model):
    __tablename__ = 'books'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    title = db.Column(db.String(500), nullable=False, default='Unknown Title')
    author = db.Column(db.String(255), nullable=False, default='Unknown Author')
    file_path = db.Column(db.String(1000), nullable=False)
    file_type = db.Column(db.String(10), nullable=False)
    file_size = db.Column(db.Integer, nullable=False, default=0)
    cover_url = db.Column(db.String(1000), nullable=True)
    total_pages = db.Column(db.Integer, nullable=False, default=0)
    last_read_page = db.Column(db.Integer, nullable=False, default=1)
    read_progress = db.Column(db.Float, nullable=False, default=0.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    notes = db.relationship('Note', backref='book', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'title': self.title,
            'author': self.author,
            'file_type': self.file_type,
            'file_url': f'/uploads/{self.id}/{self.file_path.split("/")[-1]}' if self.file_path else None,
            'cover_url': self.cover_url,
            'total_pages': self.total_pages,
            'last_read_page': self.last_read_page,
            'read_progress': self.read_progress,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }


class Note(db.Model):
    __tablename__ = 'notes'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False, index=True)
    book_id = db.Column(db.Integer, db.ForeignKey('books.id'), nullable=False, index=True)
    highlighted_text = db.Column(db.Text, nullable=False, default='')
    note_content = db.Column(db.Text, nullable=False, default='')
    page_number = db.Column(db.Integer, nullable=False, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'book_id': self.book_id,
            'highlighted_text': self.highlighted_text,
            'note_content': self.note_content,
            'page_number': self.page_number,
            'created_at': self.created_at.isoformat()
        }
