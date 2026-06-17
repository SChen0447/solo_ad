import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Dict, Optional, Any

DB_PATH = 'user_story_map.db'


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS swimlanes (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS cards (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            description TEXT NOT NULL DEFAULT '',
            type TEXT NOT NULL DEFAULT 'feature',
            story_points INTEGER NOT NULL DEFAULT 3,
            swimlane_id TEXT NOT NULL,
            position INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            created_by TEXT NOT NULL,
            FOREIGN KEY (swimlane_id) REFERENCES swimlanes(id) ON DELETE CASCADE
        )
    ''')

    cursor.execute('SELECT COUNT(*) FROM swimlanes')
    if cursor.fetchone()[0] == 0:
        now = datetime.now().isoformat()
        lanes = [
            (str(uuid.uuid4()), '第一周冲刺', 0, now, now),
            (str(uuid.uuid4()), '第二周冲刺', 1, now, now),
            (str(uuid.uuid4()), '第三周冲刺', 2, now, now),
        ]
        cursor.executemany(
            'INSERT INTO swimlanes (id, title, position, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
            lanes
        )
        lane_ids = [l[0] for l in lanes]

        types = ['feature', 'technical', 'bug']
        titles = [
            '用户登录功能', '数据导出Excel', '首页性能优化',
            '修复支付异常', '消息通知系统', 'API文档完善',
            '搜索功能增强', '移动端适配', '数据库索引优化',
        ]

        for i in range(9):
            lane_idx = i % 3
            card_id = str(uuid.uuid4())
            cursor.execute('''
                INSERT INTO cards (
                    id, title, description, type, story_points,
                    swimlane_id, position, created_at, updated_at, created_by
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                card_id,
                titles[i],
                f'这是一个关于{titles[i]}的详细描述，包含了该故事的验收标准和实现要点。',
                types[i % 3],
                (i % 13) + 1,
                lane_ids[lane_idx],
                i // 3,
                now,
                now,
                'system'
            ))

    conn.commit()
    conn.close()


def row_to_dict(row: sqlite3.Row) -> Dict[str, Any]:
    return {key: row[key] for key in row.keys()}


def get_all_swimlanes() -> List[Dict[str, Any]]:
    conn = get_db()
    try:
        rows = conn.execute(
            'SELECT * FROM swimlanes ORDER BY position ASC'
        ).fetchall()
        return [row_to_dict(r) for r in rows]
    finally:
        conn.close()


