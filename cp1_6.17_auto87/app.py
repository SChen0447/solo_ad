from flask import Flask, request, jsonify
from flask_cors import CORS

from grader import grade_code
import storage

app = Flask(__name__)
CORS(app)

storage.init_sample_data()


@app.route("/api/submit", methods=["POST"])
def submit_code():
    data = request.get_json()
    code = data.get("code", "")
    student_id = data.get("student_id", "stu_001")

    if not code:
        return jsonify({"error": "代码不能为空"}), 400
    if len(code) > 5000:
        return jsonify({"error": "代码长度不能超过5000字符"}), 400

    result = grade_code(code)
    submission = storage.save_submission(student_id, code, result)
    return jsonify(submission)


@app.route("/api/stats", methods=["GET"])
def get_stats():
    all_subs = storage.get_submissions()
    score_ranges = {
        "0-19": 0,
        "20-39": 0,
        "40-59": 0,
        "60-79": 0,
        "80-99": 0,
        "100": 0
    }
    for sub in all_subs:
        s = sub["score"]
        if s == 100:
            score_ranges["100"] += 1
        elif s >= 80:
            score_ranges["80-99"] += 1
        elif s >= 60:
            score_ranges["60-79"] += 1
        elif s >= 40:
            score_ranges["40-59"] += 1
        elif s >= 20:
            score_ranges["20-39"] += 1
        else:
            score_ranges["0-19"] += 1

    chart_data = [
        {"range": k, "count": v} for k, v in score_ranges.items()
    ]

    students = storage.get_all_students()
    return jsonify({
        "chart_data": chart_data,
        "students": students,
        "total_submissions": len(all_subs)
    })


@app.route("/api/history/<student_id>", methods=["GET"])
def get_history(student_id):
    limit = request.args.get("limit", 6, type=int)
    history = storage.get_history(student_id, limit)
    chart_data = []
    for i, sub in enumerate(history):
        chart_data.append({
            "index": i + 1,
            "score": sub["score"],
            "submitted_at": sub["submitted_at"]
        })
    return jsonify({
        "student_id": student_id,
        "student_name": storage.student_names.get(student_id, "未知"),
        "history": history,
        "chart_data": chart_data
    })


@app.route("/api/submission/<submission_id>", methods=["GET"])
def get_submission(submission_id):
    sub = storage.get_submission_by_id(submission_id)
    if not sub:
        return jsonify({"error": "提交记录不存在"}), 404
    comments = storage.get_comments(submission_id)
    return jsonify({
        "submission": sub,
        "comments": comments
    })


@app.route("/api/comment", methods=["POST"])
def add_comment():
    data = request.get_json()
    submission_id = data.get("submission_id", "")
    author = data.get("author", "教师")
    content = data.get("content", "")

    if not submission_id or not content:
        return jsonify({"error": "参数不完整"}), 400

    comment = storage.add_comment(submission_id, author, content)
    return jsonify(comment)


@app.route("/api/unread/<student_id>", methods=["GET"])
def get_unread(student_id):
    count = storage.get_unread_count(student_id)
    return jsonify({"unread_count": count})


@app.route("/api/unread/<student_id>", methods=["POST"])
def clear_unread(student_id):
    storage.clear_unread(student_id)
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True, port=5000)
