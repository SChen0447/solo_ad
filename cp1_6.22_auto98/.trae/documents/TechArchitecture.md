## 1. 架构设计

```mermaid
graph TD
    subgraph "前端 (React + Three.js)"
        A["App.tsx (根组件/状态管理)"]
        B["CityScene.tsx (3D城市场景)"]
        C["Timeline.tsx (时间轴控件)"]
        D["InfoCard.tsx (历史事件卡片)"]
        E["main.tsx (入口)"]
        F["全局样式 CSS"]
    end
    
    subgraph "后端 (Express.js)"
        G["server/index.ts"]
        H["GET /api/buildings?era=0/1/2"]
        I["GET /api/events"]
    end
    
    subgraph "数据层"
        J["src/data/buildingData.json"]
        K["src/data/historyEvents.json"]
    end
    
    E --> A
    A --> B
    A --> C
    A --> D
    B --> H
    D --> I
    H --> J
    I --> K
```

## 2. 技术说明

- **前端框架**：React 18 + TypeScript
- **构建工具**：Vite（含路径别名@和API代理配置）
- **3D引擎**：Three.js + @react-three/fiber + @react-three/drei
- **状态管理**：React useState/useEffect（轻量级场景，无需额外状态库）
- **样式方案**：全局CSS + 组件内style/CSS Modules
- **后端**：Node.js + Express 4 + CORS
- **数据格式**：静态JSON文件
- **图标**：lucide-react

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主展示页面（3D场景 + 时间轴 + 信息卡片） |
| GET /api/buildings?era=0/1/2 | 获取指定年代的建筑配置数据 |
| GET /api/events | 获取所有关键历史事件数据 |

## 4. API 定义

### GET /api/buildings?era=0/1/2

请求参数：
- `era`: number (0=1920年代, 1=1980年代, 2=2020年代)

响应数据类型：
```typescript
interface BuildingConfig {
  id: string;
  position: [number, number, number];
  height: number;
  width: number;
  depth: number;
  primaryColor: string;
  secondaryColor: string;
  windowRows: number;
  windowCols: number;
  era: number;
}

type BuildingsResponse = BuildingConfig[];
```

### GET /api/events

响应数据类型：
```typescript
interface HistoryEvent {
  year: number;
  title: string;
  description: string;
  eraIndex: number;
}

type EventsResponse = HistoryEvent[];
```

## 5. 服务端架构

```mermaid
graph LR
    A["Express Server"] --> B["GET /api/buildings"]
    A --> C["GET /api/events"]
    B --> D["读取 buildingData.json"]
    C --> E["读取 historyEvents.json"]
    D --> F["按era过滤返回"]
    E --> G["返回全部事件"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    BUILDING {
        string id PK
        float position_x
        float position_y
        float position_z
        float height
        float width
        float depth
        string primaryColor
        string secondaryColor
        int windowRows
        int windowCols
        int era FK
    }
    
    HISTORY_EVENT {
        int year PK
        string title
        string description
        int eraIndex FK
    }
```

### 6.2 项目文件结构

```
auto98/
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
├── server/
│   └── index.ts
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── components/
    │   ├── CityScene.tsx
    │   ├── Timeline.tsx
    │   └── InfoCard.tsx
    ├── data/
    │   ├── buildingData.json
    │   └── historyEvents.json
    └── styles/
        └── global.css
```
