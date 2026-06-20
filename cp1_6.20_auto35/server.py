import uuid
import random
import re
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room, leave_room

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
socketio = SocketIO(app, cors_allowed_origins="*")

projects = {}
nodes = {}
inspiration_cards = []

CHARACTER_PROMPTS = [
    {"title": "神秘旅人", "content": "一位穿着破旧斗篷的旅人，总是背着一把看似普通却暗藏玄机的长剑。他的眼中藏着不为人知的过去，每到一个地方都会留下一个未解的谜题。", "keywords": ["旅人", "神秘", "剑"]},
    {"title": "时间守望者", "content": "她能看见时间流动的纹路，可以感知即将发生的事情，却无法改变任何结局。她的存在本身就是一个悖论。", "keywords": ["时间", "预知", "守望"]},
    {"title": "落魄诗人", "content": "曾经宫廷中最受宠的诗人，因一首暗讽权贵的诗篇被流放。他游走四方，用诗歌记录世间悲欢。", "keywords": ["诗人", "流放", "诗歌"]},
    {"title": "双面医师", "content": "白天是救死扶伤的名医，夜晚却化身为暗杀组织的执行者。他的手术刀与匕首同样精准。", "keywords": ["医师", "双面", "暗杀"]},
    {"title": "失忆少女", "content": "在一座废弃的图书馆中醒来，只记得自己的名字和一段旋律。她的手腕上有一个从未见过的徽章。", "keywords": ["失忆", "图书馆", "徽章"]},
    {"title": "铁匠之子", "content": "继承了父亲打造神兵的天赋，却选择用自己的手艺为平民打造农具。他说：\"真正的力量在于创造，而非毁灭。\"", "keywords": ["铁匠", "创造", "平民"]},
]

SCENE_PROMPTS = [
    {"title": "悬浮集市", "content": "在云端之上，商贩们在漂浮的岛屿间架起吊桥，形成了世界上最高的集市。云雾缭绕中，稀世珍宝与日常用品并排而列。", "keywords": ["集市", "云端", "奇幻"]},
    {"title": "地下藏书阁", "content": "深埋在古城地下七层的藏书阁，保存着被世间遗忘的典籍。烛火永不熄灭，书页上的文字会在月圆之夜浮现新的内容。", "keywords": ["地下", "藏书", "神秘"]},
    {"title": "钟表森林", "content": "每棵树都是一个巨大的钟表，树干上刻满了转动的齿轮。当所有钟表指向同一时刻，森林的入口才会显现。", "keywords": ["森林", "钟表", "时间"]},
    {"title": "镜湖之底", "content": "湖面如镜，但湖底却映射着另一个世界的景象。有人说那是平行世界的投影，也有人说是亡灵的国度。", "keywords": ["镜湖", "倒影", "平行世界"]},
    {"title": "末世废墟", "content": "文明崩塌后的城市废墟，摩天大楼被藤蔓缠绕，地铁站成了最后的避难所。残存的广播仍在播放着无人收听的节目。", "keywords": ["废墟", "末世", "生存"]},
    {"title": "星桥客栈", "content": "横跨银河的客栈，为星际旅人提供歇脚之处。在这里，一杯酒的价格可能是一段记忆，也可能是一个承诺。", "keywords": ["星际", "客栈", "银河"]},
]

EVENT_PROMPTS = [
    {"title": "信使失踪", "content": "传递重要情报的信使在半路失踪，只留下了沾血的信封和一串神秘的符号。情报的内容将改变整个王国的命运。", "keywords": ["失踪", "情报", "符号"]},
    {"title": "日食预兆", "content": "百年一遇的日食即将来临，古籍记载每次日食都会伴随着一位\"被选中者\"的觉醒和一场足以改变世界格局的灾难。", "keywords": ["日食", "预兆", "觉醒"]},
    {"title": "背叛之夜", "content": "表面上最忠诚的盟友在庆功宴上突然倒戈，所有事先的约定瞬间化为乌有。信任的崩塌比城墙更快。", "keywords": ["背叛", "宴会", "信任"]},
    {"title": "记忆交易", "content": "一个神秘的商人出现在集市上，他声称可以买卖记忆。有人为忘记痛苦而交易，有人为获得他人的知识而购买。", "keywords": ["记忆", "交易", "商人"]},
    {"title": "暴风雪围困", "content": "突如其来的暴风雪将所有人困在一座古堡中，通讯中断，食物有限，而古堡的密室中似乎还藏着其他\"住客\"。", "keywords": ["暴风雪", "围困", "密室"]},
    {"title": "命运棋局", "content": "两位高手在广场上对弈，但棋盘上每走一步，现实中就会发生相应的变故。没有人知道谁是棋手，谁是棋子。", "keywords": ["棋局", "命运", "操控"]},
]

