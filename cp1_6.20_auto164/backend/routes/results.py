import json
from flask import Blueprint, request, jsonify
from database.db import get_db_connection, row_to_dict, rows_to_list

results_bp = Blueprint('results', __name__, url_prefix='/api')


@results_bp.route('/results/<session_id>', methods=['GET'])
def get_results(session_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute('SELECT * FROM quiz_sessions WHERE id = ?', (session_id,))
        session = row_to_dict(cursor.fetchone())
        if not session:
            return jsonify({'error': 'Session not found'}), 404

        cursor.execute(
            '''SELECT a.*, q.content, q.option_a, q.option_b, q.option_c, q.option_d,
               q.correct_answer, q.tags, q.explanation, q.review_suggestion
               FROM answers a
               JOIN questions q ON a.question_id = q.id
               WHERE a.session_id = ? AND a.is_correct = 0
               ORDER BY a.answered_at''',
            (session_id,)
        )
        wrong_rows = cursor.fetchall()
        wrong_answers = []
        tag_counts = {}
        all_tags_set = set()

        for row in wrong_rows:
            q = dict(row)
            tags = json.loads(q['tags']) if q['tags'] else []
            wrong_answers.append({
                'id': q['question_id'],
                'content': q['content'],
                'options': [q['option_a'], q['option_b'], q['option_c'], q['option_d']],
                'correctAnswer': q['correct_answer'],
                'userAnswer': q['user_answer'],
                'difficulty': q['difficulty'],
                'tags': tags,
                'explanation': q['explanation'],
                'reviewSuggestion': q['review_suggestion'],
                'answeredAt': q['answered_at']
            })
            for tag in tags:
                tag_counts[tag] = tag_counts.get(tag, 0) + 1

        cursor.execute(
            '''SELECT q.tags FROM answers a
               JOIN questions q ON a.question_id = q.id
               WHERE a.session_id = ?''',
            (session_id,)
        )
        all_question_tags = cursor.fetchall()
        for row in all_question_tags:
            tags = json.loads(row['tags']) if row['tags'] else []
            for tag in tags:
                all_tags_set.add(tag)

        tags_stats = []
        cursor.execute('SELECT COUNT(*) as total FROM answers WHERE session_id = ?', (session_id,))
        total_answers = cursor.fetchone()[0]

        for tag in all_tags_set:
            total_count = 0
            wrong_count = tag_counts.get(tag, 0)

            cursor.execute(
                '''SELECT COUNT(*) FROM answers a
                   JOIN questions q ON a.question_id = q.id
                   WHERE a.session_id = ? AND q.tags LIKE ?''',
                (session_id, f'%{tag}%')
            )
            total_count = cursor.fetchone()[0]

            tags_stats.append({
                'tag': tag,
                'totalCount': total_count,
                'wrongCount': wrong_count,
                'wrongRate': wrong_count / total_count if total_count > 0 else 0
            })

        tags_stats.sort(key=lambda x: x['wrongRate'], reverse=True)

        score = session['score'] or 0

        return jsonify({
            'sessionId': session_id,
            'score': score,
            'total': session['total_questions'],
            'accuracy': score / session['total_questions'] if session['total_questions'] > 0 else 0,
            'wrongAnswers': wrong_answers,
            'tags': tags_stats
        })


@results_bp.route('/wrong-answers/<int:user_id>', methods=['GET'])
def get_user_wrong_answers(user_id):
    tag = request.args.get('tag')

    with get_db_connection() as conn:
        cursor = conn.cursor()

        query = '''
            SELECT DISTINCT a.question_id, a.user_answer, a.answered_at,
                   q.content, q.option_a, q.option_b, q.option_c, q.option_d,
                   q.correct_answer, q.tags, q.explanation, q.review_suggestion, q.difficulty
            FROM answers a
            JOIN questions q ON a.question_id = q.id
            JOIN quiz_sessions s ON a.session_id = s.id
            WHERE s.user_id = ? AND a.is_correct = 0
        '''
        params = [user_id]

        if tag:
            query += ' AND q.tags LIKE ?'
            params.append(f'%{tag}%')

        query += ' ORDER BY a.answered_at DESC'

        cursor.execute(query, params)
        rows = cursor.fetchall()
        questions = []
        tag_counts = {}
        all_tag_totals = {}

        for row in rows:
            q = dict(row)
            tags = json.loads(q['tags']) if q['tags'] else []
            questions.append({
                'id': q['question_id'],
                'content': q['content'],
                'options': [q['option_a'], q['option_b'], q['option_c'], q['option_d']],
                'correctAnswer': q['correct_answer'],
                'userAnswer': q['user_answer'],
                'difficulty': q['difficulty'],
                'tags': tags,
                'explanation': q['explanation'],
                'reviewSuggestion': q['review_suggestion'],
                'answeredAt': q['answered_at']
            })
            for t in tags:
                tag_counts[t] = tag_counts.get(t, 0) + 1

        total_query = '''
            SELECT q.tags FROM answers a
            JOIN questions q ON a.question_id = q.id
            JOIN quiz_sessions s ON a.session_id = s.id
            WHERE s.user_id = ?
        '''
        cursor.execute(total_query, [user_id])
        all_rows = cursor.fetchall()
        for row in all_rows:
            tags = json.loads(row['tags']) if row['tags'] else []
            for t in tags:
                all_tag_totals[t] = all_tag_totals.get(t, 0) + 1

        tags_stats = []
        for tag_name, wrong_count in tag_counts.items():
            total_count = all_tag_totals.get(tag_name, 0)
            tags_stats.append({
                'tag': tag_name,
                'totalCount': total_count,
                'wrongCount': wrong_count,
                'wrongRate': wrong_count / total_count if total_count > 0 else 0
            })

        tags_stats.sort(key=lambda x: x['wrongRate'], reverse=True)

        return jsonify({
            'questions': questions,
            'tags': tags_stats
        })
