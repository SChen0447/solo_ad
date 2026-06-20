"""
智能作业批注与反馈系统 - Flask后端
===================================

数据流向：
  TeacherPanel ──GET /api/homework?role=teacher──▶ app.py ──▶ 内存存储
  TeacherPanel ──GET /api/homework/<id>──────────▶ app.py ──▶ 内存存储
  TeacherPanel ──POST /api/feedback──────────────▶ app.py ──▶ 内存存储
  TeacherPanel ──PUT /api/feedback/<id>──────────▶ app.py ──▶ 内存存储
  TeacherPanel ──DELETE /api/feedback/<id>───────▶ app.py ──▶ 内存存储
  StudentView ───GET /api/homework?role=student──▶ app.py ──▶ 内存存储
  StudentView ───GET /api/homework/<id>──────────▶ app.py ──▶ 内存存储
"""

import time
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ======================================
# 内存存储模拟数据
# ======================================

SAMPLE_CONTENT_1 = """# 《春》读后感

读了朱自清先生的《春》，我深深地感受到了春天的美好。

文章开头用"盼望着，盼望着"两个重复的词语，表现出作者对春天的急切期盼。东风来了，春天的脚步近了。这种拟人手法让春天仿佛有了生命一般。

接下来，作者描写了春草、春花、春风、春雨等景物。小草偷偷地从土里钻出来，嫩嫩的，绿绿的。园子里，田野里，瞧去，一大片一大片满是的。坐着，躺着，打两个滚，踢几脚球，赛几趟跑，捉几回迷藏。风轻悄悄的，草软绵绵的。

我最喜欢的是春花那段。桃树、杏树、梨树，你不让我，我不让你，都开满了花赶趟儿。红的像火，粉的像霞，白的像雪。花里带着甜味儿；闭了眼，树上仿佛已经满是桃儿、杏儿、梨儿。花下成千成百的蜜蜂嗡嗡地闹着，大小的蝴蝶飞来飞去。野花遍地是：杂样儿，有名字的，没名字的，散在草丛里，像眼睛，像星星，还眨呀眨的。

春天是充满希望的季节。"一年之计在于春"，刚起头儿，有的是工夫，有的是希望。春天像刚落地的娃娃，从头到脚都是新的，它生长着。春天像小姑娘，花枝招展的，笑着，走着。春天像健壮的青年，有铁一般的胳膊和腰脚，领着我们上前去。

我们也要像春天一样，充满朝气，努力学习，茁壮成长！
"""

SAMPLE_CONTENT_2 = """# 数学应用题解答

题目：一个长方体水池，长12米，宽8米，深2米。

## 问题1：这个水池的占地面积是多少？

解：占地面积就是底面积。
长方形面积 = 长 × 宽
S = 12 × 8 = 96（平方米）

答：这个水池的占地面积是96平方米。

## 问题2：如果在水池的四周和底面抹上水泥，抹水泥的面积是多少？

解：需要抹水泥的面包括1个底面和4个侧面。
底面积 = 12 × 8 = 96（平方米）
侧面积 = 2 × (长 × 深 + 宽 × 深) = 2 × (12 × 2 + 8 × 2) = 2 × (24 + 16) = 2 × 40 = 80（平方米）
总面积 = 96 + 80 = 176（平方米）

答：抹水泥的面积是176平方米。

## 问题3：水池最多能蓄水多少立方米？

解：蓄水的体积就是水池的容积。
长方体体积 = 长 × 宽 × 深
V = 12 × 8 × 2 = 192（立方米）

答：水池最多能蓄水192立方米。

## 总结

通过这道题，我掌握了长方体表面积和体积的计算方法。在计算表面积时，要注意题目要求计算几个面的面积，不能盲目套用公式。
"""

SAMPLE_CONTENT_3 = """# 英语作文：My Favorite Season

My favorite season is autumn. I think autumn is the most beautiful season of the year.

In autumn, the weather is very cool. The sun is not too hot and the wind is gentle. I like to play outside with my friends. We can fly kites and go hiking in the park.

The leaves turn yellow and red in autumn. They look like beautiful butterflies in the trees. When the wind blows, the leaves fall down to the ground. We can jump on the leaves and they make a crispy sound. That is very funny!

Autumn is also a harvest season. Farmers are very busy in the fields. The apples are red, the oranges are orange, and the grapes are purple. All the fruits are very sweet and delicious. I like to eat fresh fruits in autumn.

Mid-Autumn Festival is in autumn too. My family gets together and eats mooncakes. We watch the big round moon at night. Grandma tells me stories about Chang'e on the moon.

I love autumn! It is a season of beauty and joy.
"""


