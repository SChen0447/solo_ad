import os
import uuid
import time
import random
from datetime import datetime
from flask import Flask, request, jsonify, send_file
from flask_socketio import SocketIO, emit, join_room
from flask_cors import CORS
from io import BytesIO

app = Flask(__name__)
app.config['SECRET_KEY'] = 'translation-collab-secret-key'
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

documents = {}
comments = {}
locked_paragraphs = {}
online_users = {}

MOCK_TRANSLATIONS = {
    "en": {
        "zh": [
            "这是文档的第一段内容，用于演示翻译功能。",
            "欢迎使用我们的跨语言文档翻译与协同校对平台。",
            "该平台支持多人实时协作，提高翻译效率和质量。",
            "您可以上传多种格式的文档，包括Markdown、PDF和TXT。",
            "系统会自动识别源语言，并调用翻译引擎进行处理。",
            "翻译完成后，您可以逐段查看和编辑译文。",
            "校对人员可以通过共享链接加入，进行评论和建议。",
            "所有评论都会实时同步给所有在线用户。",
            "段落锁定功能可以防止多人同时编辑同一段落。",
            "最终您可以导出完整的翻译文档，包含所有校对建议。"
        ] * 20
    }
}

def generate_mock_translation(source_lang, target_lang, paragraphs):
    count = len(paragraphs)
    translations = []
    for i in range(count):
        mock_text = f"[翻译结果] {paragraphs[i][:30]}... 的中文翻译内容。段落 {i + 1}"
        translations.append(mock_text)
    return translations

def detect_language(text):
    return "en"

@app.route('/api/upload', methods=['POST'])
def upload_document():
    if 'file' not in request.files:
        return jsonify({"error": "未找到文件"}), 400
    
    file = request.files['file']
    format_type = request.form.get('format', 'txt')
    
    if file.filename == '':
        return jsonify({"error": "文件名为空"}), 400
    
    doc_id = str(uuid.uuid4())
    content = file.read().decode('utf-8', errors='ignore')
    paragraphs = [p.strip() for p in content.split('\n\n') if p.strip()]
    
    if not paragraphs:
        paragraphs = [content.strip()] if content.strip() else ["文档内容"]
    
    source_lang = detect_language(content)
    target_lang = "zh"
    
    documents[doc_id] = {
        "id": doc_id,
        "filename": file.filename,
        "format": format_type,
        "source_lang": source_lang,
        "target_lang": target_lang,
        "original_paragraphs": paragraphs,
        "translated_paragraphs": generate_mock_translation(source_lang, target_lang, paragraphs),
        "status": "uploaded",
        "created_at": datetime.now().isoformat(),
        "review_status": ["pending"] * len(paragraphs)
    }
    
    comments[doc_id] = [[] for _ in range(len(paragraphs))]
    locked_paragraphs[doc_id] = {}
    
    return jsonify({
        "doc_id": doc_id,
        "filename": file.filename,
        "paragraph_count": len(paragraphs),
        "source_lang": source_lang,
        "target_lang": target_lang
    })

@app.route('/api/translate', methods=['POST'])
def translate_document():
    data = request.json
    doc_id = data.get('doc_id')
    
    if doc_id not in documents:
        return jsonify({"error": "文档不存在"}), 404
    
    doc = documents[doc_id]
    doc["status"] = "translated"
    
    return jsonify({
        "doc_id": doc_id,
        "status": "translated",
        "paragraph_count": len(doc["original_paragraphs"])
    })

@app.route('/api/documents/<doc_id>/translations', methods=['GET'])
def get_translations(doc_id):
    if doc_id not in documents:
        return jsonify({"error": "文档不存在"}), 404
    
    doc = documents[doc_id]
    page = int(request.args.get('page', 0))
    page_size = int(request.args.get('page_size', 100))
    
    start = page * page_size
    end = start + page_size
    
    originals = doc["original_paragraphs"][start:end]
    translations = doc["translated_paragraphs"][start:end]
    review_status = doc["review_status"][start:end]
    
    result = []
    for i, (orig, trans, status) in enumerate(zip(originals, translations, review_status)):
        result.append({
            "index": start + i,
            "original": orig,
            "translation": trans,
            "review_status": status
        })
    
    return jsonify({
        "doc_id": doc_id,
        "page": page,
        "page_size": page_size,
        "total": len(doc["original_paragraphs"]),
        "paragraphs": result
    })

