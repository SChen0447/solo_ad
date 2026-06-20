import uuid
import json
import os
from datetime import datetime
from typing import Dict, List, Any, Optional

DATA_FILE = os.path.join(os.path.dirname(__file__), 'data.json')


def _load_data() -> Dict[str, Any]:
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            return {'surveys': {}, 'responses': {}}
    return {'surveys': {}, 'responses': {}}


def _save_data(data: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def generate_id() -> str:
    return str(uuid.uuid4())[:8]


def create_survey(survey_data: Dict[str, Any]) -> Dict[str, Any]:
    data = _load_data()
    survey_id = generate_id()
    now = datetime.now().isoformat()
    survey = {
        'id': survey_id,
        'title': survey_data.get('title', {'zh': '未命名问卷', 'en': 'Untitled Survey'}),
        'description': survey_data.get('description', {'zh': '', 'en': ''}),
        'questions': survey_data.get('questions', []),
        'status': 'active',
        'created_at': now,
        'updated_at': now,
        'expires_at': survey_data.get('expires_at', None)
    }
    data['surveys'][survey_id] = survey
    data['responses'][survey_id] = []
    _save_data(data)
    return survey


def get_survey_list() -> List[Dict[str, Any]]:
    data = _load_data()
    surveys = list(data['surveys'].values())
    surveys.sort(key=lambda s: s.get('created_at', ''), reverse=True)
    for s in surveys:
        s['response_count'] = len(data['responses'].get(s['id'], []))
    return surveys


def get_survey(survey_id: str) -> Optional[Dict[str, Any]]:
    data = _load_data()
    survey = data['surveys'].get(survey_id)
    if survey:
        survey = dict(survey)
        survey['response_count'] = len(data['responses'].get(survey_id, []))
    return survey


def delete_survey(survey_id: str) -> bool:
    data = _load_data()
    if survey_id in data['surveys']:
        del data['surveys'][survey_id]
        if survey_id in data['responses']:
            del data['responses'][survey_id]
        _save_data(data)
        return True
    return False


def update_survey_status(survey_id: str, status: str) -> Optional[Dict[str, Any]]:
    data = _load_data()
    if survey_id in data['surveys']:
        data['surveys'][survey_id]['status'] = status
        data['surveys'][survey_id]['updated_at'] = datetime.now().isoformat()
        _save_data(data)
        return data['surveys'][survey_id]
    return None


def add_response(survey_id: str, response_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    data = _load_data()
    if survey_id not in data['surveys']:
        return None
    survey = data['surveys'][survey_id]
    if survey.get('status') != 'active':
        return None
    response = {
        'id': generate_id(),
        'survey_id': survey_id,
        'answers': response_data.get('answers', {}),
        'respondent': response_data.get('respondent', '匿名 / Anonymous'),
        'submitted_at': datetime.now().isoformat()
    }
    data['responses'][survey_id].append(response)
    _save_data(data)
    return response


def get_responses(survey_id: str) -> List[Dict[str, Any]]:
    data = _load_data()
    return data['responses'].get(survey_id, [])


def compute_stats(survey_id: str) -> Optional[Dict[str, Any]]:
    data = _load_data()
    survey = data['surveys'].get(survey_id)
    if not survey:
        return None
    responses = data['responses'].get(survey_id, [])
    questions = survey.get('questions', [])

    stats = {
        'survey_id': survey_id,
        'total_responses': len(responses),
        'question_stats': {},
        'submitted_at_list': [r.get('submitted_at', '') for r in responses]
    }

    for q in questions:
        qid = q.get('id')
        qtype = q.get('type')
        stats['question_stats'][qid] = {
            'type': qtype,
            'title': q.get('title', {'zh': '', 'en': ''}),
            'required': q.get('required', False),
            'response_count': 0,
            'data': {}
        }
        qstat = stats['question_stats'][qid]

        if qtype in ('single_choice', 'multiple_choice'):
            options = q.get('options', [])
            for opt in options:
                opt_id = opt.get('id')
                label_zh = opt.get('label', {}).get('zh', '')
                label_en = opt.get('label', {}).get('en', '')
                qstat['data'][opt_id] = {
                    'count': 0,
                    'label': {'zh': label_zh, 'en': label_en}
                }
            for r in responses:
                ans = r.get('answers', {}).get(qid)
                if ans is not None and ans != '':
                    qstat['response_count'] += 1
                    if qtype == 'single_choice':
                        if ans in qstat['data']:
                            qstat['data'][ans]['count'] += 1
                    else:
                        if isinstance(ans, list):
                            for a in ans:
                                if a in qstat['data']:
                                    qstat['data'][a]['count'] += 1

        elif qtype == 'rating':
            max_rating = int(q.get('maxRating', 5))
            for i in range(1, max_rating + 1):
                qstat['data'][str(i)] = {
                    'count': 0,
                    'label': {'zh': f'{i}星', 'en': f'{i} Stars'}
                }
            total = 0
            count = 0
            for r in responses:
                ans = r.get('answers', {}).get(qid)
                if ans is not None and ans != '' and isinstance(ans, (int, float)):
                    qstat['response_count'] += 1
                    key = str(int(ans))
                    if key in qstat['data']:
                        qstat['data'][key]['count'] += 1
                    total += ans
                    count += 1
            qstat['average'] = round(total / count, 2) if count > 0 else 0

        elif qtype == 'text':
            qstat['data']['texts'] = []
            for r in responses:
                ans = r.get('answers', {}).get(qid)
                if ans is not None and ans != '':
                    qstat['response_count'] += 1
                    qstat['data']['texts'].append({
                        'content': str(ans),
                        'submitted_at': r.get('submitted_at', '')
                    })

    return stats
