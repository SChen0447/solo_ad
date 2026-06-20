from flask import Flask, request, jsonify
from flask_cors import CORS
import random
import uuid
import time

app = Flask(__name__)
CORS(app)

COURSES = [
    {
        "id": "1",
        "title": "经典川菜麻婆豆腐",
        "description": "学习正宗川味麻婆豆腐，麻辣鲜香一步到位，掌握豆腐嫩滑不碎的秘诀。",
        "cover": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=mapo%20tofu%20sichuan%20dish%20on%20white%20plate%20food%20photography%20steaming&image_size=landscape_4_3",
        "difficulty": "beginner",
        "rating": 4.5,
        "steps": [
            {"order": 1, "title": "准备食材", "description": "嫩豆腐400g切2cm方块，牛肉末100g，豆瓣酱2勺，花椒粉适量。"},
            {"order": 2, "title": "焯水豆腐", "description": "沸水中加盐，轻放入豆腐焯水2分钟，沥干备用保持嫩滑。"},
            {"order": 3, "title": "炒制肉末", "description": "热锅凉油，中火炒散牛肉末至变色出油，加豆瓣酱炒出红油。"},
            {"order": 4, "title": "烧制入味", "description": "加入高汤200ml，放入豆腐轻推，小火烧5分钟使豆腐入味。"},
            {"order": 5, "title": "收汁装盘", "description": "水淀粉勾芡，撒花椒粉和葱花，轻轻翻匀后装盘。"}
        ]
    },
    {
        "id": "2",
        "title": "法式焦糖布蕾",
        "description": "掌握法式经典甜品的制作精髓，从细腻蛋奶液到完美焦糖脆壳。",
        "cover": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=french%20creme%20brulee%20dessert%20with%20caramel%20top%20elegant%20white%20plate&image_size=landscape_4_3",
        "difficulty": "intermediate",
        "rating": 4.7,
        "steps": [
            {"order": 1, "title": "制作蛋奶液", "description": "6个蛋黄加80g砂糖搅拌至发白，加入500ml热奶油缓慢搅拌。"},
            {"order": 2, "title": "过滤入模", "description": "蛋奶液过筛两次去除气泡，倒入烤盅，轻敲去除残余气泡。"},
            {"order": 3, "title": "水浴烘烤", "description": "烤箱150°C，烤盅放入深盘加热水至半高，烤40-45分钟至微晃。"},
            {"order": 4, "title": "焦糖脆壳", "description": "冷藏4小时后，表面撒薄层砂糖，用喷枪均匀灼烧至琥珀色。"}
        ]
    },
    {
        "id": "3",
        "title": "日式豚骨拉面",
        "description": "12小时慢炖豚骨白汤，搭配溏心蛋与叉烧，还原地道博多风味。",
        "cover": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt= japanese%20tonkotsu%20ramen%20bowl%20with%20chashu%20and%20egg%20steam%20rising&image_size=landscape_4_3",
        "difficulty": "advanced",
        "rating": 4.8,
        "steps": [
            {"order": 1, "title": "熬制豚骨汤", "description": "猪大骨沸水焯过后，大火煮沸转中火持续滚煮12小时至乳白浓稠。"},
            {"order": 2, "title": "制作叉烧", "description": "五花肉卷紧棉绳扎好，酱油味醂腌制后小火慢煮2小时，冷藏切片。"},
            {"order": 3, "title": "溏心蛋", "description": "沸水煮蛋6分30秒后冰水浸泡，剥壳后浸入酱汁冷藏过夜。"},
            {"order": 4, "title": "组装出碗", "description": "面条煮好入碗，注入滚烫豚骨汤，排列叉烧、溏心蛋、葱花和木耳。"}
        ]
    },
    {
        "id": "4",
        "title": "意式玛格丽特披萨",
        "description": "从揉面到窑烤，学习那不勒斯正宗玛格丽特披萨的全套工艺。",
        "cover": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=margherita%20pizza%20fresh%20basil%20mozzarella%20italian%20wood%20fired&image_size=landscape_4_3",
        "difficulty": "intermediate",
        "rating": 4.3,
        "steps": [
            {"order": 1, "title": "制作面团", "description": "500g高筋面粉加325ml水、10g盐、3g酵母，揉至光滑有弹性。"},
            {"order": 2, "title": "低温发酵", "description": "面团分4份揉圆，冷藏发酵24-48小时，风味更佳。"},
            {"order": 3, "title": "整形铺料", "description": "手推面团成薄饼，留1cm边沿，涂番茄酱铺新鲜马苏里拉。"},
            {"order": 4, "title": "高温烘烤", "description": "烤箱预热至最高温（约250°C），烤8-10分钟至边缘金黄起泡，出炉放罗勒叶。"}
        ]
    },
    {
        "id": "5",
        "title": "粤式虾饺皇",
        "description": "薄如蝉翼的水晶饺皮包裹鲜弹虾肉，解锁港式茶楼招牌点心。",
        "cover": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cantonese%20shrimp%20dumpling%20har%20gow%20bamboo%20steamer%20dim%20sum&image_size=landscape_4_3",
        "difficulty": "advanced",
        "rating": 4.6,
        "steps": [
            {"order": 1, "title": "制作澄面皮", "description": "澄面100g加生粉30g，沸水烫面快速搅拌，揉至透明光滑。"},
            {"order": 2, "title": "调制虾馅", "description": "鲜虾去壳拍扁加猪肥膘粒，盐糖胡椒粉调味，顺一个方向搅拌上劲。"},
            {"order": 3, "title": "包制成型", "description": "皮坯擀薄包入虾馅，捏出7-9道褶子，弯如梳子造型。"},
            {"order": 4, "title": "蒸制出锅", "description": "大火蒸5分钟至皮透明，刷少许油提亮，配红醋上桌。"}
        ]
    },
    {
        "id": "6",
        "title": "家常红烧肉",
        "description": "肥而不腻入口即化，掌握炒糖色与慢炖火候的黄金比例。",
        "cover": "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20braised%20pork%20belly%20hongshao%20rou%20glossy%20sauce%20white%20plate&image_size=landscape_4_3",
        "difficulty": "beginner",
        "rating": 4.4,
        "steps": [
            {"order": 1, "title": "处理五花肉", "description": "500g五花肉切3cm方块，冷水下锅焯水去血沫，捞出洗净。"},
            {"order": 2, "title": "炒糖色", "description": "冷油下冰糖30g，小火慢炒至琥珀色冒小泡，迅速下肉块翻炒上色。"},
            {"order": 3, "title": "加料炖煮", "description": "加生抽老抽料酒，注入热水没过肉面，放八角桂皮香叶，大火烧开转小火炖1小时。"},
            {"order": 4, "title": "收汁装盘", "description": "开大火收浓汤汁至挂肉，每块肉裹满酱汁，撒葱花装盘。"}
        ]
    }
]

