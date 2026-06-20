from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit
import time
import threading
from sandbox import execute_code, static_analysis

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

PROBLEMS = [
    {
        "id": 1,
        "title": "两数之和",
        "difficulty": "easy",
        "description": "给定一个整数数组 nums 和一个整数目标值 target，请你在该数组中找出和为目标值 target 的那两个整数，并返回它们的数组下标。\n\n你可以假设每种输入只会对应一个答案。但是，数组中同一个元素在答案里不能重复出现。",
        "inputExample": "nums = [2,7,11,15], target = 9",
        "outputExample": "[0,1]",
        "starterCode": 'def two_sum(nums, target):\n    # 在这里编写你的代码\n    pass\n\nif __name__ == "__main__":\n    print(two_sum([2, 7, 11, 15], 9))',
        "testCases": [
            {"id": 1, "input": {"nums": [2, 7, 11, 15], "target": 9}, "expected": [0, 1]},
            {"id": 2, "input": {"nums": [3, 2, 4], "target": 6}, "expected": [1, 2]},
            {"id": 3, "input": {"nums": [3, 3], "target": 6}, "expected": [0, 1]},
            {"id": 4, "input": {"nums": [1, 2, 3, 4, 5], "target": 9}, "expected": [3, 4]},
            {"id": 5, "input": {"nums": [10, 20, 30, 40], "target": 50}, "expected": [0, 3]},
        ],
    },
    {
        "id": 2,
        "title": "斐波那契数列",
        "difficulty": "easy",
        "description": "编写一个函数，输入 n，求斐波那契（Fibonacci）数列的第 n 项。\n\n斐波那契数列的定义如下：\nF(0) = 0, F(1) = 1\nF(N) = F(N - 1) + F(N - 2), 其中 N > 1.",
        "inputExample": "n = 10",
        "outputExample": "55",
        "starterCode": 'def fibonacci(n):\n    # 在这里编写你的代码\n    pass\n\nif __name__ == "__main__":\n    print(fibonacci(10))',
        "testCases": [
            {"id": 1, "input": {"n": 0}, "expected": 0},
            {"id": 2, "input": {"n": 1}, "expected": 1},
            {"id": 3, "input": {"n": 10}, "expected": 55},
            {"id": 4, "input": {"n": 20}, "expected": 6765},
            {"id": 5, "input": {"n": 5}, "expected": 5},
        ],
    },
    {
        "id": 3,
        "title": "反转字符串",
        "difficulty": "medium",
        "description": "编写一个函数，其作用是将输入的字符串反转过来。输入字符串以字符数组 s 的形式给出。\n\n不要给另外的数组分配额外的空间，你必须原地修改输入数组、使用 O(1) 的额外空间解决这一问题。",
        "inputExample": 's = ["h","e","l","l","o"]',
        "outputExample": '["o","l","l","e","h"]',
        "starterCode": 'def reverse_string(s):\n    # 在这里编写你的代码\n    pass\n\nif __name__ == "__main__":\n    s = ["h", "e", "l", "l", "o"]\n    reverse_string(s)\n    print(s)',
        "testCases": [
            {"id": 1, "input": {"s": ["h", "e", "l", "l", "o"]}, "expected": ["o", "l", "l", "e", "h"]},
            {"id": 2, "input": {"s": ["H", "a", "n", "n", "a", "h"]}, "expected": ["h", "a", "n", "n", "a", "H"]},
            {"id": 3, "input": {"s": ["a"]}, "expected": ["a"]},
            {"id": 4, "input": {"s": ["a", "b"]}, "expected": ["b", "a"]},
            {"id": 5, "input": {"s": ["p", "y", "t", "h", "o", "n"]}, "expected": ["n", "o", "h", "t", "y", "p"]},
        ],
    },
    {
        "id": 4,
        "title": "最长公共前缀",
        "difficulty": "medium",
        "description": '编写一个函数来查找字符串数组中的最长公共前缀。\n\n如果不存在公共前缀，返回空字符串 ""。',
        "inputExample": 'strs = ["flower","flow","flight"]',
        "outputExample": '"fl"',
        "starterCode": 'def longest_common_prefix(strs):\n    # 在这里编写你的代码\n    pass\n\nif __name__ == "__main__":\n    print(longest_common_prefix(["flower", "flow", "flight"]))',
        "testCases": [
            {"id": 1, "input": {"strs": ["flower", "flow", "flight"]}, "expected": "fl"},
            {"id": 2, "input": {"strs": ["dog", "racecar", "car"]}, "expected": ""},
            {"id": 3, "input": {"strs": ["a"]}, "expected": "a"},
            {"id": 4, "input": {"strs": ["ab", "a"]}, "expected": "a"},
            {"id": 5, "input": {"strs": ["abc", "abc", "abc"]}, "expected": "abc"},
        ],
    },
]

