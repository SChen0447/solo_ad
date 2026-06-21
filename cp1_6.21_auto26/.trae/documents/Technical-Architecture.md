## 1. 架构设计

```mermaid
flowchart TB
  subgraph "前端层 (React + TypeScript)"
    A["App.tsx 根组件"]
    B["Context Store 状态管理"]
    C["API 封装层"]
    D["组件层"]
    D1["MediaCard 网格卡片"]
    D2["MediaList 列表视图"]
    D3["MediaTimeline 时间线视图"]
    D4["ItemModal 编辑/添加弹窗"]
    D5["DeleteModal 删除确认"]
    D6["StatsOverview 统计概览"]
    D7["FilterBar 筛选搜索栏"]
    D8["ViewSwitcher 视图切换"]
  end
  subgraph "后端层 (Express + 内存存储)"
    E["API Routes"]
    F["内存数据存储 (Map)"]
    G["UUID ID生成"]
  end
  A --> B
  B --> C
  C -->|"REST API /api"| E
  E --> F
  E --> G
  D --> A
```

## 2. 技术描述
- **前端**：React 18 + TypeScript + Vite 构建，使用 React Context 进行状态管理
- **后端**：Express 4 + TypeScript，内存存储（Map），uuid 生成 ID，cors 跨域
- **构建工具**：Vite，前端代理 /api 到后端 3001 端口
- **样式方案**：自定义 CSS（CSS Variables 主题系统），不引入 Tailwind
- **并发启动**：concurrently 同时启动 Vite(5173) 和 Express(3001)

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 单页应用首页（所有功能均在此页面，无多路由） |

## 4. API 定义

### TypeScript 类型
```typescript
type MediaType = 'book' | 'movie' | 'music';

interface MediaItem {
  id: string;
  type: MediaType;
  title: string;
  creator: string;
  year: number;
  coverUrl: string;
  rating: number; // 1-5
  tags: string[]; // max 5
  createdAt: number;
}

interface Filter {
  type: MediaType | 'all';
  ratingMin: number; // 0-5, 0 = no limit
  ratingMax: number; // 0-5, 0 = no limit
  tags: string[];
  search: string;
}

type ViewMode = 'grid' | 'list' | 'timeline';
```

### REST API 端点
| 方法 | 路径 | 请求体 | 响应 | 描述 |
|------|------|--------|------|------|
| GET | /api/items | - | MediaItem[] | 获取所有条目列表 |
| POST | /api/items | Omit<MediaItem, 'id' \| 'createdAt'> | MediaItem | 新增条目 |
| PUT | /api/items/:id | Partial<Omit<MediaItem, 'id' \| 'createdAt' \| 'coverUrl'>> | MediaItem | 更新条目（coverUrl不可改） |
| DELETE | /api/items/:id | - | { success: true } | 删除条目 |
| GET | /api/tags | - | string[] | 获取所有已存在的标签（用于自动补全） |
| GET | /api/stats | - | StatsData | 获取统计数据（总数、分类计数、平均分、标签词频） |

## 5. 服务器架构图

```mermaid
flowchart LR
  A["Express App"] --> B["cors 中间件"]
  A --> C["express.json 中间件"]
  A --> D["Router: /api/items"]
  A --> E["Router: /api/tags"]
  A --> F["Router: /api/stats"]
  D --> G["内存存储 Map<string, MediaItem>"]
  E --> G
  F --> G
  G --> H["uuid v4 生成 ID"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
  MEDIA_ITEM {
    string id PK "UUID"
    string type "book/movie/music"
    string title "标题"
    string creator "创作者"
    number year "年份"
    string coverUrl "封面图片URL"
    number rating "1-5评分"
    string tags "标签数组（JSON序列化）"
    number createdAt "创建时间戳"
  }
```

### 6.2 初始示例数据
后端启动时预置 12 条示例数据（4 本书 + 4 部电影 + 4 张音乐），涵盖常用标签如"经典"、"科幻"、"治愈"、"推荐"等，便于展示统计和筛选功能。
