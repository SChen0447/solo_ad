## 1. 架构设计

```mermaid
flowchart TD
    subgraph 前端["前端 React + TypeScript"]
        A["main.tsx 入口"] --> B["App.tsx 主布局"]
        B --> C["GameBoard.tsx 棋盘组件"]
        B --> D["StatusBar 状态栏"]
        B --> E["LogPanel 日志面板"]
        C --> F["GameEngine.ts 游戏引擎"]
        F --> G["EventEmitter 事件派发"]
    end

    subgraph 后端["后端 Python Flask"]
        H["Flask REST API"] --> I["房间管理"]
        H --> J["对局记录"]
        K["Flask-SocketIO"] --> L["WebSocket 实时同步"]
        I --> M["SQLite 数据库"]
        J --> M
    end

    C -->|"axios/REST"| H
    C -->|"socket.io-client"| K
    G -->|"事件驱动UI更新"| C
```

## 2. 技术说明

- **前端**：React@18 + TypeScript + Vite + Framer Motion（动画）+ Zustand（状态管理）
- **初始化工具**：vite-init
- **后端**：Python Flask + Flask-SocketIO + Eventlet
- **数据库**：SQLite（对局记录存储）
- **实时通信**：WebSocket（Flask-SocketIO + socket.io-client）
- **3D/动画**：Framer Motion 负责UI动画，Three.js/React Three Fiber 备用（棋子特效）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 游戏主界面（棋盘+状态栏+日志） |
| `/lobby` | 对局大厅（房间列表+创建房间） |

## 4. API 定义

### 4.1 REST API

| 方法 | 端点 | 请求体 | 响应 |
|------|------|--------|------|
| POST | `/api/rooms` | `{ "playerName": string }` | `{ "roomId": string, "wsUrl": string }` |
| GET | `/api/rooms` | - | `{ "rooms": Array<{ "id": string, "players": number }> }` |
| POST | `/api/rooms/:id/join` | `{ "playerName": string }` | `{ "success": boolean }` |
| GET | `/api/games/:id` | - | `{ "game": GameRecord }` |

### 4.2 WebSocket 事件

| 事件名 | 方向 | 数据 |
|--------|------|------|
| `join` | Client→Server | `{ "roomId": string, "playerName": string }` |
| `move` | Client→Server | `{ "from": Position, "to": Position, "attribute": Attribute }` |
| `place` | Client→Server | `{ "position": Position, "attribute": Attribute }` |
| `state` | Server→Client | `{ "board": BoardState, "scores": [number, number], "turn": number }` |
| `gameOver` | Server→Client | `{ "winner": number, "reason": string }` |

### 4.3 TypeScript 类型定义

```typescript
type Attribute = 'light' | 'dark' | 'phantom';
type Position = { row: number; col: number };

interface Piece {
  id: string;
  attribute: Attribute;
  player: 0 | 1;
  position: Position;
}

interface BoardState {
  cells: (Piece | null)[][];
  energyNodes: Position[];
}

interface GameState {
  board: BoardState;
  scores: [number, number];
  turn: 0 | 1;
  pieces: Piece[];
  isGameOver: boolean;
  winner: number | null;
}
```

## 5. 服务器架构

```mermaid
flowchart LR
    A["Flask Controller"] --> B["RoomService"]
    A --> C["GameService"]
    B --> D["SQLite"]
    C --> D
    E["SocketIO Handler"] --> C
    E --> F["EventEmitter"]
    F -->|"广播状态"| G["客户端"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "Room" {
        string id PK
        string player1_name
        string player2_name
        datetime created_at
        string status
    }
    "GameRecord" {
        integer id PK
        string room_id FK
        string winner
        integer score1
        integer score2
        string moves_json
        datetime started_at
        datetime ended_at
    }
    "Room" ||--o| "GameRecord" : "has"
```

### 6.2 数据定义语言

```sql
CREATE TABLE rooms (
    id TEXT PRIMARY KEY,
    player1_name TEXT NOT NULL,
    player2_name TEXT,
    status TEXT DEFAULT 'waiting',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE game_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id TEXT REFERENCES rooms(id),
    winner TEXT,
    score1 INTEGER DEFAULT 0,
    score2 INTEGER DEFAULT 0,
    moves_json TEXT,
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP
);
```

## 7. 核心游戏逻辑

### 7.1 三属性相克规则

- 光（light）克 暗（dark）
- 暗（dark）克 幻（phantom）
- 幻（phantom）克 光（light）

### 7.2 能量节点

- 棋盘上预设4个能量节点（位于对称位置）
- 棋子占据节点获得1分，并激活特殊能力
- 特殊能力：光属性节点恢复被吃棋子，暗属性节点封锁相邻格，幻属性节点瞬移至任意空格

### 7.3 AI决策逻辑

- 每2秒自动走一步
- 优先级：攻击可克制棋子 > 占据空能量节点 > 随机移动
- 决策时间不超过50ms

### 7.4 GameEngine 事件

| 事件名 | 数据 | 说明 |
|--------|------|------|
| `move` | `{ piece, from, to }` | 棋子移动 |
| `capture` | `{ attacker, captured }` | 吃子 |
| `score` | `{ player, points }` | 得分 |
| `win` | `{ winner, reason }` | 获胜 |
