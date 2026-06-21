# 邻里技能交换与时间银行 - 技术架构文档

## 1. 技术选型

### 1.1 前端技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^18.x | UI框架 |
| TypeScript | ^5.x | 类型安全 |
| Vite | ^5.x | 构建工具 |
| React Router DOM | ^6.x | 路由管理 |
| Axios | ^1.x | HTTP客户端 |
| CSS | 原生 | 样式（CSS变量 + 动画） |

### 1.2 后端技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行时 |
| Express | ^4.x | Web框架 |
| TypeScript | ^5.x | 类型安全 |
| CORS | ^2.x | 跨域处理 |
| UUID | ^9.x | 唯一ID生成 |
| ts-node | ^10.x | TypeScript运行 |

### 1.3 开发工具
| 工具 | 用途 |
|------|------|
| npm | 包管理 |
| VS Code | 代码编辑器 |
| Git | 版本控制 |

---

## 2. 项目结构设计

```
auto121/
├── .trae/documents/           # 项目文档
│   ├── PRD.md
│   └── Technical-Architecture.md
├── src/                        # 前端源码
│   ├── api/                    # API封装
│   │   ├── skillApi.ts         # 技能相关API
│   │   └── bookingApi.ts       # 预约和交易API
│   ├── components/             # 组件
│   │   └── SkillCard.tsx       # 技能卡片组件
│   ├── pages/                  # 页面
│   │   ├── Market.tsx          # 技能集市首页
│   │   ├── Detail.tsx          # 技能详情页
│   │   └── Dashboard.tsx       # 个人空间页
│   └── App.tsx                 # 根组件 + 路由配置
├── server/                     # 后端源码
│   ├── routes/                 # 路由
│   │   ├── skills.ts           # 技能CRUD路由
│   │   └── bookings.ts         # 预约交易路由
│   ├── data.ts                 # 内存数据存储
│   ├── index.ts                # 后端入口
│   ├── package.json            # 后端依赖
│   └── tsconfig.json           # 后端TS配置
├── index.html                  # 前端入口HTML
├── package.json                # 前端依赖
├── vite.config.js              # Vite配置
└── tsconfig.json               # 前端TS配置
```

---

## 3. 前端架构设计

### 3.1 路由配置
```
/          → 技能集市（Market）
/skill/:id → 技能详情（Detail）
/dashboard → 个人空间（Dashboard）
```

### 3.2 核心组件设计

#### SkillCard 组件
- **Props**：skill 对象（id, title, icon, description, provider, duration, availableDates, ratings）
- **功能**：卡片展示、悬停动画、点击跳转详情页
- **样式**：固定宽高320×240px，圆角20px，浅绿色背景，阴影效果

#### Market 页面
- **功能**：技能列表展示、无限滚动加载、响应式布局
- **数据获取**：分页加载，每页12条，监听滚动自动触发
- **布局**：卡片网格，左右两栏（主内容70% + 侧边栏30%）

#### Detail 页面
- **功能**：技能详情展示、日期选择、时间预约、评价列表、相关推荐
- **交互**：日期点选→时间选择→预约确认
- **布局**：上半部分左右分栏，下半部分推荐轮播

#### Dashboard 页面
- **功能**：Tab切换（我的技能/我的预约/我的时间币）
- **子功能**：技能管理（增删改）、预约时间线、交易流水
- **模态框**：编辑技能表单

### 3.3 API 封装层

#### skillApi.ts
```typescript
- fetchSkills(page: number, limit: number): Promise<Skill[]>
- fetchSkillById(id: string): Promise<Skill>
- createSkill(data: CreateSkillData): Promise<Skill>
- updateSkill(id: string, data: UpdateSkillData): Promise<Skill>
- deleteSkill(id: string): Promise<void>
```

#### bookingApi.ts
```typescript
- bookService(data: BookingData): Promise<Booking>
- fetchBookings(userId: string): Promise<Booking[]>
- fetchTransactions(userId: string, page: number): Promise<Transaction[]>
```

### 3.4 状态管理
- 使用 React Hooks（useState, useEffect, useContext）管理本地状态
- 用户信息通过 Context 全局共享
- 表单状态使用 useState 管理

### 3.5 样式系统
- **CSS 变量定义**：
  ```css
  --primary: #22c55e;
  --primary-dark: #16a34a;
  --primary-light: #86efac;
  --bg-card: #f0fdf4;
  --bg-secondary: #f8fafc;
  --text-primary: #1f2937;
  --text-secondary: #6b7280;
  --text-placeholder: #9ca3af;
  --border-light: #e2e8f0;
  --border-medium: #d1d5db;
  --warning: #f97316;
  --error: #ef4444;
  --info: #3b82f6;
  --gold: #fbbf24;
  ```

### 3.6 动画系统
- **页面入场**：opacity 0→1（300ms ease），translateX 150px→0（400ms ease-out）
- **卡片悬停**：translateY -10px，shadow 8px→12px（300ms ease）
- **轮播滑动**：transform translateX（600ms ease-in-out）
- **模态框**：backdrop-fade（200ms），scale 0.9→1（200ms ease-out）

