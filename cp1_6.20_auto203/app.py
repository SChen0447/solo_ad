from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import random
import copy

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

CATEGORY_CONFIG = {
    "文学小说": {
        "color": "#E74C3C",
        "subtags": ["现代文学", "古典名著", "诗歌散文", "外国文学"]
    },
    "历史社科": {
        "color": "#F39C12",
        "subtags": ["世界史", "中国史", "思想史", "考古"]
    },
    "科技理工": {
        "color": "#3498DB",
        "subtags": ["计算机科学", "数学物理", "生命科学", "工程技术"]
    },
    "艺术设计": {
        "color": "#9B59B6",
        "subtags": ["绘画雕塑", "建筑设计", "音乐戏剧", "摄影影视"]
    },
    "生活育儿": {
        "color": "#2ECC71",
        "subtags": ["美食烹饪", "健康养生", "家庭教育", "旅行游记"]
    }
}

KEYWORDS_MAP = {
    "现代文学": ["小说", "都市", "青春", "爱情", "当代", "现实"],
    "古典名著": ["红楼梦", "三国", "水浒", "西游", "论语", "诗经", "古文", "经典"],
    "诗歌散文": ["诗", "散文", "随笔", "杂文", "词", "赋"],
    "外国文学": ["莎士比亚", "托尔斯泰", "雨果", "海明威", "卡夫卡", "马尔克斯", "外国"],
    "世界史": ["世界史", "欧洲史", "美国史", "战争史", "全球"],
    "中国史": ["中国史", "明朝", "唐朝", "宋朝", "清朝", "史记", "汉书", "中华"],
    "思想史": ["哲学", "思想", "儒学", "道家", "法家", "存在主义", "理性"],
    "考古": ["考古", "文物", "遗迹", "化石", "出土"],
    "计算机科学": ["编程", "算法", "Python", "Java", "C++", "人工智能", "机器学习", "数据结构", "计算机"],
    "数学物理": ["数学", "物理", "量子", "相对论", "微积分", "代数", "几何"],
    "生命科学": ["生物", "基因", "进化", "医学", "细胞", "DNA", "生态"],
    "工程技术": ["工程", "机械", "电子", "电路", "建筑工程", "控制"],
    "绘画雕塑": ["绘画", "油画", "素描", "雕塑", "国画", "水彩", "艺术"],
    "建筑设计": ["建筑", "设计", "室内", "园林", "城市规划"],
    "音乐戏剧": ["音乐", "乐理", "歌剧", "戏剧", "作曲", "指挥"],
    "摄影影视": ["摄影", "电影", "导演", "镜头", "剪辑", "影视"],
    "美食烹饪": ["烹饪", "菜谱", "美食", "烘焙", "料理", "食材"],
    "健康养生": ["健康", "养生", "瑜伽", "健身", "营养", "中医"],
    "家庭教育": ["育儿", "教育", "亲子", "早教", "儿童心理", "家庭"],
    "旅行游记": ["旅行", "游记", "攻略", "地理", "探险", "徒步"]
}

SAMPLE_BOOKS = [
    {"title": "活着", "author": "余华", "isbn": "9787506365437", "year": 2012, "description": "讲述了农村人福贵悲惨的人生遭遇。"},
    {"title": "百年孤独", "author": "加西亚·马尔克斯", "isbn": "9787544258616", "year": 2011, "description": "布恩迪亚家族七代人的传奇故事。"},
    {"title": "人类简史", "author": "尤瓦尔·赫拉利", "isbn": "9787508647357", "year": 2014, "description": "从认知革命到科学革命的人类发展历程。"},
    {"title": "Python编程：从入门到实践", "author": "Eric Matthes", "isbn": "9787115428028", "year": 2016, "description": "Python编程语言入门教程。"},
    {"title": "中国哲学简史", "author": "冯友兰", "isbn": "9787301230008", "year": 2013, "description": "中国哲学思想发展史。"},
    {"title": "设计心理学", "author": "唐纳德·诺曼", "isbn": "9787508648330", "year": 2015, "description": "以人为本的设计理念。"},
    {"title": "人类群星闪耀时", "author": "茨威格", "isbn": "9787544269087", "year": 2014, "description": "影响人类历史的关键时刻。"},
    {"title": "小王子", "author": "圣埃克苏佩里", "isbn": "9787020042494", "year": 2003, "description": "一个来自B-612星球的小王子的故事。"},
    {"title": "本草纲目", "author": "李时珍", "isbn": "9787543036840", "year": 2018, "description": "中国古代药物学巨著。"},
    {"title": "深入理解计算机系统", "author": "Randal E.Bryant", "isbn": "9787111544937", "year": 2016, "description": "计算机系统基础理论。"},
    {"title": "明朝那些事儿", "author": "当年明月", "isbn": "9787213046438", "year": 2011, "description": "明朝三百年历史风云。"},
    {"title": "追风筝的人", "author": "卡勒德·胡赛尼", "isbn": "9787208061644", "year": 2006, "description": "关于友谊、背叛与救赎的故事。"},
]


