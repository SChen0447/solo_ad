from flask import Blueprint, request, jsonify
from database.db import get_db_connection

admin_bp = Blueprint('admin', __name__, url_prefix='/api')


@admin_bp.route('/admin/stats', methods=['GET'])
def get_admin_stats():
    department = request.args.get('department')

    with get_db_connection() as conn:
        cursor = conn.cursor()

        user_condition = ''
        params = []

        if department:
            user_condition = ' WHERE u.department_id = (SELECT id FROM departments WHERE name = ?)'
            params.append(department)

        cursor.execute(f'''
            SELECT
                COUNT(DISTINCT s.id) as total_sessions,
                SUM(CASE WHEN s.is_finished = 1 THEN 1 ELSE 0 END) as finished_sessions,
                AVG(CASE WHEN s.is_finished = 1 THEN CAST(s.score AS FLOAT) / s.total_questions ELSE NULL END) as avg_accuracy
            FROM quiz_sessions s
            JOIN users u ON s.user_id = u.id
            {user_condition}
        ''', params)
        row = cursor.fetchone()

        completion_rate = 0
        avg_accuracy = 0
        if row['total_sessions'] > 0:
            completion_rate = row['finished_sessions'] / row['total_sessions']
        if row['avg_accuracy'] is not None:
            avg_accuracy = row['avg_accuracy']

        difficulty_query = f'''
            SELECT q.difficulty, COUNT(*) as count
            FROM answers a
            JOIN questions q ON a.question_id = q.id
            JOIN quiz_sessions s ON a.session_id = s.id
            JOIN users u ON s.user_id = u.id
            {user_condition}
            GROUP BY q.difficulty
        '''
        cursor.execute(difficulty_query, params)
        diff_rows = cursor.fetchall()
        difficulty_distribution = {'easy': 0, 'medium': 0, 'hard': 0}
        for r in diff_rows:
            difficulty_distribution[r['difficulty']] = r['count']

        return jsonify({
            'completionRate': completion_rate,
            'avgAccuracy': avg_accuracy,
            'difficultyDistribution': difficulty_distribution
        })


@admin_bp.route('/departments', methods=['GET'])
def get_departments():
    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute('SELECT id, name FROM departments ORDER BY id')
        rows = cursor.fetchall()
        departments = [{'id': row['id'], 'name': row['name']} for row in rows]
        return jsonify(departments)
