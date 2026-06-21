## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 React + TypeScript + Vite"
        A["App.tsx 主应用"]
        B["Canvas.tsx 白板画布"]
        C["Toolbar.tsx 工具面板"]
        D["ChatPanel.tsx 聊天面板"]
        E["UserList 在线用户"]
        F["StickerPanel 贴纸面板"]
        G["TextEditor 文字编辑"]
        H["HistoryManager 历史管理"]
    end
    
    subgraph "后端 Node.js + Express + Socket.IO"
        I["server/index.ts"]
        J["RoomManager 房间管理"]
        K["WhiteboardState 白板状态缓存"]
        L["SocketEventHandler 事件处理"]
    end
    
    subgraph "通信层"
        M["WebSocket Socket.IO"]
    end
    
    A --> B
    A --> C
    A --> D
    A --> E
    B --> F
    B --> G
    B --> H
    A <--> M
    M <--> I
    I --> J
    J --> K
    I --> L
```

## 2. 技术描述

- **前端框架**：React@18.2.0 + TypeScript@5.3.3
- **构建工具**：Vite@5.0.8 + @vitejs/plugin-react@4.2.0
- **样式方案**：CSS Modules / 内联样式
- **后端框架**：Express@4.18.2
- **实时通信**：Socket.IO@4.7.2 / socket.io-client@4.7.2
- **跨域处理**：cors@2.8.5
- **唯一标识**：uuid@9.0.0
- **画布技术**：HTML5 Canvas 2D API
- **初始化方式**：手动配置项目结构

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 入口页面，昵称输入 + 创建/加入房间 |
| /room/:roomId | 白板主页面，包含画布和工具面板 |

## 4. API 定义（Socket.IO 事件）

### 4.1 客户端 → 服务端

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `createRoom` | `{ nickname: string }` | 创建新房间 |
| `joinRoom` | `{ roomId: string, nickname: string }` | 加入房间 |
| `leaveRoom` | `{ roomId: string }` | 离开房间 |
| `drawStart` | `{ roomId: string, tool: string, x: number, y: number, color: string, size: number }` | 开始绘制 |
| `drawMove` | `{ roomId: string, x: number, y: number }` | 绘制中 |
| `drawEnd` | `{ roomId: string, pathId: string }` | 结束绘制 |
| `addText` | `{ roomId: string, text: string, x: number, y: number, fontSize: number, color: string }` | 添加文字 |
| `addSticker` | `{ roomId: string, type: string, x: number, y: number }` | 添加贴纸 |
| `moveSticker` | `{ roomId: string, stickerId: string, x: number, y: number }` | 移动贴纸 |
| `undo` | `{ roomId: string, userId: string }` | 撤销操作 |
| `redo` | `{ roomId: string, userId: string }` | 重做操作 |
| `clearCanvas` | `{ roomId: string }` | 清空画布 |
| `sendMessage` | `{ roomId: string, text: string }` | 发送聊天消息 |

### 4.2 服务端 → 客户端

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `roomCreated` | `{ roomId: string, userId: string }` | 房间创建成功 |
| `roomJoined` | `{ roomId: string, userId: string, users: User[] }` | 加入房间成功 |
| `userJoined` | `{ user: User }` | 新用户加入 |
| `userLeft` | `{ userId: string }` | 用户离开 |
| `fullState` | `{ paths: Path[], texts: TextItem[], stickers: Sticker[] }` | 完整白板状态（新用户加入时） |
| `drawStart` | `{ userId: string, tool: string, ... }` | 广播绘制开始 |
| `drawMove` | `{ userId: string, x: number, y: number }` | 广播绘制中 |
| `drawEnd` | `{ userId: string, pathId: string }` | 广播绘制结束 |
| `textAdded` | `{ text: TextItem }` | 广播文字添加 |
| `stickerAdded` | `{ sticker: Sticker }` | 广播贴纸添加 |
| `stickerMoved` | `{ stickerId: string, x: number, y: number }` | 广播贴纸移动 |
| `canvasUndo` | `{ historyIndex: number }` | 广播撤销 |
| `canvasRedo` | `{ historyIndex: number }` | 广播重做 |
| `canvasCleared` | `{}` | 广播清空画布 |
| `messageReceived` | `{ userId: string, text: string, timestamp: number }` | 广播聊天消息 |

### 4.3 类型定义

```typescript
interface User {
  id: string;
  nickname: string;
  isCreator: boolean;
  avatarColor: string;
}

interface Point {
  x: number;
  y: number;
}

interface Path {
  id: string;
  tool: 'pencil' | 'eraser' | 'rectangle' | 'circle' | 'line';
  points: Point[];
  color: string;
  size: number;
  userId: string;
}

interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
  userId: string;
}

interface Sticker {
  id: string;
  type: 'smile' | 'star' | 'arrow' | 'flower' | 'lightning' | 'heart';
  x: number;
  y: number;
  userId: string;
}

interface HistoryState {
  paths: Path[];
  texts: TextItem[];
  stickers: Sticker[];
}
```

## 5. 服务端架构图

```mermaid
graph LR
    A["Socket.IO 连接层"] --> B["事件分发器"]
    B --> C["房间管理器"]
    B --> D["白板状态缓存"]
    C --> E["用户列表维护"]
    C --> F["房间消息广播"]
    D --> G["历史状态栈"]
    D --> H["当前状态快照"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    ROOM ||--o{ USER : "包含"
    ROOM ||--o{ PATH : "包含"
    ROOM ||--o{ TEXT_ITEM : "包含"
    ROOM ||--o{ STICKER : "包含"
    ROOM ||--o{ HISTORY_STATE : "记录"
    
    ROOM {
        string id "6位数字邀请码"
        string creatorId
        datetime createdAt
    }
    
    USER {
        string id "socket id"
        string nickname
        boolean isCreator
        string avatarColor
        string roomId
    }
    
    PATH {
        string id
        string tool
        string color
        number size
        string userId
        Point[] points
    }
    
    TEXT_ITEM {
        string id
        string text
        number x
        number y
        number fontSize
        string color
        string userId
    }
    
    STICKER {
        string id
        string type
        number x
        number y
        string userId
    }
    
    HISTORY_STATE {
        number index
        Path[] paths
        TextItem[] texts
        Sticker[] stickers
    }
```

### 6.2 内存存储结构

服务端使用内存缓存存储白板状态，数据结构如下：

```typescript
interface RoomState {
  id: string;
  creatorId: string;
  users: Map<string, User>;
  history: HistoryState[];
  historyIndex: number;
}

const rooms: Map<string, RoomState> = new Map();
```
