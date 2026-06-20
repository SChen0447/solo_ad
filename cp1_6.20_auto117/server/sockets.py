from flask_socketio import emit
from models import db, Message, Item
from utils import generate_id


def register_socket_events(socketio):

    @socketio.on('chat_message')
    def handle_chat_message(data):
        item_id = data.get('item_id')
        from_user_id = data.get('from_user_id')
        to_user_id = data.get('to_user_id')
        content = data.get('content', '')

        if not item_id or not from_user_id or not to_user_id or not content:
            return

        msg = Message(
            id=generate_id(),
            item_id=item_id,
            from_user_id=from_user_id,
            to_user_id=to_user_id,
            content=content,
        )
        db.session.add(msg)
        db.session.commit()

        emit('chat_message', msg.to_dict(), broadcast=True)

    @socketio.on('new_inquiry')
    def handle_new_inquiry(data):
        item_id = data.get('item_id')
        from_user_id = data.get('from_user_id')

        if not item_id or not from_user_id:
            return

        item = Item.query.get(item_id)
        if item:
            emit('new_inquiry', {
                'item_id': item_id,
                'item_title': item.title,
                'from_user_id': from_user_id,
                'to_user_id': item.user_id,
            }, broadcast=True)
