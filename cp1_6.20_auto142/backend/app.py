from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, date
import uuid

app = Flask(__name__)
CORS(app)

venues = [
    {
        "id": "v1",
        "name": "人民广场",
        "type": "square",
        "address": "上海市黄浦区人民大道120号",
        "lat": 31.2304,
        "lng": 121.4737,
        "photo": "https://images.unsplash.com/photo-1519501025264-65ba15a82390?w=400&h=200&fit=crop",
        "timeSlots": [
            {"id": "ts1", "startTime": "09:00", "endTime": "11:00", "available": True},
            {"id": "ts2", "startTime": "11:00", "endTime": "13:00", "available": False, "bookedBy": "a1"},
            {"id": "ts3", "startTime": "13:00", "endTime": "15:00", "available": True},
            {"id": "ts4", "startTime": "15:00", "endTime": "17:00", "available": True},
            {"id": "ts5", "startTime": "17:00", "endTime": "19:00", "available": False, "bookedBy": "a2"},
            {"id": "ts6", "startTime": "19:00", "endTime": "21:00", "available": True},
        ],
    },
    {
        "id": "v2",
        "name": "世纪公园",
        "type": "park",
        "address": "上海市浦东新区锦绣路1001号",
        "lat": 31.2156,
        "lng": 121.5463,
        "photo": "https://images.unsplash.com/photo-1585938389612-a552a28d6914?w=400&h=200&fit=crop",
        "timeSlots": [
            {"id": "ts7", "startTime": "08:00", "endTime": "10:00", "available": True},
            {"id": "ts8", "startTime": "10:00", "endTime": "12:00", "available": True},
            {"id": "ts9", "startTime": "14:00", "endTime": "16:00", "available": False, "bookedBy": "a3"},
            {"id": "ts10", "startTime": "16:00", "endTime": "18:00", "available": True},
            {"id": "ts11", "startTime": "18:00", "endTime": "20:00", "available": True},
        ],
    },
    {
        "id": "v3",
        "name": "陆家嘴地铁站",
        "type": "subway",
        "address": "上海市浦东新区世纪大道1号",
        "lat": 31.2397,
        "lng": 121.4998,
        "photo": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=200&fit=crop",
        "timeSlots": [
            {"id": "ts12", "startTime": "07:00", "endTime": "09:00", "available": False, "bookedBy": "a1"},
            {"id": "ts13", "startTime": "12:00", "endTime": "14:00", "available": True},
            {"id": "ts14", "startTime": "17:00", "endTime": "19:00", "available": True},
            {"id": "ts15", "startTime": "19:00", "endTime": "21:00", "available": False, "bookedBy": "a2"},
        ],
    },
    {
        "id": "v4",
        "name": "外滩观景平台",
        "type": "square",
        "address": "上海市黄浦区中山东一路",
        "lat": 31.2400,
        "lng": 121.4900,
        "photo": "https://images.unsplash.com/photo-1474181487882-5abf3f0ba6c2?w=400&h=200&fit=crop",
        "timeSlots": [
            {"id": "ts16", "startTime": "09:00", "endTime": "11:00", "available": True},
            {"id": "ts17", "startTime": "14:00", "endTime": "16:00", "available": True},
            {"id": "ts18", "startTime": "18:00", "endTime": "20:00", "available": False, "bookedBy": "a3"},
            {"id": "ts19", "startTime": "20:00", "endTime": "22:00", "available": True},
        ],
    },
    {
        "id": "v5",
        "name": "静安公园",
        "type": "park",
        "address": "上海市静安区南京西路1649号",
        "lat": 31.2245,
        "lng": 121.4480,
        "photo": "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400&h=200&fit=crop",
        "timeSlots": [
            {"id": "ts20", "startTime": "08:00", "endTime": "10:00", "available": True},
            {"id": "ts21", "startTime": "10:00", "endTime": "12:00", "available": False, "bookedBy": "a1"},
            {"id": "ts22", "startTime": "14:00", "endTime": "16:00", "available": True},
            {"id": "ts23", "startTime": "16:00", "endTime": "18:00", "available": True},
        ],
    },
    {
        "id": "v6",
        "name": "徐家汇地铁站",
        "type": "subway",
        "address": "上海市徐汇区虹桥路1号",
        "lat": 31.1947,
        "lng": 121.4365,
        "photo": "https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=400&h=200&fit=crop",
        "timeSlots": [
            {"id": "ts24", "startTime": "08:00", "endTime": "10:00", "available": True},
            {"id": "ts25", "startTime": "12:00", "endTime": "14:00", "available": False, "bookedBy": "a2"},
            {"id": "ts26", "startTime": "18:00", "endTime": "20:00", "available": True},
        ],
    },
]

