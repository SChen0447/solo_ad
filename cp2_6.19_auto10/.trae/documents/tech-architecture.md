## 1. 架构设计

```mermaid
flowchart TD
    "前端 React + TypeScript + Vite" --> "状态管理 Zustand"
    "状态管理 Zustand" --> "App.tsx 主组件"
    "App.tsx 主组件" --> "Sidebar.tsx 侧边栏"
    "App.tsx 主组件" --> "MainContent.tsx 主内容区"
    "App.tsx 主组件" --> "PlayerBar.tsx 播放控制栏"
    "MainContent.tsx 主内容区" --> "Carousel 轮播图"
    "MainContent.tsx 主内容区" --> "AlbumGrid 专辑网格"
    "MainContent.tsx 主内容区" --> "PlaylistView 播放列表"
    "types.ts 类型定义" --> "Sidebar.tsx"
    "types.ts 类型定义" --> "MainContent.tsx"
    "types.ts 类型定义" --> "PlayerBar.tsx"
    "types.ts 类型定义" --> "App.tsx"
```

## 2. 技术说明

- **前端**：React@18 + TypeScript + Vite + Tailwind CSS
- **初始化工具**：vite-init (react-ts 模板)
- **后端**：无（纯前端，使用 Mock 数据）
- **数据库**：无（Mock 数据内置于前端代码中）
- **状态管理**：Zustand

## 3. 路由定义

| 路由状态 | 目的 |
|---------|------|
| my-music | 默认首页，展示推荐歌单轮播图和我的音乐内容 |
| albums | 专辑库页面，展示专辑网格浏览 |
| playlists | 播放列表页面，展示自定义播放列表 |
| recent | 最近播放页面，展示播放历史 |

路由使用 Zustand 状态管理模拟，无实际URL变化。

## 4. 文件结构

```
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.tsx          # 入口文件
    ├── App.tsx           # 主组件（路由状态+播放状态管理）
    ├── Sidebar.tsx       # 侧边栏导航
    ├── MainContent.tsx   # 主内容区（轮播+网格+列表）
    ├── PlayerBar.tsx     # 底部播放控制栏
    ├── types.ts          # 类型定义
    └── index.css         # 全局样式+Tailwind指令
```

## 5. 数据模型

### 5.1 类型定义

```typescript
interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover: string;
}

interface Album {
  id: string;
  title: string;
  artist: string;
  cover: string;
  year: number;
  songs: Song[];
}

interface Playlist {
  id: string;
  name: string;
  cover: string;
  songs: Song[];
}

type NavItem = 'my-music' | 'albums' | 'playlists' | 'recent';
```

### 5.2 Mock数据

内置Mock数据包含：
- 8-12首歌曲（含封面URL、歌名、艺术家、时长）
- 4-6张专辑（含封面、年份、歌曲列表）
- 3个播放列表
- 3张轮播推荐卡片
