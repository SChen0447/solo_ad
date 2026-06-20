import sqlite3
import json
import uuid
from datetime import datetime
from typing import List, Dict, Any, Optional

DB_PATH = 'components.db'

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS components (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            type TEXT NOT NULL,
            name TEXT NOT NULL,
            x INTEGER DEFAULT 0,
            y INTEGER DEFAULT 0,
            width INTEGER DEFAULT 200,
            height INTEGER DEFAULT 100,
            styles TEXT DEFAULT '{}',
            props TEXT DEFAULT '{}',
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS versions (
            id TEXT PRIMARY KEY,
            project_id TEXT NOT NULL,
            snapshot TEXT NOT NULL,
            author TEXT DEFAULT 'unknown',
            created_at TEXT NOT NULL,
            FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()

class Project:
    def __init__(self, id: str, name: str, created_at: str, updated_at: str):
        self.id = id
        self.name = name
        self.created_at = created_at
        self.updated_at = updated_at
    
    @staticmethod
    def create(name: str) -> 'Project':
        project_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO projects (id, name, created_at, updated_at) VALUES (?, ?, ?, ?)',
            (project_id, name, now, now)
        )
        conn.commit()
        conn.close()
        return Project(project_id, name, now, now)
    
    @staticmethod
    def get_by_id(project_id: str) -> Optional['Project']:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM projects WHERE id = ?', (project_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return Project(row['id'], row['name'], row['created_at'], row['updated_at'])
        return None
    
    @staticmethod
    def update_timestamp(project_id: str):
        now = datetime.utcnow().isoformat()
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            'UPDATE projects SET updated_at = ? WHERE id = ?',
            (now, project_id)
        )
        conn.commit()
        conn.close()
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at,
            'updated_at': self.updated_at
        }

class Component:
    def __init__(self, id: str, project_id: str, type: str, name: str,
                 x: int, y: int, width: int, height: int,
                 styles: Dict[str, Any], props: Dict[str, Any]):
        self.id = id
        self.project_id = project_id
        self.type = type
        self.name = name
        self.x = x
        self.y = y
        self.width = width
        self.height = height
        self.styles = styles
        self.props = props
    
    @staticmethod
    def create(project_id: str, type: str, name: str, x: int = 0, y: int = 0,
               width: int = 200, height: int = 100,
               styles: Optional[Dict[str, Any]] = None,
               props: Optional[Dict[str, Any]] = None) -> 'Component':
        component_id = str(uuid.uuid4())
        styles = styles or {}
        props = props or {}
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''INSERT INTO components (id, project_id, type, name, x, y, width, height, styles, props)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (component_id, project_id, type, name, x, y, width, height,
             json.dumps(styles), json.dumps(props))
        )
        conn.commit()
        conn.close()
        Project.update_timestamp(project_id)
        return Component(component_id, project_id, type, name, x, y, width, height, styles, props)
    
    @staticmethod
    def get_by_id(component_id: str) -> Optional['Component']:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM components WHERE id = ?', (component_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return Component(
                row['id'], row['project_id'], row['type'], row['name'],
                row['x'], row['y'], row['width'], row['height'],
                json.loads(row['styles']), json.loads(row['props'])
            )
        return None
    
    @staticmethod
    def get_by_project(project_id: str) -> List['Component']:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM components WHERE project_id = ?', (project_id,))
        rows = cursor.fetchall()
        conn.close()
        return [
            Component(
                row['id'], row['project_id'], row['type'], row['name'],
                row['x'], row['y'], row['width'], row['height'],
                json.loads(row['styles']), json.loads(row['props'])
            )
            for row in rows
        ]
    
    @staticmethod
    def update(component_id: str, **kwargs) -> Optional['Component']:
        component = Component.get_by_id(component_id)
        if not component:
            return None
        
        fields = ['type', 'name', 'x', 'y', 'width', 'height', 'styles', 'props']
        updates = {}
        for field in fields:
            if field in kwargs:
                updates[field] = kwargs[field]
        
        if not updates:
            return component
        
        if 'styles' in updates:
            updates['styles'] = json.dumps(updates['styles'])
        if 'props' in updates:
            updates['props'] = json.dumps(updates['props'])
        
        set_clause = ', '.join([f'{k} = ?' for k in updates.keys()])
        values = list(updates.values()) + [component_id]
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f'UPDATE components SET {set_clause} WHERE id = ?', values)
        conn.commit()
        conn.close()
        Project.update_timestamp(component.project_id)
        return Component.get_by_id(component_id)
    
    @staticmethod
    def delete(component_id: str) -> bool:
        component = Component.get_by_id(component_id)
        if not component:
            return False
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM components WHERE id = ?', (component_id,))
        conn.commit()
        conn.close()
        Project.update_timestamp(component.project_id)
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'project_id': self.project_id,
            'type': self.type,
            'name': self.name,
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height,
            'styles': self.styles,
            'props': self.props
        }

