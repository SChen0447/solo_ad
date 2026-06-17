# -*- coding: utf-8 -*-
"""
Flask 应用入口
定义 /api/battle、/api/hint、/api/score 等路由
调用诗词库模块进行上下文匹配和得分计算
"""

import time
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from poetry_db import PoetryDB

app = Flask(__name__)
CORS(app)

db = PoetryDB()

user_sessions = {}


def get_session(session_id):
    if session_id not in user_sessions:
        user_sessions[session_id] = {
            "score": 0,
            "combo": 0,
            "max_combo": 0,
            "history": [],
            "recent_results": [],
            "difficulty": "medium",
            "best_score": 0,
        }
    return user_sessions[session_id]


def calculate_score(combo):
    base_score = 10
    if combo <= 1:
        return base_score
    elif combo == 2:
        return 12
    elif combo == 3:
        return 15
    elif combo == 4:
        return 20
    else:
        return 30


def calculate_difficulty(recent_results):
    if len(recent_results) < 5:
        return "medium"
    last_10 = recent_results[-10:]
    success = sum(1 for r in last_10 if r)
    rate = success / len(last_10)
    if rate > 0.8:
        return "hard"
    elif rate < 0.4:
        return "easy"
    else:
        return "medium"


def get_difficulty_name(difficulty):
    if difficulty == "hard":
        return "翰林"
    elif difficulty == "medium":
        return "秀才"
    else:
        return "童生"


@app.route("/api/stats", methods=["GET"])
def stats():
    return jsonify(db.get_stats())


@app.route("/api/battle", methods=["POST"])
def battle():
    data = request.get_json()
    user_line = data.get("line", "").strip()
    session_id = data.get("session_id") or str(uuid.uuid4())

    if not user_line:
        return jsonify({
            "success": False,
            "message": "请输入一句古诗词",
            "session_id": session_id,
        }), 400

    session = get_session(session_id)

    result = db.find_next_line(user_line, session["difficulty"])

    if result is None:
        session["combo"] = 0
        session["recent_results"].append(False)
        if len(session["recent_results"]) > 50:
            session["recent_results"].pop(0)
        session["difficulty"] = calculate_difficulty(session["recent_results"])

        history_item = {
            "id": str(uuid.uuid4()),
            "timestamp": int(time.time() * 1000),
            "user_line": user_line,
            "ai_line": None,
            "success": False,
            "score": 0,
            "combo": 0,
            "poem": None,
        }
        session["history"].insert(0, history_item)
        if len(session["history"]) > 50:
            session["history"].pop()

        return jsonify({
            "success": False,
            "message": "接续失败，请换一句",
            "session_id": session_id,
            "score": session["score"],
            "combo": 0,
            "max_combo": session["max_combo"],
            "difficulty": session["difficulty"],
            "difficulty_name": get_difficulty_name(session["difficulty"]),
            "best_score": session["best_score"],
        })

    session["combo"] += 1
    if session["combo"] > session["max_combo"]:
        session["max_combo"] = session["combo"]

    points = calculate_score(session["combo"])
    session["score"] += points
    if session["score"] > session["best_score"]:
        session["best_score"] = session["score"]

    session["recent_results"].append(True)
    if len(session["recent_results"]) > 50:
        session["recent_results"].pop(0)

    session["difficulty"] = calculate_difficulty(session["recent_results"])

    history_item = {
        "id": str(uuid.uuid4()),
        "timestamp": int(time.time() * 1000),
        "user_line": user_line,
        "ai_line": result["next_line"],
        "success": True,
        "score": points,
        "combo": session["combo"],
        "poem": result["poem"],
        "is_classic": result["is_classic"],
    }
    session["history"].insert(0, history_item)
    if len(session["history"]) > 50:
        session["history"].pop()

    return jsonify({
        "success": True,
        "message": "接续成功！",
        "session_id": session_id,
        "next_line": result["next_line"],
        "poem": result["poem"],
        "is_classic": result["is_classic"],
        "score": session["score"],
        "combo": session["combo"],
        "max_combo": session["max_combo"],
        "earned_points": points,
        "difficulty": session["difficulty"],
        "difficulty_name": get_difficulty_name(session["difficulty"]),
        "best_score": session["best_score"],
    })


@app.route("/api/hint", methods=["POST"])
def hint():
    data = request.get_json()
    user_line = data.get("line", "").strip()
    session_id = data.get("session_id") or str(uuid.uuid4())

    if not user_line:
        return jsonify({
            "success": False,
            "message": "请输入一句古诗词",
            "session_id": session_id,
        }), 400

    session = get_session(session_id)

    hint_char = db.get_hint(user_line, session["difficulty"])

    if hint_char is None:
        return jsonify({
            "success": False,
            "message": "没有找到相关诗句",
            "session_id": session_id,
        })

    return jsonify({
        "success": True,
        "hint": hint_char,
        "session_id": session_id,
    })


@app.route("/api/score", methods=["GET", "POST"])
def score():
    if request.method == "GET":
        session_id = request.args.get("session_id") or str(uuid.uuid4())
        session = get_session(session_id)
        return jsonify({
            "session_id": session_id,
            "score": session["score"],
            "combo": session["combo"],
            "max_combo": session["max_combo"],
            "best_score": session["best_score"],
            "difficulty": session["difficulty"],
            "difficulty_name": get_difficulty_name(session["difficulty"]),
            "history_count": len(session["history"]),
        })

    data = request.get_json()
    session_id = data.get("session_id") or str(uuid.uuid4())
    action = data.get("action", "")

    session = get_session(session_id)

    if action == "reset":
        session["score"] = 0
        session["combo"] = 0
        session["max_combo"] = 0
        session["history"] = []
        session["recent_results"] = []
        session["difficulty"] = "medium"

    return jsonify({
        "session_id": session_id,
        "score": session["score"],
        "combo": session["combo"],
        "max_combo": session["max_combo"],
        "best_score": session["best_score"],
        "difficulty": session["difficulty"],
        "difficulty_name": get_difficulty_name(session["difficulty"]),
        "history": session["history"][:50],
    })


@app.route("/api/history", methods=["GET"])
def history():
    session_id = request.args.get("session_id") or str(uuid.uuid4())
    session = get_session(session_id)
    page = int(request.args.get("page", 1))
    page_size = int(request.args.get("page_size", 50))

    start = (page - 1) * page_size
    end = start + page_size
    paginated = session["history"][start:end]

    return jsonify({
        "session_id": session_id,
        "history": paginated,
        "total": len(session["history"]),
        "page": page,
        "page_size": page_size,
    })


@app.route("/api/search", methods=["GET"])
def search():
    keyword = request.args.get("keyword", "").strip()
    if not keyword:
        return jsonify({"results": [], "count": 0})

    results = db.search_poems(keyword)
    return jsonify({
        "results": results[:20],
        "count": len(results),
    })


if __name__ == "__main__":
    stats = db.get_stats()
    print("诗词库加载完成：")
    for k, v in stats.items():
        print(f"  {k}: {v}")
    app.run(debug=True, host="0.0.0.0", port=5000)
