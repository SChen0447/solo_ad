## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 (React + TypeScript + Vite)"
        A["App.tsx<br/>主布局+Tab切换"] --> B["PlanView.tsx<br/>行程规划"]
        A --> C["DiaryView.tsx<br/>旅行日记"]
        A --> D["AlbumView.tsx<br/>旅行相册"]
        E["store.ts<br/>React Context状态管理"] --> A
        F["types.ts<br/>共享类型定义"] --> E
    end

    subgraph "后端 (Express + TypeScript)"
        G["server.ts<br/>API路由+内存存储"]
        G --> H["/api/trips<br/>行程CRUD"]
        G --> I["/api/diaries<br/>日记CRUD"]
        G --> J["/api/albums<br/>相册生成"]
        G --> K["/api/upload<br/>图片上传"]
    end

    B -->|"代理 /api"| G
    C -->|"代理 /api"| G
    D -->|"代理 /api"| G
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite（使用@vitejs/plugin-react）
- 状态管理：React Context（非Zustand，用户明确指定）
- 后端：Express@4 + TypeScript + cors + uuid
- 存储：内存模拟存储（不依赖外部数据库）
- 样式：内联CSS + CSS模块（无Tailwind，用户未要求）
- 初始化工具：vite-init
- 构建工具：Vite

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页面，通过Tab切换三个视图（行程规划、旅行日记、旅行相册） |

前端为单页应用，不使用react-router，通过Tab组件在三个视图间切换，切换时有0.3s滑动动画。

## 4. API定义

### 4.1 行程相关API

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| GET | /api/trips | - | Trip[] | 获取所有旅行 |
| POST | /api/trips | { name: string } | Trip | 创建旅行 |
| GET | /api/trips/:id | - | Trip | 获取旅行详情 |
| PUT | /api/trips/:id | Trip | Trip | 更新旅行（含天数和景点） |
| DELETE | /api/trips/:id | - | { success: boolean } | 删除旅行 |

### 4.2 日记相关API

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| GET | /api/trips/:tripId/diaries | - | DiaryEntry[] | 获取旅行所有日记 |
| POST | /api/trips/:tripId/diaries | DiaryEntry | DiaryEntry | 创建日记 |
| PUT | /api/diaries/:id | DiaryEntry | DiaryEntry | 更新日记 |
| DELETE | /api/diaries/:id | - | { success: boolean } | 删除日记 |

### 4.3 相册相关API

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| GET | /api/trips/:tripId/album | - | Photo[] | 获取旅行相册（按日期分组） |

### 4.4 图片上传API

| 方法 | 路径 | 请求体 | 响应 | 说明 |
|------|------|--------|------|------|
| POST | /api/upload | FormData (file) | { url: string } | 上传图片，返回URL |

### 4.5 TypeScript类型定义

```typescript
interface Trip {
  id: string;
  name: string;
  days: DayPlan[];
  createdAt: string;
}

interface DayPlan {
  id: string;
  dayNumber: number;
  date: string;
  spots: Spot[];
}

interface Spot {
  id: string;
  name: string;
  duration: number;
  lat: number;
  lng: number;
  order: number;
}

interface DiaryEntry {
  id: string;
  tripId: string;
  spotId: string;
  spotName: string;
  content: string;
  lat: number;
  lng: number;
  createdAt: string;
}

interface Photo {
  id: string;
  url: string;
  date: string;
  diaryId: string;
}
```

## 5. 服务器架构图

```mermaid
graph LR
    A["Express Router"] --> B["行程路由<br/>/api/trips"]
    A --> C["日记路由<br/>/api/diaries"]
    A --> D["相册路由<br/>/api/albums"]
    A --> E["上传路由<br/>/api/upload"]
    B --> F["内存存储<br/>(Map/Array)"]
    C --> F
    D --> F
    E --> G["静态文件服务<br/>/uploads"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Trip ||--o{ DayPlan : "包含"
    DayPlan ||--o{ Spot : "包含"
    Spot ||--o| DiaryEntry : "关联"
    DiaryEntry ||--o{ Photo : "包含"

    Trip {
        string id PK
        string name
        string createdAt
    }

    DayPlan {
        string id PK
        int dayNumber
        string date
        string tripId FK
    }

    Spot {
        string id PK
        string name
        float duration
        float lat
        float lng
        int order
        string dayId FK
    }

    DiaryEntry {
        string id PK
        string tripId FK
        string spotId FK
        string spotName
        string content
        float lat
        float lng
        string createdAt
    }

    Photo {
        string id PK
        string url
        string date
        string diaryId FK
    }
```

### 6.2 数据存储

使用内存中的JavaScript对象模拟数据库存储，数据结构如下：
- `trips: Map<string, Trip>` — 存储所有旅行
- `diaries: Map<string, DiaryEntry>` — 存储所有日记
- `photos: Photo[]` — 存储所有照片引用

服务器重启后数据会丢失，符合用户"内存模拟存储"的要求。
