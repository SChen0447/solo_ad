import hashlib
from datetime import datetime, timedelta
from functools import wraps

from flask import Flask, jsonify, request, session
from flask_cors import CORS

from models import get_db, init_db

app = Flask(__name__)
app.secret_key = "community_library_secret_key_2026"
CORS(app, origins=["http://localhost:5173"], supports_credentials=True)

ACTIVITY_TYPE_COLORS = {
    "读书会": "#4CAF50",
    "讲座": "#2196F3",
    "亲子活动": "#FF9800",
}


def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "请先登录"}), 401
        return f(*args, **kwargs)
    return decorated


def admin_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if "user_id" not in session:
            return jsonify({"error": "请先登录"}), 401
        if session.get("role") != "admin":
            return jsonify({"error": "需要管理员权限"}), 403
        return f(*args, **kwargs)
    return decorated


@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    name = data.get("name", "").strip()

    if not username or not password or not name:
        return jsonify({"error": "用户名、密码和姓名不能为空"}), 400

    conn = get_db()
    existing = conn.execute("SELECT id FROM users WHERE username = ?", (username,)).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "用户名已存在"}), 400

    hashed = hashlib.sha256(password.encode()).hexdigest()
    conn.execute(
        "INSERT INTO users (username, password, role, name, created_at) VALUES (?, ?, 'reader', ?, ?)",
        (username, hashed, name, datetime.now().isoformat()),
    )
    conn.commit()
    user = conn.execute("SELECT id, username, role, name FROM users WHERE username = ?", (username,)).fetchone()
    conn.close()

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["role"] = user["role"]
    session["name"] = user["name"]

    return jsonify({
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "name": user["name"],
    }), 201


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"error": "用户名和密码不能为空"}), 400

    hashed = hashlib.sha256(password.encode()).hexdigest()
    conn = get_db()
    user = conn.execute(
        "SELECT id, username, role, name FROM users WHERE username = ? AND password = ?",
        (username, hashed),
    ).fetchone()
    conn.close()

    if not user:
        return jsonify({"error": "用户名或密码错误"}), 401

    session["user_id"] = user["id"]
    session["username"] = user["username"]
    session["role"] = user["role"]
    session["name"] = user["name"]

    return jsonify({
        "id": user["id"],
        "username": user["username"],
        "role": user["role"],
        "name": user["name"],
    })


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "已退出登录"})


@app.route("/api/auth/me", methods=["GET"])
def me():
    if "user_id" not in session:
        return jsonify({"error": "未登录"}), 401
    return jsonify({
        "id": session["user_id"],
        "username": session["username"],
        "role": session["role"],
        "name": session["name"],
    })


@app.route("/api/books", methods=["GET"])
def get_books():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search = request.args.get("search", "").strip()

    conn = get_db()
    query = "SELECT * FROM books"
    count_query = "SELECT COUNT(*) as total FROM books"
    params = []

    if search:
        query += " WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ? OR category LIKE ?"
        count_query += " WHERE title LIKE ? OR author LIKE ? OR isbn LIKE ? OR category LIKE ?"
        like = f"%{search}%"
        params = [like, like, like, like]

    total = conn.execute(count_query, params).fetchone()["total"]
    offset = (page - 1) * per_page
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    books = conn.execute(query, params + [per_page, offset]).fetchall()
    conn.close()

    return jsonify({
        "books": [dict(b) for b in books],
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if total > 0 else 0,
    })


@app.route("/api/books", methods=["POST"])
@admin_required
def create_book():
    data = request.get_json()
    title = data.get("title", "").strip()
    author = data.get("author", "").strip()
    isbn = data.get("isbn", "").strip()
    category = data.get("category", "").strip()
    total_copies = data.get("total_copies", 1, type=int)
    cover_url = data.get("cover_url", "").strip()
    description = data.get("description", "").strip()

    if not title or not author:
        return jsonify({"error": "书名和作者不能为空"}), 400

    conn = get_db()
    conn.execute(
        "INSERT INTO books (title, author, isbn, category, total_copies, available_copies, cover_url, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (title, author, isbn, category, total_copies, total_copies, cover_url, description, datetime.now().isoformat()),
    )
    conn.commit()
    book_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    book = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    conn.close()

    return jsonify(dict(book)), 201


