## 1. 架构设计

```mermaid
flowchart TB
    subgraph Frontend["前端 (React + TypeScript + Vite)"]
        App["App.tsx 路由管理"]
        LP["LobbyPage 大厅"]
        GP["GamePage 游戏"]
        Board["Board 棋盘组件"]
        Socket["useSocket Hook"]
        API["api.ts REST服务"]
        Types["types.ts 类型定义"]
    end

    subgraph MockBackend["模拟后端 (客户端内)"]
        Store["Zustand 状态管理"]
        WS["WebSocket模拟 (EventEmitter)"]
        GameLogic["游戏逻辑 (五子判定/计时)"]
    end

    App --> LP
    App --> GP
    GP --> Board
    GP --> Socket
    LP --> API
    LP --> Socket
    Socket --> WS
    API --> Store
    Board --> GameLogic
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite + TailwindCSS
- 初始化工具：vite-init (react-ts模板)
- 状态管理：Zustand
- WebSocket模拟：客户端内使用EventEmitter模式模拟实时通信（无需后端服务器）
- 路由：react-router-dom
- 音效：Web Audio API（正弦波短促音效）
- 无后端服务器：所有逻辑在客户端内完成，使用Zustand管理全局状态，通过事件系统模拟WebSocket通信

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 大厅页面，展示房间列表，创建/加入房间 |
| /game/:roomId | 游戏页面，棋盘对弈、聊天、回放 |

## 4. API定义（模拟）

```typescript
interface ApiService {
  createRoom(nickname: string): Promise<Room>;
  getRooms(): Promise<Room[]>;
  joinRoom(roomId: string, nickname: string): Promise<Room>;
  getRoom(roomId: string): Promise<Room>;
}

interface WebSocketEvents {
  'move': (data: { roomId: string; position: Position; player: PlayerColor }) => void;
  'chat': (data: { roomId: string; message: ChatMessage }) => void;
  'game-end': (data: { roomId: string; winner: PlayerColor; winLine: Position[] }) => void;
  'timeout': (data: { roomId: string; loser: PlayerColor }) => void;
  'player-joined': (data: { roomId: string; player: Player }) => void;
}
```

## 5. 数据模型

### 5.1 数据模型定义

```mermaid
erDiagram
    Room ||--o{ Player : contains
    Room ||--o| Game : has
    Game ||--o{ Move : contains
    Game ||--o{ ChatMessage : contains

    Room {
        string id PK "8位房间码"
        string status "waiting/playing/finished"
        string createdAt "创建时间"
    }

    Player {
        string nickname "昵称"
        string color "black/white"
        number remainingTime "剩余时间(ms)"
    }

    Game {
        string roomId FK "房间ID"
        Position[] board "15x15棋盘状态"
        PlayerColor currentTurn "当前回合"
        Position[] winLine "获胜连线"
    }

    Move {
        number order "落子序号"
        Position position "落子坐标"
        PlayerColor player "落子方"
        number timestamp "落子时间戳"
    }

    ChatMessage {
        string sender "发送者昵称"
        PlayerColor color "棋子颜色"
        string text "消息内容"
        number timestamp "发送时间"
    }
```

### 5.2 核心类型定义

```typescript
type PlayerColor = 'black' | 'white';

interface Position {
  row: number;
  col: number;
}

interface Player {
  nickname: string;
  color: PlayerColor;
  remainingTime: number;
}

interface Room {
  id: string;
  status: 'waiting' | 'playing' | 'finished';
  players: Player[];
  createdAt: number;
}

interface Move {
  order: number;
  position: Position;
  player: PlayerColor;
  timestamp: number;
}

interface ChatMessage {
  sender: string;
  color: PlayerColor;
  text: string;
  timestamp: number;
}

interface GameState {
  board: (PlayerColor | null)[][];
  currentTurn: PlayerColor;
  moves: Move[];
  winLine: Position[] | null;
  winner: PlayerColor | null;
  isFinished: boolean;
}
```
