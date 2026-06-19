## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "GalleryPage[画廊主页 GalleryPage]"
        "GalleryCard[画作卡片 GalleryCard]"
        "RankingBar[热度排行 RankingBar]"
        "CollectionPanel[收藏面板 CollectionPanel]"
        "CommentSection[评论区域 CommentSection]"
    end

    subgraph "状态管理层"
        "GalleryStore[Zustand全局状态]"
    end

    subgraph "数据层"
        "MockData[模拟画作数据]"
        "LocalStorage[本地存储-收藏持久化]"
    end

    "GalleryPage" --> "GalleryCard"
    "GalleryPage" --> "RankingBar"
    "GalleryPage" --> "CollectionPanel"
    "GalleryCard" --> "GalleryStore"
    "RankingBar" --> "GalleryStore"
    "CollectionPanel" --> "GalleryStore"
    "CommentSection" --> "GalleryStore"
    "GalleryStore" --> "LocalStorage"
    "GalleryStore" --> "MockData"
```

## 2. 技术说明

- 前端：React 18 + TypeScript + Vite + TailwindCSS
- 初始化工具：vite-init (react-ts模板)
- 后端：无（纯前端，使用模拟数据）
- 数据库：无（使用本地存储 localStorage 持久化收藏状态，内存状态管理评论数据）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 画廊主页，展示画作网格、热度排行、收藏面板和详情面板 |

## 4. 数据模型

### 4.1 数据模型定义

```mermaid
erDiagram
    "Painting" {
        "string id PK"
        "string title"
        "string author"
        "string imageUrl"
        "number likes"
        "number commentCount"
    }
    "Comment" {
        "string id PK"
        "string paintingId FK"
        "string username"
        "string avatar"
        "string content"
        "string timestamp"
    }
    "Collection" {
        "string paintingId PK"
        "boolean isCollected"
    }
    "Painting" ||--o{ "Comment" : "has"
    "Painting" ||--o| "Collection" : "has"
```

### 4.2 数据定义

- **Painting**：画作对象，包含id、标题、作者、图片URL、点赞数、评论数
- **Comment**：评论对象，包含id、画作ID关联、用户名、头像URL、评论内容、时间戳
- **Collection**：收藏记录，画作ID与是否收藏的映射，存储在localStorage中

### 4.3 文件结构与调用关系

```
src/
├── main.tsx                          # 入口文件，渲染App
├── App.tsx                           # 根组件，布局GalleryPage
├── store/
│   └── galleryStore.ts               # Zustand全局状态管理
├── data/
│   └── mockData.ts                   # 模拟画作和评论数据
├── gallery/
│   ├── GalleryPage.tsx               # 画廊主页，调用GalleryCard、RankingBar、CollectionPanel、CommentSection
│   └── GalleryCard.tsx               # 画作卡片，接收画作props→渲染→触发收藏/点击回调
├── collection/
│   └── CollectionPanel.tsx           # 收藏面板，监听收藏事件→更新状态→重新渲染
├── ranking/
│   └── RankingBar.tsx                # 热度排行，从store获取热度数据→排序→渲染柱状图
└── comments/
    └── CommentSection.tsx            # 评论区域，接收画作ID→管理评论状态→渲染列表与输入框
```

**数据流向**：
1. mockData → galleryStore（初始化状态）
2. galleryStore → GalleryPage → GalleryCard（画作数据props传递）
3. GalleryCard → galleryStore（收藏事件、点击选中事件）
4. galleryStore → RankingBar（热度数据，排序后渲染柱状图）
5. galleryStore → CollectionPanel（收藏列表，从localStorage恢复）
6. galleryStore → CommentSection（评论数据，提交新评论更新状态）
7. galleryStore → localStorage（收藏状态持久化）