artists = [
    {
        "id": "a1",
        "name": "吉他小王",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
        "bio": "街头吉他手，擅长民谣和流行音乐改编，从事街头表演5年，足迹遍布上海各个角落。喜欢用音乐传递温暖，希望每一位路过的听众都能找到属于自己的旋律。",
        "socialLinks": [
            {"platform": "抖音", "url": "https://douyin.com"},
            {"platform": "B站", "url": "https://bilibili.com"},
            {"platform": "微博", "url": "https://weibo.com"},
        ],
        "upcomingShows": [
            {"date": "2024-01-15", "startTime": "11:00", "endTime": "13:00", "venueName": "人民广场"},
            {"date": "2024-01-16", "startTime": "07:00", "endTime": "09:00", "venueName": "陆家嘴地铁站"},
            {"date": "2024-01-17", "startTime": "10:00", "endTime": "12:00", "venueName": "静安公园"},
            {"date": "2024-01-18", "startTime": "15:00", "endTime": "17:00", "venueName": "世纪公园"},
            {"date": "2024-01-20", "startTime": "19:00", "endTime": "21:00", "venueName": "外滩观景平台"},
        ],
    },
    {
        "id": "a2",
        "name": "街舞阿杰",
        "avatar": "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face",
        "bio": "职业街舞舞者，专攻Breaking和Popping，曾获全国街舞大赛亚军。热爱街头文化，相信舞蹈是最直接的艺术表达。",
        "socialLinks": [
            {"platform": "抖音", "url": "https://douyin.com"},
            {"platform": "小红书", "url": "https://xiaohongshu.com"},
        ],
        "upcomingShows": [
            {"date": "2024-01-15", "startTime": "17:00", "endTime": "19:00", "venueName": "人民广场"},
            {"date": "2024-01-16", "startTime": "19:00", "endTime": "21:00", "venueName": "陆家嘴地铁站"},
            {"date": "2024-01-17", "startTime": "14:00", "endTime": "16:00", "venueName": "徐家汇地铁站"},
            {"date": "2024-01-19", "startTime": "16:00", "endTime": "18:00", "venueName": "世纪公园"},
        ],
    },
    {
        "id": "a3",
        "name": "小提琴小雅",
        "avatar": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
        "bio": "古典小提琴手，毕业于上海音乐学院。致力于将古典音乐带给更多人，常在公园和广场演奏经典曲目和原创作品。",
        "socialLinks": [
            {"platform": "B站", "url": "https://bilibili.com"},
            {"platform": "微博", "url": "https://weibo.com"},
        ],
        "upcomingShows": [
            {"date": "2024-01-15", "startTime": "14:00", "endTime": "16:00", "venueName": "世纪公园"},
            {"date": "2024-01-16", "startTime": "18:00", "endTime": "20:00", "venueName": "外滩观景平台"},
            {"date": "2024-01-18", "startTime": "10:00", "endTime": "12:00", "venueName": "静安公园"},
        ],
    },
]

bookings = [
    {
        "id": "b1",
        "venueId": "v2",
        "venueName": "世纪公园",
        "artistId": "a1",
        "artistName": "吉他小王",
        "date": "2024-01-16",
        "startTime": "15:00",
        "endTime": "17:00",
        "status": "confirmed",
    },
    {
        "id": "b2",
        "venueId": "v4",
        "venueName": "外滩观景平台",
        "artistId": "a1",
        "artistName": "吉他小王",
        "date": "2024-01-20",
        "startTime": "19:00",
        "endTime": "21:00",
        "status": "confirmed",
    },
]

