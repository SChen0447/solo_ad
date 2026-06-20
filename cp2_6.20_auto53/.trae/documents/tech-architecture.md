## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 (React + Vite)"
        A["App.tsx<br/>路由+全局状态"] --> B["CourseList.tsx<br/>课程列表页"]
        A --> C["CourseDetail.tsx<br/>课程详情页"]
        A --> D["Profile.tsx<br/>个人中心页"]
        B --> E["CourseCard.tsx<br/>课程卡片组件"]
        C --> F["FeedbackForm<br/>反馈表单组件"]
        C --> G["FeedbackList<br/>评论列表组件"]
        D --> H["AchievementBadge<br/>成就徽章组件"]
        A --> I["api.ts<br/>API封装层"]
    end
    subgraph "后端 (Express)"
        J["server/index.js<br/>RESTful API"]
        J --> K["内存数据存储<br/>courses/signup/feedback数组"]
    end
    I -->|"HTTP请求"| J
    J -->|"JSON响应"| I
```

## 2. 技术说明

- **前端**：React@18.2.0 + TypeScript@5.3.3 + Vite@5.0.8 + TailwindCSS + Zustand
- **构建工具**：Vite@5.0.8 + @vitejs/plugin-react@4.2.0
- **后端**：Express@4.18.2 + Node.js
- **数据库**：内存数组存储（无需外部数据库）
- **路由**：react-router-dom（客户端路由）
- **图标**：lucide-react

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 课程列表页，展示所有课程卡片 |
| `/course/:id` | 课程详情页，展示课程信息、报名操作和反馈区 |
| `/profile` | 个人中心页，展示已报名课程历史和成就徽章 |

## 4. API 定义

### 4.1 课程相关

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/courses` | 获取所有课程列表 | - | `Course[]` |
| GET | `/api/courses/:id` | 获取单个课程详情 | - | `Course` |

### 4.2 报名相关

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/courses/:id/signup` | 报名课程 | `{ userId: string }` | `{ success: boolean }` |
| DELETE | `/api/courses/:id/signup` | 取消报名 | `{ userId: string }` | `{ success: boolean }` |

### 4.3 反馈相关

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| POST | `/api/courses/:id/feedback` | 提交反馈 | `{ userId: string, rating: number, comment: string }` | `{ success: boolean }` |
| GET | `/api/courses/:id/feedback` | 获取课程反馈 | - | `Feedback[]` |

### 4.4 用户相关

| 方法 | 路径 | 描述 | 请求体 | 响应 |
|------|------|------|--------|------|
| GET | `/api/user/:id/courses` | 获取用户已报名课程 | - | `Course[]` |
| GET | `/api/user/:id/achievements` | 获取用户成就 | - | `Achievement[]` |

### 4.5 TypeScript 类型定义

```typescript
interface Course {
  id: string;
  title: string;
  type: string;
  date: string;
  time: string;
  maxStudents: number;
  enrolledStudents: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  materials: string[];
  description: string;
  colorIndex: number;
}

interface Feedback {
  id: string;
  courseId: string;
  userId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  condition: number;
}
```

## 5. 服务端架构

```mermaid
graph LR
    A["Express Router<br/>路由分发"] --> B["Course Controller<br/>课程逻辑"]
    A --> C["Feedback Controller<br/>反馈逻辑"]
    A --> D["User Controller<br/>用户逻辑"]
    B --> E["内存数据存储<br/>courses数组"]
    C --> F["内存数据存储<br/>feedbacks数组"]
    D --> E
    D --> G["成就计算<br/>基于报名数量"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Course ||--o{ Enrollment : "has"
    Course ||--o{ Feedback : "has"
    User ||--o{ Enrollment : "makes"
    User ||--o{ Feedback : "writes"
    User ||--o{ Achievement : "earns"

    Course {
        string id PK
        string title
        string type
        string date
        string time
        int maxStudents
        string difficulty
        string[] materials
        string description
        int colorIndex
    }

    Enrollment {
        string courseId FK
        string userId FK
    }

    Feedback {
        string id PK
        string courseId FK
        string userId FK
        int rating
        string comment
        string createdAt
    }

    User {
        string id PK
        string name
    }

    Achievement {
        string id PK
        string name
        string description
        int condition
        boolean unlocked
    }
```

### 6.2 初始数据

后端启动时将在内存中预设6门不同类型的手工艺课程（陶艺、编织、扎染、木工、皮具、花艺），每门课程包含完整的标题、类型、日期时间、人数上限、难度和材料清单数据。
