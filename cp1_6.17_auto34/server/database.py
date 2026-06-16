import sqlite3
import uuid
import time
from typing import Optional, List, Dict, Any
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'vote.db')


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_db():
    conn = get_conn()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS votes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        vote_type TEXT NOT NULL CHECK (vote_type IN ('single', 'multiple')),
        deadline INTEGER,
        creator_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        is_deleted INTEGER DEFAULT 0
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS options (
        id TEXT PRIMARY KEY,
        vote_id TEXT NOT NULL,
        text TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (vote_id) REFERENCES votes(id)
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS user_votes (
        id TEXT PRIMARY KEY,
        vote_id TEXT NOT NULL,
        option_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (vote_id) REFERENCES votes(id),
        FOREIGN KEY (option_id) REFERENCES options(id)
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        vote_id TEXT NOT NULL,
        nickname TEXT,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (vote_id) REFERENCES votes(id)
    )''')
    conn.commit()
    conn.close()


def create_vote(title: str, vote_type: str, options: List[str], creator_id: str, deadline: Optional[int] = None) -> Dict[str, Any]:
    vote_id = str(uuid.uuid4())
    now = int(time.time())
    conn = get_conn()
    c = conn.cursor()
    c.execute('INSERT INTO votes (id, title, vote_type, deadline, creator_id, created_at) VALUES (?, ?, ?, ?, ?, ?)',
              (vote_id, title, vote_type, deadline, creator_id, now))
    option_list = []
    for opt_text in options:
        opt_id = str(uuid.uuid4())
        c.execute('INSERT INTO options (id, vote_id, text, created_at) VALUES (?, ?, ?, ?)',
                  (opt_id, vote_id, opt_text, now))
        option_list.append({'id': opt_id, 'text': opt_text, 'votes': 0})
    conn.commit()
    conn.close()
    return {
        'id': vote_id,
        'title': title,
        'vote_type': vote_type,
        'deadline': deadline,
        'creator_id': creator_id,
        'created_at': now,
        'options': option_list,
        'total_voters': 0
    }


def get_all_votes() -> List[Dict[str, Any]]:
    conn = get_conn()
    c = conn.cursor()
    c.execute('SELECT * FROM votes WHERE is_deleted = 0 ORDER BY created_at DESC')
    vote_rows = c.fetchall()
    result = []
    for row in vote_rows:
        vote = dict(row)
        c.execute('SELECT COUNT(DISTINCT user_id) FROM user_votes WHERE vote_id = ?', (vote['id'],))
        total_voters = c.fetchone()[0]
        c.execute('SELECT id, text FROM options WHERE vote_id = ?', (vote['id'],))
        opts = [dict(r) for r in c.fetchall()]
        vote['options'] = opts
        vote['options_count'] = len(opts)
        vote['total_voters'] = total_voters
        result.append(vote)
    conn.close()
    return result


def get_vote_detail(vote_id: str) -> Optional[Dict[str, Any]]:
    conn = get_conn()
    c = conn.cursor()
    c.execute('SELECT * FROM votes WHERE id = ? AND is_deleted = 0', (vote_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return None
    vote = dict(row)
    c.execute('SELECT DISTINCT user_id FROM user_votes WHERE vote_id = ?', (vote_id,))
    voter_ids = [r[0] for r in c.fetchall()]
    c.execute('SELECT id, text FROM options WHERE vote_id = ?', (vote_id,))
    option_rows = c.fetchall()
    options = []
    for opt in option_rows:
        opt_dict = dict(opt)
        c.execute('SELECT COUNT(*) FROM user_votes WHERE option_id = ?', (opt['id'],))
        opt_dict['votes'] = c.fetchone()[0]
        options.append(opt_dict)
    vote['options'] = options
    vote['total_voters'] = len(voter_ids)
    vote['voter_ids'] = voter_ids
    conn.close()
    return vote


def submit_vote(vote_id: str, option_ids: List[str], user_id: str) -> Optional[Dict[str, Any]]:
    conn = get_conn()
    c = conn.cursor()
    c.execute('SELECT * FROM votes WHERE id = ? AND is_deleted = 0', (vote_id,))
    vote = c.fetchone()
    if not vote:
        conn.close()
        return None
    c.execute('SELECT id FROM user_votes WHERE vote_id = ? AND user_id = ?', (vote_id, user_id))
    existing = c.fetchone()
    if existing:
        conn.close()
        return None
    vote_info = dict(vote)
    now = int(time.time())
    if vote_info['vote_type'] == 'single' and len(option_ids) > 1:
        option_ids = [option_ids[0]]
    for opt_id in option_ids:
        c.execute('SELECT id FROM options WHERE id = ? AND vote_id = ?', (opt_id, vote_id))
        if not c.fetchone():
            continue
        uv_id = str(uuid.uuid4())
        c.execute('INSERT INTO user_votes (id, vote_id, option_id, user_id, created_at) VALUES (?, ?, ?, ?, ?)',
                  (uv_id, vote_id, opt_id, user_id, now))
    conn.commit()
    conn.close()
    return get_vote_detail(vote_id)


def delete_vote(vote_id: str, creator_id: str) -> bool:
    conn = get_conn()
    c = conn.cursor()
    c.execute('SELECT creator_id FROM votes WHERE id = ?', (vote_id,))
    row = c.fetchone()
    if not row or row['creator_id'] != creator_id:
        conn.close()
        return False
    c.execute('UPDATE votes SET is_deleted = 1 WHERE id = ?', (vote_id,))
    conn.commit()
    conn.close()
    return True


def add_message(vote_id: str, nickname: str, content: str) -> Dict[str, Any]:
    msg_id = str(uuid.uuid4())
    now = int(time.time())
    display_name = nickname.strip() if nickname and nickname.strip() else '匿名'
    conn = get_conn()
    c = conn.cursor()
    c.execute('INSERT INTO messages (id, vote_id, nickname, content, created_at) VALUES (?, ?, ?, ?, ?)',
              (msg_id, vote_id, display_name, content, now))
    conn.commit()
    conn.close()
    return {
        'id': msg_id,
        'vote_id': vote_id,
        'nickname': display_name,
        'content': content,
        'created_at': now
    }


def get_messages(vote_id: str) -> List[Dict[str, Any]]:
    conn = get_conn()
    c = conn.cursor()
    c.execute('SELECT * FROM messages WHERE vote_id = ? ORDER BY created_at ASC', (vote_id,))
    rows = c.fetchall()
    result = [dict(r) for r in rows]
    conn.close()
    return result