def _now():
    return time.strftime("%Y-%m-%d %H:%M", time.localtime())


# 初始化作业数据
homeworks_db = {
    "hw1": {
        "id": "hw1",
        "studentId": "s1",
        "studentName": "学生1",
        "title": "《春》读后感",
        "content": SAMPLE_CONTENT_1,
        "submittedAt": "2026-06-15 14:30",
        "feedbacks": [
            {
                "id": "fb1",
                "homeworkId": "hw1",
                "teacherId": "t1",
                "teacherName": "张老师",
                "teacherColor": "A",
                "startIndex": SAMPLE_CONTENT_1.index("盼望着，盼望着"),
                "endIndex": SAMPLE_CONTENT_1.index("盼望着，盼望着") + len("盼望着，盼望着"),
                "selectedText": "盼望着，盼望着",
                "comment": "这里运用了反复的修辞手法，分析得很好！反复的使用确实能表现出作者的期盼之情。",
                "createdAt": "2026-06-16 09:12",
                "updatedAt": "2026-06-16 09:12",
            },
            {
                "id": "fb2",
                "homeworkId": "hw1",
                "teacherId": "t1",
                "teacherName": "张老师",
                "teacherColor": "A",
                "startIndex": SAMPLE_CONTENT_1.index("小草偷偷地从土里钻出来"),
                "endIndex": SAMPLE_CONTENT_1.index("草软绵绵的") + len("草软绵绵的"),
                "selectedText": "小草偷偷地从土里钻出来，嫩嫩的，绿绿的。园子里，田野里，瞧去，一大片一大片满是的。坐着，躺着，打两个滚，踢几脚球，赛几趟跑，捉几回迷藏。风轻悄悄的，草软绵绵的。",
                "comment": "这段引用非常完整，能说说'钻'这个字用得好在哪里吗？建议加入自己的理解和感悟。",
                "createdAt": "2026-06-16 09:18",
                "updatedAt": "2026-06-16 09:18",
            },
            {
                "id": "fb3",
                "homeworkId": "hw1",
                "teacherId": "t2",
                "teacherName": "李老师",
                "teacherColor": "B",
                "startIndex": SAMPLE_CONTENT_1.index("一年之计在于春"),
                "endIndex": SAMPLE_CONTENT_1.index("领着我们上前去") + len("领着我们上前去"),
                "selectedText": '"一年之计在于春"，刚起头儿，有的是工夫，有的是希望。春天像刚落地的娃娃，从头到脚都是新的，它生长着。春天像小姑娘，花枝招展的，笑着，走着。春天像健壮的青年，有铁一般的胳膊和腰脚，领着我们上前去。',
                "comment": "结尾的三个比喻排比用得很精彩！'刚落地的娃娃-小姑娘-健壮的青年'不仅写出了春天的成长过程，也寓意着人生的成长，很有哲理。",
                "createdAt": "2026-06-16 14:22",
                "updatedAt": "2026-06-16 14:22",
            },
        ],
    },
    "hw2": {
        "id": "hw2",
        "studentId": "s1",
        "studentName": "学生1",
        "title": "数学应用题解答",
        "content": SAMPLE_CONTENT_2,
        "submittedAt": "2026-06-17 10:05",
        "feedbacks": [
            {
                "id": "fb4",
                "homeworkId": "hw2",
                "teacherId": "t2",
                "teacherName": "李老师",
                "teacherColor": "B",
                "startIndex": SAMPLE_CONTENT_2.index("需要抹水泥的面包括1个底面和4个侧面"),
                "endIndex": SAMPLE_CONTENT_2.index("抹水泥的面积是176平方米") + len("抹水泥的面积是176平方米"),
                "selectedText": "需要抹水泥的面包括1个底面和4个侧面。\n底面积 = 12 × 8 = 96（平方米）\n侧面积 = 2 × (长 × 深 + 宽 × 深) = 2 × (12 × 2 + 8 × 2) = 2 × (24 + 16) = 2 × 40 = 80（平方米）\n总面积 = 96 + 80 = 176（平方米）\n\n答：抹水泥的面积是176平方米。",
                "comment": "思路清晰，步骤完整！特别好的是你注意到了水池没有顶盖，只计算5个面。这个错误很多同学都会犯，你做对了！👍",
                "createdAt": "2026-06-18 08:40",
                "updatedAt": "2026-06-18 08:40",
            },
        ],
    },
    "hw3": {
        "id": "hw3",
        "studentId": "s2",
        "studentName": "学生2",
        "title": "《春》读后感",
        "content": SAMPLE_CONTENT_1,
        "submittedAt": "2026-06-16 16:20",
        "feedbacks": [],
    },
    "hw4": {
        "id": "hw4",
        "studentId": "s2",
        "studentName": "学生2",
        "title": "英语作文：My Favorite Season",
        "content": SAMPLE_CONTENT_3,
        "submittedAt": "2026-06-18 11:30",
        "feedbacks": [
            {
                "id": "fb5",
                "homeworkId": "hw4",
                "teacherId": "t1",
                "teacherName": "张老师",
                "teacherColor": "A",
                "startIndex": SAMPLE_CONTENT_3.index("The leaves turn yellow and red"),
                "endIndex": SAMPLE_CONTENT_3.index("That is very funny!") + len("That is very funny!"),
                "selectedText": "The leaves turn yellow and red in autumn. They look like beautiful butterflies in the trees. When the wind blows, the leaves fall down to the ground. We can jump on the leaves and they make a crispy sound. That is very funny!",
                "comment": "Great description! The simile 'look like beautiful butterflies' is very vivid. One suggestion: instead of 'funny', maybe use 'fun' which is more natural in this context. 'Funny' means something makes you laugh, while 'fun' means enjoyable.",
                "createdAt": "2026-06-19 10:05",
                "updatedAt": "2026-06-19 10:05",
            },
        ],
    },
    "hw5": {
        "id": "hw5",
        "studentId": "s3",
        "studentName": "学生3",
        "title": "数学应用题解答",
        "content": SAMPLE_CONTENT_2,
        "submittedAt": "2026-06-18 09:15",
        "feedbacks": [],
    },
    "hw6": {
        "id": "hw6",
        "studentId": "s3",
        "studentName": "学生3",
        "title": "《春》读后感",
        "content": SAMPLE_CONTENT_1,
        "submittedAt": "2026-06-19 15:00",
        "feedbacks": [],
    },
    "hw7": {
        "id": "hw7",
        "studentId": "s1",
        "studentName": "学生1",
        "title": "英语作文：My Favorite Season",
        "content": SAMPLE_CONTENT_3,
        "submittedAt": "2026-06-19 13:20",
        "feedbacks": [],
    },
    "hw8": {
        "id": "hw8",
        "studentId": "s2",
        "studentName": "学生2",
        "title": "数学应用题解答",
        "content": SAMPLE_CONTENT_2,
        "submittedAt": "2026-06-19 14:45",
        "feedbacks": [],
    },
}

