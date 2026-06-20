from flask import Blueprint, request, jsonify, g
from datetime import datetime, timezone
from .auth import login_required, role_required
from .database import get_db

product_bp = Blueprint('product', __name__, url_prefix='/api/products')

def _attach_materials(conn, product):
    p = dict(product)
    mats = conn.execute(
        "SELECT id, name, coefficient FROM materials WHERE product_id = ? ORDER BY id",
        (p['id'],)
    ).fetchall()
    p['materials'] = [dict(m) for m in mats]
    designer = conn.execute("SELECT name FROM users WHERE id = ?", (p['designer_id'],)).fetchone()
    p['designerName'] = designer['name'] if designer else ''
    p['designerId'] = p.pop('designer_id')
    p['basePrice'] = p.pop('base_price')
    p['defaultDuration'] = p.pop('default_duration')
    p['thumbnail'] = p.pop('thumbnail_url')
    p['createdAt'] = p.pop('created_at')
    return p

@product_bp.route('', methods=['GET'])
def list_products():
    page = max(1, int(request.args.get('page', 1)))
    size = min(50, max(1, int(request.args.get('size', 20))))
    offset = (page - 1) * size

    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) as c FROM products").fetchone()['c']
        rows = conn.execute(
            "SELECT * FROM products ORDER BY created_at DESC LIMIT ? OFFSET ?",
            (size, offset)
        ).fetchall()
        products = [_attach_materials(conn, r) for r in rows]

    return jsonify({'products': products, 'total': total, 'page': page, 'size': size})

@product_bp.route('/<int:pid>', methods=['GET'])
def get_product(pid):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM products WHERE id = ?", (pid,)).fetchone()
        if not row:
            return jsonify({'error': '产品不存在'}), 404
        product = _attach_materials(conn, row)
    return jsonify({'product': product})

@product_bp.route('', methods=['POST'])
@role_required('designer')
def create_product():
    data = request.get_json(silent=True) or {}
    name = (data.get('name') or '').strip()
    description = (data.get('description') or '').strip()
    base_price = float(data.get('basePrice') or 0)
    default_duration = int(data.get('defaultDuration') or 3)
    thumbnail = (data.get('thumbnail') or '').strip()
    materials = data.get('materials') or []

    if not name or base_price <= 0 or default_duration <= 0:
        return jsonify({'error': '请填写完整产品信息'}), 400

    now = datetime.now(timezone.utc).isoformat()
    user = g.current_user

    with get_db() as conn:
        cur = conn.execute(
            """INSERT INTO products (name, description, thumbnail_url, base_price,
               default_duration, designer_id, created_at) VALUES (?,?,?,?,?,?,?)""",
            (name, description, thumbnail, base_price, default_duration, user['id'], now)
        )
        pid = cur.lastrowid
        if isinstance(materials, list) and materials:
            mat_rows = []
            for m in materials:
                m_name = (m.get('name') or '').strip()
                coef = float(m.get('coefficient') or 1.0)
                if m_name:
                    mat_rows.append((pid, m_name, coef))
            if mat_rows:
                conn.executemany(
                    "INSERT INTO materials (product_id, name, coefficient) VALUES (?,?,?)",
                    mat_rows
                )
        row = conn.execute("SELECT * FROM products WHERE id = ?", (pid,)).fetchone()
        product = _attach_materials(conn, row)
    return jsonify({'product': product}), 201
