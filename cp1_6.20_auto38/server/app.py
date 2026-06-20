import os
import threading
import time
from datetime import datetime
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity

from models import db, User, Gallery, Artwork
from mock_data import generate_mock_data
from websocket import socketio, broadcast_countdown, broadcast_auction_end

app = Flask(__name__)
app.config['JWT_SECRET_KEY'] = 'virtual-gallery-secret-key-2024'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400

CORS(app, supports_credentials=True)
JWTManager(app)
socketio.init_app(app)

generate_mock_data()

def countdown_worker():
    while True:
        try:
            now = datetime.utcnow()
            for artwork in list(db.artworks.values()):
                if artwork.is_auctioning and artwork.auction_end_time:
                    remaining = int((artwork.auction_end_time - now).total_seconds())
                    if remaining <= 0:
                        artwork.end_auction()
                        if artwork.highest_bidder:
                            broadcast_auction_end(
                                artwork.id,
                                artwork.highest_bidder,
                                artwork.highest_bidder_name,
                                artwork.current_price
                            )
                    elif remaining % 1 == 0:
                        broadcast_countdown(artwork.id, remaining)
        except Exception as e:
            print(f"Countdown worker error: {e}")
        time.sleep(1)

threading.Thread(target=countdown_worker, daemon=True).start()

@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    nickname = data.get('nickname', '')
    
    if not username or not password:
        return jsonify({'message': '用户名和密码不能为空'}), 400
    
    if len(username) < 3:
        return jsonify({'message': '用户名至少3个字符'}), 400
    
    if len(password) < 6:
        return jsonify({'message': '密码至少6个字符'}), 400
    
    if db.get_user_by_username(username):
        return jsonify({'message': '用户名已存在'}), 400
    
    user = User(username, password, nickname)
    db.add_user(user)
    
    access_token = create_access_token(identity=user.id)
    
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 201

@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '').strip()
    password = data.get('password', '')
    
    user = db.get_user_by_username(username)
    
    if not user or not user.check_password(password):
        return jsonify({'message': '用户名或密码错误'}), 401
    
    access_token = create_access_token(identity=user.id)
    
    return jsonify({
        'access_token': access_token,
        'user': user.to_dict()
    }), 200

@app.route('/api/galleries', methods=['GET'])
def get_galleries():
    galleries = db.get_public_galleries()
    galleries_sorted = sorted(galleries, key=lambda g: g.created_at, reverse=True)
    
    result = []
    for gallery in galleries_sorted:
        g_dict = gallery.to_dict()
        user_galleries = db.get_user_galleries(gallery.author_id)
        g_dict['authorGalleriesCount'] = len(user_galleries)
        result.append(g_dict)
    
    return jsonify(result), 200

@app.route('/api/galleries/<gallery_id>', methods=['GET'])
def get_gallery(gallery_id):
    gallery = db.galleries.get(gallery_id)
    if not gallery:
        return jsonify({'message': '画廊不存在'}), 404
    
    if not gallery.is_public:
        return jsonify({'message': '该画廊未公开'}), 403
    
    result = gallery.to_dict()
    result['artworks'] = [a.to_dict() for a in gallery.artworks]
    
    return jsonify(result), 200

@app.route('/api/galleries', methods=['POST'])
@jwt_required()
def create_gallery():
    user_id = get_jwt_identity()
    user = db.get_user_by_id(user_id)
    if not user:
        return jsonify({'message': '用户不存在'}), 404
    
    data = request.get_json()
    title = data.get('title', '').strip()
    description = data.get('description', '').strip()
    cover_image = data.get('coverImage', '').strip()
    is_public = data.get('isPublic', True)
    artworks_data = data.get('artworks', [])
    
    if not title:
        return jsonify({'message': '画廊标题不能为空'}), 400
    
    if len(artworks_data) < 5:
        return jsonify({'message': '至少添加5件艺术品'}), 400
    
    gallery = Gallery(
        title=title,
        description=description,
        cover_image=cover_image or f"https://picsum.photos/seed/gallery-{time.time()}/800/400",
        author_id=user.id,
        author_name=user.nickname,
        author_avatar=user.avatar,
        is_public=is_public
    )
    
    db.add_gallery(gallery)
    
    for aw in artworks_data:
        artwork = Artwork(
            gallery_id=gallery.id,
            title=aw.get('title', '').strip(),
            artist=aw.get('artist', '').strip(),
            image_url=aw.get('imageUrl', '').strip(),
            starting_price=float(aw.get('startingPrice', 1000))
        )
        db.add_artwork(artwork)
    
    result = gallery.to_dict()
    result['artworks'] = [a.to_dict() for a in gallery.artworks]
    
    return jsonify(result), 201

