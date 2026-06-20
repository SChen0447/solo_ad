## 1. 架构设计

```mermaid
graph TB
    "前端 React + TypeScript" --> "路由层 React Router"
    "路由层 React Router" --> "主页"
    "路由层 React Router" --> "时间轴编辑页"
    "路由层 React Router" --> "故事书浏览页"
    "时间轴编辑页" --> "TimelineEditor组件"
    "时间轴编辑页" --> "MapView组件"
    "故事书浏览页" --> "StoryBookViewer组件"
    "TimelineEditor组件" --> "useTimeline Hook"
    "StoryBookViewer组件" --> "useTimeline Hook"
    "MapView组件" --> "useTimeline Hook"
    "useTimeline Hook" --> "Zustand Store"
    "Zustand Store" --> "mockData 初始数据"
```

## 2. 技术说明

- 前端：React 18 + TypeScript + Vite
- 状态管理：Zustand
- 路由：react-router-dom v6
- 动画：framer-motion
- 地图：leaflet + react-leaflet
- 初始化工具：vite-init (react-ts 模板)
- 后端：无（纯前端应用，数据存储在内存/localStorage）
- 数据库：无（使用mock数据 + localStorage持久化）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主页，应用入口和导航 |
| /editor | 时间轴编辑页，事件增删改查和拖拽排序 |
| /storybook | 故事书浏览页，翻页动画展示 |

## 4. 数据模型

### 4.1 事件节点（TimelineEvent）

```typescript
interface TimelineEvent {
  id: string;
  title: string;        // 最多50字
  description: string;  // 最多300字
  date: string;         // ISO日期字符串
  imageUrl?: string;    // 可选图片URL
  latitude?: number;    // 可选纬度
  longitude?: number;   // 可选经度
}
```

### 4.2 时间轴状态（TimelineStore）

```typescript
interface TimelineStore {
  events: TimelineEvent[];
  addEvent: (event: Omit<TimelineEvent, 'id'>) => void;
  removeEvent: (id: string) => void;
  updateEvent: (id: string, updates: Partial<TimelineEvent>) => void;
  moveEvent: (fromIndex: number, toIndex: number) => void;
  importEvents: (events: TimelineEvent[]) => void;
  exportEvents: () => string;
}
```

## 5. 文件结构

```
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── components/
│   │   ├── TimelineEditor.tsx
│   │   ├── StoryBookViewer.tsx
│   │   └── MapView.tsx
│   ├── hooks/
│   │   └── useTimeline.ts
│   └── data/
│       └── mockData.ts
```
