from flask import Blueprint, request, jsonify
from models import db, Message, Item, User
from utils import generate_id
from routes.auth import login_required

messages_bp = Blueprint('messages', __name__)


@messages_bp.route('/api/messages', methods=['GET'])
@login_required
def list_conversations():
    user_id = request.current_user.id

    conversations = (
        db.session.query(
            Message.item_id,
            db.func.max(Message.timestamp).label('last_time'),
        )
        .filter((Message.from_user_id == user_id) | (Message.to_user_id == user_id))
        .group_by(Message.item_id)
        .order_by(db.func.max(Message.timestamp).desc())
        .all()
    )

    result = []
    for conv in conversations:
        item = Item.query.get(conv.item_id)
        last_msg = (
            Message.query
            .filter(Message.item_id == conv.item_id)
            .order_by(Message.timestamp.desc())
            .first()
        )
        other_user_id = last_msg.from_user_id if last_msg.from_user_id != user_id else last_msg.to_user_id
        other_user = User.query.get(other_user_id)
        unread_count = (
            Message.query
            .filter(
                Message.item_id == conv.item_id,
                Message.to_user_id == user_id,
                Message.read == False,
            )
            .count()
        )
        result.append({
            'item_id': conv.item_id,
            'item': item.to_dict() if item else None,
            'other_user': other_user.to_dict() if other_user else None,
            'last_message': last_msg.to_dict() if last_msg else None,
            'unread_count': unread_count,
        })

    return jsonify(result)


@messages_bp.route('/api/messages/<item_id>', methods=['GET'])
@login_required
def get_messages(item_id):
    user_id = request.current_user.id
    messages = (
        Message.query
        .filter(Message.item_id == item_id)
        .order_by(Message.timestamp.asc())
        .all()
    )

    for msg in messages:
        if msg.to_user_id == user_id and not msg.read:
            msg.read = True
    db.session.commit()

    return jsonify([m.to_dict() for m in messages])


@messages_bp.route('/api/messages', methods=['POST'])
@login_required
def send_message():
    user = request.current_user
    data = request.get_json() or {}
    item_id = data.get('item_id', '').strip()
    to_user_id = data.get('to_user_id', '').strip()
    content = data.get('content', '').strip()

    if not item_id or not to_user_id or not content:
        return jsonify({'error': '缺少必要参数'}), 400

    item = Item.query.get(item_id)
    if not item:
        return jsonify({'error': '商品不存在'}), 404

    msg = Message(
        id=generate_id(),
        item_id=item_id,
        from_user_id=user.id,
        to_user_id=to_user_id,
        content=content,
    )
    db.session.add(msg)
    db.session.commit()

    return jsonify(msg.to_dict()), 201
