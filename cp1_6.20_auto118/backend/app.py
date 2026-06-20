from flask import Flask, request, jsonify, g
from flask_cors import CORS
import sqlite3
import json
import random
import os
import hashlib
from datetime import datetime
from collections import defaultdict

app = Flask(__name__)
CORS(app)

DATABASE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'exam.db')


def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def init_db():
    conn = sqlite3.connect(DATABASE)
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS question_banks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        subject TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (created_by) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bank_id INTEGER NOT NULL,
        type TEXT NOT NULL,
        content TEXT NOT NULL,
        options TEXT,
        answer TEXT NOT NULL,
        explanation TEXT,
        score INTEGER NOT NULL DEFAULT 5,
        difficulty TEXT NOT NULL,
        knowledge_tags TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (bank_id) REFERENCES question_banks(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS exams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        questions TEXT NOT NULL,
        answers TEXT,
        score REAL,
        total_score REAL,
        submitted INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        submitted_at TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS answer_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        user_answer TEXT,
        is_correct INTEGER NOT NULL,
        knowledge_tags TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (question_id) REFERENCES questions(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS practice_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        user_answer TEXT,
        is_correct INTEGER NOT NULL,
        knowledge_tags TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (question_id) REFERENCES questions(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS wrong_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        question_id INTEGER NOT NULL,
        knowledge_tags TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (question_id) REFERENCES questions(id),
        UNIQUE(user_id, question_id)
    )''')

    conn.commit()

    c.execute("SELECT COUNT(*) FROM users WHERE username = 'admin'")
    if c.fetchone()[0] == 0:
        c.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                  ('admin', hashlib.sha256('admin123'.encode()).hexdigest(), 'teacher'))
        c.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                  ('student1', hashlib.sha256('student123'.encode()).hexdigest(), 'student'))
        conn.commit()

    conn.close()


def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    return d


def query_db(query, args=(), one=False):
    cur = get_db().execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv


def execute_db(query, args=()):
    db = get_db()
    cur = db.execute(query, args)
    db.commit()
    return cur.lastrowid


def parse_json_field(field):
    if field is None or field == '':
        return []
    if isinstance(field, (list, dict)):
        return field
    try:
        return json.loads(field)
    except (json.JSONDecodeError, TypeError):
        return []


def get_weak_knowledge_tags(user_id):
    records = query_db(
        "SELECT knowledge_tags, is_correct FROM answer_records WHERE user_id = ? "
        "UNION ALL SELECT knowledge_tags, is_correct FROM practice_records WHERE user_id = ?",
        (user_id, user_id)
    )
    tag_stats = defaultdict(lambda: {"total": 0, "wrong": 0})
    for r in records:
        tags = parse_json_field(r["knowledge_tags"])
        for tag in tags:
            tag_stats[tag]["total"] += 1
            if not r["is_correct"]:
                tag_stats[tag]["wrong"] += 1
    weak_tags = []
    for tag, stats in tag_stats.items():
        if stats["total"] > 0:
            error_rate = stats["wrong"] / stats["total"]
            if error_rate > 0.6:
                weak_tags.append({"tag": tag, "error_rate": error_rate})
    weak_tags.sort(key=lambda x: x["error_rate"], reverse=True)
    return [wt["tag"] for wt in weak_tags], tag_stats


def select_questions_by_criteria(all_questions, count, difficulty_dist, weak_tags):
    weak_set = set(weak_tags) if weak_tags else set()
    weak_count = max(int(count * 0.6), 0)
    other_count = count - weak_count

    weak_pool = [q for q in all_questions if weak_set & set(parse_json_field(q["knowledge_tags"]))]
    other_pool = [q for q in all_questions if not (weak_set & set(parse_json_field(q["knowledge_tags"])))]

    if len(weak_pool) < weak_count:
        diff = weak_count - len(weak_pool)
        weak_count = len(weak_pool)
        other_count += diff

    selected_weak = []
    selected_other = []

    for diff_lvl, pct in difficulty_dist.items():
        target_weak = int(weak_count * pct)
        target_other = int(other_count * pct)
        diff_weak = [q for q in weak_pool if q["difficulty"] == diff_lvl and q not in selected_weak]
        diff_other = [q for q in other_pool if q["difficulty"] == diff_lvl and q not in selected_other]
        random.shuffle(diff_weak)
        random.shuffle(diff_other)
        selected_weak.extend(diff_weak[:target_weak])
        selected_other.extend(diff_other[:target_other])

    needed = count - len(selected_weak) - len(selected_other)
    if needed > 0:
        remaining = [q for q in all_questions if q not in selected_weak and q not in selected_other]
        random.shuffle(remaining)
        selected_weak.extend(remaining[:needed])

    result = selected_weak + selected_other
    random.shuffle(result)
    return result[:count]


def grade_question(question, user_answer):
    q_type = question["type"]
    correct_answer = question["answer"]
    if q_type == "single":
        return 1 if user_answer == correct_answer else 0
    elif q_type == "multiple":
        correct = set(parse_json_field(correct_answer))
        user = set(parse_json_field(user_answer))
        return 1 if correct == user else 0
    elif q_type == "fill":
        corrects = parse_json_field(correct_answer)
        if not isinstance(corrects, list):
            corrects = [correct_answer]
        return 1 if user_answer in corrects else 0
    return 0


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')
    hashed = hashlib.sha256(password.encode()).hexdigest()
    user = query_db("SELECT * FROM users WHERE username = ? AND password = ?",
                    (username, hashed), one=True)
    if user:
        return jsonify({
            "success": True,
            "user": {
                "id": user["id"],
                "username": user["username"],
                "role": user["role"]
            }
        })
    return jsonify({"success": False, "message": "用户名或密码错误"}), 401


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')
    role = data.get('role', 'student')
    if not username or not password:
        return jsonify({"success": False, "message": "用户名和密码不能为空"}), 400
    hashed = hashlib.sha256(password.encode()).hexdigest()
    try:
        uid = execute_db("INSERT INTO users (username, password, role) VALUES (?, ?, ?)",
                         (username, hashed, role))
        return jsonify({"success": True, "user": {"id": uid, "username": username, "role": role}})
    except sqlite3.IntegrityError:
        return jsonify({"success": False, "message": "用户名已存在"}), 400


@app.route('/api/banks', methods=['GET'])
def get_banks():
    banks = query_db("SELECT * FROM question_banks ORDER BY created_at DESC")
    result = []
    for b in banks:
        qs = query_db("SELECT * FROM questions WHERE bank_id = ?", (b["id"],))
        total = len(qs)
        diff_map = {"简单": 1, "中等": 2, "困难": 3}
        avg_diff = 0
        if total > 0:
            avg_diff = sum(diff_map.get(q["difficulty"], 2) for q in qs) / total
        avg_label = "简单" if avg_diff < 1.5 else ("中等" if avg_diff < 2.5 else "困难")
        result.append({
            "id": b["id"],
            "name": b["name"],
            "subject": b["subject"],
            "difficulty": b["difficulty"],
            "created_by": b["created_by"],
            "total_questions": total,
            "avg_difficulty": avg_label,
            "created_at": b["created_at"]
        })
    return jsonify(result)


@app.route('/api/banks', methods=['POST'])
def create_bank():
    data = request.get_json()
    name = data.get('name', '')
    subject = data.get('subject', '')
    difficulty = data.get('difficulty', '中等')
    created_by = data.get('created_by', 1)
    if not name or not subject:
        return jsonify({"success": False, "message": "名称和科目不能为空"}), 400
    bid = execute_db("INSERT INTO question_banks (name, subject, difficulty, created_by) VALUES (?, ?, ?, ?)",
                     (name, subject, difficulty, created_by))
    return jsonify({"success": True, "id": bid})


@app.route('/api/banks/<int:bank_id>', methods=['DELETE'])
def delete_bank(bank_id):
    execute_db("DELETE FROM questions WHERE bank_id = ?", (bank_id,))
    execute_db("DELETE FROM question_banks WHERE id = ?", (bank_id,))
    return jsonify({"success": True})


@app.route('/api/banks/<int:bank_id>/questions', methods=['GET'])
def get_bank_questions(bank_id):
    qs = query_db("SELECT * FROM questions WHERE bank_id = ? ORDER BY created_at DESC", (bank_id,))
    result = []
    for q in qs:
        result.append({
            "id": q["id"],
            "bank_id": q["bank_id"],
            "type": q["type"],
            "content": q["content"],
            "options": parse_json_field(q["options"]),
            "answer": parse_json_field(q["answer"]) if q["type"] in ("multiple", "fill") else q["answer"],
            "explanation": q["explanation"],
            "score": q["score"],
            "difficulty": q["difficulty"],
            "knowledge_tags": parse_json_field(q["knowledge_tags"]),
            "created_at": q["created_at"]
        })
    return jsonify(result)


@app.route('/api/banks/<int:bank_id>/questions', methods=['POST'])
def add_question(bank_id):
    data = request.get_json()
    q_type = data.get('type')
    content = data.get('content', '')
    options = json.dumps(data.get('options', []), ensure_ascii=False)
    answer_raw = data.get('answer')
    if isinstance(answer_raw, (list, dict)):
        answer = json.dumps(answer_raw, ensure_ascii=False)
    else:
        answer = str(answer_raw)
    explanation = data.get('explanation', '')
    score = data.get('score', 5)
    difficulty = data.get('difficulty', '中等')
    knowledge_tags = json.dumps(data.get('knowledge_tags', []), ensure_ascii=False)
    qid = execute_db(
        "INSERT INTO questions (bank_id, type, content, options, answer, explanation, score, difficulty, knowledge_tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (bank_id, q_type, content, options, answer, explanation, score, difficulty, knowledge_tags)
    )
    return jsonify({"success": True, "id": qid})


@app.route('/api/banks/<int:bank_id>/questions/batch', methods=['POST'])
def batch_add_questions(bank_id):
    data = request.get_json()
    questions = data.get('questions', [])
    count = 0
    for q in questions:
        q_type = q.get('type')
        content = q.get('content', '')
        options = json.dumps(q.get('options', []), ensure_ascii=False)
        answer_raw = q.get('answer')
        if isinstance(answer_raw, (list, dict)):
            answer = json.dumps(answer_raw, ensure_ascii=False)
        else:
            answer = str(answer_raw) if answer_raw else ''
        explanation = q.get('explanation', '')
        score = q.get('score', 5)
        difficulty = q.get('difficulty', '中等')
        knowledge_tags = json.dumps(q.get('knowledge_tags', []), ensure_ascii=False)
        execute_db(
            "INSERT INTO questions (bank_id, type, content, options, answer, explanation, score, difficulty, knowledge_tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            (bank_id, q_type, content, options, answer, explanation, score, difficulty, knowledge_tags)
        )
        count += 1
    return jsonify({"success": True, "count": count})


@app.route('/api/questions/<int:qid>', methods=['DELETE'])
def delete_question(qid):
    execute_db("DELETE FROM questions WHERE id = ?", (qid,))
    return jsonify({"success": True})


@app.route('/api/questions/batch-delete', methods=['POST'])
def batch_delete_questions():
    data = request.get_json()
    ids = data.get('ids', [])
    if not ids:
        return jsonify({"success": False, "message": "请选择要删除的题目"}), 400
    placeholders = ','.join(['?'] * len(ids))
    execute_db(f"DELETE FROM questions WHERE id IN ({placeholders})", ids)
    return jsonify({"success": True})


@app.route('/api/banks/<int:bank_id>/export', methods=['GET'])
def export_bank(bank_id):
    bank = query_db("SELECT * FROM question_banks WHERE id = ?", (bank_id,), one=True)
    if not bank:
        return jsonify({"error": "题库不存在"}), 404
    qs = query_db("SELECT * FROM questions WHERE bank_id = ?", (bank_id,))
    result = {
        "bank": {
            "name": bank["name"],
            "subject": bank["subject"],
            "difficulty": bank["difficulty"]
        },
        "questions": []
    }
    for q in qs:
        result["questions"].append({
            "type": q["type"],
            "content": q["content"],
            "options": parse_json_field(q["options"]),
            "answer": parse_json_field(q["answer"]) if q["type"] in ("multiple", "fill") else q["answer"],
            "explanation": q["explanation"],
            "score": q["score"],
            "difficulty": q["difficulty"],
            "knowledge_tags": parse_json_field(q["knowledge_tags"])
        })
    return jsonify(result)


@app.route('/api/exam/generate', methods=['POST'])
def generate_exam():
    data = request.get_json()
    user_id = data.get('user_id')
    bank_id = data.get('bank_id')
    count = data.get('count', 20)
    weak_tags, _ = get_weak_knowledge_tags(user_id)
    all_qs = query_db("SELECT * FROM questions WHERE bank_id = ?", (bank_id,))
    difficulty_dist = {"简单": 0.3, "中等": 0.5, "困难": 0.2}
    selected = select_questions_by_criteria(all_qs, count, difficulty_dist, weak_tags)
    q_list = []
    total_score = 0
    for q in selected:
        q_list.append({
            "id": q["id"],
            "type": q["type"],
            "content": q["content"],
            "options": parse_json_field(q["options"]),
            "score": q["score"],
            "difficulty": q["difficulty"],
            "knowledge_tags": parse_json_field(q["knowledge_tags"])
        })
        total_score += q["score"]
    exam_id = execute_db(
        "INSERT INTO exams (user_id, questions, total_score) VALUES (?, ?, ?)",
        (user_id, json.dumps(q_list, ensure_ascii=False), total_score)
    )
    return jsonify({
        "exam_id": exam_id,
        "questions": q_list,
        "total_score": total_score,
        "weak_tags_used": weak_tags
    })


@app.route('/api/exam/submit', methods=['POST'])
def submit_exam():
    data = request.get_json()
    exam_id = data.get('exam_id')
    user_id = data.get('user_id')
    answers = data.get('answers', {})
    exam = query_db("SELECT * FROM exams WHERE id = ?", (exam_id,), one=True)
    if not exam:
        return jsonify({"error": "考试不存在"}), 404
    questions = parse_json_field(exam["questions"])
    full_questions = {}
    for q in questions:
        full_q = query_db("SELECT * FROM questions WHERE id = ?", (q["id"],), one=True)
        if full_q:
            full_questions[q["id"]] = full_q
    score = 0
    details = []
    for q in questions:
        qid = q["id"]
        full_q = full_questions[qid]
        ua = answers.get(str(qid))
        correct = grade_question(full_q, ua)
        q_score = full_q["score"] if correct else 0
        score += q_score
        details.append({
            "question_id": qid,
            "user_answer": ua,
            "correct_answer": parse_json_field(full_q["answer"]) if full_q["type"] in ("multiple", "fill") else full_q["answer"],
            "is_correct": correct == 1,
            "score": q_score,
            "max_score": full_q["score"],
            "explanation": full_q["explanation"],
            "knowledge_tags": parse_json_field(full_q["knowledge_tags"])
        })
        execute_db(
            "INSERT INTO answer_records (user_id, question_id, user_answer, is_correct, knowledge_tags) VALUES (?, ?, ?, ?, ?)",
            (user_id, qid, json.dumps(ua, ensure_ascii=False) if isinstance(ua, (list, dict)) else (str(ua) if ua is not None else ''),
             correct, full_q["knowledge_tags"])
        )
        if not correct:
            try:
                execute_db(
                    "INSERT OR IGNORE INTO wrong_questions (user_id, question_id, knowledge_tags) VALUES (?, ?, ?)",
                    (user_id, qid, full_q["knowledge_tags"])
                )
            except Exception:
                pass
    execute_db(
        "UPDATE exams SET answers = ?, score = ?, submitted = 1, submitted_at = ? WHERE id = ?",
        (json.dumps(answers, ensure_ascii=False), score, datetime.now().isoformat(), exam_id)
    )
    return jsonify({
        "success": True,
        "score": score,
        "total_score": exam["total_score"],
        "percentage": round(score / exam["total_score"] * 100, 2) if exam["total_score"] > 0 else 0,
        "details": details
    })


@app.route('/api/stats/class', methods=['GET'])
def get_class_stats():
    exams = query_db("SELECT * FROM exams WHERE submitted = 1")
    if not exams:
        return jsonify({
            "avg_score": 0, "max_score": 0, "min_score": 0, "pass_rate": 0,
            "distribution": [0, 0, 0, 0, 0], "segment_labels": ["0-59", "60-69", "70-79", "80-89", "90-100"]
        })
    scores = []
    for e in exams:
        if e["total_score"] and e["total_score"] > 0:
            pct = e["score"] / e["total_score"] * 100
            scores.append(pct)
    if not scores:
        scores = [0]
    avg_score = round(sum(scores) / len(scores), 2)
    max_score = round(max(scores), 2)
    min_score = round(min(scores), 2)
    pass_count = sum(1 for s in scores if s >= 60)
    pass_rate = round(pass_count / len(scores) * 100, 2)
    distribution = [0, 0, 0, 0, 0]
    for s in scores:
        if s < 60:
            distribution[0] += 1
        elif s < 70:
            distribution[1] += 1
        elif s < 80:
            distribution[2] += 1
        elif s < 90:
            distribution[3] += 1
        else:
            distribution[4] += 1
    return jsonify({
        "avg_score": avg_score,
        "max_score": max_score,
        "min_score": min_score,
        "pass_rate": pass_rate,
        "total_exams": len(scores),
        "distribution": distribution,
        "segment_labels": ["0-59", "60-69", "70-79", "80-89", "90-100"]
    })


@app.route('/api/stats/knowledge', methods=['GET'])
def get_knowledge_stats():
    records = query_db(
        "SELECT knowledge_tags, is_correct FROM answer_records "
        "UNION ALL SELECT knowledge_tags, is_correct FROM practice_records"
    )
    tag_stats = defaultdict(lambda: {"total": 0, "wrong": 0})
    for r in records:
        tags = parse_json_field(r["knowledge_tags"])
        for tag in tags:
            tag_stats[tag]["total"] += 1
            if not r["is_correct"]:
                tag_stats[tag]["wrong"] += 1
    result = []
    for tag, stats in tag_stats.items():
        if stats["total"] > 0:
            result.append({
                "tag": tag,
                "total": stats["total"],
                "error_rate": round(stats["wrong"] / stats["total"] * 100, 2),
                "correct_rate": round((stats["total"] - stats["wrong"]) / stats["total"] * 100, 2)
            })
    return jsonify(result)


@app.route('/api/practice/random', methods=['POST'])
def get_random_practice():
    data = request.get_json()
    bank_id = data.get('bank_id')
    knowledge_tags = data.get('knowledge_tags', [])
    difficulty = data.get('difficulty')
    user_id = data.get('user_id')
    query = "SELECT * FROM questions WHERE bank_id = ?"
    params = [bank_id]
    if difficulty:
        query += " AND difficulty = ?"
        params.append(difficulty)
    qs = query_db(query, params)
    if knowledge_tags:
        tag_set = set(knowledge_tags)
        qs = [q for q in qs if tag_set & set(parse_json_field(q["knowledge_tags"]))]
    if not qs:
        return jsonify({"question": None})
    q = random.choice(qs)
    return jsonify({
        "question": {
            "id": q["id"],
            "type": q["type"],
            "content": q["content"],
            "options": parse_json_field(q["options"]),
            "score": q["score"],
            "difficulty": q["difficulty"],
            "knowledge_tags": parse_json_field(q["knowledge_tags"])
        },
        "answer": parse_json_field(q["answer"]) if q["type"] in ("multiple", "fill") else q["answer"],
        "explanation": q["explanation"]
    })


@app.route('/api/practice/submit', methods=['POST'])
def submit_practice():
    data = request.get_json()
    user_id = data.get('user_id')
    question_id = data.get('question_id')
    user_answer = data.get('user_answer')
    q = query_db("SELECT * FROM questions WHERE id = ?", (question_id,), one=True)
    if not q:
        return jsonify({"error": "题目不存在"}), 404
    correct = grade_question(q, user_answer)
    ua_json = json.dumps(user_answer, ensure_ascii=False) if isinstance(user_answer, (list, dict)) else (str(user_answer) if user_answer is not None else '')
    execute_db(
        "INSERT INTO practice_records (user_id, question_id, user_answer, is_correct, knowledge_tags) VALUES (?, ?, ?, ?, ?)",
        (user_id, question_id, ua_json, correct, q["knowledge_tags"])
    )
    if not correct:
        try:
            execute_db(
                "INSERT OR IGNORE INTO wrong_questions (user_id, question_id, knowledge_tags) VALUES (?, ?, ?)",
                (user_id, question_id, q["knowledge_tags"])
            )
        except Exception:
            pass
    else:
        execute_db("DELETE FROM wrong_questions WHERE user_id = ? AND question_id = ?", (user_id, question_id))
    return jsonify({
        "is_correct": correct == 1,
        "correct_answer": parse_json_field(q["answer"]) if q["type"] in ("multiple", "fill") else q["answer"],
        "explanation": q["explanation"]
    })


@app.route('/api/wrong-questions/<int:user_id>', methods=['GET'])
def get_wrong_questions(user_id):
    wqs = query_db("SELECT wq.*, q.type, q.content, q.options, q.answer, q.explanation, q.score, q.difficulty "
                   "FROM wrong_questions wq JOIN questions q ON wq.question_id = q.id "
                   "WHERE wq.user_id = ? ORDER BY wq.created_at DESC", (user_id,))
    grouped = defaultdict(list)
    for wq in wqs:
        tags = parse_json_field(wq["knowledge_tags"])
        tag_key = tags[0] if tags else "未分类"
        grouped[tag_key].append({
            "id": wq["question_id"],
            "type": wq["type"],
            "content": wq["content"],
            "options": parse_json_field(wq["options"]),
            "answer": parse_json_field(wq["answer"]) if wq["type"] in ("multiple", "fill") else wq["answer"],
            "explanation": wq["explanation"],
            "score": wq["score"],
            "difficulty": wq["difficulty"],
            "knowledge_tags": tags
        })
    result = [{"tag": tag, "questions": qs} for tag, qs in grouped.items()]
    return jsonify(result)


@app.route('/api/knowledge-tags/<int:bank_id>', methods=['GET'])
def get_knowledge_tags(bank_id):
    qs = query_db("SELECT knowledge_tags FROM questions WHERE bank_id = ?", (bank_id,))
    tags = set()
    for q in qs:
        for t in parse_json_field(q["knowledge_tags"]):
            tags.add(t)
    return jsonify(list(tags))


if __name__ == '__main__':
    if not os.path.exists(DATABASE):
        init_db()
    else:
        init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
