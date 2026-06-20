import sqlite3
import json
import os
from contextlib import contextmanager

DB_PATH = os.path.join(os.path.dirname(__file__), 'quiz.db')


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def get_db_connection():
    conn = get_db()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS departments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL UNIQUE
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name VARCHAR(100) NOT NULL,
                department_id INTEGER,
                role VARCHAR(20) DEFAULT 'employee',
                FOREIGN KEY (department_id) REFERENCES departments(id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS questions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                content TEXT NOT NULL,
                option_a VARCHAR(500) NOT NULL,
                option_b VARCHAR(500) NOT NULL,
                option_c VARCHAR(500) NOT NULL,
                option_d VARCHAR(500) NOT NULL,
                correct_answer INTEGER NOT NULL CHECK (correct_answer BETWEEN 0 AND 3),
                difficulty VARCHAR(20) NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
                tags TEXT NOT NULL DEFAULT '[]',
                explanation TEXT,
                review_suggestion TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS quiz_sessions (
                id VARCHAR(36) PRIMARY KEY,
                user_id INTEGER NOT NULL,
                current_difficulty VARCHAR(20) DEFAULT 'easy',
                consecutive_correct INTEGER DEFAULT 0,
                consecutive_hard_wrong INTEGER DEFAULT 0,
                current_question_index INTEGER DEFAULT 0,
                is_finished INTEGER DEFAULT 0,
                total_questions INTEGER DEFAULT 10,
                score INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                finished_at DATETIME,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
        ''')

        cursor.execute('''
            CREATE TABLE IF NOT EXISTS answers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id VARCHAR(36) NOT NULL,
                question_id INTEGER NOT NULL,
                user_answer INTEGER NOT NULL,
                is_correct INTEGER NOT NULL,
                difficulty VARCHAR(20) NOT NULL,
                answered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (session_id) REFERENCES quiz_sessions(id),
                FOREIGN KEY (question_id) REFERENCES questions(id)
            )
        ''')

        cursor.execute('CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_answers_session ON answers(session_id)')
        cursor.execute('CREATE INDEX IF NOT EXISTS idx_quiz_sessions_user ON quiz_sessions(user_id)')


def seed_data():
    with get_db_connection() as conn:
        cursor = conn.cursor()

        cursor.execute('SELECT COUNT(*) FROM departments')
        if cursor.fetchone()[0] == 0:
            cursor.executemany(
                'INSERT INTO departments (name) VALUES (?)',
                [('技术部',), ('市场部',), ('人力资源部',), ('财务部',)]
            )

        cursor.execute('SELECT COUNT(*) FROM users')
        if cursor.fetchone()[0] == 0:
            cursor.executemany(
                'INSERT INTO users (name, department_id, role) VALUES (?, ?, ?)',
                [
                    ('张三', 1, 'employee'),
                    ('李四', 1, 'employee'),
                    ('王五', 2, 'employee'),
                    ('赵六', 3, 'admin'),
                ]
            )

        cursor.execute('SELECT COUNT(*) FROM questions')
        if cursor.fetchone()[0] == 0:
            seed_questions = [
                ('Python中哪个关键字用于定义函数？', 'function', 'def', 'func', 'define', 1, 'easy',
                 json.dumps(['Python基础', '语法']), 'Python使用def关键字定义函数', '复习Python函数定义语法'),
                ('以下哪个不是Python的数据类型？', 'list', 'tuple', 'array', 'dict', 2, 'easy',
                 json.dumps(['Python基础', '数据类型']), 'Python没有内置array类型，有list、tuple、dict等', '复习Python基本数据类型'),
                ('Python中用于表示空值的关键字是？', 'null', 'None', 'nil', 'undefined', 1, 'easy',
                 json.dumps(['Python基础', '语法']), 'Python使用None表示空值', '复习Python基础语法'),
                ('下列哪个方法可以向列表末尾添加元素？', 'append()', 'add()', 'insert()', 'push()', 0, 'easy',
                 json.dumps(['Python基础', '数据类型']), 'append()方法用于向列表末尾添加元素', '复习列表操作方法'),
                ('Python中len()函数的作用是？', '计算平方', '返回长度', '转换类型', '排序', 1, 'easy',
                 json.dumps(['Python基础', '内置函数']), 'len()函数用于返回对象的长度', '复习Python内置函数'),

                ('Python中装饰器的主要作用是？', '定义变量', '增强函数功能', '创建类', '处理异常', 1, 'medium',
                 json.dumps(['Python进阶', '装饰器']), '装饰器可以在不修改函数代码的情况下增强函数功能', '学习装饰器的原理和使用'),
                ('下列哪个不是Python的魔法方法？', '__init__', '__str__', '__main__', '__del__', 2, 'medium',
                 json.dumps(['Python进阶', '面向对象']), '__main__不是魔法方法，是模块入口标记', '复习Python魔法方法'),
                ('Python中生成器使用什么关键字？', 'return', 'yield', 'async', 'await', 1, 'medium',
                 json.dumps(['Python进阶', '生成器']), 'yield关键字用于创建生成器', '学习生成器的使用'),
                ('下列哪个模块用于正则表达式？', 're', 'os', 'sys', 'math', 0, 'medium',
                 json.dumps(['Python进阶', '标准库']), 're模块提供正则表达式功能', '熟悉Python标准库'),
                ('Python中@property装饰器的作用是？', '定义静态方法', '定义属性访问器', '定义类方法', '定义抽象方法', 1, 'medium',
                 json.dumps(['Python进阶', '面向对象']), '@property将方法转换为属性访问', '深入学习面向对象编程'),

                ('Python中GIL的作用是？', '垃圾回收', '全局解释器锁', '图形界面库', '网络框架', 1, 'hard',
                 json.dumps(['Python高级', '并发编程']), 'GIL(全局解释器锁)保证同一时刻只有一个线程执行Python字节码', '深入理解Python并发模型'),
                ('下列哪种方式不能实现Python并发？', '多线程', '多进程', '协程', '递归', 3, 'hard',
                 json.dumps(['Python高级', '并发编程']), '递归是编程技巧，不是并发方式', '学习Python并发编程'),
                ('Python中元类的主要用途是？', '创建实例', '控制类的创建', '定义方法', '处理文件', 1, 'hard',
                 json.dumps(['Python高级', '元编程']), '元类用于控制类的创建过程', '深入学习Python元编程'),
                ('Python的内存管理机制不包括？', '引用计数', '标记清除', '分代回收', '手动释放', 3, 'hard',
                 json.dumps(['Python高级', '内存管理']), 'Python使用自动内存管理，不需要手动释放', '了解Python内存管理'),
                ('asyncio模块的核心概念是？', '事件循环', '线程池', '进程池', '内存池', 0, 'hard',
                 json.dumps(['Python高级', '异步编程']), 'asyncio基于事件循环实现异步IO', '学习异步编程'),
            ]
            cursor.executemany(
                '''INSERT INTO questions (content, option_a, option_b, option_c, option_d,
                   correct_answer, difficulty, tags, explanation, review_suggestion)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                seed_questions
            )


def row_to_dict(row):
    if row is None:
        return None
    d = dict(row)
    if 'tags' in d and d['tags']:
        try:
            d['tags'] = json.loads(d['tags'])
        except (json.JSONDecodeError, TypeError):
            d['tags'] = []
    return d


def rows_to_list(rows):
    return [row_to_dict(row) for row in rows]