# 批注索引
feedbacks_index = {}
for hw in homeworks_db.values():
    for fb in hw["feedbacks"]:
        feedbacks_index[fb["id"]] = fb


# ======================================
# API 端点
# ======================================

@app.route("/api/homework", methods=["GET"])
def get_homeworks():
    """
    获取作业列表
    参数：
      - role: 'teacher' 或 'student'
      - userId: 用户ID
    数据流：TeacherPanel/StudentView → app.py → 内存存储
    """
    role = request.args.get("role", "")
    user_id = request.args.get("userId", "")

    hw_list = list(homeworks_db.values())

    if role == "student" and user_id:
        hw_list = [hw for hw in hw_list if hw["studentId"] == user_id]

    # 按提交时间倒序
    hw_list.sort(key=lambda h: h["submittedAt"], reverse=True)

    # 简化列表中的批注数量信息
    result = []
    for hw in hw_list:
        result.append({
            **hw,
            "feedbacks": hw["feedbacks"],  # 保留完整批注，前端自行处理
        })

    return jsonify(result)


@app.route("/api/homework/<homework_id>", methods=["GET"])
def get_homework_detail(homework_id):
    """
    获取单个作业详情（含所有批注）
    数据流：TeacherPanel/StudentView → app.py → 内存存储
    """
    hw = homeworks_db.get(homework_id)
    if not hw:
        return jsonify({"error": "Homework not found"}), 404
    return jsonify(hw)


