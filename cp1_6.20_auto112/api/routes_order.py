from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from .auth import login_required, role_required
from .database import get_db
from .services import calculate_pricing, generate_order_number

order_bp = Blueprint('order', __name__, url_prefix='/api/orders')

VALID_STATUSES = ('pending', 'production', 'quality', 'shipping', 'completed')
STATUS_FLOW = {
    'pending': 'production',
    'production': 'quality',
    'quality': 'shipping',
    'shipping': 'completed',
    'completed': None
}

def _attach_order_details(conn, row):
    o = dict(row)
    history = conn.execute(
        "SELECT status, remark, timestamp FROM status_history WHERE order_id = ? ORDER BY timestamp",
        (o['id'],)
    ).fetchall()
    o['statusHistory'] = [dict(h) for h in history]

    customer = conn.execute("SELECT name FROM users WHERE id = ?", (o['customer_id'],)).fetchone()
    designer = conn.execute("SELECT name FROM users WHERE id = ?", (o['designer_id'],)).fetchone()
    product = conn.execute("SELECT name FROM products WHERE id = ?", (o['product_id'],)).fetchone()
    material = conn.execute("SELECT name FROM materials WHERE id = ?", (o['material_id'],)).fetchone() if o.get('material_id') else None

    o['customerName'] = customer['name'] if customer else ''
    o['designerName'] = designer['name'] if designer else ''
    o['productName'] = product['name'] if product else ''
    o['materialName'] = material['name'] if material else ''
    o['materialCoefficient'] = o.pop('material_coefficient')
    o['designImage'] = o.pop('design_image_url')
    o['basePrice'] = o.pop('base_price')
    o['totalPrice'] = o.pop('total_price')
    o['estimatedDays'] = o.pop('estimated_days')
    o['estimatedFinishDate'] = o.pop('estimated_finish_date')
    o['orderNumber'] = o.pop('order_number')
    o['productId'] = o.pop('product_id')
    o['customerId'] = o.pop('customer_id')
    o['designerId'] = o.pop('designer_id')
    o['materialId'] = o.pop('material_id')
    o['createdAt'] = o.pop('created_at')
    o['updatedAt'] = o.pop('updated_at')
    return o

@order_bp.route('', methods=['GET'])
@login_required
def list_orders():
    user = g.current_user
    status_filter = request.args.get('status')
    role_view = request.args.get('role', user['role'])

    with get_db() as conn:
        query = "SELECT * FROM orders WHERE 1=1"
        params = []
        if user['role'] == 'designer' and role_view == 'designer':
            query += " AND designer_id = ?"
            params.append(user['id'])
        elif user['role'] == 'customer':
            query += " AND customer_id = ?"
            params.append(user['id'])
        elif user['role'] == 'designer' and role_view == 'customer':
            return jsonify({'orders': []})

        if status_filter and status_filter in VALID_STATUSES:
            query += " AND status = ?"
            params.append(status_filter)

        query += " ORDER BY created_at DESC LIMIT 100"
        rows = conn.execute(query, params).fetchall()
        orders = [_attach_order_details(conn, r) for r in rows]
    return jsonify({'orders': orders})

@order_bp.route('/<int:oid>', methods=['GET'])
@login_required
def get_order(oid):
    user = g.current_user
    with get_db() as conn:
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (oid,)).fetchone()
        if not row:
            return jsonify({'error': '订单不存在'}), 404
        if row['customer_id'] != user['id'] and row['designer_id'] != user['id']:
            return jsonify({'error': '无权访问该订单'}), 403
        order = _attach_order_details(conn, row)
    return jsonify({'order': order})

@order_bp.route('', methods=['POST'])
@role_required('customer')
def create_order():
    data = request.get_json(silent=True) or {}
    try:
        product_id = int(data.get('productId') or 0)
        size = (data.get('size') or '').strip()
        quantity = int(data.get('quantity') or 0)
        material_id = int(data.get('materialId') or 0)
        remark = (data.get('remark') or '').strip()
        design_image = (data.get('designImage') or '').strip()
    except (ValueError, TypeError):
        return jsonify({'error': '参数格式错误'}), 400

    if product_id <= 0 or quantity <= 0 or material_id <= 0:
        return jsonify({'error': '请填写完整的定制信息'}), 400
    if not design_image:
        return jsonify({'error': '请上传设计稿'}), 400

    user = g.current_user
    now = datetime.now(timezone.utc).isoformat()
    order_number = generate_order_number()

    with get_db() as conn:
        product = conn.execute(
            "SELECT * FROM products WHERE id = ?", (product_id,)
        ).fetchone()
        if not product:
            return jsonify({'error': '产品不存在'}), 404
        material = conn.execute(
            "SELECT * FROM materials WHERE id = ? AND product_id = ?",
            (material_id, product_id)
        ).fetchone()
        if not material:
            return jsonify({'error': '材质选项无效'}), 400

        pricing = calculate_pricing(
            product['base_price'], material['coefficient'],
            quantity, product['default_duration']
        )

        cur = conn.execute(
            """INSERT INTO orders (order_number, product_id, customer_id, designer_id,
               design_image_url, size, quantity, material_id, material_coefficient,
               remark, base_price, total_price, estimated_days, estimated_finish_date,
               status, created_at, updated_at)
               VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
            (order_number, product_id, user['id'], product['designer_id'],
             design_image, size, quantity, material_id, material['coefficient'],
             remark, product['base_price'], pricing['totalPrice'],
             pricing['estimatedDays'], pricing['estimatedFinishDate'],
             'pending', now, now)
        )
        oid = cur.lastrowid
        conn.execute(
            "INSERT INTO status_history (order_id, status, remark, timestamp) VALUES (?,?,?,?)",
            (oid, 'pending', '订单已提交，等待设计师确认', now)
        )
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (oid,)).fetchone()
        order = _attach_order_details(conn, row)
    return jsonify({'order': order}), 201

@order_bp.route('/<int:oid>/status', methods=['PATCH'])
@role_required('designer')
def update_status(oid):
    user = g.current_user
    data = request.get_json(silent=True) or {}
    new_status = data.get('status')
    remark = (data.get('remark') or '').strip()

    if new_status not in VALID_STATUSES:
        return jsonify({'error': '状态值无效'}), 400

    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (oid,)).fetchone()
        if not row:
            return jsonify({'error': '订单不存在'}), 404
        if row['designer_id'] != user['id']:
            return jsonify({'error': '无权操作该订单'}), 403

        current = row['status']
        if current == 'completed':
            return jsonify({'error': '已完成订单不能再修改状态'}), 400
        if new_status != current:
            expected_next = STATUS_FLOW.get(current)
            if expected_next and new_status != expected_next:
                return jsonify({'error': f'状态只能从"{current}"流转到"{expected_next}"'}), 400

        conn.execute(
            "UPDATE orders SET status = ?, updated_at = ? WHERE id = ?",
            (new_status, now, oid)
        )
        conn.execute(
            "INSERT INTO status_history (order_id, status, remark, timestamp) VALUES (?,?,?,?)",
            (oid, new_status, remark or f'状态更新为{new_status}', now)
        )
        row = conn.execute("SELECT * FROM orders WHERE id = ?", (oid,)).fetchone()
        order = _attach_order_details(conn, row)
    return jsonify({'order': order})
