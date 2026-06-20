import time
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode="threading")

GRADIENT_COLORS = [
    "linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)",
    "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
    "linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%)",
    "linear-gradient(135deg, #fce4ec 0%, #f8bbd0 100%)",
    "linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)",
    "linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)",
    "linear-gradient(135deg, #fff8e1 0%, #ffecb3 100%)",
    "linear-gradient(135deg, #e8eaf6 0%, #c5cae9 100%)",
    "linear-gradient(135deg, #e1f5fe 0%, #b3e5fc 100%)",
    "linear-gradient(135deg, #f1f8e9 0%, #dcedc8 100%)",
]

topics = {}
ideas = {}
members = {}
member_sid_map = {}

ROOM = "brainstorm_main"

SAMPLE_TOPICS = [
    {
        "id": f"topic_{i+1}",
        "title": title,
        "description": desc,
        "createdAt": int(time.time() * 1000) - (3 - i) * 3600000,
    }
    for i, (title, desc) in enumerate(
        [
            (
                "下季度产品功能方向",
                "讨论Q3季度我们应该重点开发哪些功能，以提升用户体验和产品竞争力。",
            ),
            (
                "团队建设活动方案",
                "策划一次有意义的团建活动，增强团队凝聚力，预算控制在5000元以内。",
            ),
            (
                "远程办公效率提升",
                "探讨如何优化远程办公流程，提升团队协作效率和沟通质量。",
            ),
        ]
    )
]

SAMPLE_IDEAS = [
    {
        "topicId": "topic_1",
        "content": "推出AI智能助手功能，帮助用户自动生成内容摘要和建议",
        "authorName": "紫色的独角兽",
        "authorColor": "#7e57c2",
    },
    {
        "topicId": "topic_1",
        "content": "增加深色模式和多种主题皮肤，满足不同用户偏好",
        "authorName": "蓝色的海豚",
        "authorColor": "#42a5f5",
    },
    {
        "topicId": "topic_1",
        "content": "优化移动端体验，开发原生App支持离线使用功能",
        "authorName": "绿色的龙",
        "authorColor": "#66bb6a",
    },
    {
        "topicId": "topic_1",
        "content": "添加实时协作编辑功能，支持多人同时编辑同一文档",
        "authorName": "橙色的凤凰",
        "authorColor": "#ffa726",
    },
    {
        "topicId": "topic_1",
        "content": "引入游戏化元素，设置成就系统和积分兑换激励用户活跃",
        "authorName": "粉色的猫",
        "authorColor": "#ec407a",
    },
    {
        "topicId": "topic_2",
        "content": "组织密室逃脱活动，需要团队协作解谜，紧张刺激又有趣",
        "authorName": "红色的老虎",
        "authorColor": "#ef5350",
    },
    {
        "topicId": "topic_2",
        "content": "户外烧烤+桌游派对，轻松自在可以自由交流",
        "authorName": "青色的企鹅",
        "authorColor": "#26c6da",
    },
    {
        "topicId": "topic_2",
        "content": "公益志愿者活动，去动物救助中心照顾流浪猫狗",
        "authorName": "棕色的熊猫",
        "authorColor": "#8d6e63",
    },
    {
        "topicId": "topic_2",
        "content": "剧本杀+晚宴，沉浸式体验增进团队默契",
        "authorName": "灰色的狐狸",
        "authorColor": "#78909c",
    },
    {
        "topicId": "topic_2",
        "content": "城市定向越野+打卡任务，户外锻炼又考验团队配合",
        "authorName": "靛蓝的麒麟",
        "authorColor": "#5c6bc0",
    },
    {
        "topicId": "topic_3",
        "content": "推行异步办公文化，减少不必要的会议提高专注时间",
        "authorName": "天蓝的猫头鹰",
        "authorColor": "#29b6f6",
    },
    {
        "topicId": "topic_3",
        "content": "建立标准化的文档协作流程，统一使用Notion管理所有项目文档",
        "authorName": "蓝绿的松鼠",
        "authorColor": "#26a69a",
    },
    {
        "topicId": "topic_3",
        "content": "每周固定1-2天线下办公日，增进面对面交流",
        "authorName": "草绿的考拉",
        "authorColor": "#9ccc65",
    },
    {
        "topicId": "topic_3",
        "content": "引入虚拟办公室软件，打造线上3D工作空间增强仪式感",
        "authorName": "珊瑚的狮子",
        "authorColor": "#ff7043",
    },
    {
        "topicId": "topic_3",
        "content": "制定明确的工作时间边界，避免过度加班保障身心健康",
        "authorName": "浅蓝的浣熊",
        "authorColor": "#42a5f5",
    },
]


