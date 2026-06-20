import uuid
from flask import Blueprint, request, jsonify
from database.db import get_db_connection, row_to_dict
from services.adaptive_engine import (
    get_next_difficulty, get_random_question,
    get_answered_question_ids, format_question_response
)

quiz_bp = Blueprint('quiz', __name__, url_prefix='/api/quiz')


@quiz_bp.route('/start', methods=['POST'])
def start_quiz():
    data = request.get_json()
    user_id = data.get('userId', 1)
    total_questions = data.get('totalQuestions', 10)
    session_id = str(uuid.uuid4())

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            '''INSERT INTO quiz_sessions (id, user_id, total_questions)
               VALUES (?, ?, ?)''',
            (session_id, user_id, total_questions)
        )

        first_question = get_random_question('easy', [])

        return jsonify({
            'sessionId': session_id,
            'firstQuestion': format_question_response(first_question),
            'totalQuestions': total_questions,
            'currentDifficulty': 'easy'
        })


@quiz_bp.route('/next', methods=['POST'])
def next_question():
    data = request.get_json()
    session_id = data['sessionId']
    question_id = data['questionId']
    user_answer = data['answer']

    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM quiz_sessions WHERE id = ?', (session_id,))
        session = row_to_dict(cursor.fetchone())
        if not session:
            return jsonify({'error': 'Session not found'}), 404

        cursor.execute('SELECT * FROM questions WHERE id = ?', (question_id,))
        question = row_to_dict(cursor.fetchone())
        if not question:
            return jsonify({'error': 'Question not found'}), 404

        is_correct = user_answer == question['correct_answer']

        cursor.execute(
            '''INSERT INTO answers (session_id, question_id, user_answer, is_correct, difficulty)
               VALUES (?, ?, ?, ?, ?)''',
            (session_id, question_id, user_answer, 1 if is_correct else 0, question['difficulty'])
        )

        answered_ids = get_answered_question_ids(session_id)
        current_index = len(answered_ids)

        if current_index >= session['total_questions']:
            cursor.execute(
                '''UPDATE quiz_sessions SET is_finished=1, finished_at=CURRENT_TIMESTAMP,
                   score=(SELECT COUNT(*) FROM answers WHERE session_id=? AND is_correct=1)
                   WHERE id=?''',
                (session_id, session_id)
            )
            return jsonify({
                'isFinished': True,
                'isCorrect': is_correct,
                'score': session.get('score', 0) + (1 if is_correct else 0),
                'total': session['total_questions'],
                'nextQuestion': None
            })

        difficulty_result = get_next_difficulty(
            session['current_difficulty'],
            session['consecutive_correct'],
            session['consecutive_hard_wrong'],
            is_correct
        )

        next_question = get_random_question(
            difficulty_result['difficulty'],
            answered_ids
        )

        if not next_question:
            cursor.execute(
                '''UPDATE quiz_sessions SET is_finished=1, finished_at=CURRENT_TIMESTAMP,
                   score=(SELECT COUNT(*) FROM answers WHERE session_id=? AND is_correct=1)
                   WHERE id=?''',
                (session_id, session_id)
            )
            return jsonify({
                'isFinished': True,
                'isCorrect': is_correct,
                'score': session.get('score', 0) + (1 if is_correct else 0),
                'total': session['total_questions'],
                'nextQuestion': None
            })

        cursor.execute(
            '''UPDATE quiz_sessions SET current_difficulty=?, consecutive_correct=?,
               consecutive_hard_wrong=?, current_question_index=?
               WHERE id=?''',
            (
                difficulty_result['difficulty'],
                difficulty_result['consecutive_correct'],
                difficulty_result['consecutive_hard_wrong'],
                current_index,
                session_id
            )
        )

        return jsonify({
            'isFinished': False,
            'isCorrect': is_correct,
            'currentDifficulty': difficulty_result['difficulty'],
            'nextQuestion': format_question_response(next_question),
            'answeredCount': current_index
        })


@quiz_bp.route('/<session_id>', methods=['GET'])
def get_session(session_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM quiz_sessions WHERE id = ?', (session_id,))
        session = row_to_dict(cursor.fetchone())
        if not session:
            return jsonify({'error': 'Session not found'}), 404

        cursor.execute(
            '''SELECT * FROM answers WHERE session_id = ? ORDER BY answered_at''',
            (session_id,)
        )
        answers = [dict(row) for row in cursor.fetchall()]

        return jsonify({
            'progress': session['current_question_index'],
            'currentDifficulty': session['current_difficulty'],
            'answers': answers,
            'isFinished': bool(session['is_finished']),
            'score': session['score']
        })
