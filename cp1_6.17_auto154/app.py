import re
import sqlite3
from datetime import datetime, timedelta

from flask import Flask, g, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DATABASE = "tickets.db"

PRIORITY_VALUES = ("urgent", "high", "medium", "low")
STATUS_VALUES = ("pending", "in_progress", "done")


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DATABASE)
        g.db.row_factory = sqlite3.Row
    return g.db


@app.teardown_appcontext
def close_db(exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    db = sqlite3.connect(DATABASE)
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS team (
            code TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT
        )
        """
    )
    db.execute(
        """
        CREATE TABLE IF NOT EXISTS ticket (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT DEFAULT '',
            priority TEXT CHECK(priority IN ('urgent','high','medium','low')),
            status TEXT DEFAULT 'pending' CHECK(status IN ('pending','in_progress','done')),
            submitter TEXT NOT NULL,
            team_code TEXT NOT NULL,
            created_at TEXT,
            first_moved_at TEXT,
            FOREIGN KEY(team_code) REFERENCES team(code)
        )
        """
    )
    db.execute("CREATE INDEX IF NOT EXISTS idx_ticket_team_code ON ticket(team_code)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_ticket_status ON ticket(status)")
    db.execute("CREATE INDEX IF NOT EXISTS idx_ticket_priority ON ticket(priority)")
    db.commit()
    db.close()


def seed_data():
    db = sqlite3.connect(DATABASE)
    db.row_factory = sqlite3.Row
    row = db.execute("SELECT COUNT(*) AS cnt FROM team WHERE code = ?", ("DEMO01",)).fetchone()
    if row["cnt"] == 0:
        now = datetime.utcnow().isoformat()
        db.execute(
            "INSERT INTO team (code, name, created_at) VALUES (?, ?, ?)",
            ("DEMO01", "示例团队", now),
        )
        tickets = [
            (
                "T-001",
                "登录页面加载缓慢",
                "用户反馈登录页面加载时间超过5秒，需要优化 @T-002",
                "high",
                "pending",
                "张三",
                "DEMO01",
                now,
                None,
            ),
            (
                "T-002",
                "数据库连接池配置不当",
                "连接池最大连接数设置过低，导致高并发时连接超时",
                "urgent",
                "in_progress",
                "李四",
                "DEMO01",
                (datetime.utcnow() - timedelta(hours=2)).isoformat(),
                (datetime.utcnow() - timedelta(hours=1)).isoformat(),
            ),
            (
                "T-003",
                "用户注册邮件未发送",
                "新用户注册后未收到验证邮件",
                "medium",
                "pending",
                "王五",
                "DEMO01",
                (datetime.utcnow() - timedelta(days=1)).isoformat(),
                None,
            ),
            (
                "T-004",
                "首页Banner图片适配问题",
                "在移动端首页Banner显示不全",
                "low",
                "done",
                "赵六",
                "DEMO01",
                (datetime.utcnow() - timedelta(days=3)).isoformat(),
                (datetime.utcnow() - timedelta(days=2, hours=12)).isoformat(),
            ),
            (
                "T-005",
                "密码重置功能异常",
                "点击密码重置链接后返回404 @T-001",
                "high",
                "in_progress",
                "张三",
                "DEMO01",
                (datetime.utcnow() - timedelta(days=1, hours=4)).isoformat(),
                (datetime.utcnow() - timedelta(hours=6)).isoformat(),
            ),
        ]
        db.executemany(
            "INSERT INTO ticket (id, title, description, priority, status, submitter, team_code, created_at, first_moved_at) VALUES (?,?,?,?,?,?,?,?,?)",
            tickets,
        )
        db.commit()
    db.close()


def _next_ticket_id(db):
    row = db.execute("SELECT id FROM ticket ORDER BY id DESC LIMIT 1").fetchone()
    if row is None:
        return "T-001"
    num = int(row["id"].split("-")[1]) + 1
    return f"T-{num:03d}"


def _compute_referenced_by_count(db, ticket_id):
    pattern = f"%@{ticket_id}%"
    row = db.execute(
        "SELECT COUNT(*) AS cnt FROM ticket WHERE description LIKE ?",
        (pattern,),
    ).fetchone()
    return row["cnt"]


def _ticket_to_dict(row, db):
    d = dict(row)
    d["referenced_by_count"] = _compute_referenced_by_count(db, d["id"])
    refs = re.findall(r"@T-\d{3}", d.get("description", "") or "")
    d["references"] = refs
    return d


@app.route("/api/tickets", methods=["GET"])
def get_tickets():
    team_code = request.args.get("team_code")
    if not team_code:
        return jsonify({"error": "team_code is required"}), 400
    db = get_db()
    rows = db.execute(
        "SELECT * FROM ticket WHERE team_code = ? ORDER BY created_at DESC",
        (team_code,),
    ).fetchall()
    return jsonify([_ticket_to_dict(r, db) for r in rows])


@app.route("/api/tickets", methods=["POST"])
def create_ticket():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    title = data.get("title")
    description = data.get("description", "")
    priority = data.get("priority", "medium")
    submitter = data.get("submitter")
    team_code = data.get("team_code")
    if not title or not submitter or not team_code:
        return jsonify({"error": "title, submitter, and team_code are required"}), 400
    if priority not in PRIORITY_VALUES:
        return jsonify({"error": f"priority must be one of {PRIORITY_VALUES}"}), 400
    db = get_db()
    team = db.execute("SELECT code FROM team WHERE code = ?", (team_code,)).fetchone()
    if not team:
        return jsonify({"error": "team not found"}), 404
    ticket_id = _next_ticket_id(db)
    now = datetime.utcnow().isoformat()
    db.execute(
        "INSERT INTO ticket (id, title, description, priority, status, submitter, team_code, created_at, first_moved_at) VALUES (?,?,?,?,?,?,?,?,?)",
        (ticket_id, title, description, priority, "pending", submitter, team_code, now, None),
    )
    db.commit()
    row = db.execute("SELECT * FROM ticket WHERE id = ?", (ticket_id,)).fetchone()
    return jsonify(_ticket_to_dict(row, db)), 201


@app.route("/api/tickets/<ticket_id>", methods=["PUT"])
def update_ticket(ticket_id):
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    status = data.get("status")
    if status and status not in STATUS_VALUES:
        return jsonify({"error": f"status must be one of {STATUS_VALUES}"}), 400
    db = get_db()
    row = db.execute("SELECT * FROM ticket WHERE id = ?", (ticket_id,)).fetchone()
    if not row:
        return jsonify({"error": "ticket not found"}), 404
    if status:
        first_moved_at = row["first_moved_at"]
        if status == "in_progress" and first_moved_at is None:
            first_moved_at = datetime.utcnow().isoformat()
        db.execute(
            "UPDATE ticket SET status = ?, first_moved_at = ? WHERE id = ?",
            (status, first_moved_at, ticket_id),
        )
        db.commit()
    row = db.execute("SELECT * FROM ticket WHERE id = ?", (ticket_id,)).fetchone()
    return jsonify(_ticket_to_dict(row, db))


@app.route("/api/stats", methods=["GET"])
def get_stats():
    team_code = request.args.get("team_code")
    if not team_code:
        return jsonify({"error": "team_code is required"}), 400
    db = get_db()

    total = db.execute(
        "SELECT COUNT(*) AS cnt FROM ticket WHERE team_code = ?", (team_code,)
    ).fetchone()["cnt"]

    priority_rows = db.execute(
        "SELECT priority, COUNT(*) AS cnt FROM ticket WHERE team_code = ? GROUP BY priority",
        (team_code,),
    ).fetchall()
    by_priority = {p: 0 for p in PRIORITY_VALUES}
    for r in priority_rows:
        by_priority[r["priority"]] = r["cnt"]

    handling_rows = db.execute(
        "SELECT created_at, first_moved_at FROM ticket WHERE team_code = ? AND first_moved_at IS NOT NULL",
        (team_code,),
    ).fetchall()
    if handling_rows:
        total_hours = 0.0
        for r in handling_rows:
            created = datetime.fromisoformat(r["created_at"])
            moved = datetime.fromisoformat(r["first_moved_at"])
            total_hours += (moved - created).total_seconds() / 3600
        avg_handling_time_hours = round(total_hours / len(handling_rows), 2)
    else:
        avg_handling_time_hours = 0

    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()
    daily_new_rows = db.execute(
        "SELECT DATE(created_at) AS day, COUNT(*) AS cnt FROM ticket WHERE team_code = ? AND created_at >= ? GROUP BY DATE(created_at) ORDER BY day",
        (team_code, seven_days_ago),
    ).fetchall()
    daily_new_tickets = {r["day"]: r["cnt"] for r in daily_new_rows}

    priority_dist_rows = db.execute(
        "SELECT priority, COUNT(*) AS cnt FROM ticket WHERE team_code = ? GROUP BY priority",
        (team_code,),
    ).fetchall()
    priority_distribution = {r["priority"]: r["cnt"] for r in priority_dist_rows}

    last_7_rows = db.execute(
        "SELECT submitter, DATE(created_at) AS day FROM ticket WHERE team_code = ? AND created_at >= ?",
        (team_code, seven_days_ago),
    ).fetchall()
    submitter_days = {}
    for r in last_7_rows:
        key = r["submitter"]
        if key not in submitter_days:
            submitter_days[key] = set()
        submitter_days[key].add(r["day"])
    if submitter_days:
        total_daily = sum(len(days) for days in submitter_days.values())
        unique_submitters = len(submitter_days)
        per_capita_handling = round(total_daily / unique_submitters, 2)
    else:
        per_capita_handling = 0

    return jsonify(
        {
            "total": total,
            "by_priority": by_priority,
            "avg_handling_time_hours": avg_handling_time_hours,
            "daily_new_tickets": daily_new_tickets,
            "priority_distribution": priority_distribution,
            "per_capita_handling": per_capita_handling,
        }
    )


@app.route("/api/teams", methods=["POST"])
def create_team():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required"}), 400
    name = data.get("name")
    if not name:
        return jsonify({"error": "name is required"}), 400
    db = get_db()
    import random

    code = f"{random.randint(100000, 999999)}"
    while db.execute("SELECT code FROM team WHERE code = ?", (code,)).fetchone():
        code = f"{random.randint(100000, 999999)}"
    now = datetime.utcnow().isoformat()
    db.execute(
        "INSERT INTO team (code, name, created_at) VALUES (?, ?, ?)",
        (code, name, now),
    )
    db.commit()
    row = db.execute("SELECT * FROM team WHERE code = ?", (code,)).fetchone()
    return jsonify(dict(row)), 201


init_db()
seed_data()

if __name__ == "__main__":
    app.run(debug=True, port=5000)
