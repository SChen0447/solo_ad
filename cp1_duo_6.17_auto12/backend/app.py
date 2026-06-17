from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from datetime import datetime, date
import uuid
import os
import json
from werkzeug.utils import secure_filename

from models import db, DiaryEntry

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///diary.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(__file__), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

db.init_app(app)

with app.app_context():
    db.create_all()
    
    if DiaryEntry.query.count() == 0:
        sample_entries = [
            {
                'id': str(uuid.uuid4()),
                'date': date.today().isoformat(),
                'text': '<p>今天是个美好的日子，阳光明媚，心情愉悦。<strong>听了一首很喜欢的歌</strong>，感觉整个人都被治愈了。</p>',
                'musicInfo': {
                    'id': '1',
                    'title': '晴天',
                    'artist': '周杰伦',
                    'album': '叶惠美',
                    'coverUrl': 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/2f/ab/22/2fab222c-0a18-49d0-8896-0b87adb6f9a3/190296533337.jpg/300x300bb.jpg',
                    'genre': 'pop'
                },
                'mediaPaths': []
            },
            {
                'id': str(uuid.uuid4()),
                'date': date.today().isoformat(),
                'text': '<p>工作了一整天，<em>有些疲惫</em>，但听到这首歌又充满了力量。明天继续加油！💪</p>',
                'musicInfo': {
                    'id': '2',
                    'title': '海阔天空',
                    'artist': 'Beyond',
                    'album': '乐与怒',
                    'coverUrl': 'https://is1-ssl.mzstatic.com/image/thumb/Music124/v4/3c/02/2e/3c022e9f-8cd9-1c08-7a90-8a8b6902c0aa/034744900348.jpg/300x300bb.jpg',
                    'genre': 'rock'
                },
                'mediaPaths': []
            }
        ]
        
        for entry_data in sample_entries:
            entry = DiaryEntry.from_dict(entry_data)
            db.session.add(entry)
        
        db.session.commit()
        print('Sample data created')

@app.route('/api/diary', methods=['GET'])
def get_diaries():
    year = request.args.get('year', type=int)
    month = request.args.get('month', type=int)
    
    query = DiaryEntry.query.order_by(DiaryEntry.date.desc())
    
    if year is not None and month is not None:
        query = query.filter(
            db.extract('year', DiaryEntry.date) == year,
            db.extract('month', DiaryEntry.date) == month
        )
    elif year is not None:
        query = query.filter(db.extract('year', DiaryEntry.date) == year)
    
    entries = query.all()
    return jsonify([entry.to_dict() for entry in entries])

@app.route('/api/diary', methods=['POST'])
def create_diary():
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    entry_id = str(uuid.uuid4())
    entry_data = {
        'id': entry_id,
        'date': data.get('date'),
        'text': data.get('text', ''),
        'musicInfo': data.get('musicInfo'),
        'mediaPaths': data.get('mediaPaths', []),
        'userId': 'default_user'
    }
    
    entry = DiaryEntry.from_dict(entry_data)
    db.session.add(entry)
    db.session.commit()
    
    return jsonify(entry.to_dict()), 201

@app.route('/api/diary/search', methods=['GET'])
def search_diaries():
    keyword = request.args.get('keyword', '')
    year = request.args.get('year', type=int)
    
    if not keyword:
        return jsonify([])
    
    query = DiaryEntry.query.filter(
        db.or_(
            DiaryEntry.text.ilike(f'%{keyword}%'),
            DiaryEntry.music_info.ilike(f'%{keyword}%')
        )
    ).order_by(DiaryEntry.date.desc())
    
    if year is not None:
        query = query.filter(db.extract('year', DiaryEntry.date) == year)
    
    entries = query.all()
    return jsonify([entry.to_dict() for entry in entries])

@app.route('/api/diary/<entry_id>', methods=['DELETE'])
def delete_diary(entry_id):
    entry = DiaryEntry.query.get(entry_id)
    
    if not entry:
        return jsonify({'error': 'Entry not found'}), 404
    
    db.session.delete(entry)
    db.session.commit()
    
    return jsonify({'message': 'Entry deleted successfully'})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    filename = secure_filename(file.filename)
    file_ext = os.path.splitext(filename)[1].lower()
    
    if file_ext not in ['.jpg', '.jpeg', '.png', '.gif', '.webm', '.mp4']:
        return jsonify({'error': 'Unsupported file type'}), 400
    
    unique_filename = f"{uuid.uuid4().hex}{file_ext}"
    filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
    file.save(filepath)
    
    file_size = os.path.getsize(filepath)
    media_type = 'video' if file_ext in ['.webm', '.mp4'] else 'image'
    
    media_id = str(uuid.uuid4())
    media_url = f'/api/uploads/{unique_filename}'
    thumbnail_url = media_url
    
    return jsonify({
        'id': media_id,
        'type': media_type,
        'url': media_url,
        'thumbnailUrl': thumbnail_url,
        'filename': filename,
        'size': file_size
    })

@app.route('/api/uploads/<filename>')
def serve_upload(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True)
