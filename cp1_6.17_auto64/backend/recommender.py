import random
from typing import List, Dict

BOOKS_DB: List[Dict] = [
    {
        "id": 1,
        "title": "三体",
        "author": "刘慈欣",
        "tags": ["科幻", "悬疑", "太空"],
        "rating": 9.3,
        "cover": "https://picsum.photos/seed/book1/300/420",
        "description": "地球文明向宇宙发出的第一声啼鸣，引来三体世界的目光。当三体舰队即将抵达地球，人类将何去何从？",
        "pages": 302
    },
    {
        "id": 2,
        "title": "人类简史",
        "author": "尤瓦尔·赫拉利",
        "tags": ["历史", "社科", "人文"],
        "rating": 9.1,
        "cover": "https://picsum.photos/seed/book2/300/420",
        "description": "从认知革命、农业革命到科学革命，人类究竟是如何一步步走上食物链顶端的？",
        "pages": 440
    },
    {
        "id": 3,
        "title": "白夜行",
        "author": "东野圭吾",
        "tags": ["推理", "悬疑", "日本文学"],
        "rating": 9.2,
        "cover": "https://picsum.photos/seed/book3/300/420",
        "description": "一段跨越十九年的悲凉守望，雪穗与亮司的命运在黑暗中交织缠绕。",
        "pages": 538
    },
    {
        "id": 4,
        "title": "明朝那些事儿",
        "author": "当年明月",
        "tags": ["历史", "中国史", "通俗"],
        "rating": 9.1,
        "cover": "https://picsum.photos/seed/book4/300/420",
        "description": "用诙谐幽默的笔触，讲述明朝三百年兴衰荣辱，历史原来可以这么好看。",
        "pages": 2160
    },
    {
        "id": 5,
        "title": "百年孤独",
        "author": "加西亚·马尔克斯",
        "tags": ["魔幻现实主义", "文学经典", "拉美文学"],
        "rating": 9.3,
        "cover": "https://picsum.photos/seed/book5/300/420",
        "description": "马孔多小镇上布恩迪亚家族七代人的传奇故事，一个世纪的风雨飘摇。",
        "pages": 360
    },
    {
        "id": 6,
        "title": "沙丘",
        "author": "弗兰克·赫伯特",
        "tags": ["科幻", "太空", "史诗"],
        "rating": 8.8,
        "cover": "https://picsum.photos/seed/book6/300/420",
        "description": "在黄沙漫天的厄拉科斯星球上，香料、权力、命运交织成一部恢宏的太空史诗。",
        "pages": 680
    },
    {
        "id": 7,
        "title": "嫌疑人X的献身",
        "author": "东野圭吾",
        "tags": ["推理", "悬疑", "日本文学"],
        "rating": 9.0,
        "cover": "https://picsum.photos/seed/book7/300/420",
        "description": "这是我能想到最纯粹的爱情，最好的诡计。天才数学家石神的终极献身。",
        "pages": 251
    },
    {
        "id": 8,
        "title": "万历十五年",
        "author": "黄仁宇",
        "tags": ["历史", "中国史", "明朝"],
        "rating": 9.0,
        "cover": "https://picsum.photos/seed/book8/300/420",
        "description": "一个看似平淡无奇的年份，却暗藏着大明王朝由盛转衰的玄机。",
        "pages": 286
    },
    {
        "id": 9,
        "title": "1984",
        "author": "乔治·奥威尔",
        "tags": ["反乌托邦", "科幻", "政治"],
        "rating": 9.4,
        "cover": "https://picsum.photos/seed/book9/300/420",
        "description": "老大哥在看着你。一部关于极权主义的惊世预言，至今振聋发聩。",
        "pages": 304
    },
    {
        "id": 10,
        "title": "解忧杂货店",
        "author": "东野圭吾",
        "tags": ["治愈", "日本文学", "温情"],
        "rating": 8.5,
        "cover": "https://picsum.photos/seed/book10/300/420",
        "description": "僻静街道旁的一家杂货店，只要写下烦恼投进卷帘门的投信口，第二天就会在店后的牛奶箱里得到回答。",
        "pages": 291
    },
    {
        "id": 11,
        "title": "活着",
        "author": "余华",
        "tags": ["文学经典", "中国文学", "人生"],
        "rating": 9.4,
        "cover": "https://picsum.photos/seed/book11/300/420",
        "description": "讲述了农村人福贵悲惨的人生遭遇。苦难背后是对生命意义的深刻思考。",
        "pages": 191
    },
    {
        "id": 12,
        "title": "未来简史",
        "author": "尤瓦尔·赫拉利",
        "tags": ["社科", "未来", "人文"],
        "rating": 8.7,
        "cover": "https://picsum.photos/seed/book12/300/420",
        "description": "当人类战胜了饥荒、瘟疫和战争，接下来的目标会是什么？永生、幸福还是成神？",
        "pages": 406
    },
    {
        "id": 13,
        "title": "无人生还",
        "author": "阿加莎·克里斯蒂",
        "tags": ["推理", "悬疑", "经典"],
        "rating": 8.7,
        "cover": "https://picsum.photos/seed/book13/300/420",
        "description": "十个互不相识的人被邀请到一座孤岛，然后一个接一个地死去……",
        "pages": 250
    },
    {
        "id": 14,
        "title": "苏菲的世界",
        "author": "乔斯坦·贾德",
        "tags": ["哲学", "启蒙", "文学"],
        "rating": 8.8,
        "cover": "https://picsum.photos/seed/book14/300/420",
        "description": "14岁的少女苏菲不断接到一些极不寻常的来信，世界像谜团一般在她眼底展开。",
        "pages": 528
    },
    {
        "id": 15,
        "title": "基督山伯爵",
        "author": "大仲马",
        "tags": ["文学经典", "复仇", "法国文学"],
        "rating": 9.2,
        "cover": "https://picsum.photos/seed/book15/300/420",
        "description": "爱德蒙·唐泰斯被诬陷入狱，十四年后逃出生天，开始了一场惊心动魄的复仇。",
        "pages": 1475
    },
    {
        "id": 16,
        "title": "安德的游戏",
        "author": "奥森·斯科特·卡德",
        "tags": ["科幻", "太空", "军事"],
        "rating": 8.8,
        "cover": "https://picsum.photos/seed/book16/300/420",
        "description": "天才少年安德在战斗学校中的成长历程，关乎人类文明的存亡之战。",
        "pages": 328
    },
    {
        "id": 17,
        "title": "追风筝的人",
        "author": "卡勒德·胡赛尼",
        "tags": ["文学", "成长", "阿富汗"],
        "rating": 8.9,
        "cover": "https://picsum.photos/seed/book17/300/420",
        "description": "关于友谊、背叛、救赎的故事。为你，千千万万遍。",
        "pages": 362
    },
    {
        "id": 18,
        "title": "国史大纲",
        "author": "钱穆",
        "tags": ["历史", "中国史", "学术"],
        "rating": 9.3,
        "cover": "https://picsum.photos/seed/book18/300/420",
        "description": "钱穆先生的代表作，一部中华民族的通史，读之令人对国史有温情与敬意。",
        "pages": 890
    }
]