@app.route('/api/update-translation', methods=['POST'])
def update_translation():
    data = request.json
    doc_id = data.get('doc_id')
    paragraph_index = data.get('paragraph_index')
    new_translation = data.get('translation')
    
    if doc_id not in documents:
        return jsonify({"error": "文档不存在"}), 404
    
    doc = documents[doc_id]
    if paragraph_index < 0 or paragraph_index >= len(doc["translated_paragraphs"]):
        return jsonify({"error": "段落索引无效"}), 400
    
    doc["translated_paragraphs"][paragraph_index] = new_translation
    
    socketio.emit('translation_updated', {
        "doc_id": doc_id,
        "paragraph_index": paragraph_index,
        "translation": new_translation
    }, room=doc_id)
    
    return jsonify({
        "success": True,
        "doc_id": doc_id,
        "paragraph_index": paragraph_index
    })

@app.route('/api/documents/<doc_id>/comments', methods=['GET'])
def get_comments(doc_id):
    if doc_id not in documents:
        return jsonify({"error": "文档不存在"}), 404
    
    paragraph_index = request.args.get('paragraph_index', type=int)
    
    if paragraph_index is not None:
        if paragraph_index < 0 or paragraph_index >= len(comments[doc_id]):
            return jsonify({"error": "段落索引无效"}), 400
        return jsonify({
            "doc_id": doc_id,
            "paragraph_index": paragraph_index,
            "comments": comments[doc_id][paragraph_index]
        })
    
    return jsonify({
        "doc_id": doc_id,
        "comments": comments[doc_id]
    })

