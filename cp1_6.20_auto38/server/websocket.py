from datetime import datetime
from flask import request
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_jwt_extended import decode_token
from models import db, Artwork, Bid

socketio = SocketIO(cors_allowed_origins="*", async_mode='eventlet')

active_rooms = set()

def get_user_from_token():
    auth_header = request.headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:]
        try:
            decoded = decode_token(token)
            user_id = decoded.get('sub')
            user = db.get_user_by_id(user_id)
            return user
        except Exception:
            return None
    return None

@socketio.on('connect')
def handle_connect():
    print(f"Client connected: {request.sid}")
    emit('connection_status', {'status': 'connected', 'sid': request.sid})

@socketio.on('disconnect')
def handle_disconnect():
    print(f"Client disconnected: {request.sid}")
    for room in list(active_rooms):
        leave_room(room)

@socketio.on('join_auction')
def handle_join_auction(data):
    artwork_id = data.get('artwork_id')
    if artwork_id:
        join_room(f'auction_{artwork_id}')
        active_rooms.add(f'auction_{artwork_id}')
        print(f"Client {request.sid} joined auction room for artwork {artwork_id}")
        
        artwork = db.artworks.get(artwork_id)
        if artwork and artwork.is_auctioning and artwork.auction_end_time:
            remaining = int((artwork.auction_end_time - datetime.utcnow()).total_seconds())
            emit('countdown_update', {
                'artwork_id': artwork_id,
                'remaining_seconds': max(0, remaining)
            }, room=f'auction_{artwork_id}')

@socketio.on('leave_auction')
def handle_leave_auction(data):
    artwork_id = data.get('artwork_id')
    if artwork_id:
        leave_room(f'auction_{artwork_id}')
        print(f"Client {request.sid} left auction room for artwork {artwork_id}")

@socketio.on('place_bid')
def handle_place_bid(data):
    user = get_user_from_token()
    if not user:
        emit('bid_error', {'message': '请先登录'}, room=request.sid)
        return
    
    artwork_id = data.get('artwork_id')
    amount = float(data.get('amount', 0))
    
    artwork = db.artworks.get(artwork_id)
    if not artwork:
        emit('bid_error', {'message': '拍品不存在'}, room=request.sid)
        return
    
    if not artwork.is_auctioning:
        emit('bid_error', {'message': '拍卖已结束'}, room=request.sid)
        return
    
    if amount <= artwork.current_price:
        emit('bid_error', {'message': '出价必须高于当前价格'}, room=request.sid)
        return
    
    if artwork.place_bid(amount, user.id, user.nickname):
        bid = Bid(artwork_id, artwork.title, user.id, user.nickname, amount)
        db.add_bid(bid)
        
        remaining = int((artwork.auction_end_time - datetime.utcnow()).total_seconds())
        
        bid_data = {
            'artwork_id': artwork_id,
            'amount': amount,
            'bidder_id': user.id,
            'bidder_name': user.nickname,
            'bidder_avatar': user.avatar,
            'timestamp': datetime.utcnow().isoformat(),
            'remaining_seconds': max(0, remaining)
        }
        
        emit('bid_update', bid_data, room=f'auction_{artwork_id}')
        emit('bid_update', bid_data, room='auction_lobby')
        
        print(f"Bid placed on {artwork_id}: {amount} by {user.nickname}")
    else:
        emit('bid_error', {'message': '出价失败'}, room=request.sid)

@socketio.on('join_lobby')
def handle_join_lobby():
    join_room('auction_lobby')
    print(f"Client {request.sid} joined auction lobby")

@socketio.on('leave_lobby')
def handle_leave_lobby():
    leave_room('auction_lobby')

def broadcast_countdown(artwork_id, remaining_seconds):
    room = f'auction_{artwork_id}'
    emit('countdown_update', {
        'artwork_id': artwork_id,
        'remaining_seconds': remaining_seconds
    }, room=room)
    emit('countdown_update', {
        'artwork_id': artwork_id,
        'remaining_seconds': remaining_seconds
    }, room='auction_lobby')

def broadcast_auction_end(artwork_id, winner_id, winner_name, amount):
    room = f'auction_{artwork_id}'
    end_data = {
        'artwork_id': artwork_id,
        'winner_id': winner_id,
        'winner_name': winner_name,
        'final_price': amount
    }
    emit('auction_end', end_data, room=room)
    emit('auction_end', end_data, room='auction_lobby')
    print(f"Auction ended for {artwork_id}: winner {winner_name} at {amount}")
