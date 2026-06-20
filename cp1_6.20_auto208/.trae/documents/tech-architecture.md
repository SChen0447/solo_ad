## 1. 架构设计

```mermaid
flowchart TB
    "前端层 React + TypeScript" --> "状态管理 Zustand"
    "状态管理 Zustand" --> "游戏逻辑 GameLogic.ts"
    "游戏逻辑 GameLogic.ts" --> "类型定义 types.ts"
    "前端层 React + TypeScript" --> "UI组件层"
    "UI组件层" --> "App.tsx 主应用"
    "UI组件层" --> "Board.tsx 棋盘组件"
    "App.tsx 主应用" --> "Board.tsx 棋盘组件"
    "App.tsx 主应用" --> "分数面板"
    "App.tsx 主应用" --> "回合指示器"
    "App.tsx 主应用" --> "技能按钮"
    "App.tsx 主应用" --> "结算界面"
```

纯前端架构，无后端服务，所有游戏逻辑在客户端运行。

## 2. 技术说明
- 前端框架：React 18 + TypeScript
- 构建工具：Vite + @vitejs/plugin-react
- 动画库：framer-motion
- 状态管理：组件内useState + useReducer（游戏状态管理）
- 初始化工具：vite-init（react-ts模板）
- 后端：无
- 数据库：无（纯前端状态）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 游戏主页面（包含难度选择、游戏进行、结算展示） |

单页应用，通过游戏阶段状态切换不同UI视图。

## 4. 核心数据结构

### 4.1 类型定义（types.ts）

```typescript
interface CellState {
  owner: Player | null;
  isPlanet: boolean;
}

type Player = 1 | 2;

interface PlayerState {
  id: Player;
  score: number;
  tokensPlaced: number;
  energy: number;
  skillUsedCount: number;
}

type GamePhase = 'setup' | 'playing' | 'ended';

interface GameState {
  board: CellState[][];
  boardSize: number;
  players: [PlayerState, PlayerState];
  currentPlayer: Player;
  phase: GamePhase;
  targetScore: number;
  hasSkill: boolean;
  totalTurns: number;
  longestLine: number;
  activeLines: Line[];
  scoreHistory: { turn: number; player1: number; player2: number }[];
}

interface Line {
  player: Player;
  cells: [number, number][];
  direction: 'horizontal' | 'vertical' | 'diagonal';
}
```

## 5. 游戏逻辑设计（GameLogic.ts）

### 5.1 核心流程
1. `initializeBoard(size)` - 初始化棋盘，随机生成行星节点
2. `placeToken(state, row, col)` - 放置代币，校验合法性
3. `useSkill(state, row, col)` - 使用星灵技能替换对方代币
4. `detectLines(board)` - 检测所有星座连线（横/竖/斜3个以上）
5. `calculateScore(state)` - 计算当前分数
6. `checkWin(state)` - 检查是否达到目标分数
7. `getValidMoves(state)` - 获取当前可放置位置

### 5.2 计分规则
- 普通格子放置代币：1分
- 行星节点放置代币：2分
- 星座连线每个代币额外：+1分
- 游戏结束时连线长度奖励分

### 5.3 难度预设
| 模式 | 棋盘大小 | 技能 | 目标分 | 行星节点 |
|------|----------|------|--------|----------|
| 普通 | 8x8 | 无 | 20 | 5-8个 |
| 进阶 | 8x8 | 有 | 20 | 5-8个 |
| 大师 | 10x10 | 有 | 30 | 8-11个 |

## 6. 组件设计

### 6.1 App.tsx
- 游戏容器（1000x800）
- 管理GameState
- 渲染：标题、分数面板、回合指示器、Board、技能按钮、结算弹窗
- 处理游戏流程控制

### 6.2 Board.tsx
- 使用React.memo优化
- 渲染网格棋盘
- 代币放置动画（framer-motion）
- 行星节点金色星形图标
- 选中/可放置格子光晕动画
- 星座连线高亮

### 6.3 性能优化
- React.memo包裹Board组件
- useMemo缓存计算结果
- 动画使用CSS transform/opacity（GPU加速）
- 目标60fps，动画帧率不低于55fps
