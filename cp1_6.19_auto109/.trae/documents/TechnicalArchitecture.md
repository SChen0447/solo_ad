## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层 Frontend"
        "App.tsx 主应用" --> "DeviceManager.tsx"
        "App.tsx 主应用" --> "EnergyChart.tsx"
        "App.tsx 主应用" --> "Notifications.tsx"
        "App.tsx 主应用" --> "TipsPanel.tsx"
    end

    subgraph "数据层 Data"
        "devices.ts 数据模块" --> "设备CRUD操作"
        "devices.ts 数据模块" --> "能耗计算函数"
        "devices.ts 数据模块" --> "历史数据模拟"
    end

    "DeviceManager.tsx" --> "devices.ts 数据模块"
    "EnergyChart.tsx" --> "devices.ts 数据模块"
    "Notifications.tsx" --> "devices.ts 数据模块"
```

## 2. 技术说明

- 前端框架：React 18 + TypeScript（严格模式）
- 构建工具：Vite + @vitejs/plugin-react
- 图表库：Recharts（圆环图 PieChart + 折线图 LineChart）
- 样式方案：CSS-in-JS（内联样式 + CSS模块），CSS变量管理主题色
- 状态管理：React useState + useEffect，数据通过 props 传递
- 后端：无（纯前端应用，数据存储在 localStorage + 内存）
- 数据库：无（使用模拟数据，localStorage 持久化）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 首页仪表盘，展示所有功能模块 |

注：本项目为单页应用，所有功能集成在同一页面，无需多路由。

## 4. API 定义

无后端API，所有数据操作通过前端模块 `devices.ts` 提供：

### 4.1 数据接口定义

```typescript
interface Device {
  id: string;
  name: string;
  power: number;       // 额定功率 (W)
  dailyHours: number;  // 日均使用时长 (h)
  dailyKWh: number;    // 预估日耗电量 (kWh) = power * dailyHours / 1000
  monthlyKWh: number;  // 预估月耗电量 (kWh) = dailyKWh * 30
  history: number[];   // 过去7天耗电量模拟数据
}

interface EnergyTip {
  id: string;
  text: string;
  read: boolean;
}
```

### 4.2 数据操作函数

| 函数 | 说明 |
|------|------|
| getDevices() | 获取所有设备列表 |
| addDevice(device) | 添加新设备 |
| updateDevice(id, data) | 更新设备信息 |
| deleteDevice(id) | 删除设备 |
| calculateDailyKWh(power, hours) | 计算日耗电量 |
| calculateMonthlyKWh(dailyKWh) | 计算月耗电量 |
| getEnergyTips() | 获取随机节能建议 |
| generateHistory(baseKWh) | 生成7天历史模拟数据 |

## 5. 数据模型

### 5.1 数据模型定义

```mermaid
erDiagram
    "Device 设备" {
        string id PK
        string name 设备名称
        number power 额定功率W
        number dailyHours 日均使用时长h
        number dailyKWh 日耗电量kWh
        number monthlyKWh 月耗电量kWh
        number[] history 7天历史数据
    }
    "EnergyTip 节能建议" {
        string id PK
        string text 建议内容
        boolean read 是否已读
    }
```

### 5.2 本地存储结构

- localStorage key: `smart-home-devices`
- 存储格式：JSON 序列化的 Device[]
- 初始数据：预置5个常见家电（空调、冰箱、电视、洗衣机、热水器）
