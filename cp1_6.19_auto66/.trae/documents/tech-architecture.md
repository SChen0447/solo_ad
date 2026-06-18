## 1. 架构设计

```mermaid
graph TB
    "前端展示层" --> "状态管理层(Zustand)"
    "状态管理层(Zustand)" --> "业务逻辑层(Hooks)"
    "业务逻辑层(Hooks)" --> "数据类型层(Types)"
    "前端展示层" --> "App.tsx(导航栏+布局)"
    "前端展示层" --> "Floorplan.tsx(2D平面图)"
    "前端展示层" --> "SidePanel.tsx(左侧面板)"
    "前端展示层" --> "EditPanel.tsx(编辑面板)"
    "前端展示层" --> "InfoCard.tsx(悬浮信息卡)"
    "状态管理层(Zustand)" --> "store.ts(画框/展厅/动线状态)"
    "业务逻辑层(Hooks)" --> "hooks.ts(useDragMove/useAutoPath)"
    "数据类型层(Types)" --> "types.ts(接口定义)"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite
- 状态管理：Zustand
- 初始化工具：vite-init（react-ts 模板）
- 样式：Tailwind CSS + CSS Modules（复杂动画部分）
- 后端：无（纯前端应用，数据通过JSON导入导出）
- 数据库：无（所有数据存储在Zustand store内存中，通过JSON文件持久化）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 展览规划主页（单页应用，无额外路由） |

## 4. API定义

不适用，本项目为纯前端应用，无后端API。

## 5. 服务器架构图

不适用，本项目为纯前端应用。

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "ExhibitionHall" ||--o{ "Frame" : "contains"
    "ExhibitionHall" ||--o{ "PathNode" : "has"
    "Frame" ||--o| "Artwork" : "displays"
    "ExhibitionHall" {
        "string id PK"
        "string name"
        "number width"
        "number depth"
        "string wallColor"
        "string floorMaterial"
    }
    "Frame" {
        "string id PK"
        "number x"
        "number y"
        "number width"
        "number height"
        "string frameColor"
        "boolean visible"
        "boolean isColliding"
    }
    "Artwork" {
        "string id PK"
        "string frameId FK"
        "string name"
        "string artist"
        "string description"
        "string imageUrl"
    }
    "PathNode" {
        "string id PK"
        "number x"
        "number y"
        "number order"
    }
```

### 6.2 数据定义语言（TypeScript接口）

```typescript
interface ExhibitionHall {
  id: string;
  name: string;
  width: number;
  depth: number;
  wallColor: string;
  floorMaterial: 'wood' | 'carpet' | 'concrete';
}

interface Frame {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  frameColor: string;
  visible: boolean;
  isColliding: boolean;
  artwork?: Artwork;
}

interface Artwork {
  id: string;
  name: string;
  artist: string;
  description: string;
  imageUrl: string;
}

interface PathNode {
  id: string;
  x: number;
  y: number;
  order: number;
}
```

## 7. 文件结构

```
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── types.ts          # TypeScript接口定义
│   ├── store.ts          # Zustand状态管理
│   ├── hooks.ts          # 自定义hooks
│   ├── App.tsx           # 主应用组件
│   ├── Floorplan.tsx     # 2D平面图组件
│   ├── SidePanel.tsx     # 左侧工具面板
│   ├── EditPanel.tsx     # 画框编辑面板
│   ├── InfoCard.tsx      # 悬浮信息卡
│   ├── main.tsx          # 入口文件
│   └── index.css         # 全局样式
```