TAG_RE = re.compile(r'<[^>]+>')

def strip_html(html_str):
    return TAG_RE.sub('', html_str)

def make_summary(html_str):
    plain = strip_html(html_str)
    return plain[:30]

def init_seed_data():
    project_id = "proj-1"
    projects[project_id] = {
        "id": project_id,
        "name": "星桥纪事",
        "description": "一段横跨银河的星际冒险故事，关于勇气、背叛与救赎",
        "createdAt": datetime.now().isoformat(),
        "members": ["云墨", "清风", "星河"]
    }

    seed_nodes = [
        {"id": "node-1", "parentId": None, "author": "云墨", "content": "<h2>第一章：启程</h2><p>星桥客栈的灯火在银河的映照下显得格外温暖。我叫林夕，是这间横跨星际的客栈的最后一位守夜人。</p><p>三百年前，我的祖先在这里建起了第一座星桥，连接着两个文明。如今，星桥摇摇欲坠，而最后的旅人却带来了一个惊人的消息——星桥的另一端，那个被认为已经消亡的文明，其实从未消失。</p><blockquote>\"当最后一颗星落入银河，你将看见真相。\"——星桥守望者之书</blockquote>", "branchIndex": 0, "order": 0, "targetWordCount": 500},
        {"id": "node-2", "parentId": "node-1", "author": "清风", "content": "<h2>第二章：暗流</h2><p>旅人名叫苏瑾，她的飞船在星桥附近遭遇了不明能量风暴。她告诉我，那不是普通的风暴——那是某种信号。</p><p>\"他们在呼唤，\"苏瑾的眼中闪烁着不安的光芒，\"三百年了，他们一直在呼唤。\"</p><p>我翻开了那本被灰尘覆盖的守望者之书，在最后一页发现了一段从未见过的文字，仿佛是刚刚才浮现出来的：</p><p><em>桥之尽头，非彼端，乃初心。</em></p>", "branchIndex": 0, "order": 1, "targetWordCount": 800},
        {"id": "node-3", "parentId": "node-2", "author": "星河", "content": "<h2>第三章：抉择</h2><p>星桥开始震颤。我站在桥头，身后是我守护了一生的客栈，前方是未知的深渊。</p><p>苏瑾已经回到了她的飞船，准备穿越风暴。\"你不必跟来，\"她说，但语气中的犹豫出卖了她。</p><p>我望着银河中翻涌的能量潮，想起了祖先留下的最后一句话。也许，守夜人的使命从来就不是守护这座桥——而是等待它重新被点亮的那一刻。</p><p>我深吸一口气，踏上了星桥。</p>", "branchIndex": 0, "order": 2, "targetWordCount": 600},
        {"id": "node-2b", "parentId": "node-1", "author": "云墨", "content": "<h2>第二章（分支）：守夜人的日记</h2><p>如果苏瑾从未出现，我大概会继续这样度过每一个夜晚——在星桥客栈的露台上，看着银河缓缓流淌，记录着星际旅人的故事。</p><p>但那个夜晚改变了一切。当能量风暴席卷而来时，我看到了不该看到的东西——星桥的另一端亮起了灯。</p><p>三百年来第一次。</p><p>我的手颤抖着翻开守望者之书，发现书页上的文字正在自动改写……</p>", "branchIndex": 1, "order": 3, "targetWordCount": 700},
    ]

    for n in seed_nodes:
        plain_text = strip_html(n["content"])
        summary = plain_text[:30]
        now = datetime.now().isoformat()
        nodes[n["id"]] = {
            "id": n["id"],
            "projectId": project_id,
            "parentId": n["parentId"],
            "author": n["author"],
            "content": n["content"],
            "summary": summary,
            "branchIndex": n["branchIndex"],
            "order": n["order"],
            "targetWordCount": n["targetWordCount"],
            "createdAt": now,
            "updatedAt": now,
            "versions": [{
                "id": f"ver-{n['id']}-1",
                "nodeId": n["id"],
                "content": n["content"],
                "wordCount": len(plain_text),
                "createdAt": now
            }]
        }

    all_prompts = (
        [("character", p) for p in CHARACTER_PROMPTS] +
        [("scene", p) for p in SCENE_PROMPTS] +
        [("event", p) for p in EVENT_PROMPTS]
    )
    for card_type, prompt in all_prompts:
        inspiration_cards.append({
            "id": str(uuid.uuid4()),
            "type": card_type,
            "title": prompt["title"],
            "content": prompt["content"],
            "keywords": prompt["keywords"]
        })

init_seed_data()

@app.route("/api/projects", methods=["GET"])
def get_projects():
    return jsonify(list(projects.values()))