@app.route("/api/homework/stats", methods=["GET"])
def get_teacher_stats():
    """
    获取教师统计数据
    参数：
      - teacherId: 教师ID
    返回：总作业数、已批改数、平均评语长度
    """
    teacher_id = request.args.get("teacherId", "")
    all_hw = list(homeworks_db.values())
    total_homework = len(all_hw)

    graded_hw = [
        hw for hw in all_hw
        if any(f["teacherId"] == teacher_id for f in hw["feedbacks"])
    ]
    graded_count = len(graded_hw)

    all_comments = []
    for hw in all_hw:
        for f in hw["feedbacks"]:
            if f["teacherId"] == teacher_id:
                all_comments.append(f["comment"])

    avg_length = 0
    if all_comments:
        avg_length = round(sum(len(c) for c in all_comments) / len(all_comments))

    return jsonify({
        "totalHomework": total_homework,
        "gradedHomework": graded_count,
        "avgCommentLength": avg_length,
    })


@app.route("/api/feedback", methods=["POST"])
def create_feedback():
    """
    创建新批注
    请求体：{ id, homeworkId, teacherId, teacherName, teacherColor,
              startIndex, endIndex, selectedText, comment }
    数据流：TeacherPanel → useFeedback.createFeedback → app.py → 内存存储
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request"}), 400

    fb_id = data.get("id") or "fb_" + uuid.uuid4().hex[:8]
    hw_id = data.get("homeworkId", "")

    hw = homeworks_db.get(hw_id)
    if not hw:
        return jsonify({"error": "Homework not found"}), 404

    now = _now()
    feedback = {
        "id": fb_id,
        "homeworkId": hw_id,
        "teacherId": data.get("teacherId", ""),
        "teacherName": data.get("teacherName", ""),
        "teacherColor": data.get("teacherColor", "A"),
        "startIndex": data.get("startIndex", 0),
        "endIndex": data.get("endIndex", 0),
        "selectedText": data.get("selectedText", ""),
        "comment": data.get("comment", ""),
        "createdAt": now,
        "updatedAt": now,
    }

    hw["feedbacks"].append(feedback)
    feedbacks_index[fb_id] = feedback

    # 模拟网络延迟 80-150ms
    time.sleep(0.1)

    return jsonify(feedback), 201


@app.route("/api/feedback/<feedback_id>", methods=["PUT"])
def update_feedback(feedback_id):
    """
    更新批注（评语）
    请求体：{ comment }
    数据流：TeacherPanel → useFeedback.updateFeedback → app.py → 内存存储
    """
    data = request.get_json() or {}
    fb = feedbacks_index.get(feedback_id)
    if not fb:
        return jsonify({"error": "Feedback not found"}), 404

    if "comment" in data:
        fb["comment"] = data["comment"]
        fb["updatedAt"] = _now()

    time.sleep(0.08)
    return jsonify(fb)


@app.route("/api/feedback/<feedback_id>", methods=["DELETE"])
def delete_feedback(feedback_id):
    """
    删除批注
    数据流：TeacherPanel → useFeedback.deleteFeedback → app.py → 内存存储
    """
    fb = feedbacks_index.pop(feedback_id, None)
    if not fb:
        return jsonify({"error": "Feedback not found"}), 404

    hw = homeworks_db.get(fb["homeworkId"])
    if hw:
        hw["feedbacks"] = [f for f in hw["feedbacks"] if f["id"] != feedback_id]

    time.sleep(0.08)
    return jsonify({"success": True, "deletedId": feedback_id})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "homeworks": len(homeworks_db), "feedbacks": len(feedbacks_index)})


if __name__ == "__main__":
    print("=" * 60)
    print("  智能作业批注与反馈系统 - Flask后端")
    print("=" * 60)
    print(f"  作业数: {len(homeworks_db)}")
    print(f"  批注数: {len(feedbacks_index)}")
    print("=" * 60)
    print("  启动地址: http://localhost:5000")
    print("  健康检查: http://localhost:5000/api/health")
    print("=" * 60)
    app.run(host="0.0.0.0", port=5000, debug=True)