reviews = [
    {
        "id": "r1",
        "artistId": "a1",
        "userId": "u1",
        "userName": "音乐爱好者小明",
        "userAvatar": "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
        "rating": 5,
        "comment": "今天路过人民广场，被小王的吉他声深深吸引了！《成都》改编得特别有味道，唱得也很有感情。希望以后能常来表演！",
        "date": "2024-01-10",
        "reply": "感谢支持！下周还会来人民广场，敬请期待~",
        "replyDate": "2024-01-10",
    },
    {
        "id": "r2",
        "artistId": "a1",
        "userId": "u2",
        "userName": "路过的旅人",
        "userAvatar": "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
        "rating": 4,
        "comment": "弹得很棒！就是今天风有点大，声音听得不太清楚。建议下次可以带个小音箱~",
        "date": "2024-01-08",
    },
    {
        "id": "r3",
        "artistId": "a2",
        "userId": "u3",
        "userName": "街舞迷弟",
        "userAvatar": "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
        "rating": 5,
        "comment": "阿杰的breaking太炸了！托马斯全旋超级稳，现场气氛超嗨。支持支持！",
        "date": "2024-01-12",
        "reply": "谢谢兄弟！继续加油！",
        "replyDate": "2024-01-12",
    },
]

users = {
    "u_artist_1": {
        "id": "u_artist_1",
        "name": "吉他小王",
        "avatar": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
        "role": "artist",
    }
}


def find_venue(venue_id):
    for v in venues:
        if v["id"] == venue_id:
            return v
    return None


def find_timeslot(venue, slot_id):
    for s in venue["timeSlots"]:
        if s["id"] == slot_id:
            return s
    return None


@app.route("/api/venues", methods=["GET"])
def get_venues():
    return jsonify(venues)


@app.route("/api/venues/<venue_id>", methods=["GET"])
def get_venue(venue_id):
    venue = find_venue(venue_id)
    if not venue:
        return jsonify({"error": "场地不存在"}), 404
    return jsonify(venue)


@app.route("/api/artists/<artist_id>", methods=["GET"])
def get_artist(artist_id):
    for artist in artists:
        if artist["id"] == artist_id:
            return jsonify(artist)
    return jsonify({"error": "艺人不存在"}), 404


@app.route("/api/bookings", methods=["GET"])
def get_bookings():
    user_id = request.args.get("userId", "u_artist_1")
    user_bookings = [b for b in bookings if b["artistId"] == user_id]
    return jsonify(user_bookings)


@app.route("/api/bookings/today", methods=["GET"])
def get_today_performances():
    today = date.today().isoformat()
    today_bookings = [b for b in bookings if b["date"] == today]
    
    if not today_bookings:
        today_bookings = []
        for venue in venues:
            for slot in venue["timeSlots"]:
                if not slot["available"] and slot.get("bookedBy"):
                    artist = next((a for a in artists if a["id"] == slot["bookedBy"]), None)
                    today_bookings.append({
                        "id": f"{venue['id']}_{slot['id']}",
                        "venueId": venue["id"],
                        "venueName": venue["name"],
                        "artistId": slot["bookedBy"],
                        "artistName": artist["name"] if artist else "未知艺人",
                        "date": today,
                        "startTime": slot["startTime"],
                        "endTime": slot["endTime"],
                        "status": "confirmed",
                    })
    
    return jsonify(today_bookings)


