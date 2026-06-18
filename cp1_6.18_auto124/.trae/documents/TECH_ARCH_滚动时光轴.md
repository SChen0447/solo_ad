## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层"
        A["React 组件层"] --> B["UI组件"]
        B --> B1["TimeLineCanvas"]
        B --> B2["CardEditor"]
        B --> B3["Minimap"]
        B --> B4["UploadZone"]
    end
    
    subgraph "业务层"
        C["核心模块"] --> C1["TimeLineEngine 渲染引擎"]]
        C --> C2["CardParser 解析器"]]
        C --> C3["GridStore 状态管理"]]
    end
    
    subgraph "数据层"
        D["Zustand Store"] --> D1["卡片列表"]
        D --> D2["缩放层级"]
        D --> D3["聚焦卡片ID"]
        D --> D4["滚动位置"]
    end
    
    subgraph "工具层"
        E["工具函数"] --> E1["动画缓动"]
        E --> E2["时间解析"]
        E --> E3["颜色生成"]
    end
    
    A --> C
    C --> D
    B --> C
```

## 2. 技术描述

- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite 5
- **状态管理**: Zustand 4
- **唯一ID**: uuid
- **样式方案**: 原生 CSS + CSS 变量
- **动画方案**: CSS 动画 + requestAnimationFrame
- **渲染引擎**: 原生 DOM 操作（无第三方滚动库）

## 3. 目录结构

```
src/
├── main.tsx              # React 入口文件
├── App.tsx              # 主应用组件
├── modules/
│   ├── TimeLineEngine.ts    # 时间轴渲染与滚动逻辑
│   ├── CardParser.ts      # 时间解析与卡片生成
│   └── GridStore.ts       # Zustand 状态管理
├── components/
│   ├── TimeLineCanvas.tsx  # 画布组件
│   ├── CardEditor.tsx     # 弹窗编辑器
│   └── Minimap.tsx       # 迷你地图
└── styles/
    └── global.css         # 全局样式
```

## 4. 数据模型

### 4.1 Card 数据结构

```typescript
interface Card {
  id: string;
  title: string;
  content: string;
  timestamp: Date | null;
  imageUrl?: string;
  color: string;
  isUnfiled: boolean;
  createdAt: number;
  x: number;
  y: number;
  scale: number;
}
```

### 4.2 Store 状态定义

```typescript
interface GridState {
  cards: Card[];
  zoom: number;
  scrollX: number;
  focusedCardId: string | null;
  editingCardId: string | null;
  viewportWidth: number;
  viewportHeight: number;
}
```

## 5. 核心模块说明

### 5.1 TimeLineEngine

- 职责：管理时间轴渲染、卡片布局计算、滚动与缩放处理
- 主要方法：
  - `render(cards: Card[]): void
  - `scrollTo(x: number): void
  - `setZoom(zoom: number): void
  - `handleDrag(deltaX: number): void
  - `getCenterCard(): Card | null

### 5.2 CardParser

- 职责：解析输入内容，提取时间戳，生成Card对象
- 主要方法：
  - `parseText(text: string): Card[]`
  - `parseImage(file: File): Promise<Card>`
  - `extractDate(text: string): Date | null

### 5.3 GridStore (Zustand)

- 职责：全局状态管理
- 主要方法：
  - `addCard(card: Card): void`
  - `updateCard(id: string, updates: Partial<Card>): void`
  - `removeCard(id: string): void`
  - `setZoom(zoom: number): void`
  - `setScrollX(x: number): void`
  - `setFocusedCard(id: string | null): void`

## 6. 性能优化策略

### 6.1 渲染优化

- 使用 CSS `transform` 和 `opacity` 实现动画，避免重排重绘
- 卡片使用 `will-change: transform` 提升渲染性能
- 使用 `requestAnimationFrame` 保证动画帧率稳定

### 6.2 交互优化

- 鼠标拖拽使用节流处理
- 滚轮缩放使用防抖处理
- 迷你地图同步滚动使用即时响应，无延迟

### 6.3 内存管理

- 图片使用适当压缩
- 大图使用缩略图展示
- 及时清理事件监听器

## 7. 动画实现

### 7.1 卡片滑入动画（0.3s，弹性缓动）

```css
@keyframes slideIn {
  0% { transform: translateX(-100%); opacity: 0; }
  70% { transform: translateX(5%); opacity: 1; }
  100% { transform: translateX(0); }
}
```

### 7.2 缩放动画（平滑过渡）

```css
transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
```

### 7.3 编辑器弹出动画（从卡片位置放大）

```css
@keyframes editorPopIn {
  0% { transform: scale(0.5); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
```

## 8. 预设颜色方案

### 8.1 主题颜色变量

```css
:root {
  --bg-primary: #1A1A2E;
  --bg-card: #16213E;
  --text-title: #E2E8F0;
  --text-note: #A0AEC0;
  --accent-line: #4FD1C5;
  --focus-bg: #E8F5E9;
  --minimap-viewport: rgba(255, 165, 0, 0.3);
}
```

### 8.2 标签色预设（10种柔和色）

```typescript
const TAG_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
];
```
