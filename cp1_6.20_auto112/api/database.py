import sqlite3
from contextlib import contextmanager
from datetime import datetime
from .config import Config

SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('designer', 'customer')),
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    thumbnail_url TEXT,
    base_price REAL NOT NULL,
    default_duration INTEGER NOT NULL,
    designer_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (designer_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS materials (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    coefficient REAL NOT NULL,
    product_id INTEGER NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    product_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    designer_id INTEGER NOT NULL,
    design_image_url TEXT NOT NULL,
    size TEXT,
    quantity INTEGER NOT NULL,
    material_id INTEGER,
    material_coefficient REAL NOT NULL,
    remark TEXT,
    base_price REAL NOT NULL,
    total_price REAL NOT NULL,
    estimated_days INTEGER NOT NULL,
    estimated_finish_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','production','quality','shipping','completed')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (product_id) REFERENCES products(id),
    FOREIGN KEY (customer_id) REFERENCES users(id),
    FOREIGN KEY (designer_id) REFERENCES users(id),
    FOREIGN KEY (material_id) REFERENCES materials(id)
);

CREATE TABLE IF NOT EXISTS status_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    status TEXT NOT NULL,
    remark TEXT,
    timestamp TEXT NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_orders_designer ON orders(designer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_products_designer ON products(designer_id);
CREATE INDEX IF NOT EXISTS idx_materials_product ON materials(product_id);
CREATE INDEX IF NOT EXISTS idx_status_history_order ON status_history(order_id);
"""

@contextmanager
def get_db():
    conn = sqlite3.connect(Config.DATABASE_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        conn.executescript(SCHEMA_SQL)
        _seed_data(conn)

def _seed_data(conn):
    cur = conn.execute("SELECT COUNT(*) as c FROM users")
    if cur.fetchone()['c'] > 0:
        return

    now = datetime.utcnow().isoformat()

    users = [
        ('designer@workshop.com', 'pbkdf2_sha256$123456$designer', '张设计师', 'designer', now),
        ('customer@test.com', 'pbkdf2_sha256$123456$customer', '李客户', 'customer', now),
    ]
    conn.executemany(
        "INSERT INTO users (email, password_hash, name, role, created_at) VALUES (?,?,?,?,?)",
        users
    )

    products = [
        ('手工皮革钱包', '头层牛皮手工缝制，支持压印个性化图案', 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800&q=80', 299.0, 7, 1, now),
        ('定制陶瓷马克杯', '景德镇手工陶瓷，支持图案定制', 'https://images.unsplash.com/photo-1514228742587-6b1558fcca3d?w=800&q=80', 89.0, 5, 1, now),
        ('木质首饰盒', '胡桃木手工打磨，支持激光雕刻', 'https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800&q=80', 459.0, 10, 1, now),
        ('定制帆布手提袋', '加厚帆布材质，支持数码印花', 'https://images.unsplash.com/photo-1597633125097-5a9961e1f03d?w=800&q=80', 59.0, 3, 1, now),
    ]
    conn.executemany(
        "INSERT INTO products (name, description, thumbnail_url, base_price, default_duration, designer_id, created_at) VALUES (?,?,?,?,?,?,?)",
        products
    )

    materials = [
        (1, '头层牛皮(棕)', 1.0),
        (1, '头层牛皮(黑)', 1.05),
        (1, '头层牛皮(酒红)', 1.1),
        (2, '白瓷', 1.0),
        (2, '青瓷', 1.15),
        (2, '黑瓷', 1.2),
        (3, '胡桃木', 1.0),
        (3, '樱桃木', 1.1),
        (3, '枫木', 0.9),
        (4, '自然白', 1.0),
        (4, '米黄色', 1.05),
        (4, '藏青色', 1.1),
    ]
    conn.executemany(
        "INSERT INTO materials (product_id, name, coefficient) VALUES (?,?,?)",
        materials
    )
