from flask import Flask, request, jsonify
from flask_cors import CORS
from question_bank import get_questions, POSITION_LABELS
from scorer import score_answer

app = Flask(__name__)
CORS(app)


@app.route("/api/questions", methods=["POST"])
def fetch_questions():
    data = request.get_json()
    position = data.get("position", "")
    if position not in POSITION_LABELS:
        return jsonify({"error": "无效的岗位类型"}), 400
    questions = get_questions(position, 5)
    return jsonify({"questions": questions})


@app.route("/api/score", methods=["POST"])
def score_response():
    data = request.get_json()
    question_id = data.get("question_id", 0)
    answer = data.get("answer", "")
    position = data.get("position", "")

    if not answer or not answer.strip():
        return jsonify({"error": "答案不能为空"}), 400
    if position not in POSITION_LABELS:
        return jsonify({"error": "无效的岗位类型"}), 400

    from question_bank import QUESTION_BANK
    question_text = ""
    for q in QUESTION_BANK.get(position, []):
        if q["id"] == question_id:
            question_text = q["text"]
            break

    if not question_text:
        question_text = f"问题 {question_id}"

    result = score_answer(question_text, answer, position)
    return jsonify(result)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
