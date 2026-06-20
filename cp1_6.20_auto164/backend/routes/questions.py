import json
from flask import Blueprint, request, jsonify
from database.db import get_db_connection, row_to_dict, rows_to_list

questions_bp = Blueprint('questions', __name__, url_prefix='/api/questions')


@questions_bp.route('', methods=['GET'])
def get_questions():
    difficulty = request.args.get('difficulty')
    tag = request.args.get('tag')
    page = int(request.args.get('page', 1))
    page_size = int(request.args.get('pageSize', 20))

    with get_db_connection() as conn:
        cursor = conn.cursor()

        conditions = []
        params = []

        if difficulty:
            conditions.append('difficulty = ?')
            params.append(difficulty)

        where_clause = ''
        if conditions:
            where_clause = ' WHERE ' + ' AND '.join(conditions)

        count_query = f'SELECT COUNT(*) as total FROM questions{where_clause}'
        cursor.execute(count_query, params)
        total = cursor.fetchone()[0]

        offset = (page - 1) * page_size
        query = f'SELECT * FROM questions{where_clause} ORDER BY id DESC LIMIT ? OFFSET ?'
        params.extend([page_size, offset])
        cursor.execute(query, params)
        rows = cursor.fetchall()
        questions = rows_to_list(rows)

        if tag:
            filtered = []
            for q in questions:
                if tag in q.get('tags', []):
                    filtered.append(q)
            questions = filtered
            total = len(filtered)

        return jsonify({
            'total': total,
            'questions': questions
        })


@questions_bp.route('/<int:question_id>', methods=['GET'])
def get_question(question_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM questions WHERE id = ?', (question_id,))
        row = cursor.fetchone()
        question = row_to_dict(row)
        if question:
            return jsonify(question)
        return jsonify({'error': 'Question not found'}), 404


@questions_bp.route('', methods=['POST'])
def create_question():
    data = request.get_json()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            '''INSERT INTO questions (content, option_a, option_b, option_c, option_d,
               correct_answer, difficulty, tags, explanation, review_suggestion)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (
                data['content'],
                data['options'][0],
                data['options'][1],
                data['options'][2],
                data['options'][3],
                data['correctAnswer'],
                data['difficulty'],
                json.dumps(data.get('tags', [])),
                data.get('explanation', ''),
                data.get('reviewSuggestion', '')
            )
        )
        question_id = cursor.lastrowid
        return jsonify({'id': question_id, 'success': True})


@questions_bp.route('/<int:question_id>', methods=['PUT'])
def update_question(question_id):
    data = request.get_json()

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute(
            '''UPDATE questions SET content=?, option_a=?, option_b=?, option_c=?, option_d=?,
               correct_answer=?, difficulty=?, tags=?, explanation=?, review_suggestion=?
               WHERE id=?''',
            (
                data['content'],
                data['options'][0],
                data['options'][1],
                data['options'][2],
                data['options'][3],
                data['correctAnswer'],
                data['difficulty'],
                json.dumps(data.get('tags', [])),
                data.get('explanation', ''),
                data.get('reviewSuggestion', ''),
                question_id
            )
        )
        return jsonify({'success': True})


@questions_bp.route('/<int:question_id>', methods=['DELETE'])
def delete_question(question_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('DELETE FROM questions WHERE id = ?', (question_id,))
        return jsonify({'success': True})


@questions_bp.route('/batch', methods=['POST'])
def batch_import():
    data = request.get_json()
    questions = data.get('questions', [])

    with get_db_connection() as conn:
        cursor = conn.cursor()
        for q in questions:
            cursor.execute(
                '''INSERT INTO questions (content, option_a, option_b, option_c, option_d,
                   correct_answer, difficulty, tags, explanation, review_suggestion)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (
                    q['content'],
                    q['options'][0],
                    q['options'][1],
                    q['options'][2],
                    q['options'][3],
                    q['correctAnswer'],
                    q['difficulty'],
                    json.dumps(q.get('tags', [])),
                    q.get('explanation', ''),
                    q.get('reviewSuggestion', '')
                )
            )
        return jsonify({'count': len(questions), 'success': True})
