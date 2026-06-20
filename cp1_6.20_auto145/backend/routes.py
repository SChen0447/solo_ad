from flask import Blueprint, request, jsonify
from datetime import datetime
import models

bp = Blueprint('survey_routes', __name__)


def _is_expired(survey):
    expires_at = survey.get('expires_at')
    if expires_at:
        try:
            return datetime.now().isoformat() > expires_at
        except Exception:
            return False
    return False


@bp.route('/api/surveys', methods=['POST'])
def create_survey():
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({'error': 'Invalid request body'}), 400
        if not data.get('title'):
            return jsonify({'error': 'Survey title is required'}), 400
        survey = models.create_survey(data)
        return jsonify({'success': True, 'survey': survey}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/surveys', methods=['GET'])
def list_surveys():
    try:
        surveys = models.get_survey_list()
        result = []
        for s in surveys:
            expired = _is_expired(s)
            if expired and s.get('status') == 'active':
                models.update_survey_status(s['id'], 'expired')
                s['status'] = 'expired'
            result.append(s)
        return jsonify({'success': True, 'surveys': result}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/surveys/<survey_id>', methods=['GET'])
def get_survey(survey_id):
    try:
        survey = models.get_survey(survey_id)
        if not survey:
            return jsonify({'error': 'Survey not found'}), 404
        expired = _is_expired(survey)
        if expired and survey.get('status') == 'active':
            survey = models.update_survey_status(survey_id, 'expired')
        return jsonify({'success': True, 'survey': survey}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/surveys/<survey_id>', methods=['DELETE'])
def delete_survey(survey_id):
    try:
        ok = models.delete_survey(survey_id)
        if not ok:
            return jsonify({'error': 'Survey not found'}), 404
        return jsonify({'success': True, 'message': 'Survey deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/surveys/<survey_id>/close', methods=['POST'])
def close_survey(survey_id):
    try:
        survey = models.update_survey_status(survey_id, 'closed')
        if not survey:
            return jsonify({'error': 'Survey not found'}), 404
        return jsonify({'success': True, 'survey': survey}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/surveys/<survey_id>/responses', methods=['POST'])
def submit_response(survey_id):
    try:
        data = request.get_json(force=True)
        if not data or 'answers' not in data:
            return jsonify({'error': 'Answers are required'}), 400
        survey = models.get_survey(survey_id)
        if not survey:
            return jsonify({'error': 'Survey not found'}), 404
        if survey.get('status') != 'active':
            return jsonify({'error': 'Survey is not active', 'status': survey.get('status')}), 410
        if _is_expired(survey):
            models.update_survey_status(survey_id, 'expired')
            return jsonify({'error': 'Survey has expired', 'status': 'expired'}), 410

        answers = data.get('answers', {})
        for q in survey.get('questions', []):
            qid = q.get('id')
            required = q.get('required', False)
            ans = answers.get(qid)
            if required and (ans is None or ans == '' or (isinstance(ans, list) and len(ans) == 0)):
                return jsonify({'error': f'Required question not answered: {qid}'}), 400

        response = models.add_response(survey_id, data)
        if not response:
            return jsonify({'error': 'Failed to submit response'}), 500

        return jsonify({'success': True, 'response': response}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/surveys/<survey_id>/stats', methods=['GET'])
def get_stats(survey_id):
    try:
        survey = models.get_survey(survey_id)
        if not survey:
            return jsonify({'error': 'Survey not found'}), 404
        stats = models.compute_stats(survey_id)
        if not stats:
            return jsonify({'error': 'Failed to compute stats'}), 500
        stats['survey_status'] = survey.get('status', 'unknown')
        return jsonify({'success': True, 'stats': stats}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@bp.route('/api/surveys/<survey_id>/responses', methods=['GET'])
def list_responses(survey_id):
    try:
        survey = models.get_survey(survey_id)
        if not survey:
            return jsonify({'error': 'Survey not found'}), 404
        responses = models.get_responses(survey_id)
        return jsonify({'success': True, 'responses': responses}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500
