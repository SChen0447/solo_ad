## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 React + TypeScript"
        A["App.tsx 路由分发"] --> B["PlannerPage 行程规划"]
        A --> C["BookletPage 手册生成"]
        A --> D["FavoritesPage 收藏夹"]
        B --> E["MapView 地图组件"]
        E --> F["MapService 地图服务"]
        B --> G["ApiService API服务"]
        C --> G
        D --> G
    end

    subgraph "后端 Python Flask"
        H["Flask API Server"] --> I["城市数据接口"]
        H --> J["景点数据接口"]
        H --> K["行程保存/加载接口"]
        H --> L["分享链接接口"]
    end

    G -->|HTTP请求| H
    F -->|Mapbox GL JS API| M["Mapbox地图服务"]
```

## 2. 技术说明

- **前端**：React 18 + TypeScript + Vite + Tailwind CSS
- **初始化工具**：vite-init (react-ts 模板)
- **后端**：Python Flask (提供城市数据、景点数据、保存/加载、分享链接API)
- **数据库**：本地JSON文件存储（行程数据、收藏数据），无需外部数据库
- **地图**：Mapbox GL JS
- **PDF生成**：jsPDF + html2canvas
- **动画**：Framer Motion
- **路由**：react-router-dom
- **HTTP客户端**：axios

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 行程规划主页，城市选择与地图标注 |
| /booklet | 行程手册生成与导出页面 |
| /favorites | 收藏夹页面，网格展示已保存行程 |

## 4. API定义

### 4.1 获取城市列表

```typescript
GET /api/cities
Response: {
  cities: Array<{
    id: string;
    name: string;
    lat: number;
    lng: number;
  }>
}
```

### 4.2 搜索景点

```typescript
GET /api/attractions?cityId={cityId}&keyword={keyword}
Response: {
  attractions: Array<{
    id: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    duration: string;
    transport: string;
  }>
}
```

### 4.3 保存行程

```typescript
POST /api/itineraries
Body: {
  cityName: string;
  tripName: string;
  days: Array<{
    dayIndex: number;
    attractions: Array<{
      id: string;
      name: string;
      address: string;
      lat: number;
      lng: number;
      duration: string;
      transport: string;
      note: string;
    }>
  }>;
  thumbnail: string;
}
Response: {
  id: string;
  createdAt: string;
}
```

### 4.4 获取行程列表

```typescript
GET /api/itineraries
Response: {
  itineraries: Array<{
    id: string;
    cityName: string;
    tripName: string;
    days: number;
    createdAt: string;
    thumbnail: string;
  }>
}
```

### 4.5 获取行程详情

```typescript
GET /api/itineraries/:id
Response: {
  id: string;
  cityName: string;
  tripName: string;
  days: Array<{...}>;
  createdAt: string;
  thumbnail: string;
}
```

### 4.6 删除行程

```typescript
DELETE /api/itineraries/:id
Response: { success: boolean }
```

### 4.7 生成分享链接

```typescript
POST /api/share
Body: { itineraryId: string }
Response: {
  link: string;
  expiresAt: string;
}
```

### 4.8 获取分享行程

```typescript
GET /api/share/:token
Response: {
  cityName: string;
  tripName: string;
  days: Array<{...}>;
}
```

## 5. 服务器架构图

```mermaid
graph LR
    A["Flask路由层"] --> B["业务逻辑层"]
    B --> C["数据访问层"]
    C --> D["JSON文件存储"]
```

## 6. 数据模型

### 6.1 数据模型定义

```mermaid
erDiagram
    "City" {
        string id PK
        string name
        float lat
        float lng
    }
    "Attraction" {
        string id PK
        string cityId FK
        string name
        string address
        float lat
        float lng
        string duration
        string transport
    }
    "Itinerary" {
        string id PK
        string cityName
        string tripName
        string thumbnail
        string createdAt
    }
    "DayPlan" {
        string id PK
        string itineraryId FK
        int dayIndex
    }
    "DayAttraction" {
        string id PK
        string dayPlanId FK
        string attractionId FK
        int orderIndex
        string note
    }
    "ShareLink" {
        string token PK
        string itineraryId FK
        string expiresAt
    }
    "City" ||--o{ "Attraction" : "contains"
    "Itinerary" ||--o{ "DayPlan" : "has"
    "DayPlan" ||--o{ "DayAttraction" : "contains"
    "Attraction" ||--o{ "DayAttraction" : "referenced"
    "Itinerary" ||--o{ "ShareLink" : "shared"
```

### 6.2 数据初始化

预设10个国内热门旅游城市及其景点数据：
- 北京、上海、成都、杭州、西安、重庆、丽江、厦门、大理、三亚
- 每个城市预设5-8个热门景点，包含经纬度、推荐游玩时长、建议交通方式
