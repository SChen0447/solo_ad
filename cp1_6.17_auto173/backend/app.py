from flask import Flask, request, jsonify, g
from flask_cors import CORS
import sqlite3
import json
import time
import random
import string
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

DATABASE = os.path.join(os.path.dirname(__file__), 'flowershop.db')

PACKAGING_PRICES = {
    'kraft': 10,
    'pink': 10,
    'vintage': 10
}

INITIAL_FLOWERS = [
    {
        'id': 1,
        'name': '红玫瑰',
        'category': '玫瑰',
        'price': 8,
        'stock': 50,
        'image': '🌹',
        'description': '热情似火的红玫瑰',
        'color': '#FF4444'
    },
    {
        'id': 2,
        'name': '粉玫瑰',
        'category': '玫瑰',
        'price': 9,
        'stock': 30,
        'image': '🌷',
        'description': '温柔的粉玫瑰',
        'color': '#FF99AA'
    },
    {
        'id': 3,
        'name': '白百合',
        'category': '百合',
        'price': 15,
        'stock': 20,
        'image': '🌸',
        'description': '纯洁的白百合',
        'color': '#FFFFFF'
    },
    {
        'id': 4,
        'name': '粉百合',
        'category': '百合',
        'price': 18,
        'stock': 15,
        'image': '🌺',
        'description': '优雅的粉百合',
        'color': '#FFB6C1'
    },
    {
        'id': 5,
        'name': '白色满天星',
        'category': '满天星',
        'price': 5,
        'stock': 100,
        'image': '✨',
        'description': '梦幻的白色满天星',
        'color': '#F0F0F0'
    },
    {
        'id': 6,
        'name': '粉色满天星',
        'category': '满天星',
        'price': 6,
        'stock': 80,
        'image': '💫',
        'description': '浪漫的粉色满天星',
        'color': '#FFB6C1'
    },
    {
        'id': 7,
        'name': '尤加利叶',
        'category': '尤加利叶',
        'price': 4,
        'stock': 60,
        'image': '🌿',
        'description': '清新的尤加利叶',
        'color': '#8FBC8F'
    },
    {
        'id': 8,
        'name': '红色康乃馨',
        'category': '康乃馨',
        'price': 7,
        'stock': 40,
        'image': '🌼',
        'description': '温馨的康乃馨',
        'color': '#FF6B6B'
    },
    {
        'id': 9,
        'name': '向日葵',
        'category': '向日葵',
        'price': 12,
        'stock': 25,
        'image': '🌻',
        'description': '阳光的向日葵',
        'color': '#FFD700'
    }
]


def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db


@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


def init_db():
    if not os.path.exists(DATABASE):
        conn = sqlite3.connect(DATABASE)
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS flowers (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                category TEXT NOT NULL,
                price REAL NOT NULL,
                stock INTEGER NOT NULL,
                image TEXT NOT NULL,
                description TEXT,
                color TEXT NOT NULL
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_no TEXT UNIQUE NOT NULL,
                flowers TEXT NOT NULL,
                packaging TEXT NOT NULL,
                total_price REAL NOT NULL,
                status TEXT NOT NULL DEFAULT 'pending',
                created_at TEXT NOT NULL
            )
        ''')

        for flower in INITIAL_FLOWERS:
            cursor.execute('''
                INSERT OR IGNORE INTO flowers (id, name, category, price, stock, image, description, color)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                flower['id'],
                flower['name'],
                flower['category'],
                flower['price'],
                flower['stock'],
                flower['image'],
                flower['description'],
                flower['color']
            ))

        conn.commit()
        conn.close()
        print('Database initialized successfully!')


def generate_order_no():
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    random_chars = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
    return f'FL{timestamp}{random_chars}'


@app.route('/api/flowers', methods=['GET'])
def get_flowers():
    try:
        category = request.args.get('category')
        min_price = request.args.get('min_price', type=float)
        max_price = request.args.get('max_price', type=float)

        db = get_db()
        cursor = db.cursor()

        query = 'SELECT * FROM flowers WHERE 1=1'
        params = []

        if category and category != '全部':
            query += ' AND category = ?'
            params.append(category)
        if min_price is not None:
            query += ' AND price >= ?'
            params.append(min_price)
        if max_price is not None:
            query += ' AND price <= ?'
            params.append(max_price)

        query += ' ORDER BY id ASC'
        cursor.execute(query, params)
        flowers = cursor.fetchall()

        result = []
        for flower in flowers:
            result.append({
                'id': flower['id'],
                'name': flower['name'],
                'category': flower['category'],
                'price': flower['price'],
                'stock': flower['stock'],
                'image': flower['image'],
                'description': flower['description'],
                'color': flower['color']
            })

        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/flowers/<int:flower_id>', methods=['GET'])
