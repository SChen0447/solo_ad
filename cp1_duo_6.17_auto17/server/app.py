from flask import Flask, request, jsonify, Response
from flask_cors import CORS
import csv
import io
import uuid
import re
from datetime import datetime, timedelta

app = Flask(__name__)
CORS(app)

accounts = [
    {"id": "acc_1", "name": "微博官方号", "platform": "weibo", "color": "#ff6b6b", "icon": "📢"},
    {"id": "acc_2", "name": "公众号专栏", "platform": "wechat", "color": "#51cf66", "icon": "💬"},
    {"id": "acc_3", "name": "小红书笔记", "platform": "xiaohongshu", "color": "#ff922b", "icon": "📒"},
]

_today = datetime.now()


def _fmt(d):
    return d.strftime("%Y-%m-%d")


def _add_days(n):
    return _fmt(_today + timedelta(days=n))


tasks = [
    {
        "id": "task_1",
        "accountId": "acc_1",
        "title": "新品发布预告",
        "type": "short_text",
        "summary": "明天上午10点新品首发，限时优惠不要错过，关注+转发抽3位送小样！",
        "date": _add_days(1),
        "status": "scheduled",
        "estimatedViews": 15000,
        "estimatedEngagement": 3.2,
    },
    {
        "id": "task_2",
        "accountId": "acc_2",
        "title": "深度产品评测报告",
        "type": "long_article",
        "summary": "从用户角度深度体验产品30天，详细记录使用心得、优缺点对比，附真实场景图片展示。",
        "date": _add_days(2),
        "status": "draft",
        "estimatedViews": 8000,
        "estimatedEngagement": 4.5,
    },
    {
        "id": "task_3",
        "accountId": "acc_3",
        "title": "日常妆容分享",
        "type": "image_set",
        "summary": "春日清新妆容教程，9张图详解每一步，附产品清单和色号推荐。",
        "date": _add_days(3),
        "status": "scheduled",
        "estimatedViews": 25000,
        "estimatedEngagement": 5.8,
    },
    {
        "id": "task_4",
        "accountId": "acc_1",
        "title": "用户故事征集",
        "type": "short_text",
        "summary": "讲讲你和品牌的故事吧，被选中可获得全年产品免费使用权！",
        "date": _add_days(4),
        "status": "scheduled",
        "estimatedViews": 20000,
        "estimatedEngagement": 6.1,
    },
    {
        "id": "task_5",
        "accountId": "acc_3",
        "title": "开箱Vlog",
        "type": "video",
        "summary": "网红爆款真的值得买吗？本期视频带你一次性测评5款热门产品。",
        "date": _add_days(5),
        "status": "draft",
        "estimatedViews": 50000,
        "estimatedEngagement": 7.2,
    },
]


def _tokenize(text):
    tokens = re.split(r"[\s,，。！？!?、；;:：\"\"''（）()【】\[\]《》<>/\\.。]+", text or "")
    return set(t for t in tokens if t)


def _jaccard(a, b):
    if not a or not b:
        return 0.0
    inter = a & b
    union = a | b
    return len(inter) / len(union) if union else 0.0


@app.route("/api/accounts", methods=["GET"])
def list_accounts():
    return jsonify(accounts)


@app.route("/api/accounts", methods=["POST"])
def add_account():
    data = request.get_json() or {}
    new_acc = {
        "id": "acc_" + uuid.uuid4().hex[:8],
        "name": data.get("name", ""),
        "platform": data.get("platform", "weibo"),
        "color": data.get("color", "#7950f2"),
        "icon": data.get("icon", "📢"),
    }
    accounts.append(new_acc)
    return jsonify(new_acc), 201


@app.route("/api/tasks", methods=["GET"])
def list_tasks():
    return jsonify(tasks)


@app.route("/api/tasks", methods=["POST"])
def add_task():
    data = request.get_json() or {}
    new_task = {
        "id": "task_" + uuid.uuid4().hex[:8],
        "accountId": data.get("accountId", ""),
        "title": data.get("title", ""),
        "type": data.get("type", "short_text"),
        "summary": data.get("summary", ""),
        "date": data.get("date", _fmt(_today)),
        "status": data.get("status", "draft"),
        "estimatedViews": data.get("estimatedViews", 10000),
        "estimatedEngagement": data.get("estimatedEngagement", 3.0),
    }
    tasks.append(new_task)
    return jsonify(new_task), 201


@app.route("/api/tasks/<task_id>", methods=["DELETE"])
def remove_task(task_id):
    global tasks
    tasks = [t for t in tasks if t["id"] != task_id]
    return jsonify({"ok": True})


@app.route("/api/check-duplicate", methods=["POST"])
def check_duplicate():
    data = request.get_json() or {}
    task_ids = data.get("taskIds", [])
    selected = [t for t in tasks if t["id"] in task_ids]
    results = []
    for i in range(len(selected)):
        for j in range(i + 1, len(selected)):
            t1, t2 = selected[i], selected[j]
            a = _tokenize(t1["summary"] + t1["title"])
            b = _tokenize(t2["summary"] + t2["title"])
            sim = _jaccard(a, b)
            if sim >= 0.7:
                results.append(
                    {
                        "task1Id": t1["id"],
                        "task2Id": t2["id"],
                        "similarity": round(sim * 100, 1),
                    }
                )
    return jsonify(results)


@app.route("/api/export/csv", methods=["GET"])
def export_csv():
    start = request.args.get("start")
    end = request.args.get("end")
    acc_map = {a["id"]: a["name"] for a in accounts}
    type_label = {
        "short_text": "短文字",
        "long_article": "长文章",
        "image_set": "图片集",
        "video": "视频",
    }

    def _in_range(d):
        if start and d < start:
            return False
        if end and d > end:
            return False
        return True

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_ALL)
    writer.writerow(["账号", "日期", "标题", "类型", "摘要"])
    for t in tasks:
        if not _in_range(t["date"]):
            continue
        writer.writerow(
            [
                acc_map.get(t["accountId"], ""),
                t["date"],
                t["title"],
                type_label.get(t["type"], t["type"]),
                t["summary"].replace("\n", " "),
            ]
        )
    csv_content = output.getvalue()
    return Response(
        "\ufeff" + csv_content,
        mimetype="text/csv; charset=utf-8",
        headers={
            "Content-Disposition": f'attachment; filename="content-schedule-{_fmt(_today)}.csv"'
        },
    )


@app.route("/api/history", methods=["GET"])
def history():
    start = request.args.get("start", _fmt(_today - timedelta(days=6)))
    end = request.args.get("end", _fmt(_today))
    try:
        s = datetime.strptime(start, "%Y-%m-%d")
        e = datetime.strptime(end, "%Y-%m-%d")
    except ValueError:
        return jsonify({"error": "invalid date"}), 400
    bar_data = []
    line_data = []
    d = s
    import random

    random.seed(42)
    while d <= e:
        ds = _fmt(d)
        bar = {"date": ds}
        line = {"date": ds}
        for a in accounts:
            bar[a["id"]] = random.randint(0, 4)
            line[a["id"]] = round(2 + random.random() * 8, 1)
        bar_data.append(bar)
        line_data.append(line)
        d += timedelta(days=1)
    return jsonify({"barData": bar_data, "lineData": line_data})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
