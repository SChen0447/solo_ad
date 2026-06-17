from flask import Flask, request, jsonify, g
from flask_cors import CORS
import sqlite3
import os

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'docs.db')

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DB_PATH)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

@app.route('/api/docs/search', methods=['GET'])
def search_docs():
    query = request.args.get('q', '').strip().lower()
    tech = request.args.get('tech', '')

    db = get_db()
    cursor = db.cursor()

    sql = 'SELECT id, tech_stack, title, description, code_snippet FROM docs WHERE 1=1'
    params = []

    if tech:
        tech_list = [t.strip() for t in tech.split(',') if t.strip()]
        if tech_list:
            placeholders = ','.join(['?'] * len(tech_list))
            sql += f' AND tech_stack IN ({placeholders})'
            params.extend(tech_list)

    if query:
        sql += ' AND (LOWER(title) LIKE ? OR LOWER(description) LIKE ? OR LOWER(code_snippet) LIKE ?)'
        like_query = f'%{query}%'
        params.extend([like_query, like_query, like_query])
        sql += ' ORDER BY CASE WHEN LOWER(title) LIKE ? THEN 0 WHEN LOWER(description) LIKE ? THEN 1 ELSE 2 END'
        params.extend([f'%{query}%', f'%{query}%'])
    else:
        sql += ' ORDER BY tech_stack, title'

    cursor.execute(sql, params)
    rows = cursor.fetchall()

    results = []
    for row in rows:
        results.append({
            'id': row['id'],
            'techStack': row['tech_stack'],
            'title': row['title'],
            'description': row['description'],
            'codeSnippet': row['code_snippet']
        })

    return jsonify({'data': results, 'total': len(results)})

@app.route('/api/docs/detail', methods=['GET'])
def get_doc_detail():
    doc_id = request.args.get('id', '')

    if not doc_id:
        return jsonify({'error': 'Missing id parameter'}), 400

    try:
        doc_id_int = int(doc_id)
    except ValueError:
        return jsonify({'error': 'Invalid id parameter'}), 400

    db = get_db()
    cursor = db.cursor()
    cursor.execute(
        'SELECT id, tech_stack, title, description, code_snippet FROM docs WHERE id = ?',
        (doc_id_int,)
    )
    row = cursor.fetchone()

    if not row:
        return jsonify({'error': 'Document not found'}), 404

    result = {
        'id': row['id'],
        'techStack': row['tech_stack'],
        'title': row['title'],
        'description': row['description'],
        'codeSnippet': row['code_snippet']
    }

    return jsonify({'data': result})

@app.cli.command('init-db')
def init_db_command():
    from init_db import init_db
    init_db()
    print('Initialized the database.')

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