def get_swimlane(lane_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    try:
        row = conn.execute(
            'SELECT * FROM swimlanes WHERE id = ?',
            (lane_id,)
        ).fetchone()
        return row_to_dict(row) if row else None
    finally:
        conn.close()


def create_swimlane(data: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_db()
    try:
        now = datetime.now().isoformat()
        lane_id = data.get('id') or str(uuid.uuid4())
        count = conn.execute('SELECT COUNT(*) FROM swimlanes').fetchone()[0]
        conn.execute('''
            INSERT INTO swimlanes (id, title, position, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
        ''', (
            lane_id,
            data['title'],
            data.get('position', count),
            now,
            now
        ))
        conn.commit()
        return get_swimlane(lane_id) or {}
    finally:
        conn.close()


def update_swimlane(lane_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_db()
    try:
        now = datetime.now().isoformat()
        fields = []
        values = []
        if 'title' in data:
            fields.append('title = ?')
            values.append(data['title'])
        if 'position' in data:
            fields.append('position = ?')
            values.append(data['position'])
        fields.append('updated_at = ?')
        values.append(now)
        values.append(lane_id)

        if fields:
            conn.execute(
                f'UPDATE swimlanes SET {", ".join(fields)} WHERE id = ?',
                values
            )
            conn.commit()
        return get_swimlane(lane_id)
    finally:
        conn.close()


def delete_swimlane(lane_id: str) -> bool:
    conn = get_db()
    try:
        conn.execute('DELETE FROM swimlanes WHERE id = ?', (lane_id,))
        conn.commit()
        return True
    finally:
        conn.close()


def get_all_cards() -> List[Dict[str, Any]]:
    conn = get_db()
    try:
        rows = conn.execute(
            'SELECT * FROM cards ORDER BY swimlane_id ASC, position ASC'
        ).fetchall()
        result = []
        for r in rows:
            d = row_to_dict(r)
            d['swimlaneId'] = d.pop('swimlane_id')
            d['storyPoints'] = d.pop('story_points')
            d['createdAt'] = d.pop('created_at')
            d['updatedAt'] = d.pop('updated_at')
            d['createdBy'] = d.pop('created_by')
            result.append(d)
        return result
    finally:
        conn.close()


def get_card(card_id: str) -> Optional[Dict[str, Any]]:
    conn = get_db()
    try:
        row = conn.execute(
            'SELECT * FROM cards WHERE id = ?',
            (card_id,)
        ).fetchone()
        if not row:
            return None
        d = row_to_dict(row)
        d['swimlaneId'] = d.pop('swimlane_id')
        d['storyPoints'] = d.pop('story_points')
        d['createdAt'] = d.pop('created_at')
        d['updatedAt'] = d.pop('updated_at')
        d['createdBy'] = d.pop('created_by')
        return d
    finally:
        conn.close()


def create_card(data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_db()
    try:
        now = datetime.now().isoformat()
        card_id = data.get('id') or str(uuid.uuid4())
        swimlane_id = data.get('swimlaneId', data.get('swimlane_id'))
        if not swimlane_id:
            return None

        count = conn.execute(
            'SELECT COUNT(*) FROM cards WHERE swimlane_id = ?',
            (swimlane_id,)
        ).fetchone()[0]

        conn.execute('''
            INSERT INTO cards (
                id, title, description, type, story_points,
                swimlane_id, position, created_at, updated_at, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            card_id,
            data.get('title', '新故事卡片'),
            data.get('description', ''),
            data.get('type', 'feature'),
            data.get('storyPoints', data.get('story_points', 3)),
            swimlane_id,
            data.get('position', count),
            now,
            now,
            data.get('createdBy', data.get('created_by', 'system'))
        ))
        conn.commit()
        return get_card(card_id)
    finally:
        conn.close()


def update_card(card_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    conn = get_db()
    try:
        now = datetime.now().isoformat()
        fields = []
        values = []

        field_map = {
            'title': 'title = ?',
            'description': 'description = ?',
            'type': 'type = ?',
            'storyPoints': 'story_points = ?',
            'swimlaneId': 'swimlane_id = ?',
            'position': 'position = ?',
        }

        for key, sql_field in field_map.items():
            if key in data:
                fields.append(sql_field)
                values.append(data[key])

        fields.append('updated_at = ?')
        values.append(now)
        values.append(card_id)

        if len(fields) > 1:
            conn.execute(
                f'UPDATE cards SET {", ".join(fields)} WHERE id = ?',
                values
            )
            conn.commit()
        return get_card(card_id)
    finally:
        conn.close()


def delete_card(card_id: str) -> bool:
    conn = get_db()
    try:
        conn.execute('DELETE FROM cards WHERE id = ?', (card_id,))
        conn.commit()
        return True
    finally:
        conn.close()


def move_card(card_id: str, swimlane_id: str, position: int) -> Optional[Dict[str, Any]]:
    conn = get_db()
    try:
        card = conn.execute(
            'SELECT swimlane_id, position FROM cards WHERE id = ?',
            (card_id,)
        ).fetchone()
        if not card:
            return None

        old_lane = card['swimlane_id']
        old_pos = card['position']

        if old_lane == swimlane_id:
            if old_pos < position:
                conn.execute('''
                    UPDATE cards SET position = position - 1
                    WHERE swimlane_id = ? AND position > ? AND position <= ? AND id != ?
                ''', (swimlane_id, old_pos, position, card_id))
            elif old_pos > position:
                conn.execute('''
                    UPDATE cards SET position = position + 1
                    WHERE swimlane_id = ? AND position >= ? AND position < ? AND id != ?
                ''', (swimlane_id, position, old_pos, card_id))
        else:
            conn.execute('''
                UPDATE cards SET position = position - 1
                WHERE swimlane_id = ? AND position > ? AND id != ?
            ''', (old_lane, old_pos, card_id))

            conn.execute('''
                UPDATE cards SET position = position + 1
                WHERE swimlane_id = ? AND position >= ? AND id != ?
            ''', (swimlane_id, position, card_id))

        now = datetime.now().isoformat()
        conn.execute('''
            UPDATE cards SET swimlane_id = ?, position = ?, updated_at = ?
            WHERE id = ?
        ''', (swimlane_id, position, now, card_id))

        conn.commit()
        return get_card(card_id)
    finally:
        conn.close()