@app.route('/api/documents/<doc_id>/comments', methods=['POST'])
def submit_comment(doc_id):
    if doc_id not in documents:
        return jsonify({"error": "文档不存在"}), 404
    
    data = request.json
    paragraph_index = data.get('paragraph_index')
    content = data.get('content')
    user_name = data.get('user_name', '匿名用户')
    user_id = data.get('user_id', str(uuid.uuid4()))
    
    if paragraph_index < 0 or paragraph_index >= len(comments[doc_id]):
        return jsonify({"error": "段落索引无效"}), 400
    
    colors = ['#4361ee', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22']
    avatar_color = random.choice(colors)
    
    comment = {
        "id": str(uuid.uuid4()),
        "paragraph_index": paragraph_index,
        "content": content,
        "user_name": user_name,
        "user_id": user_id,
        "avatar_color": avatar_color,
        "created_at": datetime.now().isoformat()
    }
    
    comments[doc_id][paragraph_index].append(comment)
    
    socketio.emit('new_comment', {
        "doc_id": doc_id,
        "comment": comment
    }, room=doc_id)
    
    return jsonify(comment)

@app.route('/api/documents/<doc_id>/review-status', methods=['POST'])
def update_review_status(doc_id):
    if doc_id not in documents:
        return jsonify({"error": "文档不存在"}), 404
    
    data = request.json
    paragraph_index = data.get('paragraph_index')
    status = data.get('status')
    
    if paragraph_index < 0 or paragraph_index >= len(documents[doc_id]["review_status"]):
        return jsonify({"error": "段落索引无效"}), 400
    
    if status not in ['pending', 'reviewed', 'disputed']:
        return jsonify({"error": "无效的状态值"}), 400
    
    documents[doc_id]["review_status"][paragraph_index] = status
    
    socketio.emit('review_status_updated', {
        "doc_id": doc_id,
        "paragraph_index": paragraph_index,
        "status": status
    }, room=doc_id)
    
    return jsonify({
        "success": True,
        "paragraph_index": paragraph_index,
        "status": status
    })

@app.route('/api/documents/<doc_id>/export', methods=['GET'])
def export_document(doc_id):
    if doc_id not in documents:
        return jsonify({"error": "文档不存在"}), 404
    
    format_type = request.args.get('format', 'md')
    doc = documents[doc_id]
    
    if format_type == 'md':
        content = "# 翻译文档\n\n"
        content += f"- 原文件: {doc['filename']}\n"
        content += f"- 源语言: {doc['source_lang']}\n"
        content += f"- 目标语言: {doc['target_lang']}\n\n"
        content += "---\n\n"
        
        for i, (orig, trans) in enumerate(zip(doc["original_paragraphs"], doc["translated_paragraphs"])):
            content += f"## 段落 {i + 1}\n\n"
            content += f"> {orig}\n\n"
            content += f"{trans}\n\n"
            
            if comments[doc_id][i]:
                content += "*校对建议:*\n\n"
                for comment in comments[doc_id][i]:
                    content += f"- *[{comment['user_name']} {comment['created_at']}]* {comment['content']}\n"
                content += "\n"
        
        output = BytesIO(content.encode('utf-8'))
        output.seek(0)
        return send_file(
            output,
            mimetype='text/markdown',
            as_attachment=True,
            download_name=f"{doc['filename'].split('.')[0]}_translated.md"
        )
    else:
        content = f"翻译文档 - {doc['filename']}\n\n"
        for i, (orig, trans) in enumerate(zip(doc["original_paragraphs"], doc["translated_paragraphs"])):
            content += f"段落 {i + 1}:\n"
            content += f"原文: {orig}\n"
            content += f"译文: {trans}\n"
            if comments[doc_id][i]:
                content += "校对建议:\n"
                for comment in comments[doc_id][i]:
                    content += f"  - [{comment['user_name']}] {comment['content']}\n"
            content += "\n"
        
        output = BytesIO(content.encode('utf-8'))
        output.seek(0)
        return send_file(
            output,
            mimetype='text/plain',
            as_attachment=True,
            download_name=f"{doc['filename'].split('.')[0]}_translated.txt"
        )

@socketio.on('join_document')
def handle_join_document(data):
    doc_id = data.get('doc_id')
    user_id = data.get('user_id')
    user_name = data.get('user_name', '匿名用户')
    
    join_room(doc_id)
    
    if doc_id not in online_users:
        online_users[doc_id] = {}
    
    colors = ['#4361ee', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22']
    
    online_users[doc_id][request.sid] = {
        "user_id": user_id,
        "user_name": user_name,
        "avatar_color": random.choice(colors),
        "joined_at": datetime.now().isoformat()
    }
    
    emit('user_joined', {
        "user": online_users[doc_id][request.sid],
        "online_users": list(online_users[doc_id].values())
    }, room=doc_id)

@socketio.on('lock_paragraph')
def handle_lock_paragraph(data):
    doc_id = data.get('doc_id')
    paragraph_index = data.get('paragraph_index')
    user_id = data.get('user_id')
    
    if doc_id not in locked_paragraphs:
        locked_paragraphs[doc_id] = {}
    
    if paragraph_index not in locked_paragraphs[doc_id]:
        locked_paragraphs[doc_id][paragraph_index] = {
            "user_id": user_id,
            "locked_at": datetime.now().isoformat()
        }
        
        emit('paragraph_locked', {
            "doc_id": doc_id,
            "paragraph_index": paragraph_index,
            "user_id": user_id
        }, room=doc_id)

@socketio.on('unlock_paragraph')
def handle_unlock_paragraph(data):
    doc_id = data.get('doc_id')
    paragraph_index = data.get('paragraph_index')
    
    if doc_id in locked_paragraphs and paragraph_index in locked_paragraphs[doc_id]:
        del locked_paragraphs[doc_id][paragraph_index]
        
        emit('paragraph_unlocked', {
            "doc_id": doc_id,
            "paragraph_index": paragraph_index
        }, room=doc_id)

@socketio.on('disconnect')
def handle_disconnect():
    for doc_id, users in online_users.items():
        if request.sid in users:
            del users[request.sid]
            
            emit('user_left', {
                "sid": request.sid,
                "online_users": list(users.values())
            }, room=doc_id)
            
            if doc_id in locked_paragraphs:
                to_unlock = []
                for para_idx, lock_info in locked_paragraphs[doc_id].items():
                    if lock_info["user_id"] == request.sid:
                        to_unlock.append(para_idx)
                
                for para_idx in to_unlock:
                    del locked_paragraphs[doc_id][para_idx]
                    emit('paragraph_unlocked', {
                        "doc_id": doc_id,
                        "paragraph_index": para_idx
                    }, room=doc_id)
            break

@socketio.on('get_online_users')
def handle_get_online_users(data):
    doc_id = data.get('doc_id')
    if doc_id in online_users:
        emit('online_users_list', {
            "online_users": list(online_users[doc_id].values())
        })

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
