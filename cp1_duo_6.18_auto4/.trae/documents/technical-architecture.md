## 1. 架构设计

```mermaid
flowchart TB
    subgraph 前端["前端 React + TypeScript"]
        A["App.tsx 主布局"] --> B["CanvasHandler.ts 画布渲染"]
        A --> C["StateManager.ts Zustand状态"]
        A --> D["SummaryPanel.tsx 纪要面板"]
        C --> E["WebSocketConnection.ts WebSocket管理"]
    end

    subgraph 后端["后端 Node.js"]
        F["server.js WebSocket服务器"]
        F --> G["消息广播"]
        F --> H["POST /generate-summary"]
    end

    E -->|"WebSocket连接"| F
    D -->|"HTTP POST"| H
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite + Zustand
- 初始化工具：vite-init (react-ts模板)
- 后端：Node.js + ws库（WebSocket服务器）+ http模块（REST API）
- 数据库：无（内存存储，元素列表在客户端和服务器间同步）
- 实时通信：WebSocket（ws库）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 白板主页面（单页应用） |

## 4. API定义

### 4.1 WebSocket消息类型

```typescript
type MessageType = 'add' | 'update' | 'delete' | 'cursor';

interface WSMessage {
  type: MessageType;
  element?: BoardElement;
  elements?: BoardElement[];
  cursor?: { x: number; y: number };
  userId: string;
}

interface BoardElement {
  id: string;
  type: 'stroke' | 'rect' | 'ellipse' | 'text';
  x: number;
  y: number;
  width?: number;
  height?: number;
  points?: { x: number; y: number }[];
  color: string;
  lineWidth?: number;
  text?: string;
  fontSize?: number;
  userId: string;
  createdAt: number;
  opacity?: number;
}
```

### 4.2 REST API

```
POST /generate-summary
请求体: { elements: BoardElement[] }
响应体: { summary: string }
```

## 5. 服务器架构图

```mermaid
flowchart LR
    A["WebSocket连接管理"] --> B["消息路由"]
    B --> C["广播给其他客户端"]
    B --> D["存储元素快照"]
    E["HTTP请求处理"] --> F["POST /generate-summary"]
    F --> G["整理文本内容生成摘要"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    BoardElement ||--o{ StrokePoint : contains
    BoardElement {
        string id PK
        string type
        number x
        number y
        number width
        number height
        string color
        number lineWidth
        string text
        number fontSize
        string userId
        number createdAt
        number opacity
    }
    StrokePoint {
        number x
        number y
    }
    User {
        string id PK
        string name
        string color
        number cursorX
        number cursorY
    }
```

### 6.2 文件结构

```
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
├── server.js
├── src/
│   ├── App.tsx
│   ├── CanvasHandler.ts
│   ├── StateManager.ts
│   ├── WebSocketConnection.ts
│   └── SummaryPanel.tsx
```