def classify_book(description="", title=""):
    text = (title + " " + description).lower()
    scores = {}
    for subtag, keywords in KEYWORDS_MAP.items():
        score = 0
        for kw in keywords:
            if kw.lower() in text:
                score += 1
        scores[subtag] = score
    sorted_tags = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    if sorted_tags and sorted_tags[0][1] > 0:
        matched_subtag = sorted_tags[0][0]
    else:
        matched_subtag = random.choice(list(KEYWORDS_MAP.keys()))
    for category, config in CATEGORY_CONFIG.items():
        if matched_subtag in config["subtags"]:
            return category, matched_subtag
    return "文学小说", "现代文学"


books_db = []
records_db = {}
next_id = 1


def add_sample_books():
    global next_id
    for b in SAMPLE_BOOKS:
        category, subtag = classify_book(b["description"], b["title"])
        book = {
            "id": next_id,
            "title": b["title"],
            "author": b["author"],
            "isbn": b["isbn"],
            "year": b["year"],
            "description": b["description"],
            "category": category,
            "subtag": subtag,
            "createdAt": (datetime.now() - timedelta(days=random.randint(0, 30))).isoformat()
        }
        books_db.append(book)
        records_db[next_id] = {
            "borrowCount": random.randint(0, 20),
            "history": generate_history()
        }
        next_id += 1


def generate_history():
    history = []
    base = datetime.now()
    for i in range(6):
        days_ago = random.randint(1, 90)
        dt = base - timedelta(days=days_ago, hours=random.randint(0, 23))
        completed = random.random() > 0.3
        history.append({
            "date": dt.isoformat(),
            "type": random.choice(["借阅", "购买"]),
            "completed": completed
        })
    history.sort(key=lambda x: x["date"], reverse=True)
    return history


add_sample_books()


@app.route('/api/books', methods=['GET'])
def get_books():
    category = request.args.get('category', '')
    subtag = request.args.get('subtag', '')
    search = request.args.get('search', '').lower()
    result = books_db
    if category:
        result = [b for b in result if b["category"] == category]
    if subtag:
        result = [b for b in result if b["subtag"] == subtag]
    if search:
        result = [b for b in result if search in b["title"].lower() or search in b["author"].lower()]
    return jsonify({"books": result, "total": len(result)})


@app.route('/api/books/<int:book_id>', methods=['GET'])
def get_book(book_id):
    book = next((b for b in books_db if b["id"] == book_id), None)
    if not book:
        return jsonify({"error": "图书不存在"}), 404
    records = records_db.get(book_id, {"borrowCount": 0, "history": []})
    return jsonify({"book": book, "records": records})


@app.route('/api/books', methods=['POST'])
def create_book():
    global next_id
    data = request.json or {}
    required = ["title", "author"]
    for f in required:
        if f not in data:
            return jsonify({"error": f"缺少字段: {f}"}), 400
    category, subtag = classify_book(
        data.get("description", ""), data.get("title", "")
    )
    if data.get("category") and data["category"] in CATEGORY_CONFIG:
        category = data["category"]
    if data.get("subtag") and data["subtag"] in CATEGORY_CONFIG[category]["subtags"]:
        subtag = data["subtag"]
    book = {
        "id": next_id,
        "title": data["title"],
        "author": data["author"],
        "isbn": data.get("isbn", ""),
        "year": data.get("year", datetime.now().year),
        "description": data.get("description", ""),
        "category": category,
        "subtag": subtag,
        "createdAt": datetime.now().isoformat()
    }
    books_db.append(book)
    records_db[next_id] = {"borrowCount": 0, "history": []}
    next_id += 1
    return jsonify({"book": book}), 201


