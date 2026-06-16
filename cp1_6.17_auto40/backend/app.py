from flask import Flask, request, jsonify
from flask_cors import CORS
import uuid
from db import init_db, create_story, get_story, update_story, get_all_stories

app = Flask(__name__)
CORS(app)

init_db()

@app.route('/api/stories', methods=['GET'])
def list_stories():
    stories = get_all_stories()
    return jsonify(stories)

@app.route('/api/stories', methods=['POST'])
def create_new_story():
    data = request.get_json()
    title = data.get('title', '未命名故事')
    pages = data.get('pages', [])
    story_id = str(uuid.uuid4())[:8]
    create_story(story_id, title, pages)
    return jsonify({'story_id': story_id, 'title': title, 'pages': pages})

@app.route('/api/stories/<story_id>', methods=['GET'])
def get_single_story(story_id):
    story = get_story(story_id)
    if story:
        return jsonify(story)
    return jsonify({'error': 'Story not found'}), 404

@app.route('/api/stories/<story_id>', methods=['PUT'])
def update_existing_story(story_id):
    data = request.get_json()
    title = data.get('title')
    pages = data.get('pages')
    existing = get_story(story_id)
    if not existing:
        return jsonify({'error': 'Story not found'}), 404
    if title is None:
        title = existing['title']
    if pages is None:
        pages = existing['pages']
    update_story(story_id, title, pages)
    return jsonify({'story_id': story_id, 'title': title, 'pages': pages})

if __name__ == '__main__':
    app.run(port=5000, debug=True)