@app.route('/api/artworks/<artwork_id>', methods=['GET'])
def get_artwork(artwork_id):
    artwork = db.artworks.get(artwork_id)
    if not artwork:
        return jsonify({'message': '艺术品不存在'}), 404
    
    return jsonify(artwork.to_dict()), 200

@app.route('/api/artworks', methods=['POST'])
@jwt_required()
def create_artwork():
    user_id = get_jwt_identity()
    user = db.get_user_by_id(user_id)
    if not user:
        return jsonify({'message': '用户不存在'}), 404
    
    data = request.get_json()
    gallery_id = data.get('galleryId', '')
    gallery = db.galleries.get(gallery_id)
    
    if not gallery:
        return jsonify({'message': '画廊不存在'}), 404
    
    if gallery.author_id != user.id:
        return jsonify({'message': '无权限操作此画廊'}), 403
    
    artwork = Artwork(
        gallery_id=gallery_id,
        title=data.get('title', '').strip(),
        artist=data.get('artist', '').strip(),
        image_url=data.get('imageUrl', '').strip(),
        starting_price=float(data.get('startingPrice', 1000))
    )
    
    db.add_artwork(artwork)
    
    return jsonify(artwork.to_dict()), 201

@app.route('/api/artworks/<artwork_id>/start_auction', methods=['POST'])
@jwt_required()
def start_auction(artwork_id):
    user_id = get_jwt_identity()
    artwork = db.artworks.get(artwork_id)
    
    if not artwork:
        return jsonify({'message': '艺术品不存在'}), 404
    
    gallery = db.galleries.get(artwork.gallery_id)
    if not gallery or gallery.author_id != user_id:
        return jsonify({'message': '无权限操作此拍品'}), 403
    
    artwork.start_auction(30)
    
    return jsonify({
        'message': '拍卖已开始',
        'artwork': artwork.to_dict()
    }), 200

@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_user_profile():
    user_id = get_jwt_identity()
    user = db.get_user_by_id(user_id)
    
    if not user:
        return jsonify({'message': '用户不存在'}), 404
    
    user_dict = user.to_dict()
    user_dict['galleriesCount'] = len(db.get_user_galleries(user_id))
    user_dict['favoritesCount'] = 0
    
    return jsonify(user_dict), 200

@app.route('/api/user/profile', methods=['PUT'])
@jwt_required()
def update_user_profile():
    user_id = get_jwt_identity()
    user = db.get_user_by_id(user_id)
    
    if not user:
        return jsonify({'message': '用户不存在'}), 404
    
    data = request.get_json()
    nickname = data.get('nickname', '').strip()
    avatar = data.get('avatar', '').strip()
    
    if nickname:
        user.nickname = nickname
    if avatar:
        user.avatar = avatar
    
    return jsonify(user.to_dict()), 200

@app.route('/api/user/galleries', methods=['GET'])
@jwt_required()
def get_user_galleries():
    user_id = get_jwt_identity()
    galleries = db.get_user_galleries(user_id)
    galleries_sorted = sorted(galleries, key=lambda g: g.created_at, reverse=True)
    
    return jsonify([g.to_dict() for g in galleries_sorted]), 200

@app.route('/api/user/bids', methods=['GET'])
@jwt_required()
def get_user_bids():
    user_id = get_jwt_identity()
    bids = db.get_user_bids(user_id)
    bids_sorted = sorted(bids, key=lambda b: b.timestamp, reverse=True)
    
    result = []
    for bid in bids_sorted:
        bid_dict = bid.to_dict()
        artwork = db.artworks.get(bid.artwork_id)
        if artwork:
            bid_dict['isWinning'] = (artwork.highest_bidder == user_id and artwork.is_auctioning) or \
                                    (not artwork.is_auctioning and artwork.highest_bidder == user_id)
        result.append(bid_dict)
    
    return jsonify(result), 200

@app.route('/api/auctions', methods=['GET'])
def get_auctions():
    artworks = db.get_auctioning_artworks()
    
    def get_remaining(aw):
        if aw.auction_end_time:
            return (aw.auction_end_time - datetime.utcnow()).total_seconds()
        return float('inf')
    
    artworks_sorted = sorted(artworks, key=get_remaining)
    
    return jsonify([a.to_dict() for a in artworks_sorted]), 200

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'users': len(db.users),
        'galleries': len(db.galleries),
        'artworks': len(db.artworks),
        'auctions': len(db.get_auctioning_artworks())
    }), 200

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    socketio.run(app, host='0.0.0.0', port=port, debug=True)
