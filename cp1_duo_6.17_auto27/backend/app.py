import json
import os
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
DATA_FILE = os.path.join(DATA_DIR, 'data.json')


def load_data():
    with open(DATA_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@app.route('/api/characters', methods=['GET'])
def get_characters():
    data = load_data()
    return jsonify(data['characters'])


@app.route('/api/characters/<character_id>', methods=['GET'])
def get_character(character_id):
    data = load_data()
    character = next((c for c in data['characters'] if c['id'] == character_id), None)
    if character:
        return jsonify(character)
    return jsonify({'error': 'Character not found'}), 404


@app.route('/api/characters', methods=['POST'])
def create_character():
    data = load_data()
    new_character = request.json
    new_character['id'] = f"char_{len(data['characters']) + 1}"
    data['characters'].append(new_character)
    save_data(data)
    return jsonify(new_character), 201


@app.route('/api/characters/<character_id>', methods=['PUT'])
def update_character(character_id):
    data = load_data()
    character = next((c for c in data['characters'] if c['id'] == character_id), None)
    if character:
        character.update(request.json)
        save_data(data)
        return jsonify(character)
    return jsonify({'error': 'Character not found'}), 404


@app.route('/api/characters/<character_id>', methods=['DELETE'])
def delete_character(character_id):
    data = load_data()
    data['characters'] = [c for c in data['characters'] if c['id'] != character_id]
    save_data(data)
    return jsonify({'message': 'Character deleted'})


@app.route('/api/relations', methods=['GET'])
def get_relations():
    data = load_data()
    return jsonify(data['relations'])


@app.route('/api/relations', methods=['POST'])
def create_relation():
    data = load_data()
    new_relation = request.json
    new_relation['id'] = f"rel_{len(data['relations']) + 1}"
    data['relations'].append(new_relation)
    save_data(data)
    return jsonify(new_relation), 201


@app.route('/api/relations/<relation_id>', methods=['PUT'])
def update_relation(relation_id):
    data = load_data()
    relation = next((r for r in data['relations'] if r['id'] == relation_id), None)
    if relation:
        relation.update(request.json)
        save_data(data)
        return jsonify(relation)
    return jsonify({'error': 'Relation not found'}), 404


@app.route('/api/relations/<relation_id>', methods=['DELETE'])
def delete_relation(relation_id):
    data = load_data()
    data['relations'] = [r for r in data['relations'] if r['id'] != relation_id]
    save_data(data)
    return jsonify({'message': 'Relation deleted'})


@app.route('/api/events', methods=['GET'])
def get_events():
    data = load_data()
    return jsonify(data['events'])


@app.route('/api/events/<event_id>', methods=['GET'])
def get_event(event_id):
    data = load_data()
    event = next((e for e in data['events'] if e['id'] == event_id), None)
    if event:
        return jsonify(event)
    return jsonify({'error': 'Event not found'}), 404


@app.route('/api/events', methods=['POST'])
def create_event():
    data = load_data()
    new_event = request.json
    new_event['id'] = f"evt_{len(data['events']) + 1}"
    data['events'].append(new_event)
    save_data(data)
    return jsonify(new_event), 201


@app.route('/api/events/<event_id>', methods=['PUT'])
def update_event(event_id):
    data = load_data()
    event = next((e for e in data['events'] if e['id'] == event_id), None)
    if event:
        event.update(request.json)
        save_data(data)
        return jsonify(event)
    return jsonify({'error': 'Event not found'}), 404


@app.route('/api/events/<event_id>', methods=['DELETE'])
def delete_event(event_id):
    data = load_data()
    data['events'] = [e for e in data['events'] if e['id'] != event_id]
    save_data(data)
    return jsonify({'message': 'Event deleted'})


@app.route('/api/chapters', methods=['GET'])
def get_chapters():
    data = load_data()
    return jsonify(data['chapters'])


@app.route('/api/chapters/<chapter_id>', methods=['GET'])
def get_chapter(chapter_id):
    data = load_data()
    chapter = next((c for c in data['chapters'] if c['id'] == chapter_id), None)
    if chapter:
        return jsonify(chapter)
    return jsonify({'error': 'Chapter not found'}), 404


@app.route('/api/chapters', methods=['POST'])
def create_chapter():
    data = load_data()
    new_chapter = request.json
    new_chapter['id'] = f"ch_{len(data['chapters']) + 1}"
    data['chapters'].append(new_chapter)
    save_data(data)
    return jsonify(new_chapter), 201


@app.route('/api/chapters/<chapter_id>', methods=['PUT'])
def update_chapter(chapter_id):
    data = load_data()
    chapter = next((c for c in data['chapters'] if c['id'] == chapter_id), None)
    if chapter:
        chapter.update(request.json)
        save_data(data)
        return jsonify(chapter)
    return jsonify({'error': 'Chapter not found'}), 404


@app.route('/api/chapters/<chapter_id>', methods=['DELETE'])
def delete_chapter(chapter_id):
    data = load_data()
    data['chapters'] = [c for c in data['chapters'] if c['id'] != chapter_id]
    save_data(data)
    return jsonify({'message': 'Chapter deleted'})


@app.route('/api/volumes', methods=['GET'])
def get_volumes():
    data = load_data()
    return jsonify(data['volumes'])


if __name__ == '__main__':
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(DATA_FILE):
        save_data({
            'characters': [],
            'relations': [],
            'events': [],
            'chapters': [],
            'volumes': []
        })
    app.run(debug=True, port=5000)
