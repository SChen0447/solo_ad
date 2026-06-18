## 1. 架构设计

纯前端单页应用，采用分层架构：UI层（React DOM）负责交互面板，渲染层（Canvas 2D）负责电路可视化，状态层（Zustand）管理全局数据，引擎层（独立Module）负责逻辑模拟计算。

```mermaid
flowchart TB
    subgraph "React DOM 交互层"
        A["Toolbar.tsx (顶部工具栏)"]
        B["Panel.tsx (右侧元件面板)"]
        C["CanvasContainer.tsx (画布容器)"]
    end
    subgraph "Canvas 渲染层"
        D["canvasRenderer.ts<br/>(网格/元件/导线/动画绘制)"]
    end
    subgraph "状态管理层 (Zustand)"
        E["circuitStore.ts<br/>(元件/导线/模拟/历史栈)"]
    end
    subgraph "模拟引擎层"
        F["simulationEngine.ts<br/>(信号传播/循环检测/帧更新)"]
    end
    A -->|dispatch actions| E
    B -->|dispatch actions| E
    C -->|dispatch actions| E
    C -->|每帧调用| D
    E -->|订阅状态变更| C
    E -->|提供数据| D
    E -->|提供数据| F
    F -->|更新引脚电平| E
```

## 2. 技术描述

- **前端框架**：React 18 + TypeScript 5（严格模式）
- **构建工具**：Vite 5 + @vitejs/plugin-react
- **状态管理**：Zustand 4（含 history middleware 实现撤销重做）
- **渲染方案**：原生 HTML5 Canvas 2D（元件、导线、信号流动动画均在Canvas绘制，避免大量DOM节点导致的性能问题）
- **UI面板**：React DOM + 内联样式（CSS变量统一主题）
- **图标库**：react-icons / lucide-react
- **唯一ID**：uuid
- **后端**：无（纯前端本地运行，数据保存在内存中）
- **数据库**：无

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 主应用页面（电路编辑器） |

## 4. 数据模型

### 4.1 核心类型定义

```mermaid
erDiagram
    CIRCUIT_COMPONENT ||--o{ PIN : has
    CIRCUIT_COMPONENT ||--o| SUB_CIRCUIT : "may be"
    WIRE ||--|| PIN : connects-from
    WIRE ||--|| PIN : connects-to
    SIMULATION_STATE ||--o{ CIRCUIT_COMPONENT : references
    SIMULATION_STATE ||--o{ WIRE : references
    HISTORY_STACK ||--o{ SNAPSHOT : contains

    CIRCUIT_COMPONENT {
        string id PK
        enum type "AND/OR/NOT/NAND/NOR/XOR/RS_FLIPFLOP/SUB_CIRCUIT"
        number x
        number y
        number width
        number height
        string color
        string name
        object subCircuitData "optional"
    }
    PIN {
        string id PK
        string componentId FK
        enum direction "INPUT/OUTPUT"
        number index
        boolean level "true=高电平, false=低电平"
        number offsetX
        number offsetY
    }
    WIRE {
        string id PK
        string fromPinId FK
        string toPinId FK
        array points "直角拐角路径点"
    }
    SUB_CIRCUIT {
        string id PK
        string name
        array internalComponents
        array internalWires
        array exposedInputPins
        array exposedOutputPins
    }
    SNAPSHOT {
        array components
        array wires
    }
    HISTORY_STACK {
        array past
        object present
        array future
    }
```

### 4.2 文件结构

```
e:\solo\SoloAutoDemo\tasks\auto87\
├── package.json
├── index.html
├── vite.config.ts
├── tsconfig.json
└── src/
    ├── main.tsx              # React入口
    ├── App.tsx               # 根组件（布局组装）
    ├── types.ts              # 所有类型定义、枚举
    ├── circuitStore.ts       # Zustand全局状态+actions
    ├── simulationEngine.ts   # 独立的模拟引擎
    ├── canvasRenderer.ts     # Canvas 2D渲染器
    ├── styles.css            # 全局样式+CSS变量
    └── Components/
        ├── Toolbar.tsx       # 顶部工具栏
        ├── Panel.tsx         # 右侧元件面板
        ├── Canvas.tsx        # Canvas画布组件
        └── SubCircuitDialog.tsx # 子电路命名弹窗
```

## 5. 关键技术实现说明

### 5.1 模拟引擎
- 固定时间步长（60fps），使用 `requestAnimationFrame` 驱动
- 拓扑排序计算元件更新顺序，避免依赖问题
- BFS广度优先搜索从输入引脚出发计算信号传播路径
- 循环检测：DFS标记访问状态（0=未访问/1=访问中/2=已完成），发现回边则标记为循环并跳过
- 信号传播延迟：按路径长度逐帧点亮导线上的流动光点，支持3档速度系数

### 5.2 Canvas渲染
- 离屏Canvas缓存静态网格背景，减少每帧重绘开销
- 脏矩形渲染：只重绘状态变化的元件和导线区域
- 流动光点动画：根据模拟引擎返回的信号传播进度，沿导线路径线性插值计算光点位置
- 坐标变换矩阵统一处理画布的平移和缩放

### 5.3 撤销重做
- Zustand + 自定义history middleware，每次可撤销操作前对components和wires做深拷贝
- 历史栈上限50步，超出自动丢弃最早记录
- 瞬态操作（如拖拽中的坐标更新）不入栈，只有拖拽结束时才记录快照

### 5.4 子电路封装
- 封装时计算选中元件集合的边界框，提取跨边界的连接作为I/O端口
- 子电路内部元件和导线被序列化存储，双击展开时深拷贝恢复到临时编辑画布
- 子电路端口引脚映射到内部对应元件的引脚，模拟时递归计算内部逻辑