SUBMISSIONS = {}

SUGGESTIONS_POOL = [
    "建议增加少许醋提鲜，让酸甜层次更加分明。",
    "火候可以再精准一些，避免过熟导致口感发柴。",
    "摆盘时注意色彩搭配，加入绿色蔬菜点缀增加视觉层次。",
    "调味料可适当减少，突出食材本身的鲜味。",
    "建议最后撒上香草碎，增添清新香气。",
    "汤汁收浓度可以再提升，让味道更加集中。",
    "可以尝试加入少许花椒油，增加风味的深度。",
    "食材切配大小不够均匀，建议统一规格提升口感一致性。",
    "出锅前淋上热油激香，能让整道菜的风味更上一层。",
    "建议搭配酸味酱汁，解腻的同时提升整体平衡感。",
    "烘焙时间可以缩短2-3分钟，保持内部湿润口感。",
    "糖的用量可以适当减少，突出自然的甜味。"
]

USERNAMES = ["美食达人小李", "厨神阿杰", "味蕾探险家", "家常大厨", "甜蜜烘焙师", "川味小王子", "素食主义猫", "深夜食堂长"]


def _get_submissions(course_id):
    if course_id not in SUBMISSIONS:
        SUBMISSIONS[course_id] = [
            {
                "id": str(uuid.uuid4()),
                "username": random.choice(USERNAMES),
                "image": f"https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cooked+{COURSES[int(course_id)-1]['title']}+dish+food+photography&image_size=landscape_4_3",
                "score": round(random.uniform(3.5, 4.9), 1),
                "createdAt": "2025-06-18T10:30:00Z"
            },
            {
                "id": str(uuid.uuid4()),
                "username": random.choice(USERNAMES),
                "image": f"https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=homemade+cooking+dish+plated+beautifully&image_size=landscape_4_3",
                "score": round(random.uniform(3.2, 4.7), 1),
                "createdAt": "2025-06-17T14:20:00Z"
            },
            {
                "id": str(uuid.uuid4()),
                "username": random.choice(USERNAMES),
                "image": f"https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=delicious+food+plating+gourmet+style&image_size=landscape_4_3",
                "score": round(random.uniform(3.0, 4.5), 1),
                "createdAt": "2025-06-16T09:15:00Z"
            }
        ]
    return SUBMISSIONS[course_id]


