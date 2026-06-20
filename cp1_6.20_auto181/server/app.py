import os
import json
import time
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
ANNOTATIONS_FILE = os.path.join(DATA_DIR, 'annotations.json')
TEMPLATES_FILE = os.path.join(DATA_DIR, 'templates.json')


def ensure_data_dir():
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)


def load_json(filepath, default):
    ensure_data_dir()
    if not os.path.exists(filepath):
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(default, f, ensure_ascii=False, indent=2)
        return default
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return default


def save_json(filepath, data):
    ensure_data_dir()
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def generate_id():
    return str(uuid.uuid4())


def success_response(data=None, message=None):
    resp = {"success": True}
    if data is not None:
        resp["data"] = data
    if message:
        resp["message"] = message
    return jsonify(resp)


def error_response(message, status_code=400):
    return jsonify({"success": False, "message": message}), status_code


@app.route('/api/health', methods=['GET'])
def health_check():
    return success_response({"status": "ok", "timestamp": int(time.time())})


@app.route('/api/annotations/<artwork_id>', methods=['GET'])
def get_annotations(artwork_id):
    annotations_store = load_json(ANNOTATIONS_FILE, {})
    annotations = annotations_store.get(artwork_id, [])
    return success_response(annotations)


@app.route('/api/annotations/<artwork_id>', methods=['POST'])
def save_annotations(artwork_id):
    try:
        body = request.get_json(silent=True)
        if not body or 'annotations' not in body:
            return error_response('缺少 annotations 字段')

        annotations = body['annotations']
        if not isinstance(annotations, list):
            return error_response('annotations 必须是数组')

        annotations_store = load_json(ANNOTATIONS_FILE, {})
        annotations_store[artwork_id] = annotations
        save_json(ANNOTATIONS_FILE, annotations_store)

        return success_response({"saved": len(annotations)}, '批注保存成功')
    except Exception as e:
        return error_response(f'保存批注失败: {str(e)}', 500)


@app.route('/api/templates', methods=['GET'])
def list_templates():
    try:
        templates = load_json(TEMPLATES_FILE, [])
        templates_sorted = sorted(
            templates,
            key=lambda t: t.get('updatedAt', 0),
            reverse=True
        )
        return success_response(templates_sorted)
    except Exception as e:
        return error_response(f'获取模板列表失败: {str(e)}', 500)


@app.route('/api/templates', methods=['POST'])
def create_template():
    try:
        body = request.get_json(silent=True)
        if not body:
            return error_response('请求体为空')

        name = body.get('name', '').strip()
        if not name:
            return error_response('模板名称不能为空')

        annotations = body.get('annotations', [])
        if not isinstance(annotations, list):
            return error_response('annotations 必须是数组')

        tags = body.get('tags', [])
        if not isinstance(tags, list):
            if isinstance(tags, str) and tags:
                tags = [t.strip() for t in tags.replace('，', ',').split(',') if t.strip()]
            else:
                tags = []

        now = int(time.time() * 1000)
        template = {
            'id': generate_id(),
            'name': name,
            'tags': [t for t in tags if isinstance(t, str)],
            'annotations': annotations,
            'createdAt': now,
            'updatedAt': now,
        }

        templates = load_json(TEMPLATES_FILE, [])
        templates.append(template)
        save_json(TEMPLATES_FILE, templates)

        return success_response(template, '模板保存成功')
    except Exception as e:
        return error_response(f'保存模板失败: {str(e)}', 500)


@app.route('/api/templates/<template_id>', methods=['GET'])
def get_template(template_id):
    try:
        templates = load_json(TEMPLATES_FILE, [])
        template = next((t for t in templates if t.get('id') == template_id), None)
        if not template:
            return error_response('模板不存在', 404)
        return success_response(template)
    except Exception as e:
        return error_response(f'获取模板详情失败: {str(e)}', 500)


@app.route('/api/templates/<template_id>', methods=['PUT'])
def update_template(template_id):
    try:
        templates = load_json(TEMPLATES_FILE, [])
        idx = next((i for i, t in enumerate(templates) if t.get('id') == template_id), -1)
        if idx == -1:
            return error_response('模板不存在', 404)

        body = request.get_json(silent=True) or {}
        template = templates[idx]

        if 'name' in body:
            name = body['name'].strip() if isinstance(body['name'], str) else ''
            if not name:
                return error_response('模板名称不能为空')
            template['name'] = name

        if 'tags' in body:
            tags = body['tags']
            if isinstance(tags, list):
                template['tags'] = [t for t in tags if isinstance(t, str)]
            elif isinstance(tags, str):
                template['tags'] = [t.strip() for t in tags.replace('，', ',').split(',') if t.strip()]

        if 'annotations' in body and isinstance(body['annotations'], list):
            template['annotations'] = body['annotations']

        template['updatedAt'] = int(time.time() * 1000)
        templates[idx] = template
        save_json(TEMPLATES_FILE, templates)

        return success_response(template, '模板更新成功')
    except Exception as e:
        return error_response(f'更新模板失败: {str(e)}', 500)


@app.route('/api/templates/<template_id>', methods=['DELETE'])
def delete_template_route(template_id):
    try:
        templates = load_json(TEMPLATES_FILE, [])
        idx = next((i for i, t in enumerate(templates) if t.get('id') == template_id), -1)
        if idx == -1:
            return error_response('模板不存在', 404)

        deleted = templates.pop(idx)
        save_json(TEMPLATES_FILE, templates)

        return success_response(None, f'模板 "{deleted.get("name", "")}" 已删除')
    except Exception as e:
        return error_response(f'删除模板失败: {str(e)}', 500)


@app.errorhandler(404)
def not_found(e):
    return error_response('接口不存在', 404)


@app.errorhandler(500)
def server_error(e):
    return error_response(f'服务器内部错误: {str(e)}', 500)


if __name__ == '__main__':
    ensure_data_dir()
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
