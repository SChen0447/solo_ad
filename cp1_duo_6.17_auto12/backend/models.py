from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class DiaryEntry(db.Model):
    __tablename__ = 'diary_entries'
    
    id = db.Column(db.String(36), primary_key=True)
    date = db.Column(db.Date, nullable=False, index=True)
    text = db.Column(db.Text, nullable=False)
    music_info = db.Column(db.Text, nullable=True)
    media_paths = db.Column(db.Text, nullable=True)
    user_id = db.Column(db.String(36), nullable=False, default='default_user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'date': self.date.isoformat(),
            'text': self.text,
            'musicInfo': json.loads(self.music_info) if self.music_info else None,
            'mediaPaths': json.loads(self.media_paths) if self.media_paths else [],
            'userId': self.user_id,
            'createdAt': self.created_at.isoformat(),
            'updatedAt': self.updated_at.isoformat()
        }
    
    @classmethod
    def from_dict(cls, data):
        return cls(
            id=data.get('id'),
            date=data.get('date'),
            text=data.get('text', ''),
            music_info=json.dumps(data.get('musicInfo')) if data.get('musicInfo') else None,
            media_paths=json.dumps(data.get('mediaPaths', [])),
            user_id=data.get('userId', 'default_user')
        )