def init_sample_data():
    for topic in SAMPLE_TOPICS:
        topics[topic["id"]] = {
            **topic,
            "ideaCount": len([i for i in SAMPLE_IDEAS if i["topicId"] == topic["id"]]),
        }

    for idx, idea in enumerate(SAMPLE_IDEAS):
        idea_id = f"idea_{idx + 1}"
        gradient = GRADIENT_COLORS[idx % len(GRADIENT_COLORS)]
        ideas[idea_id] = {
            "id": idea_id,
            "topicId": idea["topicId"],
            "content": idea["content"],
            "authorId": f"demo_author_{idx}",
            "authorName": idea["authorName"],
            "authorColor": idea["authorColor"],
            "createdAt": int(time.time() * 1000) - (15 - idx) * 60000,
            "likes": [],
            "votes": {},
            "avgScore": 0.0,
            "gradientColor": gradient,
        }


def calculate_avg_score(idea):
    votes_data = idea.get("votes", {})
    if not votes_data:
        return 0.0

    total_feasibility = 0
    total_innovation = 0
    total_cost = 0
    count = len(votes_data)

    for v in votes_data.values():
        total_feasibility += v.get("feasibility", 0)
        total_innovation += v.get("innovation", 0)
        total_cost += v.get("cost", 0)

    avg_feasibility = total_feasibility / count
    avg_innovation = total_innovation / count
    avg_cost = total_cost / count

    return round((avg_feasibility + avg_innovation + (6 - avg_cost)) / 3, 4)


init_sample_data()


@app.route("/api/topics", methods=["GET"])
def get_topics():
    topic_list = list(topics.values())
    for t in topic_list:
        t["ideaCount"] = len([i for i in ideas.values() if i["topicId"] == t["id"]])
    topic_list.sort(key=lambda x: x["createdAt"], reverse=True)
    return jsonify(topic_list)


@app.route("/api/topics", methods=["POST"])
def create_topic():
    data = request.get_json()
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()

    if not title:
        return jsonify({"error": "标题不能为空"}), 400

    topic_id = f"topic_{uuid.uuid4().hex[:8]}"
    topic = {
        "id": topic_id,
        "title": title,
        "description": description,
        "createdAt": int(time.time() * 1000),
        "ideaCount": 0,
    }
    topics[topic_id] = topic
    return jsonify(topic), 201


@app.route("/api/ideas", methods=["GET"])
def get_ideas():
    topic_id = request.args.get("topicId")
    idea_list = list(ideas.values())

    if topic_id:
        idea_list = [i for i in idea_list if i["topicId"] == topic_id]

    for idea in idea_list:
        idea["avgScore"] = calculate_avg_score(idea)

    idea_list.sort(key=lambda x: x["createdAt"], reverse=True)
    return jsonify(idea_list)


@app.route("/api/ideas", methods=["POST"])
def create_idea():
    data = request.get_json()
    topic_id = data.get("topicId")
    content = data.get("content", "").strip()

    if not topic_id or topic_id not in topics:
        return jsonify({"error": "无效的议题"}), 400
    if not content:
        return jsonify({"error": "内容不能为空"}), 400
    if len(content) > 100:
        return jsonify({"error": "内容不能超过100字"}), 400

    idea_id = f"idea_{uuid.uuid4().hex[:8]}"
    gradient = GRADIENT_COLORS[hash(idea_id) % len(GRADIENT_COLORS)]

    idea = {
        "id": idea_id,
        "topicId": topic_id,
        "content": content,
        "authorId": data.get("authorId", ""),
        "authorName": data.get("authorName", "匿名用户"),
        "authorColor": data.get("authorColor", "#666"),
        "createdAt": int(time.time() * 1000),
        "likes": [],
        "votes": {},
        "avgScore": 0.0,
        "gradientColor": gradient,
    }
    ideas[idea_id] = idea

    if topics.get(topic_id):
        topics[topic_id]["ideaCount"] = (
            len([i for i in ideas.values() if i["topicId"] == topic_id])
        )

    return jsonify(idea), 201


