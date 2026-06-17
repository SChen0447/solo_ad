## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 (React + TypeScript)"
        A["KanbanBoard 看板组件"] --> B["TaskCard 任务卡片"]
        A --> C["TaskModal 添加任务对话框"]
        D["HeatmapView 热力图组件"] --> E["WorkloadCalculator 负载计算"]
        F["MembersPage 成员管理"] --> G["MemberTable 成员表格"]
        H["AppContext 全局状态"] --> A
        H --> D
        H --> F
        I["taskApi API层"] --> H
    end
    subgraph "后端 (Python Flask)"
        J["Flask REST API"]
        K["Task Model"]
        L["Member Model"]
        M["Workload Calculator"]
        N["SQLite Database"]
        J --> K
        J --> L
        J --> M
        K --> N
        L --> N
    end
    I -->|"HTTP/Axios"| J
```

## 2. 技术说明
- 前端：React@18 + TypeScript + Vite + Tailwind CSS
- 初始化工具：vite-init（react-ts模板）
- 后端：Python Flask + SQLAlchemy + Flask-CORS
- 数据库：SQLite

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 主页面，包含看板/热力图/成员管理三个标签页 |

## 4. API定义

### 4.1 任务相关
| 方法 | 路径 | 请求体 | 响应 |
|------|------|--------|------|
| GET | /api/tasks | - | `Task[]` |
| POST | /api/tasks | `{title, description, assignee_id, priority, due_date, estimated_hours}` | `Task` |
| PUT | /api/tasks/:id | `{status?, title?, description?, assignee_id?, priority?, due_date?, estimated_hours?}` | `Task` |
| DELETE | /api/tasks/:id | - | `{success: bool}` |

### 4.2 成员相关
| 方法 | 路径 | 请求体 | 响应 |
|------|------|--------|------|
| GET | /api/members | - | `Member[]` |
| POST | /api/members | `{name, daily_available_hours}` | `Member` |
| PUT | /api/members/:id | `{name?, daily_available_hours?}` | `Member` |
| DELETE | /api/members/:id | - | `{success: bool}` |

### 4.3 负载相关
| 方法 | 路径 | 请求体 | 响应 |
|------|------|--------|------|
| GET | /api/workload?month=YYYY-MM | - | `{member_id: {date: hours}}` |

### 4.4 TypeScript类型定义
```typescript
interface Task {
  id: number;
  title: string;
  description: string;
  assignee_id: number;
  priority: 'urgent' | 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'done';
  due_date: string;
  estimated_hours: number;
  created_at: string;
  updated_at: string;
}

interface Member {
  id: number;
  name: string;
  daily_available_hours: number;
  avatar_color: string;
}

interface WorkloadDay {
  member_id: number;
  date: string;
  total_hours: number;
  load_percentage: number;
  tasks: Task[];
}
```

## 5. 服务器架构图

```mermaid
graph LR
    A["Flask Controller"] --> B["Service Layer"]
    B --> C["SQLAlchemy ORM"]
    C --> D["SQLite"]
    B --> E["WorkloadCalculator"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Task {
        int id PK
        string title
        string description
        int assignee_id FK
        string priority
        string status
        string due_date
        float estimated_hours
        datetime created_at
        datetime updated_at
    }
    Member {
        int id PK
        string name
        float daily_available_hours
        string avatar_color
    }
    Member ||--o{ Task : "assigns"
```

### 6.2 数据定义语言
```sql
CREATE TABLE member (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    daily_available_hours FLOAT DEFAULT 8.0,
    avatar_color VARCHAR(7) NOT NULL
);

CREATE TABLE task (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT DEFAULT '',
    assignee_id INTEGER NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'todo',
    due_date DATE,
    estimated_hours FLOAT DEFAULT 1.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assignee_id) REFERENCES member(id)
);
```
