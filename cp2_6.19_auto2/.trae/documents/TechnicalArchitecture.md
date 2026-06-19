## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "index.html" --> "src/main.ts"
        "src/main.ts" --> "src/ParticleFlow.ts"
        "src/main.ts" --> "src/DataSimulator.ts"
        "src/main.ts" --> "src/InteractionManager.ts"
    end
    subgraph "数据层"
        "src/DataSimulator.ts" -->|"时间戳+流量数据"| "src/main.ts"
        "src/main.ts" -->|"数据更新"| "src/ParticleFlow.ts"
    end
    subgraph "渲染层"
        "src/ParticleFlow.ts" -->|"BufferGeometry"| "Three.js WebGLRenderer"
        "src/InteractionManager.ts" -->|"相机位置"| "Three.js WebGLRenderer"
    end
```

## 2. 技术说明

- **前端**：TypeScript + Three.js + Vite
- **初始化工具**：Vite
- **后端**：无
- **数据库**：无，使用模拟数据

### 文件结构与调用关系

```
project/
├── package.json          # 依赖：three, @types/three, typescript, vite
├── vite.config.js        # Vite默认配置
├── tsconfig.json         # 严格模式，ES Module
├── index.html            # 入口页面，全屏显示
└── src/
    ├── main.ts           # 主入口：初始化场景→接收模拟数据→创建粒子系统→启动动画
    ├── ParticleFlow.ts   # 粒子流动：接收时间戳→计算粒子位置→更新BufferGeometry
    ├── DataSimulator.ts  # 数据模拟：生成流量数据→提供订阅接口
    └── InteractionManager.ts  # 交互管理：用户输入→更新相机位置
```

### 数据流向

1. `DataSimulator` 每100ms生成 `{timestamp, direction, magnitude}` 数据
2. `main.ts` 订阅数据，传递给 `ParticleFlow`
3. `ParticleFlow` 根据数据更新粒子位置、速度、颜色（写入BufferAttribute）
4. `InteractionManager` 独立处理用户输入，更新OrbitControls
5. 动画循环中 `main.ts` 统一调用渲染

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 单页3D监控看板 |

## 4. API定义

无后端API，使用本地数据模拟。

### 数据模拟接口类型

```typescript
interface FlowData {
  timestamp: number;
  direction: Vector3;
  magnitude: number;
}

type DataSubscriber = (data: FlowData) => void;
```

## 5. 关键实现细节

### 5.1 粒子系统

- 使用 `THREE.BufferGeometry` + `THREE.Points` + `THREE.PointsMaterial`
- 粒子数量：2000+，通过Float32Array管理位置、颜色、大小
- 多条3D曲线路径（使用CatmullRomCurve3），粒子沿路径参数化流动
- 粒子大小：根据数据magnitude映射到0.1-1.0
- 粒子颜色：根据magnitude从#00d4ff(蓝)线性插值到#ff0055(红)
- 粒子透明度：进入时渐入、消失时渐出，避免突兀

### 5.2 数据模拟器

- setInterval 100ms触发
- 随机生成direction（3D向量）和magnitude（0-1范围）
- 提供subscribe/unsubscribe接口

### 5.3 性能优化

- 使用BufferAttribute的needsDirty标记，避免每帧重建几何体
- 粒子更新直接操作TypedArray，减少GC压力
- OrbitControls启用阻尼，减少重绘
- 目标：55FPS+ @ 2000粒子 + 100ms数据更新

### 5.4 UI组件

- 监控面板：HTML覆盖层，position:fixed，左上角
- 控制条：HTML覆盖层，position:fixed，右下角
- CSS：毛玻璃效果，响应式，最小宽度768px
