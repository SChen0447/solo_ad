## 1. 架构设计

```mermaid
graph TD
    "index.html" --> "main.ts"
    "main.ts" --> "GameEngine.ts"
    "GameEngine.ts" --> "Renderer.ts"
    "GameEngine.ts" --> "AudioManager.ts"
    "GameEngine.ts" --> "InputManager.ts"
    "InputManager.ts --> GameEngine.ts"
    "Renderer.ts --> Canvas"
    "AudioManager.ts --> Web Audio API"
    "InputManager.ts --> Canvas Events"
```

## 2. 技术说明

- 前端：TypeScript + Vite + Canvas 2D（无框架，纯Canvas渲染）
- 构建工具：Vite@5.0.8
- 语言：TypeScript@5.3.3（严格模式，ES模块）
- 音效：Web Audio API合成音效（无外部音频文件）
- 无后端、无数据库（纯前端单机游戏）

## 3. 模块职责

### 3.1 GameEngine.ts（游戏主循环）

- 管理网格状态（20×20数组）
- 管理建筑数据（类型、等级、位置、产出速率）
- 游客生成与移动逻辑（A*寻路或简单路径）
- 金币计算与累计
- 每帧更新逻辑，调用渲染器绘制场景
- 管理升级进度和粒子特效状态

### 3.2 Renderer.ts（渲染模块）

- 绘制网格（虚线、背景渐变）
- 绘制建筑（像素图标、等级标识、选中高亮）
- 绘制游客（2×2像素小人、行走浮动动画）
- 绘制UI（工具栏、金币面板、统计侧边栏、升级菜单）
- 绘制动画（放置弹入、升级进度条、粒子特效、金币泡泡）
- 处理响应式布局（桌面32px/移动24px）

### 3.3 AudioManager.ts（音效管理）

- Web Audio API初始化
- playPlaceSound()：上升音调
- playUpgradeSound()：欢快琶音
- playCoinSound()：短促叮当声

### 3.4 InputManager.ts（输入管理）

- 鼠标/触摸事件监听
- 区分拖拽、点击、右键操作
- 拖拽建筑放置（从工具栏到网格）
- 拖拽建筑移位（已放置建筑）
- 右键打开升级菜单
- 统计按钮交互
- 将操作转换为游戏命令传递给GameEngine

## 4. 数据模型

### 4.1 建筑

```typescript
interface Building {
  id: number;
  type: 'fisherman' | 'hotel' | 'restaurant' | 'lighthouse' | 'garden';
  gridX: number;
  gridY: number;
  level: number;
  goldRate: number;
  isUpgrading: boolean;
  upgradeProgress: number;
}
```

### 4.2 游客

```typescript
interface Tourist {
  id: number;
  x: number;
  y: number;
  color: 'red' | 'yellow' | 'blue' | 'green';
  targetBuildingId: number | null;
  path: {x: number; y: number}[];
  isConsuming: boolean;
  consumeTimer: number;
}
```

### 4.3 交易记录

```typescript
interface Transaction {
  timestamp: number;
  buildingType: string;
  amount: number;
  touristColor: string;
}
```

## 5. 文件结构

```
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
└── src/
    ├── main.ts         （入口，初始化各模块）
    ├── GameEngine.ts   （游戏主循环与核心逻辑）
    ├── Renderer.ts     （渲染模块）
    ├── AudioManager.ts （音效管理）
    └── InputManager.ts （输入管理）
```

## 6. 游戏数值

| 建筑 | 等级1产出 | 等级2产出 | 等级3产出 | 等级4产出 | 等级5产出 | 特殊效果 |
|------|-----------|-----------|-----------|-----------|-----------|----------|
| 渔屋 | 5金/分 | 10金/分 | 15金/分 | 20金/分 | 25金/分 | - |
| 旅馆 | 3游客容量 | 6游客容量 | 9游客容量 | 12游客容量 | 15游客容量 | 吸引游客 |
| 餐厅 | 8金/分 | 16金/分 | 24金/分 | 32金/分 | 40金/分 | - |
| 灯塔 | +10%区域产出 | +20% | +30% | +40% | +50% | 增加相邻建筑产出 |
| 花圃 | 3金/分 | 6金/分 | 9金/分 | 12金/分 | 15金/分 | 增加游客满意度 |