@app.route("/api/loans", methods=["GET"])
@login_required
def get_loans():
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search = request.args.get("search", "").strip()
    has_overdue = request.args.get("has_overdue", "").strip()

    conn = get_db()
    query = "SELECT l.*, b.title, b.author, b.cover_url FROM loans l JOIN books b ON l.book_id = b.id WHERE l.user_id = ?"
    count_query = "SELECT COUNT(*) as total FROM loans l JOIN books b ON l.book_id = b.id WHERE l.user_id = ?"
    params = [session["user_id"]]

    if search:
        query += " AND (b.title LIKE ? OR b.author LIKE ?)"
        count_query += " AND (b.title LIKE ? OR b.author LIKE ?)"
        like = f"%{search}%"
        params += [like, like]

    if has_overdue == "true":
        now = datetime.now().isoformat()
        query += " AND l.status = 'borrowed' AND l.due_date < ?"
        count_query += " AND l.status = 'borrowed' AND l.due_date < ?"
        params.append(now)

    total = conn.execute(count_query, params).fetchone()["total"]
    offset = (page - 1) * per_page
    query += " ORDER BY l.borrow_date DESC LIMIT ? OFFSET ?"
    loans = conn.execute(query, params + [per_page, offset]).fetchall()
    conn.close()

    now = datetime.now()
    result = []
    for loan in loans:
        loan_dict = dict(loan)
        if loan_dict["status"] == "borrowed":
            due = datetime.fromisoformat(loan_dict["due_date"])
            if now > due:
                loan_dict["overdue_days"] = (now - due).days
                loan_dict["status"] = "overdue"
            else:
                loan_dict["overdue_days"] = 0
        else:
            loan_dict["overdue_days"] = 0
        result.append(loan_dict)

    return jsonify({
        "loans": result,
        "total": total,
        "page": page,
        "per_page": per_page,
        "total_pages": (total + per_page - 1) // per_page if total > 0 else 0,
    })


@app.route("/api/loans", methods=["POST"])
@login_required
def borrow_book():
    data = request.get_json()
    book_id = data.get("book_id")

    if not book_id:
        return jsonify({"error": "请指定要借阅的图书"}), 400

    conn = get_db()
    book = conn.execute("SELECT * FROM books WHERE id = ?", (book_id,)).fetchone()
    if not book:
        conn.close()
        return jsonify({"error": "图书不存在"}), 404

    if book["available_copies"] <= 0:
        conn.close()
        return jsonify({"error": "该图书暂无库存"}), 400

    existing = conn.execute(
        "SELECT id FROM loans WHERE user_id = ? AND book_id = ? AND status = 'borrowed'",
        (session["user_id"], book_id),
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "您已借阅该图书，请先归还"}), 400

    now = datetime.now()
    due = now + timedelta(days=14)

    conn.execute(
        "INSERT INTO loans (user_id, book_id, borrow_date, due_date, status) VALUES (?, ?, ?, ?, 'borrowed')",
        (session["user_id"], book_id, now.isoformat(), due.isoformat()),
    )
    conn.execute(
        "UPDATE books SET available_copies = available_copies - 1 WHERE id = ?",
        (book_id,),
    )
    conn.commit()
    loan_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    loan = conn.execute("SELECT l.*, b.title, b.author FROM loans l JOIN books b ON l.book_id = b.id WHERE l.id = ?", (loan_id,)).fetchone()
    conn.close()

    return jsonify(dict(loan)), 201


@app.route("/api/loans/<int:loan_id>/return", methods=["PUT"])
@login_required
def return_book(loan_id):
    conn = get_db()
    loan = conn.execute("SELECT * FROM loans WHERE id = ? AND user_id = ?", (loan_id, session["user_id"])).fetchone()
    if not loan:
        conn.close()
        return jsonify({"error": "借阅记录不存在"}), 404

    if loan["status"] == "returned":
        conn.close()
        return jsonify({"error": "该图书已归还"}), 400

    now = datetime.now().isoformat()
    conn.execute(
        "UPDATE loans SET status = 'returned', return_date = ? WHERE id = ?",
        (now, loan_id),
    )
    conn.execute(
        "UPDATE books SET available_copies = available_copies + 1 WHERE id = ?",
        (loan["book_id"],),
    )
    conn.commit()
    updated = conn.execute("SELECT l.*, b.title, b.author FROM loans l JOIN books b ON l.book_id = b.id WHERE l.id = ?", (loan_id,)).fetchone()
    conn.close()

    return jsonify(dict(updated))


@app.route("/api/activities", methods=["GET"])
def get_activities():
    conn = get_db()
    activities = conn.execute("SELECT * FROM activities ORDER BY start_time ASC").fetchall()
    conn.close()

    result = []
    for act in activities:
        act_dict = dict(act)
        act_dict["type_color"] = ACTIVITY_TYPE_COLORS.get(act_dict["activity_type"], "#9E9E9E")
        if "user_id" in session:
            participant = conn.execute is None
            conn2 = get_db()
            p = conn2.execute(
                "SELECT id FROM activity_participants WHERE activity_id = ? AND user_id = ?",
                (act_dict["id"], session["user_id"]),
            ).fetchone()
            act_dict["is_registered"] = p is not None
            conn2.close()
        else:
            act_dict["is_registered"] = False
        result.append(act_dict)

    return jsonify({"activities": result})


