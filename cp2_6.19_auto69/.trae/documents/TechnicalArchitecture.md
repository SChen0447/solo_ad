## 1. 架构设计

```mermaid
graph TD
    "index.html" --> "GameEngine.ts"
    "GameEngine.ts" --> "BeatSync.ts"
    "GameEngine.ts" --> "Player.ts"
    "GameEngine.ts" --> "ObstacleManager.ts"
    "GameEngine.ts" --> "Renderer.ts"
    "BeatSync.ts -->|节拍事件| GameEngine.ts"
    "ObstacleManager.ts -->|待渲染对象| Renderer.ts"
    "Player.ts -->|角色状态| Renderer.ts"
    "GameEngine.ts -->|游戏状态| Renderer.ts"
```

## 2. 技术说明

- **前端**：纯TypeScript + Canvas 2D（无框架，纯游戏引擎模式）
- **构建工具**：Vite@5.0.8
- **语言**：TypeScript@5.3.3（严格模式）
- **音频**：Web Audio API（生成电子鼓点节拍）
- **存储**：localStorage（最高纪录持久化）
- **无后端**：纯前端单页应用

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 游戏主页面（全屏Canvas） |

## 4. 模块职责

### 4.1 GameEngine.ts
- 游戏主循环：requestAnimationFrame驱动
- 管理帧率监控与自适应降级
- 输入处理（键盘事件监听）
- 协调BeatSync、Player、ObstacleManager、Renderer
- 游戏状态管理（运行中、游戏结束）

### 4.2 BeatSync.ts
- Web Audio API初始化与电子鼓点节拍生成
- 节拍位置计算（0.5秒间隔，精度±10ms）
- 发布节拍事件给GameEngine
- 输出节拍信号用于动画触发（光晕、警示圈）

### 4.3 Player.ts
- 角色状态管理（奔跑、跳跃、滑铲）
- 跳跃逻辑：上弹+360度旋转，0.6秒，缓动曲线
- 滑铲逻辑：压缩1/3高度+白色粒子拖尾，0.4秒，缓动曲线
- 碰撞盒计算
- 输出角色位置和动画参数给Renderer

### 4.4 ObstacleManager.ts
- 根据节拍信号和当前分数生成障碍物和金币
- 三种障碍物：尖刺、矮墙、横杆
- 两种金币：普通金币、节拍金币
- 碰撞检测
- 对象生命周期管理（生成→移动→离开屏幕→销毁）
- 输出待渲染对象列表给Renderer

### 4.5 Renderer.ts
- 绘制背景（深蓝到紫色径向渐变）
- 绘制跑道（白色虚线，随速度滚动）
- 绘制脉冲光晕（节拍触发，0.2秒）
- 绘制警示圈（节拍前0.1秒，红色圆环）
- 绘制角色（像素风格红色方块，奔跑/跳跃/滑铲动画）
- 绘制障碍物和金币（含旋转、发光、粒子效果）
- 绘制UI（分数、连击数、分数弹出动画）
- 绘制音量控制滑块
- 绘制游戏结束界面

## 5. 数据模型

### 5.1 游戏状态

```typescript
interface GameState {
  score: number;
  highScore: number;
  combo: number;
  speed: number;
  isRunning: boolean;
  isGameOver: boolean;
  fps: number;
  particleMultiplier: number;
}
```

### 5.2 节拍状态

```typescript
interface BeatState {
  bpm: number;
  interval: number;
  lastBeatTime: number;
  nextBeatTime: number;
  beatProgress: number;
  isOnBeat: boolean;
}
```

### 5.3 角色状态

```typescript
interface PlayerState {
  x: number;
  y: number;
  baseY: number;
  width: number;
  height: number;
  isJumping: boolean;
  isSliding: boolean;
  rotation: number;
  jumpProgress: number;
  slideProgress: number;
  legPhase: number;
}
```

### 5.4 障碍物/金币类型

```typescript
type ObstacleType = 'spike' | 'lowWall' | 'highBar';
type CoinType = 'normal' | 'beat';

interface GameObject {
  x: number;
  y: number;
  type: ObstacleType | CoinType;
  width: number;
  height: number;
  isActive: boolean;
  warningShown: boolean;
  spawnTime: number;
  animProgress: number;
}
```

## 6. 文件结构

```
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
└── src/
    ├── GameEngine.ts
    ├── BeatSync.ts
    ├── ObstacleManager.ts
    ├── Renderer.ts
    └── Player.ts
```