---

## 4. 后端架构设计

### 4.1 服务端分层
```
┌─────────────────┐
│   Express App   │  入口、中间件、路由注册
├─────────────────┤
│     Routes      │  skills.ts, bookings.ts
├─────────────────┤
│   Data Layer    │  data.ts (内存存储)
└─────────────────┘
```

### 4.2 API 接口设计

#### 技能接口 (skills.ts)
| 方法 | 路径 | 功能 | 参数 | 返回 |
|------|------|------|------|------|
| GET | `/api/skills` | 获取技能列表 | page, limit, tag | { data: Skill[], total: number } |
| GET | `/api/skills/:id` | 获取单个技能 | id | Skill |
| POST | `/api/skills` | 创建技能 | title, description, icon, duration, providerId, availableDates, tags | Skill |
| PUT | `/api/skills/:id` | 更新技能 | id, 同上字段 | Skill |
| DELETE | `/api/skills/:id` | 删除技能 | id | { success: true } |

#### 预约接口 (bookings.ts)
| 方法 | 路径 | 功能 | 参数 | 返回 |
|------|------|------|------|------|
| POST | `/api/bookings` | 预约服务 | skillId, bookerId, date, time | { success: true, booking: Booking } |
| GET | `/api/bookings/:userId` | 获取用户预约 | userId | Booking[] |
| GET | `/api/transactions/:userId` | 获取交易流水 | userId, page, limit | { data: Transaction[], hasMore: boolean } |

### 4.3 数据模型

#### User
```typescript
interface User {
  id: string;
  nickname: string;
  avatar: string;
  creditRating: number; // 1-5
  timeCoins: number;
}
```

#### Skill
```typescript
interface Skill {
  id: string;
  title: string;
  description: string;
  icon: string; // emoji
  duration: number; // minutes
  providerId: string;
  provider: User;
  availableDates: number[]; // 0-6, 周一到周日
  bookedDates: string[]; // 已被预约的日期 'YYYY-MM-DD'
  tags: string[];
  ratings: {
    average: number;
    count: number;
  };
  reviews: Review[];
  createdAt: string;
}
```

#### Booking
```typescript
interface Booking {
  id: string;
  skillId: string;
  skillTitle: string;
  bookerId: string;
  providerId: string;
  date: string; // 'YYYY-MM-DD'
  time: string; // 'HH:mm'
  status: 'pending' | 'completed' | 'cancelled';
  review?: Review;
  createdAt: string;
}
```

#### Transaction
```typescript
interface Transaction {
  id: string;
  type: 'earn' | 'spend';
  userId: string;
  counterpartId: string;
  counterpartName: string;
  counterpartAvatar: string;
  amount: number;
  skillTitle: string;
  bookingId: string;
  createdAt: string;
}
```

#### Review
```typescript
interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  rating: number;
  content: string;
  createdAt: string;
}
```

### 4.4 数据存储设计（data.ts）
- 使用内存数组存储所有数据
- 提供 `getDb()` 和 `saveDb()` 函数
- 初始化示例数据（用户、技能、预约、交易）
- 使用 UUID 生成唯一ID
- 模拟数据库查询和更新操作

### 4.5 中间件配置
- CORS：允许所有来源，支持预检请求
- JSON 解析：express.json()
- 请求日志：自定义中间件记录请求路径和时间
- 错误处理：统一错误响应格式

---

## 5. 构建与部署

### 5.1 前端构建配置 (vite.config.js)
```javascript
export default {
  server: {
    proxy: {
      '/api': 'http://localhost:3001'
    }
  }
}
```

### 5.2 TypeScript 配置 (tsconfig.json)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

### 5.3 启动脚本
- **前端**：`npm run dev` → Vite 开发服务器
- **后端**：`cd server && npm install && npx ts-node index.ts`
- **同时启动**：需两个终端分别运行

---

## 6. 性能优化策略

### 6.1 前端优化
- 懒加载：Intersection Observer 实现无限滚动
- 图片懒加载：loading="lazy"
- 组件懒加载：React.lazy + Suspense
- 防抖/节流：滚动事件、输入事件
- 缓存：API 响应本地缓存

### 6.2 后端优化
- 分页查询：避免一次返回大量数据
- 内存索引：按常用查询字段建立索引
- 模拟延迟：接口添加 100-300ms 延迟模拟真实网络

---

## 7. 安全考虑

### 7.1 输入验证
- 所有用户输入进行类型检查和长度限制
- XSS 防护：转义用户生成内容

### 7.2 业务逻辑安全
- 预约前检查时间币余额
- 防止重复预约同一时间段
- 用户权限校验（只能编辑/删除自己的技能）

---

## 8. 测试策略

### 8.1 功能测试点
- 技能列表分页加载
- 技能卡片悬停效果
- 日期选择和预约流程
- 时间币扣减逻辑
- Tab 切换和页面导航
- 响应式布局适配

### 8.2 性能测试点
- 首屏加载时间
- 预约操作响应时间
- 滚动流畅度
