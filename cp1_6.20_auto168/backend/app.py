from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime
from models import User, Item, Exchange, TrustReview, TimelineEvent, generate_id
import json

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

users = {}
items = {}
exchanges = {}
reviews = {}


def init_mock_data():
    users_data = [
        {"id": "user1", "name": "张小明", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix", "creditScore": 105},
        {"id": "user2", "name": "李小红", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Molly", "creditScore": 112},
        {"id": "user3", "name": "王大伟", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Max", "creditScore": 95},
        {"id": "user4", "name": "赵美丽", "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=Luna", "creditScore": 88},
    ]

    for u in users_data:
        users[u["id"]] = User(**u)

    items_data = [
        {
            "id": "item1", "userId": "user1", "title": "宜家实木餐桌",
            "category": "furniture", "conditionScore": 4,
            "description": "使用两年，轻微磨损，尺寸120x80cm，适合小户型家庭。因搬家转让，需自提。",
            "imagePaths": [
                "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=600",
                "https://images.unsplash.com/photo-1617806118233-18e1de247200?w=600"
            ]
        },
        {
            "id": "item2", "userId": "user2", "title": "《百年孤独》精装版",
            "category": "books", "conditionScore": 5,
            "description": "全新未拆封，马尔克斯经典著作，收藏佳品。",
            "imagePaths": ["https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=600"]
        },
        {
            "id": "item3", "userId": "user3", "title": "iPad Air 4代",
            "category": "electronics", "conditionScore": 3,
            "description": "2020款iPad Air，64G，深空灰色，屏幕有细微划痕，功能完好，配原装充电器。",
            "imagePaths": [
                "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=600",
                "https://images.unsplash.com/photo-1585790050230-5dd28404e1a9?w=600",
                "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600"
            ]
        },
        {
            "id": "item4", "userId": "user1", "title": "双立人刀具套装",
            "category": "kitchen", "conditionScore": 4,
            "description": "德国双立人刀具5件套，使用一年，刀刃锋利，附赠磨刀石。",
            "imagePaths": ["https://images.unsplash.com/photo-1593618998160-e34014e67546?w=600"]
        },
        {
            "id": "item5", "userId": "user4", "title": "北欧风装饰花瓶",
            "category": "decor", "conditionScore": 5,
            "description": "陶瓷花瓶，高30cm，极简设计，适合插花装饰，全新未使用。",
            "imagePaths": ["https://images.unsplash.com/photo-1578500494198-246f612d3b3d?w=600"]
        },
        {
            "id": "item6", "userId": "user2", "title": "瑜伽垫+瑜伽砖套装",
            "category": "other", "conditionScore": 4,
            "description": "TPE环保瑜伽垫8mm厚，配两块瑜伽砖，使用半年，清洁完好。",
            "imagePaths": ["https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=600"]
        }
    ]

    for item in items_data:
        items[item["id"]] = Item(**item)

    timeline_event = TimelineEvent(
        type='apply',
        date=datetime.now().isoformat(),
        description='李小红申请交换',
        userId='user2'
    )
    items["item1"].timelines.append(timeline_event)


def serialize(obj):
    if isinstance(obj, dict):
        return {k: serialize(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [serialize(v) for v in obj]
    elif hasattr(obj, '__dataclass_fields__'):
        return {k: serialize(v) for k, v in obj.__dict__.items()}
    else:
        return obj


@app.route('/api/items', methods=['GET'])
def get_items():
    category = request.args.get('category', 'all')
    condition = request.args.get('condition', '0')
    keyword = request.args.get('keyword', '')

    result = list(items.values())

    if category != 'all':
        result = [item for item in result if item.category == category]

    if int(condition) > 0:
        result = [item for item in result if item.conditionScore >= int(condition)]

    if keyword:
        keyword = keyword.lower()
        result = [item for item in result if
                  keyword in item.title.lower() or keyword in item.description.lower()]

    return jsonify(serialize(result))


@app.route('/api/items/<item_id>', methods=['GET'])
def get_item(item_id):
    if item_id in items:
        return jsonify(serialize(items[item_id]))
    return jsonify({"error": "Item not found"}), 404


@app.route('/api/items', methods=['POST'])
def create_item():
    data = request.json
    item_id = generate_id()
    data['id'] = item_id
    item = Item(**data)
    items[item_id] = item
    return jsonify(serialize(item)), 201


@app.route('/api/items/<item_id>', methods=['PUT'])
def update_item(item_id):
    if item_id not in items:
        return jsonify({"error": "Item not found"}), 404

    data = request.json
    item = items[item_id]

    for key, value in data.items():
        if hasattr(item, key):
            setattr(item, key, value)

    return jsonify(serialize(item))


@app.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    if user_id not in users:
        return jsonify({"error": "User not found"}), 404

    user = users[user_id]
    user_items = [item for item in items.values() if item.userId == user_id]
    user_exchanges = [
        exchange for exchange in exchanges.values()
        if exchange.fromUserId == user_id or exchange.toUserId == user_id
    ]

    result = {
        **serialize(user),
        "items": serialize(user_items),
        "exchanges": serialize(user_exchanges)
    }
    return jsonify(result)


@app.route('/api/users/<user_id>/credit', methods=['GET'])
def get_user_credit(user_id):
    if user_id not in users:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"creditScore": users[user_id].creditScore})


@app.route('/api/exchanges', methods=['POST'])
def create_exchange():
    data = request.json
    exchange_id = generate_id()
    data['id'] = exchange_id

    from_item = items.get(data['fromItemId'])
    to_item = items.get(data['toItemId'])

    if not from_item or not to_item:
        return jsonify({"error": "Item not found"}), 404

    data['fromUserId'] = from_item.userId
    data['toUserId'] = to_item.userId

    exchange = Exchange(**data)
    exchanges[exchange_id] = exchange

    timeline_event = TimelineEvent(
        type='apply',
        date=datetime.now().isoformat(),
        description=f'{users[data["fromUserId"]].name}申请交换',
        userId=data['fromUserId']
    )
    to_item.timelines.append(timeline_event)

    return jsonify(serialize(exchange)), 201


@app.route('/api/exchanges/pending/<user_id>', methods=['GET'])
def get_pending_exchanges(user_id):
    pending = [
        exchange for exchange in exchanges.values()
        if exchange.toUserId == user_id and exchange.status == 'pending'
    ]
    return jsonify(serialize(pending))


@app.route('/api/exchanges/<exchange_id>/approve', methods=['PUT'])
def approve_exchange(exchange_id):
    if exchange_id not in exchanges:
        return jsonify({"error": "Exchange not found"}), 404

    exchange = exchanges[exchange_id]
    exchange.status = 'approved'

    from_item = items[exchange.fromItemId]
    to_item = items[exchange.toItemId]

    from_item.status = 'exchanging'
    to_item.status = 'exchanging'

    from_event = TimelineEvent(
        type='approve',
        date=datetime.now().isoformat(),
        description='交换申请已批准，交换中',
        userId=exchange.toUserId
    )
    from_item.timelines.append(from_event)
    to_item.timelines.append(from_event)

    return jsonify(serialize(exchange))


@app.route('/api/exchanges/<exchange_id>/reject', methods=['PUT'])
def reject_exchange(exchange_id):
    if exchange_id not in exchanges:
        return jsonify({"error": "Exchange not found"}), 404

    exchange = exchanges[exchange_id]
    exchange.status = 'rejected'

    to_item = items[exchange.toItemId]
    timeline_event = TimelineEvent(
        type='approve',
        date=datetime.now().isoformat(),
        description='交换申请已拒绝',
        userId=exchange.toUserId
    )
    to_item.timelines.append(timeline_event)

    return jsonify(serialize(exchange))


@app.route('/api/exchanges/<exchange_id>/complete', methods=['PUT'])
def complete_exchange(exchange_id):
    if exchange_id not in exchanges:
        return jsonify({"error": "Exchange not found"}), 404

    exchange = exchanges[exchange_id]
    exchange.status = 'completed'

    from_item = items[exchange.fromItemId]
    to_item = items[exchange.toItemId]

    from_owner = from_item.currentOwnerId
    to_owner = to_item.currentOwnerId

    from_item.currentOwnerId = to_owner
    to_item.currentOwnerId = from_owner

    complete_event = TimelineEvent(
        type='complete',
        date=datetime.now().isoformat(),
        description='交换完成，等待确认',
        userId=exchange.fromUserId
    )
    from_item.timelines.append(complete_event)
    to_item.timelines.append(complete_event)

    return jsonify(serialize(exchange))


@app.route('/api/reviews', methods=['POST'])
def create_review():
    data = request.json
    review_id = generate_id()
    data['id'] = review_id
    review = TrustReview(**data)
    reviews[review_id] = review

    exchange = exchanges.get(data['exchangeId'])
    if exchange:
        from_item = items[exchange.fromItemId]
        to_item = items[exchange.toItemId]

        confirm_event = TimelineEvent(
            type='confirm',
            date=datetime.now().isoformat(),
            description=f'已收到{users[data["toUserId"]].name}的评价',
            userId=data['fromUserId']
        )
        from_item.timelines.append(confirm_event)
        to_item.timelines.append(confirm_event)

        if data['score'] >= 4:
            users[data['toUserId']].creditScore += 5
        else:
            users[data['toUserId']].creditScore -= 5

        all_reviews = [r for r in reviews.values() if r.exchangeId == data['exchangeId']]
        if len(all_reviews) >= 2:
            from_item.status = 'completed'
            to_item.status = 'completed'

    return jsonify(serialize(review)), 201


@app.route('/api/users', methods=['GET'])
def get_all_users():
    return jsonify(serialize(list(users.values())))


if __name__ == '__main__':
    init_mock_data()
    app.run(debug=True, port=5000)