@app.route('/api/books/<int:book_id>', methods=['PUT'])
def update_book(book_id):
    data = request.json or {}
    book = next((b for b in books_db if b["id"] == book_id), None)
    if not book:
        return jsonify({"error": "图书不存在"}), 404
    for key in ["title", "author", "isbn", "year", "description", "category", "subtag"]:
        if key in data:
            book[key] = data[key]
    return jsonify({"book": book})


@app.route('/api/books/<int:book_id>', methods=['DELETE'])
def delete_book(book_id):
    global books_db
    book = next((b for b in books_db if b["id"] == book_id), None)
    if not book:
        return jsonify({"error": "图书不存在"}), 404
    books_db = [b for b in books_db if b["id"] != book_id]
    if book_id in records_db:
        del records_db[book_id]
    return jsonify({"message": "删除成功"})


@app.route('/api/books/batch', methods=['POST'])
def batch_create():
    global next_id
    data = request.json or {}
    items = data.get("books", [])
    created = []
    for item in items:
        if "title" not in item or "author" not in item:
            continue
        category, subtag = classify_book(
            item.get("description", ""), item.get("title", "")
        )
        book = {
            "id": next_id,
            "title": item["title"],
            "author": item["author"],
            "isbn": item.get("isbn", ""),
            "year": item.get("year", datetime.now().year),
            "description": item.get("description", ""),
            "category": category,
            "subtag": subtag,
            "createdAt": datetime.now().isoformat()
        }
        books_db.append(book)
        records_db[next_id] = {"borrowCount": 0, "history": []}
        created.append(book)
        next_id += 1
    return jsonify({"created": created, "count": len(created)}), 201


@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify({"categories": CATEGORY_CONFIG})


@app.route('/api/recommend', methods=['POST'])
def recommend():
    data = request.json or {}
    tags = data.get("tags", [])
    if not tags:
        return jsonify({"recommendations": []})
    tag_set = set(tags)
    scored = []
    for book in books_db:
        score = 0
        book_tags = {book["category"], book["subtag"]}
        for tag in tags:
            if tag == book["category"]:
                score += 50
            if tag == book["subtag"]:
                score += 50
        if score == 0:
            for category, config in CATEGORY_CONFIG.items():
                tag_in_category = any(tag in config["subtags"] for tag in tags)
                if tag_in_category and book["category"] == category:
                    score += 25
        for tag in tags:
            if tag.lower() in book["title"].lower() or tag.lower() in book["description"].lower():
                score += 20
        if score > 0:
            match_percent = min(score, 100)
            scored.append({"book": book, "matchScore": match_percent})
    scored.sort(key=lambda x: x["matchScore"], reverse=True)
    return jsonify({"recommendations": scored[:20]})


@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    today = datetime.now().date()
    today_books = [b for b in books_db if datetime.fromisoformat(b["createdAt"]).date() == today]
    total_borrow = sum(r["borrowCount"] for r in records_db.values())
    trend_dates = []
    trend_values = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        trend_dates.append(d.strftime("%m-%d"))
        count = 0
        for bid, rec in records_db.items():
            for h in rec["history"]:
                hd = datetime.fromisoformat(h["date"]).date()
                if hd == d:
                    count += 1
        trend_values.append(count)
    category_stats = []
    for cat, config in CATEGORY_CONFIG.items():
        cat_books = [b for b in books_db if b["category"] == cat]
        category_stats.append({
            "name": cat,
            "color": config["color"],
            "count": len(cat_books)
        })
    return jsonify({
        "todayNewBooks": len(today_books),
        "totalInventory": len(books_db),
        "totalBorrowCount": total_borrow,
        "trendDates": trend_dates,
        "trendValues": trend_values,
        "categoryStats": category_stats
    })


@app.route('/api/books/<int:book_id>/record', methods=['POST'])
def add_record(book_id):
    data = request.json or {}
    if book_id not in records_db:
        records_db[book_id] = {"borrowCount": 0, "history": []}
    rec = records_db[book_id]
    rec["borrowCount"] += 1
    new_record = {
        "date": datetime.now().isoformat(),
        "type": data.get("type", "借阅"),
        "completed": data.get("completed", True)
    }
    rec["history"].insert(0, new_record)
    if len(rec["history"]) > 20:
        rec["history"] = rec["history"][:20]
    return jsonify({"record": new_record})


if __name__ == '__main__':
    app.run(debug=True, port=5000)