@app.route("/api/projects", methods=["POST"])
def create_project():
    data = request.json
    project_id = str(uuid.uuid4())
    project = {
        "id": project_id,
        "name": data.get("name", "新项目"),
        "description": data.get("description", ""),
        "createdAt": datetime.now().isoformat(),
        "members": data.get("members", [])
    }
    projects[project_id] = project
    return jsonify(project), 201

@app.route("/api/projects/<project_id>", methods=["GET"])
def get_project(project_id):
    if project_id not in projects:
        return jsonify({"error": "Project not found"}), 404
    project = dict(projects[project_id])
    project_nodes = [n for n in nodes.values() if n["projectId"] == project_id]
    project["nodes"] = project_nodes
    return jsonify(project)

@app.route("/api/nodes/<project_id>", methods=["GET"])
def get_nodes(project_id):
    project_nodes = [n for n in nodes.values() if n["projectId"] == project_id]
    return jsonify(project_nodes)

@app.route("/api/nodes", methods=["POST"])
def create_node():
    data = request.json
    node_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    content = data.get("content", "")
    plain_text = strip_html(content)
    summary = plain_text[:30]
    node = {
        "id": node_id,
        "projectId": data.get("projectId"),
        "parentId": data.get("parentId"),
        "author": data.get("author", "匿名"),
        "content": content,
        "summary": summary,
        "branchIndex": data.get("branchIndex", 0),
        "order": data.get("order", 0),
        "targetWordCount": data.get("targetWordCount", 500),
        "createdAt": now,
        "updatedAt": now,
        "versions": [{
            "id": str(uuid.uuid4()),
            "nodeId": node_id,
            "content": content,
            "wordCount": len(plain_text),
            "createdAt": now
        }]
    }
    nodes[node_id] = node
    socketio.emit("node_added", node, room=node["projectId"])
    return jsonify(node), 201

@app.route("/api/nodes/<node_id>", methods=["PUT"])
def update_node(node_id):
    if node_id not in nodes:
        return jsonify({"error": "Node not found"}), 404
    data = request.json
    now = datetime.now().isoformat()
    content = data.get("content", nodes[node_id]["content"])
    plain_text = strip_html(content)
    summary = plain_text[:30]
    new_version = {
        "id": str(uuid.uuid4()),
        "nodeId": node_id,
        "content": content,
        "wordCount": len(plain_text),
        "createdAt": now
    }
    current_versions = nodes[node_id].get("versions", [])
    current_versions.append(new_version)
    if len(current_versions) > 5:
        current_versions = current_versions[-5:]
    nodes[node_id].update({
        "content": content,
        "summary": summary,
        "targetWordCount": data.get("targetWordCount", nodes[node_id]["targetWordCount"]),
        "updatedAt": now,
        "versions": current_versions
    })
    socketio.emit("node_updated", nodes[node_id], room=nodes[node_id]["projectId"])
    return jsonify(nodes[node_id])

@app.route("/api/nodes/<node_id>/versions", methods=["GET"])
def get_versions(node_id):
    if node_id not in nodes:
        return jsonify({"error": "Node not found"}), 404
    return jsonify(nodes[node_id].get("versions", []))

@app.route("/api/inspirations", methods=["GET"])
def get_inspirations():
    card_type = request.args.get("type")
    keyword = request.args.get("keyword", "").lower()
    filtered = inspiration_cards
    if card_type:
        filtered = [c for c in filtered if c["type"] == card_type]
    if keyword:
        filtered = [c for c in filtered if keyword in c["title"].lower() or keyword in c["content"].lower() or any(keyword in k.lower() for k in c["keywords"])]
    return jsonify(filtered)

@app.route("/api/inspirations/random", methods=["GET"])
def get_random_inspiration():
    if not inspiration_cards:
        return jsonify(None)
    return jsonify(random.choice(inspiration_cards))

@app.route("/api/inspirations/generate", methods=["POST"])
def generate_inspiration():
    card_type = request.json.get("type", random.choice(["character", "scene", "event"]))
    prompts_map = {
        "character": CHARACTER_PROMPTS,
        "scene": SCENE_PROMPTS,
        "event": EVENT_PROMPTS
    }
    prompt = random.choice(prompts_map.get(card_type, CHARACTER_PROMPTS))
    card = {
        "id": str(uuid.uuid4()),
        "type": card_type,
        "title": prompt["title"],
        "content": prompt["content"],
        "keywords": prompt["keywords"]
    }
    inspiration_cards.append(card)
    return jsonify(card), 201

@socketio.on("join_project")
def on_join_project(data):
    room = data.get("projectId")
    if room:
        join_room(room)

@socketio.on("leave_project")
def on_leave_project(data):
    room = data.get("projectId")
    if room:
        leave_room(room)

@socketio.on("cursor_update")
def on_cursor_update(data):
    room = data.get("projectId")
    if room:
        emit("cursor_update", data, room=room, include_self=False)

if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5001, debug=True, allow_unsafe_werkzeug=True)