@app.route("/api/bookings", methods=["POST"])
def create_booking():
    data = request.get_json()
    venue_id = data.get("venueId")
    time_slot_id = data.get("timeSlotId")
    booking_date = data.get("date", date.today().isoformat())
    user_id = data.get("userId", "u_artist_1")
    user_name = data.get("userName", "吉他小王")

    venue = find_venue(venue_id)
    if not venue:
        return jsonify({"success": False, "message": "场地不存在"}), 404

    slot = find_timeslot(venue, time_slot_id)
    if not slot:
        return jsonify({"success": False, "message": "时间段不存在"}), 404

    if not slot["available"]:
        return jsonify({"success": False, "message": "该时间段已被预约"}), 400

    slot["available"] = False
    slot["bookedBy"] = user_id

    new_booking = {
        "id": f"b_{uuid.uuid4().hex[:8]}",
        "venueId": venue_id,
        "venueName": venue["name"],
        "artistId": user_id,
        "artistName": user_name,
        "date": booking_date,
        "startTime": slot["startTime"],
        "endTime": slot["endTime"],
        "status": "confirmed",
    }
    bookings.append(new_booking)

    return jsonify({
        "success": True,
        "message": "预约成功！",
        "booking": new_booking,
    })


@app.route("/api/bookings/<booking_id>", methods=["DELETE"])
def cancel_booking(booking_id):
    global bookings
    booking = next((b for b in bookings if b["id"] == booking_id), None)
    if not booking:
        return jsonify({"success": False, "message": "预约不存在"}), 404

    venue = find_venue(booking["venueId"])
    if venue:
        for slot in venue["timeSlots"]:
            if slot["startTime"] == booking["startTime"] and slot["endTime"] == booking["endTime"]:
                slot["available"] = True
                slot.pop("bookedBy", None)
                break

    bookings = [b for b in bookings if b["id"] != booking_id]
    return jsonify({"success": True, "message": "预约已取消"})


@app.route("/api/reviews/artist/<artist_id>", methods=["GET"])
def get_artist_reviews(artist_id):
    artist_reviews = [r for r in reviews if r["artistId"] == artist_id]
    artist_reviews.sort(key=lambda r: r["date"], reverse=True)
    return jsonify(artist_reviews)


@app.route("/api/reviews", methods=["POST"])
def add_review():
    data = request.get_json()
    artist_id = data.get("artistId")
    rating = data.get("rating")
    comment = data.get("comment", "")
    user_id = data.get("userId", "u_current")
    user_name = data.get("userName", "当前用户")
    user_avatar = data.get("userAvatar", "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face")

    if not artist_id or not rating or not comment:
        return jsonify({"success": False, "message": "缺少必要参数"}), 400

    if rating < 1 or rating > 5:
        return jsonify({"success": False, "message": "评分必须在1-5之间"}), 400

    new_review = {
        "id": f"r_{uuid.uuid4().hex[:8]}",
        "artistId": artist_id,
        "userId": user_id,
        "userName": user_name,
        "userAvatar": user_avatar,
        "rating": rating,
        "comment": comment,
        "date": date.today().isoformat(),
    }
    reviews.append(new_review)

    return jsonify({
        "success": True,
        "review": new_review,
    })


@app.route("/api/reviews/<review_id>/reply", methods=["POST"])
def reply_review(review_id):
    data = request.get_json()
    reply_text = data.get("reply", "")

    review = next((r for r in reviews if r["id"] == review_id), None)
    if not review:
        return jsonify({"success": False, "message": "评价不存在"}), 404

    if not reply_text:
        return jsonify({"success": False, "message": "回复内容不能为空"}), 400

    review["reply"] = reply_text
    review["replyDate"] = date.today().isoformat()

    return jsonify({"success": True, "message": "回复成功"})


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json()
    user_id = data.get("userId", "u_artist_1")
    
    user = users.get(user_id)
    if not user:
        return jsonify({"success": False, "message": "用户不存在"}), 404

    return jsonify({
        "success": True,
        "user": user,
    })


@app.route("/api/health", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "timestamp": datetime.now().isoformat()})


if __name__ == "__main__":
    print("🚀 Street Stage API Server starting on port 5000...")
    print(f"📋 {len(venues)} venues loaded")
    print(f"🎭 {len(artists)} artists loaded")
    print(f"📅 {len(bookings)} bookings loaded")
    print(f"⭐ {len(reviews)} reviews loaded")
    app.run(debug=True, port=5000)