class Version:
    MAX_VERSIONS = 50
    
    def __init__(self, id: str, project_id: str, snapshot: Dict[str, Any],
                 author: str, created_at: str):
        self.id = id
        self.project_id = project_id
        self.snapshot = snapshot
        self.author = author
        self.created_at = created_at
    
    @staticmethod
    def create(project_id: str, author: str = 'unknown') -> 'Version':
        version_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        components = [c.to_dict() for c in Component.get_by_project(project_id)]
        project = Project.get_by_id(project_id)
        snapshot = {
            'project': project.to_dict() if project else None,
            'components': components
        }
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''INSERT INTO versions (id, project_id, snapshot, author, created_at)
               VALUES (?, ?, ?, ?, ?)''',
            (version_id, project_id, json.dumps(snapshot), author, now)
        )
        
        cursor.execute(
            '''SELECT id FROM versions WHERE project_id = ? ORDER BY created_at DESC''',
            (project_id,)
        )
        rows = cursor.fetchall()
        if len(rows) > Version.MAX_VERSIONS:
            to_delete = rows[Version.MAX_VERSIONS:]
            for row in to_delete:
                cursor.execute('DELETE FROM versions WHERE id = ?', (row['id'],))
        
        conn.commit()
        conn.close()
        return Version(version_id, project_id, snapshot, author, now)
    
    @staticmethod
    def get_by_project(project_id: str) -> List['Version']:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            '''SELECT * FROM versions WHERE project_id = ? ORDER BY created_at DESC''',
            (project_id,)
        )
        rows = cursor.fetchall()
        conn.close()
        return [
            Version(
                row['id'], row['project_id'], json.loads(row['snapshot']),
                row['author'], row['created_at']
            )
            for row in rows
        ]
    
    @staticmethod
    def get_by_id(version_id: str) -> Optional['Version']:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM versions WHERE id = ?', (version_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return Version(
                row['id'], row['project_id'], json.loads(row['snapshot']),
                row['author'], row['created_at']
            )
        return None
    
    @staticmethod
    def restore(version_id: str) -> bool:
        version = Version.get_by_id(version_id)
        if not version:
            return False
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute('DELETE FROM components WHERE project_id = ?', (version.project_id,))
        
        for comp_data in version.snapshot.get('components', []):
            cursor.execute(
                '''INSERT INTO components (id, project_id, type, name, x, y, width, height, styles, props)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                (
                    comp_data['id'], comp_data['project_id'], comp_data['type'],
                    comp_data['name'], comp_data['x'], comp_data['y'],
                    comp_data['width'], comp_data['height'],
                    json.dumps(comp_data.get('styles', {})),
                    json.dumps(comp_data.get('props', {}))
                )
            )
        
        conn.commit()
        conn.close()
        Project.update_timestamp(version.project_id)
        return True
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'project_id': self.project_id,
            'snapshot': self.snapshot,
            'author': self.author,
            'created_at': self.created_at
        }
