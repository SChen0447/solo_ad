import hashlib
from urllib.parse import quote
from models import (
    create_user,
    create_track,
    create_studio,
    create_danmaku,
    is_table_empty,
)


def hash_password(password):
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def seed_data():
    if not is_table_empty("users"):
        return

    uid_luna = create_user(
        "luna_echo", "luna@indie.wav", hash_password("password123"), is_musician=1
    )
    uid_owl = create_user(
        "night_owl", "owl@indie.wav", hash_password("password123"), is_musician=0
    )

    tracks_data = [
        {
            "title": "月光信箱",
            "artist": "Luna Echo",
            "cover_prompt": "dreamy moonlight mailbox indie album cover, soft purple and blue tones, hand-drawn style",
            "lyrics": "月光洒在旧信箱\n晚风轻抚过往\n谁的名字还在等\n一封不会寄出的信\n\n邮戳印着昨天的月\n邮票贴着思念的雪\n我在时光的缝隙里\n等一个回音",
        },
        {
            "title": "橘子海",
            "artist": "Luna Echo",
            "cover_prompt": "orange sunset ocean beach indie album cover, warm orange and pink tones, watercolor style",
            "lyrics": "橘色的海浪拍打着沙滩\n你说夏天的味道像汽水\n我们坐在礁石上\n看夕阳沉入海平线\n\n橘子味的晚风\n吹散了所有忧愁\n那一刻世界很小\n小到只装得下你我",
        },
        {
            "title": "猫咪与黑胶",
            "artist": "Luna Echo",
            "cover_prompt": "cute cat sitting next to vinyl record player, cozy room, warm lighting, indie album art",
            "lyrics": "黑胶转着老调\n猫咪趴在窗台\n雨滴敲打节奏\n咖啡慢慢变凉\n\n你说生活就像这张唱片\n每一圈都是不同的风景\n我握着你的手\n听时光轻轻转",
        },
        {
            "title": "银河便利店",
            "artist": "Luna Echo",
            "cover_prompt": "convenience store in galaxy space, neon lights, stars, indie album cover, retro futuristic",
            "lyrics": "银河尽头有家便利店\n卖着收集来的星光\n我买了一罐月亮\n想寄给远方的你\n\n货架上摆满了心愿\n每个瓶子装着不同颜色的梦\n你的那瓶是蓝色的\n因为你说蓝色最温柔",
        },
        {
            "title": "云朵面包房",
            "artist": "Luna Echo",
            "cover_prompt": "bakery shop on clouds, pastel colors, cute bread and pastries floating, dreamy indie album cover",
            "lyrics": "云朵做的面包\n入口即化的温柔\n我开了一家店\n在天上第二层\n\n每个路过的人\n都带走一片柔软\n你说生活太硬\n那就来我的面包房",
        },
        {
            "title": "午夜电台",
            "artist": "Luna Echo",
            "cover_prompt": "vintage radio in dark room with moonlight, cassette tapes, lo-fi aesthetic, indie album cover",
            "lyrics": "调频到午夜的频道\n听陌生人说自己的故事\n有人失恋有人想念\n有人只是不想睡\n\n电波穿过城市的夜\n连接每个孤独的耳朵\n这一刻我们不寂寞\n因为有人在听",
        },
    ]

    base_cover_url = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt={}&image_size=square"
    track_ids = []
    for t in tracks_data:
        cover_url = base_cover_url.format(quote(t["cover_prompt"]))
        tid = create_track(t["title"], t["artist"], cover_url, "", t["lyrics"], uid_luna)
        track_ids.append(tid)

    create_studio(track_ids[0], uid_luna, duration=1800)
    create_studio(track_ids[2], uid_luna, duration=2400)

    danmakus_data = [
        (track_ids[0], "这段旋律太美了！", "夜行者"),
        (track_ids[0], "月光信箱，永远的神", "星河漫步"),
        (track_ids[0], "听哭了...", "雨中漫步"),
        (track_ids[1], "橘子海！夏日必备", "海边拾贝"),
        (track_ids[1], "这首歌让我想起了夏天", "晚风轻吟"),
        (track_ids[2], "猫咪和黑胶，绝配", "猫奴一号"),
        (track_ids[2], "我家的猫也在听", "橘座驾到"),
        (track_ids[3], "银河便利店，我要买星星", "追星人"),
        (track_ids[4], "云朵面包房也太可爱了吧", "甜品控"),
        (track_ids[5], "午夜电台陪我度过了无数个夜晚", "夜猫子"),
    ]
    for track_id, content, nickname in danmakus_data:
        create_danmaku(track_id, content, nickname)

    print("Seed data inserted successfully.")