@app.route("/api/ideas/like", methods=["POST"])
def like_idea():
    data = request.get_json()
    idea_id = data.get("ideaId")
    member_id = data.get("memberId")

    if idea_id not in ideas:
        return jsonify({"error": "创意不存在"}), 404

    idea = ideas[idea_id]
    if member_id in idea["likes"]:
        idea["likes"].remove(member_id)
    else:
        idea["likes"].append(member_id)

    return jsonify(idea)


@app.route("/api/votes", methods=["POST"])
def submit_vote():
    data = request.get_json()
    idea_id = data.get("ideaId")
    member_id = data.get("memberId")

    if idea_id not in ideas:
        return jsonify({"error": "创意不存在"}), 404

    try:
        feasibility = int(data.get("feasibility", 0))
        innovation = int(data.get("innovation", 0))
        cost = int(data.get("cost", 0))

        for val in [feasibility, innovation, cost]:
            if not (0 <= val <= 5):
                return jsonify({"error": "评分必须在0-5之间"}), 400
    except (ValueError, TypeError):
        return jsonify({"error": "无效的评分"}), 400

    idea = ideas[idea_id]
    idea["votes"][member_id] = {
        "feasibility": feasibility,
        "innovation": innovation,
        "cost": cost,
    }
    idea["avgScore"] = calculate_avg_score(idea)

    return jsonify(idea)


@socketio.on("connect")
def handle_connect():
    member_id = request.args.get("memberId")
    member_name = request.args.get("memberName")
    member_color = request.args.get("memberColor")

    if member_id and member_name:
        members[member_id] = {
            "id": member_id,
            "name": member_name,
            "color": member_color or "#666",
        }
        member_sid_map[request.sid] = member_id
        join_room(ROOM)

        emit("member_joined", members[member_id], room=ROOM, include_self=False)
        emit("members_list", list(members.values()), room=request.sid)


@socketio.on("disconnect")
def handle_disconnect():
    member_id = member_sid_map.get(request.sid)
    if member_id:
        leave_room(ROOM)
        del member_sid_map[request.sid]
        if member_id in members:
            del members[member_id]
            emit("member_left", member_id, room=ROOM)


@socketio.on("new_idea")
def handle_new_idea(idea):
    emit("new_idea", idea, room=ROOM, include_self=False)


@socketio.on("new_vote")
def handle_new_vote(idea):
    emit("new_vote", idea, room=ROOM, include_self=False)


@socketio.on("request_sync")
def handle_request_sync():
    emit("members_list", list(members.values()), room=request.sid)


@socketio.on("end_vote")
def handle_end_vote():
    all_ideas = list(ideas.values())
    for idea in all_ideas:
        idea["avgScore"] = calculate_avg_score(idea)

    sorted_ideas = sorted(all_ideas, key=lambda x: x["avgScore"], reverse=True)

    rankings = []
    for idx, idea in enumerate(sorted_ideas):
        votes_data = idea.get("votes", {})
        count = len(votes_data) if votes_data else 0

        if count > 0:
            feas = sum(v.get("feasibility", 0) for v in votes_data.values()) / count
            innov = sum(v.get("innovation", 0) for v in votes_data.values()) / count
            cst = sum(v.get("cost", 0) for v in votes_data.values()) / count
        else:
            feas = 0.0
            innov = 0.0
            cst = 0.0

        rankings.append(
            {
                "ideaId": idea["id"],
                "content": idea["content"],
                "avgScore": round(idea["avgScore"], 2),
                "feasibilityAvg": round(feas, 2),
                "innovationAvg": round(innov, 2),
                "costAvg": round(cst, 2),
                "rank": idx + 1,
            }
        )

    voted_member_ids = set()
    for idea in all_ideas:
        voted_member_ids.update(idea.get("votes", {}).keys())

    report = {
        "rankings": rankings,
        "participantCount": len(members),
        "votedCount": len(voted_member_ids),
        "totalIdeas": len(all_ideas),
    }

    emit("vote_ended", report, room=ROOM)


if __name__ == "__main__":
    print("=" * 50)
    print("🚀 团队头脑风暴服务器启动")
    print(f"📊 初始化议题: {len(topics)} 个")
    print(f"💡 初始化创意: {len(ideas)} 条")
    print("🔌 WebSocket: 已启用")
    print("=" * 50)
    socketio.run(app, host="0.0.0.0", port=5000, debug=False, allow_unsafe_werkzeug=True)
