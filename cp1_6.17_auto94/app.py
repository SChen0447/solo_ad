from flask import Flask, request, jsonify
from flask_cors import CORS
import json
import os
import uuid
from datetime import datetime, timedelta
from collections import Counter

app = Flask(__name__)
CORS(app)

DATA_DIR = 'data'
FORMS_FILE = os.path.join(DATA_DIR, 'forms.json')
SUBMISSIONS_DIR = os.path.join(DATA_DIR, 'submissions')

os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(SUBMISSIONS_DIR, exist_ok=True)

if not os.path.exists(FORMS_FILE):
    with open(FORMS_FILE, 'w', encoding='utf-8') as f:
        json.dump({}, f, ensure_ascii=False, indent=2)


def load_forms():
    with open(FORMS_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_forms(forms):
    with open(FORMS_FILE, 'w', encoding='utf-8') as f:
        json.dump(forms, f, ensure_ascii=False, indent=2)


def load_submissions(form_id):
    filepath = os.path.join(SUBMISSIONS_DIR, f'{form_id}.json')
    if not os.path.exists(filepath):
        return []
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)


def save_submissions(form_id, submissions):
    filepath = os.path.join(SUBMISSIONS_DIR, f'{form_id}.json')
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(submissions, f, ensure_ascii=False, indent=2)


@app.route('/api/forms', methods=['GET'])
def get_forms():
    forms = load_forms()
    return jsonify(list(forms.values()))


@app.route('/api/forms', methods=['POST'])
def create_form():
    data = request.get_json()
    form_id = data.get('id') or str(uuid.uuid4())[:8]
    forms = load_forms()
    form_data = {
        'id': form_id,
        'title': data.get('title', '未命名表单'),
        'fields': data.get('fields', []),
        'createdAt': datetime.now().isoformat(),
        'updatedAt': datetime.now().isoformat()
    }
    forms[form_id] = form_data
    save_forms(forms)
    return jsonify(form_data), 201


@app.route('/api/forms/<form_id>', methods=['GET'])
def get_form(form_id):
    forms = load_forms()
    if form_id not in forms:
        return jsonify({'error': '表单不存在'}), 404
    return jsonify(forms[form_id])


@app.route('/api/forms/<form_id>', methods=['PUT'])
def update_form(form_id):
    forms = load_forms()
    if form_id not in forms:
        return jsonify({'error': '表单不存在'}), 404
    data = request.get_json()
    forms[form_id]['title'] = data.get('title', forms[form_id]['title'])
    forms[form_id]['fields'] = data.get('fields', forms[form_id]['fields'])
    forms[form_id]['updatedAt'] = datetime.now().isoformat()
    save_forms(forms)
    return jsonify(forms[form_id])


@app.route('/api/forms/<form_id>', methods=['DELETE'])
def delete_form(form_id):
    forms = load_forms()
    if form_id not in forms:
        return jsonify({'error': '表单不存在'}), 404
    del forms[form_id]
    save_forms(forms)
    filepath = os.path.join(SUBMISSIONS_DIR, f'{form_id}.json')
    if os.path.exists(filepath):
        os.remove(filepath)
    return jsonify({'message': '删除成功'})


@app.route('/api/forms/<form_id>/submit', methods=['POST'])
def submit_form(form_id):
    forms = load_forms()
    if form_id not in forms:
        return jsonify({'error': '表单不存在'}), 404
    data = request.get_json()
    submissions = load_submissions(form_id)
    submission = {
        'id': str(uuid.uuid4())[:8],
        'data': data,
        'submittedAt': datetime.now().isoformat()
    }
    submissions.append(submission)
    save_submissions(form_id, submissions)
    return jsonify({'message': '提交成功', 'submission': submission}), 201


@app.route('/api/forms/<form_id>/submissions', methods=['GET'])
def get_submissions(form_id):
    forms = load_forms()
    if form_id not in forms:
        return jsonify({'error': '表单不存在'}), 404
    submissions = load_submissions(form_id)
    return jsonify(submissions)


@app.route('/api/forms/<form_id>/stats', methods=['GET'])
def get_form_stats(form_id):
    forms = load_forms()
    if form_id not in forms:
        return jsonify({'error': '表单不存在'}), 404
    submissions = load_submissions(form_id)
    total = len(submissions)

    today = datetime.now().date()
    today_count = 0
    last_7_days = {}
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        last_7_days[d.strftime('%m-%d')] = 0

    for s in submissions:
        submitted = datetime.fromisoformat(s['submittedAt'])
        if submitted.date() == today:
            today_count += 1
        date_key = submitted.date().strftime('%m-%d')
        if date_key in last_7_days:
            last_7_days[date_key] += 1

    field_distributions = {}
    fields = forms[form_id].get('fields', [])
    choice_fields = [f for f in fields if f.get('type') in ['radio', 'checkbox', 'select', 'rating']]

    for field in choice_fields:
        field_id = field['id']
        counter = Counter()
        for s in submissions:
            value = s['data'].get(field_id)
            if value is not None:
                if isinstance(value, list):
                    for v in value:
                        counter[str(v)] += 1
                else:
                    counter[str(value)] += 1
        field_distributions[field_id] = {
            'label': field.get('label', field_id),
            'data': [{'name': k, 'value': v} for k, v in counter.items()]
        }

    return jsonify({
        'formId': form_id,
        'total': total,
        'todayCount': today_count,
        'last7Days': [{'date': k, 'count': v} for k, v in last_7_days.items()],
        'fieldDistributions': field_distributions
    })


if __name__ == '__main__':
    app.run(port=5000, debug=True)