@app.route("/api/activities", methods=["POST"])
@admin_required
def create_activity():
    data = request.get_json()
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    activity_type = data.get("activity_type", "").strip()
    location = data.get("location", "").strip()
    start_time = data.get("start_time", "").strip()
    end_time = data.get("end_time", "").strip()
    max_participants = data.get("max_participants")

    if not title or not activity_type or not start_time or not end_time:
        return jsonify({"error": "活动名称、类型、开始时间和结束时间不能为空"}), 400

    conn = get_db()
    conn.execute(
        "INSERT INTO activities (title, description, activity_type, location, start_time, end_time, max_participants, current_participants, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)",
        (title, description, activity_type, location, start_time, end_time, max_participants, session["user_id"], datetime.now().isoformat()),
    )
    conn.commit()
    activity_id = conn.execute("SELECT last_insert_rowid()").fetchone()[0]
    activity = conn.execute("SELECT * FROM activities WHERE id = ?", (activity_id,)).fetchone()
    conn.close()

    act_dict = dict(activity)
    act_dict["type_color"] = ACTIVITY_TYPE_COLORS.get(act_dict["activity_type"], "#9E9E9E")
    return jsonify(act_dict), 201


@app.route("/api/activities/<int:activity_id>/register", methods=["POST"])
@login_required
def register_activity(activity_id):
    conn = get_db()
    activity = conn.execute("SELECT * FROM activities WHERE id = ?", (activity_id,)).fetchone()
    if not activity:
        conn.close()
        return jsonify({"error": "活动不存在"}), 404

    if activity["max_participants"] is not None and activity["current_participants"] >= activity["max_participants"]:
        conn.close()
        return jsonify({"error": "活动名额已满"}), 400

    existing = conn.execute(
        "SELECT id FROM activity_participants WHERE activity_id = ? AND user_id = ?",
        (activity_id, session["user_id"]),
    ).fetchone()
    if existing:
        conn.close()
        return jsonify({"error": "您已报名该活动"}), 400

    conn.execute(
        "INSERT INTO activity_participants (activity_id, user_id, registered_at) VALUES (?, ?, ?)",
        (activity_id, session["user_id"], datetime.now().isoformat()),
    )
    conn.execute(
        "UPDATE activities SET current_participants = current_participants + 1 WHERE id = ?",
        (activity_id,),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "报名成功"}), 201


@app.route("/api/activities/<int:activity_id>/register", methods=["DELETE"])
@login_required
def cancel_registration(activity_id):
    conn = get_db()
    activity = conn.execute("SELECT * FROM activities WHERE id = ?", (activity_id,)).fetchone()
    if not activity:
        conn.close()
        return jsonify({"error": "活动不存在"}), 404

    start_time = datetime.fromisoformat(activity["start_time"])
    now = datetime.now()
    if now >= start_time - timedelta(hours=24):
        conn.close()
        return jsonify({"error": "活动开始前24小时内无法取消报名"}), 400

    existing = conn.execute(
        "SELECT id FROM activity_participants WHERE activity_id = ? AND user_id = ?",
        (activity_id, session["user_id"]),
    ).fetchone()
    if not existing:
        conn.close()
        return jsonify({"error": "您未报名该活动"}), 400

    conn.execute(
        "DELETE FROM activity_participants WHERE activity_id = ? AND user_id = ?",
        (activity_id, session["user_id"]),
    )
    conn.execute(
        "UPDATE activities SET current_participants = current_participants - 1 WHERE id = ?",
        (activity_id,),
    )
    conn.commit()
    conn.close()

    return jsonify({"message": "取消报名成功"})


@app.route("/api/stats", methods=["GET"])
def get_stats():
    conn = get_db()
    total_books = conn.execute("SELECT COALESCE(SUM(total_copies), 0) as cnt FROM books").fetchone()["cnt"]
    total_readers = conn.execute("SELECT COUNT(*) as cnt FROM users WHERE role = 'reader'").fetchone()["cnt"]
    current_loans = conn.execute("SELECT COUNT(*) as cnt FROM loans WHERE status = 'borrowed'").fetchone()["cnt"]
    overdue_books = conn.execute(
        "SELECT COUNT(*) as cnt FROM loans WHERE status = 'borrowed' AND due_date < ?",
        (datetime.now().isoformat(),),
    ).fetchone()["cnt"]
    total_activities = conn.execute("SELECT COUNT(*) as cnt FROM activities").fetchone()["cnt"]

    seven_days_ago = (datetime.now() - timedelta(days=7)).isoformat()
    recent_loans = conn.execute(
        "SELECT COUNT(*) as cnt FROM loans WHERE borrow_date >= ?", (seven_days_ago,)
    ).fetchone()["cnt"]
    conn.close()

    return jsonify({
        "total_books": total_books,
        "total_readers": total_readers,
        "current_loans": current_loans,
        "overdue_books": overdue_books,
        "total_activities": total_activities,
        "recent_loans": recent_loans,
    })


init_db()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
