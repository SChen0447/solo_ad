import json
import math
from flask import Blueprint, request, jsonify, current_app
from models import db, Item
from utils import generate_id, save_uploaded_images
from routes.auth import login_required

items_bp = Blueprint('items', __name__)


@items_bp.route('/api/items', methods=['GET'])
def list_items():
    query = Item.query.filter(Item.status == 'active')

    category = request.args.get('category')
    if category:
        query = query.filter(Item.category == category)

    min_price = request.args.get('minPrice', type=float)
    max_price = request.args.get('maxPrice', type=float)
    if min_price is not None:
        query = query.filter(Item.sale_price >= min_price)
    if max_price is not None:
        query = query.filter(Item.sale_price <= max_price)

    keyword = request.args.get('keyword')
    if keyword:
        query = query.filter(Item.title.contains(keyword))

    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)
    zoom = request.args.get('zoom', type=float)

    sort_by = request.args.get('sortBy', 'newest')
    if sort_by == 'price_asc':
        query = query.order_by(Item.sale_price.asc())
    elif sort_by == 'price_desc':
        query = query.order_by(Item.sale_price.desc())
    else:
        query = query.order_by(Item.created_at.desc())

    items = query.all()
    result = []

    for item in items:
        d = item.to_dict(include_user=True)
        if lat is not None and lng is not None and item.lat and item.lng:
            d['distance'] = haversine(lat, lng, item.lat, item.lng)
        else:
            d['distance'] = None
        result.append(d)

    if lat is not None and lng is not None and sort_by == 'nearest':
        result.sort(key=lambda x: x['distance'] if x['distance'] is not None else float('inf'))

    if zoom is not None:
        max_dist = zoom_to_radius(zoom)
        if max_dist:
            result = [r for r in result if r['distance'] is None or r['distance'] <= max_dist]

    return jsonify(result)


@items_bp.route('/api/items/<item_id>', methods=['GET'])
def get_item(item_id):
    item = Item.query.get(item_id)
    if not item:
        return jsonify({'error': '商品不存在'}), 404
    return jsonify(item.to_dict(include_user=True))


@items_bp.route('/api/items', methods=['POST'])
@login_required
def create_item():
    user = request.current_user
    title = request.form.get('title', '').strip()
    description = request.form.get('description', '').strip()
    original_price = request.form.get('original_price', 0, type=float)
    sale_price = request.form.get('sale_price', 0, type=float)
    category = request.form.get('category', '').strip()
    city = request.form.get('city', '').strip()
    district = request.form.get('district', '').strip()
    lat = request.form.get('lat', 0, type=float)
    lng = request.form.get('lng', 0, type=float)
    phone = request.form.get('phone', '').strip()

    if not title:
        return jsonify({'error': '标题不能为空'}), 400

    files = request.files.getlist('images')
    upload_folder = current_app.config['UPLOAD_FOLDER']
    filenames = save_uploaded_images(files, upload_folder)

    item = Item(
        id=generate_id(),
        user_id=user.id,
        title=title,
        description=description,
        original_price=original_price,
        sale_price=sale_price,
        category=category,
        city=city,
        district=district,
        lat=lat,
        lng=lng,
        images=json.dumps(filenames),
        status='active',
        phone=phone,
    )
    db.session.add(item)
    db.session.commit()

    return jsonify(item.to_dict(include_user=True)), 201


@items_bp.route('/api/items/<item_id>', methods=['PUT'])
@login_required
def update_item(item_id):
    item = Item.query.get(item_id)
    if not item:
        return jsonify({'error': '商品不存在'}), 404
    if item.user_id != request.current_user.id:
        return jsonify({'error': '无权修改此商品'}), 403

    data = request.get_json() or {}
    if 'status' in data:
        item.status = data['status']
    if 'title' in data:
        item.title = data['title']
    if 'description' in data:
        item.description = data['description']
    if 'sale_price' in data:
        item.sale_price = data['sale_price']
    if 'category' in data:
        item.category = data['category']
    if 'phone' in data:
        item.phone = data['phone']

    db.session.commit()
    return jsonify(item.to_dict(include_user=True))


@items_bp.route('/api/items/<item_id>', methods=['DELETE'])
@login_required
def delete_item(item_id):
    item = Item.query.get(item_id)
    if not item:
        return jsonify({'error': '商品不存在'}), 404
    if item.user_id != request.current_user.id:
        return jsonify({'error': '无权删除此商品'}), 403

    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': '删除成功'})


def haversine(lat1, lng1, lat2, lng2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlng / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return R * c


def zoom_to_radius(zoom):
    mapping = {
        10: 200, 11: 100, 12: 50, 13: 25, 14: 12, 15: 6, 16: 3, 17: 1.5, 18: 0.8,
    }
    return mapping.get(int(zoom))
