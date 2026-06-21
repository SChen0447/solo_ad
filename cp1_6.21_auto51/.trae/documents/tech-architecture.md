## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 React + TypeScript + Vite"
        A["报名页 RegisterPage"]
        B["摊主管理页 VendorDashboard"]
        C["管理员面板 AdminPanel"]
        D["报告页 ReportPage"]
        E["全局状态 AppContext"]
        F["组件 GoodsCard / CountdownTimer"]
    end

    subgraph "后端 Express + Socket.io"
        G["REST API :3001"]
        H["WebSocket 服务"]
        I["活动路由 activity.js"]
        J["商品路由 goods.js"]
        K["物资申请路由 request.js"]
        L["Socket管理 socket.js"]
    end

    subgraph "数据层 内存Map"
        M["activities Map"]
        N["vendors Map"]
        O["goods Map"]
        P["requests Map"]
        Q["orders Map"]
    end

    A --> G
    B --> G
    B --> H
    C --> G
    C --> H
    D --> G
    G --> I
    G --> J
    G --> K
    H --> L
    I --> M
    I --> N
    J --> O
    J --> Q
    K --> P
    L --> P
```

## 2. 技术说明

- **前端**: React 18 + TypeScript + Vite + TailwindCSS
- **初始化工具**: vite-init (react-express-ts 模板)
- **后端**: Express 4 + Socket.io
- **数据库**: 内存存储（Map对象），无需外部数据库
- **图表**: Recharts
- **图标**: lucide-react
- **实时通信**: Socket.io（倒计时广播、物资申请状态推送）
- **构建工具**: Vite（前端）+ tsc（类型检查）
- **并发运行**: concurrently

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| `/` | 报名首页，输入活动码报名 |
| `/vendor/:vendorId` | 摊主个人管理后台 |
| `/admin/:activityCode` | 管理员物资调度面板 |
| `/report/:activityCode` | 活动总结报告页面 |

## 4. API 定义

### 4.1 活动相关

```
POST   /api/activities                    创建活动
GET    /api/activities/:code              获取活动信息
POST   /api/activities/:code/register     摊主报名
GET    /api/activities/:code/vendors      获取摊主列表
```

**创建活动请求体**:
```typescript
interface CreateActivityBody {
  name: string;
  date: string;
  location: string;
  maxBooths: number;
}
```

**创建活动响应**:
```typescript
interface Activity {
  id: string;
  code: string;
  name: string;
  date: string;
  location: string;
  maxBooths: number;
  createdAt: string;
}
```

**报名请求体**:
```typescript
interface RegisterBody {
  orgName: string;
  contact: string;
  category: "手工艺品" | "二手书籍" | "自制食品" | "服装配饰" | "其他";
}
```

**报名响应**:
```typescript
interface Vendor {
  id: string;
  activityCode: string;
  orgName: string;
  contact: string;
  category: string;
  boothNumber: number;
  registeredAt: string;
}
```

### 4.2 商品相关

```
POST   /api/goods                         上架商品
GET    /api/goods?vendorId=xxx            获取摊主商品列表
PUT    /api/goods/:id                     编辑商品
DELETE /api/goods/:id                     下架商品
POST   /api/goods/:id/purchase            购买商品（模拟成交）
```

**商品数据结构**:
```typescript
interface Goods {
  id: string;
  vendorId: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  imageUrl: string;
  isActive: boolean;
  createdAt: string;
}
```

### 4.3 物资申请相关

```
POST   /api/requests                      提交物资申请
GET    /api/requests?activityCode=xxx     获取活动物资申请列表
PUT    /api/requests/:id                  处理物资申请
```

**物资申请数据结构**:
```typescript
interface MaterialRequest {
  id: string;
  vendorId: string;
  activityCode: string;
  type: "额外桌子" | "电源延长线" | "宣传海报" | "椅子" | "其他";
  note: string;
  urgency: "高" | "中" | "低";
  status: "pending" | "allocated" | "rejected";
  createdAt: string;
}
```

## 5. 服务端架构图

```mermaid
graph LR
    A["Express路由控制器"] --> B["业务逻辑层"]
    B --> C["内存数据存储 Map"]
    D["Socket.io事件处理"] --> B
    D --> E["WebSocket广播"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    Activity ||--o{ Vendor : contains
    Vendor ||--o{ Goods : sells
    Vendor ||--o{ MaterialRequest : submits
    Goods ||--o{ Order : purchased_in

    Activity {
        string id PK
        string code UK
        string name
        string date
        string location
        number maxBooths
        string createdAt
    }

    Vendor {
        string id PK
        string activityCode FK
        string orgName
        string contact
        string category
        number boothNumber
        string registeredAt
    }

    Goods {
        string id PK
        string vendorId FK
        string name
        string description
        number price
        number stock
        string imageUrl
        boolean isActive
        string createdAt
    }

    MaterialRequest {
        string id PK
        string vendorId FK
        string activityCode FK
        string type
        string note
        string urgency
        string status
        string createdAt
    }

    Order {
        string id PK
        string goodsId FK
        string vendorId FK
        number quantity
        number totalPrice
        string createdAt
    }
```

### 6.2 内存数据初始化

所有数据存储在 server/index.js 的 Map 对象中：
- `activities`: Map<string, Activity> — 活动码为键
- `vendors`: Map<string, Vendor> — 摊主ID为键
- `goods`: Map<string, Goods> — 商品ID为键
- `requests`: Map<string, MaterialRequest> — 申请ID为键
- `orders`: Map<string, Order> — 订单ID为键