RANKINGS = [
    {"rank": 1, "userId": "user_001", "username": "算法大神", "problemId": 1, "passRate": 1.0, "avgExecutionTime": 15, "codeLines": 12},
    {"rank": 2, "userId": "user_002", "username": "Python专家", "problemId": 1, "passRate": 1.0, "avgExecutionTime": 23, "codeLines": 15},
    {"rank": 3, "userId": "user_003", "username": "代码高手", "problemId": 1, "passRate": 0.8, "avgExecutionTime": 18, "codeLines": 20},
    {"rank": 4, "userId": "user_004", "username": "编程爱好者", "problemId": 1, "passRate": 0.8, "avgExecutionTime": 45, "codeLines": 25},
    {"rank": 5, "userId": "user_005", "username": "学习中", "problemId": 1, "passRate": 0.6, "avgExecutionTime": 30, "codeLines": 30},
]


def get_problem(problem_id):
    for p in PROBLEMS:
        if p["id"] == problem_id:
            return p
    return None


def run_test_cases(code, problem):
    results = []
    func_name_map = {
        1: "two_sum",
        2: "fibonacci",
        3: "reverse_string",
        4: "longest_common_prefix",
    }
    func_name = func_name_map.get(problem["id"], "solution")

    for tc in problem["testCases"]:
        try:
            namespace = {}
            exec(code, namespace)
            func = namespace.get(func_name)
            if func is None:
                results.append({"id": tc["id"], "passed": False, "error": f"函数 {func_name} 未找到"})
                continue

            if problem["id"] == 3:
                s_list = list(tc["input"]["s"])
                func(s_list)
                actual = s_list
            else:
                actual = func(**tc["input"])

            passed = actual == tc["expected"]
            results.append({
                "id": tc["id"],
                "passed": passed,
                "expectedOutput": str(tc["expected"]),
                "actualOutput": str(actual),
                "error": None if passed else f"期望 {tc['expected']}，实际 {actual}",
            })
        except Exception as e:
            results.append({"id": tc["id"], "passed": False, "error": str(e)})

    return results


@app.route("/api/problems", methods=["GET"])
def api_problems():
    problems_simple = [
        {
            "id": p["id"],
            "title": p["title"],
            "difficulty": p["difficulty"],
            "description": p["description"],
            "inputExample": p["inputExample"],
            "outputExample": p["outputExample"],
            "starterCode": p["starterCode"],
        }
        for p in PROBLEMS
    ]
    return jsonify(problems_simple)


@app.route("/api/rankings", methods=["GET"])
def api_rankings():
    problem_id = request.args.get("problemId", type=int, default=1)
    filtered = [r for r in RANKINGS if r["problemId"] == problem_id]
    if not filtered:
        filtered = RANKINGS
    return jsonify(filtered)


@app.route("/api/run", methods=["POST"])
def api_run():
    data = request.get_json()
    code = data.get("code", "")
    result = execute_code(code)
    return jsonify(result)


@socketio.on("connect")
def on_connect():
    print("Client connected")


@socketio.on("disconnect")
def on_disconnect():
    print("Client disconnected")


@socketio.on("ping")
def on_ping():
    emit("pong")


@socketio.on("run_code")
def on_run_code(data):
    code = data.get("code", "")
    problem_id = data.get("problemId", 1)

    def run():
        start = time.time()
        result = execute_code(code)
        warnings = static_analysis(code)
        elapsed = int((time.time() - start) * 1000)
        result["executionTime"] = elapsed
        result["warnings"] = warnings
        result["testCases"] = []
        emit("run_result", result)

    thread = threading.Thread(target=run)
    thread.daemon = True
    thread.start()


@socketio.on("submit_code")
def on_submit_code(data):
    code = data.get("code", "")
    problem_id = data.get("problemId", 1)
    user_id = data.get("userId", "")
    username = data.get("username", "")

    def submit():
        start = time.time()
        result = execute_code(code)
        warnings = static_analysis(code)
        problem = get_problem(problem_id)
        test_results = []
        if problem:
            test_results = run_test_cases(code, problem)
        elapsed = int((time.time() - start) * 1000)
        result["executionTime"] = elapsed
        result["warnings"] = warnings
        result["testCases"] = test_results
        emit("submit_result", result)

        if problem:
            passed = sum(1 for t in test_results if t["passed"])
            total = len(test_results) if test_results else 1
            pass_rate = passed / total
            code_lines = len(code.strip().split("\n"))
            RANKINGS.append({
                "rank": 0,
                "userId": user_id,
                "username": username,
                "problemId": problem_id,
                "passRate": pass_rate,
                "avgExecutionTime": elapsed,
                "codeLines": code_lines,
            })
            RANKINGS.sort(key=lambda x: (-x["passRate"], x["avgExecutionTime"], x["codeLines"]))
            for i, r in enumerate(RANKINGS):
                r["rank"] = i + 1

    thread = threading.Thread(target=submit)
    thread.daemon = True
    thread.start()


if __name__ == "__main__":
    print("Starting Flask server on port 5000...")
    socketio.run(app, host="0.0.0.0", port=5000, debug=False, allow_unsafe_werkzeug=True)
