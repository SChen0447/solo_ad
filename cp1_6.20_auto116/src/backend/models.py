import sqlite3
import os
from datetime import datetime, timedelta
import hashlib

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "library.db")

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'reader',
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    category TEXT,
    total_copies INTEGER NOT NULL DEFAULT 1,
    available_copies INTEGER NOT NULL DEFAULT 1,
    cover_url TEXT,
    description TEXT,
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS loans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    book_id INTEGER NOT NULL,
    borrow_date TEXT NOT NULL,
    due_date TEXT NOT NULL,
    return_date TEXT,
    status TEXT NOT NULL DEFAULT 'borrowed',
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (book_id) REFERENCES books(id)
);

CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    activity_type TEXT NOT NULL,
    location TEXT,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    max_participants INTEGER,
    current_participants INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at TEXT NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS activity_participants (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    activity_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    registered_at TEXT NOT NULL,
    UNIQUE(activity_id, user_id),
    FOREIGN KEY (activity_id) REFERENCES activities(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
"""

SEED_USERS = [
    ("admin", hashlib.sha256("admin123".encode()).hexdigest(), "admin", "系统管理员", datetime.now().isoformat()),
    ("reader1", hashlib.sha256("reader123".encode()).hexdigest(), "reader", "张三", datetime.now().isoformat()),
    ("reader2", hashlib.sha256("reader123".encode()).hexdigest(), "reader", "李四", datetime.now().isoformat()),
]

SEED_BOOKS = [
    ("百年孤独", "加西亚·马尔克斯", "978-7-5442-1", "文学", 3, 3,
     "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=magical%20realism%20book%20cover%20surreal%20jungle%20village%20golden%20butterflies&image_size=portrait_4_3",
     "魔幻现实主义文学的代表作，讲述布恩迪亚家族七代人的传奇故事。"),
    ("活着", "余华", "978-7-5063-2", "文学", 2, 2,
     "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20literature%20book%20cover%20simple%20field%20sunset%20silhouette&image_size=portrait_4_3",
     "讲述了农村人福贵悲惨的人生遭遇，余华的经典之作。"),
    ("三体", "刘慈欣", "978-7-5366-9", "科幻", 4, 4,
     "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=scifi%20book%20cover%20three%20suns%20planet%20space%20stars%20dark&image_size=portrait_4_3",
     "中国科幻文学的里程碑之作，地球文明与三体文明的碰撞。"),
    ("人类简史", "尤瓦尔·赫拉利", "978-7-5086-4", "历史", 2, 2,
     "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=history%20book%20cover%20ancient%20human%20evolution%20cave%20painting&image_size=portrait_4_3",
     "从认知革命到科学革命，全景式回顾人类发展史。"),
    ("小王子", "安托万·德·圣-埃克苏佩里", "978-7-020-0", "童话", 3, 3,
     "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fairy%20tale%20book%20cover%20little%20prince%20star%20rose%20night%20sky&image_size=portrait_4_3",
     "一部写给大人的童话，关于爱与责任的永恒故事。"),
    ("设计模式", "GoF", "978-7-111-0", "计算机", 2, 2,
     "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=tech%20book%20cover%20software%20design%20patterns%20blueprint%20geometric&image_size=portrait_4_3",
     "软件工程经典著作，23种设计模式的全面介绍。"),
    ("红楼梦", "曹雪芹", "978-7-020-1", "古典文学", 3, 3,
     "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=classical%20chinese%20book%20cover%20red%20mansion%20garden%20elegant%20ink&image_size=portrait_4_3",
     "中国古典四大名著之首，贾府兴衰与宝黛爱情的千古绝唱。"),
    ("时间简史", "史蒂芬·霍金", "978-7-5357-1", "科学", 2, 2,
     "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=science%20book%20cover%20black%20hole%20cosmos%20time%20space%20wormhole&image_size=portrait_4_3",
     "探索宇宙本质的科普经典，从大爆炸到黑洞。"),
]

SEED_ACTIVITIES = [
    ("周末读书会：经典文学赏析", "一起品读世界经典文学作品，分享阅读感悟与心得。", "读书会", "社区图书馆二楼活动室",
     (datetime.now() + timedelta(days=7, hours=14)).isoformat(),
     (datetime.now() + timedelta(days=7, hours=17)).isoformat(),
     20, 0, 1, datetime.now().isoformat()),
    ("科技前沿讲座：人工智能与未来", "邀请专家分享人工智能最新发展动态与未来趋势。", "讲座", "社区活动中心报告厅",
     (datetime.now() + timedelta(days=10, hours=9)).isoformat(),
     (datetime.now() + timedelta(days=10, hours=12)).isoformat(),
     50, 0, 1, datetime.now().isoformat()),
    ("亲子绘本阅读：奇妙的自然", "适合3-8岁儿童与家长共同参与的绘本阅读活动。", "亲子活动", "社区图书馆一楼儿童区",
     (datetime.now() + timedelta(days=5, hours=10)).isoformat(),
     (datetime.now() + timedelta(days=5, hours=12)).isoformat(),
     15, 0, 1, datetime.now().isoformat()),
    ("读书会：科幻文学之夜", "科幻迷的聚会，畅聊科幻小说中的奇思妙想。", "读书会", "社区图书馆二楼活动室",
     (datetime.now() + timedelta(days=14, hours=19)).isoformat(),
     (datetime.now() + timedelta(days=14, hours=21)).isoformat(),
     25, 0, 1, datetime.now().isoformat()),
]

SEED_LOANS = [
    (2, 1, (datetime.now() - timedelta(days=10)).isoformat(), (datetime.now() + timedelta(days=4)).isoformat(), None, "borrowed"),
    (2, 3, (datetime.now() - timedelta(days=20)).isoformat(), (datetime.now() - timedelta(days=6)).isoformat(), None, "borrowed"),
    (3, 2, (datetime.now() - timedelta(days=5)).isoformat(), (datetime.now() + timedelta(days=9)).isoformat(), None, "borrowed"),
    (3, 5, (datetime.now() - timedelta(days=3)).isoformat(), (datetime.now() + timedelta(days=11)).isoformat(), None, "borrowed"),
]


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def query_db(query, args=(), one=False):
    conn = get_db()
    cursor = conn.execute(query, args)
    result = cursor.fetchone() if one else cursor.fetchall()
    conn.close()
    return result


def init_db():
    conn = get_db()
    conn.executescript(SCHEMA)

    cursor = conn.execute("SELECT COUNT(*) FROM users")
    if cursor.fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO users (username, password, role, name, created_at) VALUES (?, ?, ?, ?, ?)",
            SEED_USERS,
        )

    cursor = conn.execute("SELECT COUNT(*) FROM books")
    if cursor.fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO books (title, author, isbn, category, total_copies, available_copies, cover_url, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            SEED_BOOKS,
        )

    cursor = conn.execute("SELECT COUNT(*) FROM activities")
    if cursor.fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO activities (title, description, activity_type, location, start_time, end_time, max_participants, current_participants, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            SEED_ACTIVITIES,
        )

    cursor = conn.execute("SELECT COUNT(*) FROM loans")
    if cursor.fetchone()[0] == 0:
        conn.executemany(
            "INSERT INTO loans (user_id, book_id, borrow_date, due_date, return_date, status) VALUES (?, ?, ?, ?, ?, ?)",
            SEED_LOANS,
        )
        for loan in SEED_LOANS:
            conn.execute(
                "UPDATE books SET available_copies = available_copies - 1 WHERE id = ?",
                (loan[1],),
            )

    conn.commit()
    conn.close()
