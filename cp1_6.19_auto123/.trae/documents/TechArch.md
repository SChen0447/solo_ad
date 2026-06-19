# 城市通勤碳排放追踪器 - 技术架构文档

## 1. 技术选型

| 技术 | 版本 | 用途 |
|------|------|------|
| React | ^18.2.0 | 前端框架 |
| React DOM | ^18.2.0 | DOM渲染 |
| TypeScript | ^5.2.0 | 类型安全 |
| Vite | ^5.0.0 | 构建工具 |
| @vitejs/plugin-react | ^4.2.0 | React HMR支持 |
| Chart.js | ^4.4.0 | 图表渲染 |
| react-chartjs-2 | ^5.2.0 | React图表封装 |
| uuid | ^9.0.0 | ID生成 |

## 2. 项目结构

```
auto123/
├── .trae/documents/          # 项目文档
├── src/
│   ├── components/           # React组件
│   │   ├── Dashboard.tsx     # 主仪表盘（状态管理）
│   │   ├── RecordForm.tsx    # 通勤记录表单
│   │   ├── CarbonCircle.tsx  # 圆环进度图
│   │   ├── TrendLine.tsx     # 7天趋势图
│   │   └── Leaderboard.tsx   # 好友排行榜
│   ├── types.ts              # TypeScript类型定义
│   ├── mockApi.ts            # 模拟API模块
│   ├── App.tsx               # 根组件
│   ├── main.tsx              # 应用入口
│   └── styles.css            # 全局样式
├── index.html                # HTML入口
├── package.json              # 依赖配置
├── tsconfig.json             # TypeScript配置
└── vite.config.js            # Vite配置
```

## 3. 数据流架构

### 3.1 状态管理
- **全局状态**：App.tsx 管理通勤记录列表和好友数据
- **组件状态**：各组件内部管理UI状态（表单输入、动画状态）
- **数据流向**：
  ```
  mockApi → App.tsx → Dashboard.tsx → 各子组件
  用户操作 → RecordForm.tsx → mockApi → 更新App状态
  ```

### 3.2 模拟API设计
```typescript
// src/mockApi.ts
- getRecords(): Promise<CommuteRecord[]>
- addRecord(record: Omit<CommuteRecord, 'id' | 'timestamp'>): Promise<CommuteRecord>
- getFriends(): Promise<Friend[]>
- calculateEmission(transport: TransportType, distance: number): number
- getEmissionFactors(): EmissionFactors
```

## 4. 类型定义

```typescript
// src/types.ts
type TransportType = 'walk' | 'bicycle' | 'electric' | 'bus' | 'metro' | 'car' | 'carpool';

interface CommuteRecord {
  id: string;
  transport: TransportType;
  distance: number;
  emission: number;
  timestamp: number;
}

interface Friend {
  id: string;
  name: string;
  avatar: string;
  monthlyEmission: number;
  lastMonthEmission: number;
  weeklyData: number[];
}

interface EmissionFactors {
  [key: string]: number; // g CO2 per km
}
```

## 5. 核心组件设计

### 5.1 Dashboard.tsx
- 职责：组合所有图表和表单，管理数据流
- 状态：records、friends、loading
- 生命周期：useEffect加载初始数据

### 5.2 RecordForm.tsx
- 职责：收集用户输入，计算排放，提交记录
- 状态：selectedTransport、distance、calculatedEmission
- 动画：数字滚动、卡片飞入

### 5.3 CarbonCircle.tsx
- 职责：渲染月度碳排圆环图
- 基于Chart.js doughnut图表
- 动画：超标脉冲、达标呼吸

### 5.4 TrendLine.tsx
- 职责：渲染7天趋势折线图
- 基于Chart.js line图表
- 动画：曲线缓动绘制

### 5.5 Leaderboard.tsx
- 职责：渲染好友排行榜和详情面板
- 状态：selectedFriendId、isDetailOpen

## 6. 性能优化策略

### 6.1 图表性能
- 使用Chart.js的animation配置控制渲染时间
- 数据变化时使用轻量级更新而非重绘
- 避免不必要的re-render（React.memo）

### 6.2 动画性能
- 使用CSS transform和opacity做动画（GPU加速）
- 避免布局抖动（layout thrashing）
- 使用will-change提示浏览器优化

### 6.3 渲染优化
- 列表项使用key属性
- 复杂组件使用React.memo
- 事件处理函数使用useCallback

## 7. 构建配置

### 7.1 Vite配置要点
- React插件启用fast refresh
- 构建优化：代码分割、tree shaking
- 开发服务器端口配置

### 7.2 TypeScript配置
- strict模式开启
- 严格的类型检查
- JSX: react-jsx模式

## 8. 动画实现方案

### 8.1 数字滚动动画
- 使用requestAnimationFrame
- 缓动函数：easeOutQuad
- 持续时间：600ms

### 8.2 卡片飞入动画
- CSS @keyframes + transform
- 缓动函数：cubic-bezier(0.68, -0.55, 0.265, 1.55)
- 持续时间：500ms

### 8.3 图表动画
- Chart.js内置动画配置
- 自定义easing函数
- 按需控制动画触发时机