ALL_TAGS: List[str] = [
    "科幻", "历史", "推理", "悬疑", "文学经典", "中国文学", "日本文学",
    "社科", "人文", "太空", "反乌托邦", "治愈", "哲学", "复仇", "成长",
    "魔幻现实主义", "通俗", "中国史", "未来", "经典", "温情"
]


def _calculate_tag_score(book_tags: List[str], selected_tags: List[str]) -> int:
    return len(set(book_tags) & set(selected_tags)) * 10


def _calculate_history_score(book_tags: List[str], history_tags: List[str]) -> int:
    if not history_tags:
        return 0
    return len(set(book_tags) & set(history_tags)) * 5


def recommend_books(selected_tags: List[str], exclude_ids: List[int], read_history: List[Dict], count: int = 6) -> List[Dict]:
    candidates = [b for b in BOOKS_DB if b["id"] not in exclude_ids]

    history_tags = []
    for item in read_history:
        book = next((b for b in BOOKS_DB if b["id"] == item["id"]), None)
        if book:
            history_tags.extend(book["tags"])

    scored = []
    for book in candidates:
        tag_score = _calculate_tag_score(book["tags"], selected_tags)
        hist_score = _calculate_history_score(book["tags"], history_tags)
        rating_score = book["rating"]
        total = tag_score + hist_score + rating_score
        scored.append((total, random.random(), book))

    scored.sort(key=lambda x: (-x[0], -x[1]))
    return [s[2] for s in scored[:count]]


def get_all_tags() -> List[str]:
    return ALL_TAGS


def get_book_by_id(book_id: int):
    return next((b for b in BOOKS_DB if b["id"] == book_id), None)