def _generate_scores():
    return {
        "sweet": round(random.uniform(2.5, 5.0), 1),
        "salty": round(random.uniform(2.5, 5.0), 1),
        "sour": round(random.uniform(2.0, 4.5), 1),
        "bitter": round(random.uniform(1.0, 3.5), 1),
        "umami": round(random.uniform(3.0, 5.0), 1),
        "appearance": round(random.uniform(2.5, 5.0), 1)
    }


def _generate_suggestions():
    return random.sample(SUGGESTIONS_POOL, k=min(3, len(SUGGESTIONS_POOL)))


@app.route("/api/courses", methods=["GET"])
def get_courses():
    search = request.args.get("search", "").lower()
    difficulty = request.args.get("difficulty", "")
    filtered = COURSES
    if search:
        filtered = [c for c in filtered if search in c["title"].lower() or search in c["description"].lower()]
    if difficulty:
        filtered = [c for c in filtered if c["difficulty"] == difficulty]
    result = []
    for c in filtered:
        result.append({
            "id": c["id"],
            "title": c["title"],
            "description": c["description"],
            "cover": c["cover"],
            "difficulty": c["difficulty"],
            "rating": c["rating"]
        })
    return jsonify(result)


@app.route("/api/courses/<course_id>", methods=["GET"])
def get_course_detail(course_id):
    course = next((c for c in COURSES if c["id"] == course_id), None)
    if not course:
        return jsonify({"error": "Course not found"}), 404
    submissions = _get_submissions(course_id)
    return jsonify({
        "id": course["id"],
        "title": course["title"],
        "description": course["description"],
        "cover": course["cover"],
        "difficulty": course["difficulty"],
        "rating": course["rating"],
        "steps": course["steps"],
        "submissions": sorted(submissions, key=lambda s: s["score"], reverse=True)
    })


@app.route("/api/courses/<course_id>/submit", methods=["POST"])
def submit_work(course_id):
    course = next((c for c in COURSES if c["id"] == course_id), None)
    if not course:
        return jsonify({"error": "Course not found"}), 404

    description = request.form.get("description", "")
    image_file = request.files.get("image")

    image_url = ""
    if image_file:
        image_url = f"https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=uploaded+cooked+{course['title']}+dish+food+photo&image_size=landscape_4_3"
    else:
        image_url = f"https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=cooked+{course['title']}+homemade+dish&image_size=landscape_4_3"

    scores = _generate_scores()
    overall = round(sum(scores.values()) / len(scores), 1)
    suggestions = _generate_suggestions()
    submission_id = str(uuid.uuid4())

    new_submission = {
        "id": submission_id,
        "username": "我",
        "image": image_url,
        "score": overall,
        "createdAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    }

    if course_id not in SUBMISSIONS:
        SUBMISSIONS[course_id] = []
    SUBMISSIONS[course_id].insert(0, new_submission)

    return jsonify({
        "submissionId": submission_id,
        "scores": scores,
        "suggestions": suggestions,
        "overallScore": overall
    })


@app.route("/api/courses/<course_id>/submissions", methods=["GET"])
def get_submissions(course_id):
    submissions = _get_submissions(course_id)
    return jsonify(sorted(submissions, key=lambda s: s["score"], reverse=True))


if __name__ == "__main__":
    app.run(debug=True, port=5000)
