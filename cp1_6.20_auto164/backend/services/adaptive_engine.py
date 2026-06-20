import random
from database.db import get_db_connection, rows_to_list, row_to_dict

DIFFICULTY_LEVELS = ['easy', 'medium', 'hard']
THRESHOLD_UP = 3
THRESHOLD_HARD_WRONG_DOWN = 2


def get_next_difficulty(current_difficulty, consecutive_correct, consecutive_hard_wrong, is_correct):
    new_consecutive_correct = consecutive_correct + 1 if is_correct else 0

    if current_difficulty == 'hard' and not is_correct:
        new_consecutive_hard_wrong = consecutive_hard_wrong + 1
    else:
        new_consecutive_hard_wrong = 0

    new_difficulty = current_difficulty
    current_index = DIFFICULTY_LEVELS.index(current_difficulty)

    if new_consecutive_correct >= THRESHOLD_UP and current_index < len(DIFFICULTY_LEVELS) - 1:
        new_difficulty = DIFFICULTY_LEVELS[current_index + 1]
        new_consecutive_correct = 0

    if current_difficulty == 'hard' and new_consecutive_hard_wrong >= THRESHOLD_HARD_WRONG_DOWN:
        new_difficulty = 'medium'
        new_consecutive_hard_wrong = 0

    return {
        'difficulty': new_difficulty,
        'consecutive_correct': new_consecutive_correct,
        'consecutive_hard_wrong': new_consecutive_hard_wrong
    }


def get_random_question(difficulty, answered_ids):
    with get_db_connection() as conn:
        cursor = conn.cursor()

        placeholders = ','.join(['?'] * len(answered_ids)) if answered_ids else ''
        if placeholders:
            query = f'''
                SELECT * FROM questions
                WHERE difficulty = ? AND id NOT IN ({placeholders})
                ORDER BY RANDOM()
                LIMIT 1
            '''
            params = [difficulty] + answered_ids
        else:
            query = '''
                SELECT * FROM questions
                WHERE difficulty = ?
                ORDER BY RANDOM()
                LIMIT 1
            '''
            params = [difficulty]

        cursor.execute(query, params)
        row = cursor.fetchone()
        return row_to_dict(row)


def get_answered_question_ids(session_id):
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT question_id FROM answers WHERE session_id = ?', (session_id,))
        rows = cursor.fetchall()
        return [row[0] for row in rows]


def format_question_response(question):
    if not question:
        return None
    return {
        'id': question['id'],
        'content': question['content'],
        'options': [
            question['option_a'],
            question['option_b'],
            question['option_c'],
            question['option_d']
        ],
        'difficulty': question['difficulty'],
        'tags': question.get('tags', [])
    }