def get_flower(flower_id):
    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute('SELECT * FROM flowers WHERE id = ?', (flower_id,))
        flower = cursor.fetchone()

        if not flower:
            return jsonify({'error': 'Flower not found'}), 404

        return jsonify({
            'id': flower['id'],
            'name': flower['name'],
            'category': flower['category'],
            'price': flower['price'],
            'stock': flower['stock'],
            'image': flower['image'],
            'description': flower['description'],
            'color': flower['color']
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        data = request.get_json()
        flowers = data.get('flowers', [])
        packaging = data.get('packaging')

        if not flowers:
            return jsonify({'error': 'No flowers in order'}), 400

        if not packaging or packaging not in PACKAGING_PRICES:
            return jsonify({'error': 'Invalid packaging type'}), 400

        db = get_db()
        cursor = db.cursor()

        total_price = PACKAGING_PRICES[packaging]
        flower_details = []

        for flower_item in flowers:
            flower_id = flower_item.get('id')
            count = flower_item.get('count', 1)

            cursor.execute('SELECT * FROM flowers WHERE id = ?', (flower_id,))
            flower = cursor.fetchone()

            if not flower:
                return jsonify({'error': f'Flower {flower_id} not found'}), 404

            if flower['stock'] < count:
                return jsonify({
                    'error': f'Insufficient stock for {flower["name"]}. Available: {flower["stock"]}'
                }), 400

            total_price += flower['price'] * count
            flower_details.append({
                'id': flower['id'],
                'name': flower['name'],
                'price': flower['price'],
                'count': count,
                'category': flower['category'],
                'image': flower['image'],
                'color': flower['color']
            })

        order_no = generate_order_no()
        created_at = datetime.utcnow().isoformat()

        cursor.execute('''
            INSERT INTO orders (order_no, flowers, packaging, total_price, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        ''', (
            order_no,
            json.dumps(flower_details),
            packaging,
            total_price,
            'pending',
            created_at
        ))

        for flower_item in flowers:
            flower_id = flower_item.get('id')
            count = flower_item.get('count', 1)
            cursor.execute('''
                UPDATE flowers SET stock = stock - ? WHERE id = ?
            ''', (count, flower_id))

        db.commit()

        return jsonify({
            'id': cursor.lastrowid,
            'order_no': order_no,
            'flowers': flower_details,
            'packaging': packaging,
            'total_price': total_price,
            'status': 'pending',
            'created_at': created_at
        }), 201

    except Exception as e:
        db.rollback() if 'db' in locals() else None
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/orders', methods=['GET'])
def get_orders():
    try:
        status = request.args.get('status')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        db = get_db()
        cursor = db.cursor()

        query = 'SELECT * FROM orders WHERE 1=1'
        params = []

        if status and status != 'all':
            query += ' AND status = ?'
            params.append(status)
        if start_date:
            query += ' AND created_at >= ?'
            params.append(start_date)
        if end_date:
            query += ' AND created_at <= ?'
            params.append(end_date + 'T23:59:59')

        query += ' ORDER BY created_at DESC'
        cursor.execute(query, params)
        orders = cursor.fetchall()

        result = []
        for order in orders:
            result.append({
                'id': order['id'],
                'order_no': order['order_no'],
                'flowers': json.loads(order['flowers']),
                'packaging': order['packaging'],
                'total_price': order['total_price'],
                'status': order['status'],
                'created_at': order['created_at']
            })

        return jsonify(result), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/orders/<int:order_id>/status', methods=['PUT'])
def update_order_status(order_id):
    try:
        data = request.get_json()
        new_status = data.get('status')

        if new_status not in ['pending', 'confirmed', 'completed']:
            return jsonify({'error': 'Invalid status'}), 400

        db = get_db()
        cursor = db.cursor()

        cursor.execute('SELECT * FROM orders WHERE id = ?', (order_id,))
        order = cursor.fetchone()

        if not order:
            return jsonify({'error': 'Order not found'}), 404

        cursor.execute('''
            UPDATE orders SET status = ? WHERE id = ?
        ''', (new_status, order_id))

        db.commit()

        cursor.execute('SELECT * FROM orders WHERE id = ?', (order_id,))
        updated_order = cursor.fetchone()

        return jsonify({
            'id': updated_order['id'],
            'order_no': updated_order['order_no'],
            'flowers': json.loads(updated_order['flowers']),
            'packaging': updated_order['packaging'],
            'total_price': updated_order['total_price'],
            'status': updated_order['status'],
            'created_at': updated_order['created_at']
        }), 200

    except Exception as e:
        db.rollback() if 'db' in locals() else None
        return jsonify({'error': str(e)}), 500


@app.route('/api/admin/flowers/<int:flower_id>/stock', methods=['PUT'])
def update_flower_stock(flower_id):
    try:
        data = request.get_json()
        new_stock = data.get('stock')

        if new_stock is None or new_stock < 0:
            return jsonify({'error': 'Invalid stock value'}), 400

        db = get_db()
        cursor = db.cursor()

        cursor.execute('SELECT * FROM flowers WHERE id = ?', (flower_id,))
        flower = cursor.fetchone()

        if not flower:
            return jsonify({'error': 'Flower not found'}), 404

        cursor.execute('''
            UPDATE flowers SET stock = ? WHERE id = ?
        ''', (new_stock, flower_id))

        db.commit()

        cursor.execute('SELECT * FROM flowers WHERE id = ?', (flower_id,))
        updated_flower = cursor.fetchone()

        return jsonify({
            'id': updated_flower['id'],
            'name': updated_flower['name'],
            'category': updated_flower['category'],
            'price': updated_flower['price'],
            'stock': updated_flower['stock'],
            'image': updated_flower['image'],
            'description': updated_flower['description'],
            'color': updated_flower['color']
        }), 200

    except Exception as e:
        db.rollback() if 'db' in locals() else None
        return jsonify({'error': str(e)}), 500


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'timestamp': datetime.utcnow().isoformat()}), 200


if __name__ == '__main__':
    init_db()
    print('Starting Flower Shop API server on port 5000...')
    app.run(host='0.0.0.0', port=5000, debug=True)
