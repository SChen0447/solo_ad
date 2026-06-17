## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "index.html" --- "main.ts"
        "main.ts" --- "visualizer.ts"
        "main.ts" --- "controls.ts"
    end
    subgraph "Web Audio API 层"
        "AudioContext" --- "AnalyserNode"
        "AnalyserNode" --- "频率数据"
        "AnalyserNode" --- "时域数据"
    end
    subgraph "Three.js 渲染层"
        "Scene" --- "BufferGeometry Points"
        "Scene" --- "PerspectiveCamera"
        "Scene" --- "WebGLRenderer"
        "BufferGeometry Points" --- "粒子着色器"
    end
    "visualizer.ts" --> "Web Audio API 层"
    "visualizer.ts" --> "Three.js 渲染层"
    "controls.ts" --> "visualizer.ts"
```

## 2. 技术选型

- 前端：TypeScript + Three.js + Web Audio API
- 构建工具：Vite
- 无后端，纯前端应用
- 无数据库

## 3. 文件结构

| 文件 | 用途 |
|------|------|
| package.json | 依赖管理，启动脚本 npm run dev |
| index.html | 入口页面，深色背景，音频上传区域，3D渲染容器 |
| tsconfig.json | TypeScript严格模式，target ES2020 |
| vite.config.js | Vite构建配置，base为相对路径 |
| src/main.ts | 应用入口，初始化场景、音频上下文、控制面板 |
| src/visualizer.ts | 核心可视化引擎，粒子系统、音频映射、渲染循环 |
| src/controls.ts | 控制面板UI逻辑，滑块按钮事件、参数回调 |

## 4. 核心数据流

```
音频文件 → AudioContext.decodeAudioData → AnalyserNode
    → getByteFrequencyData (频谱) → 分段映射(低/中/高频)
    → 粒子参数更新(大小/颜色/速度) → BufferGeometry attribute更新
    → WebGLRenderer.render → 60fps渲染循环
```

## 5. 粒子系统架构

### 5.1 粒子属性映射

| 频率段 | 频率范围 | 映射属性 | 效果 |
|--------|----------|----------|------|
| 低频 | 0-300Hz | 粒子位置聚合 + 地面波纹 | 鼓点触发脉冲波纹 |
| 中频 | 300-2000Hz | 粒子颜色(深蓝→亮紫→橙红) + 轨迹 | 旋律驱动色彩变幻 |
| 高频 | 2000Hz+ | 粒子散射速度 + 光带闪烁 | 人声/高频闪烁 |

### 5.2 渲染模式

| 模式 | 描述 | 过渡 |
|------|------|------|
| 粒子漫游 | 粒子围绕中心球体运动，类似星云 | - |
| 波形波纹 | 粒子沿三维波形曲面分布，随振幅起伏 | 切换时1.2秒淡入淡出 |

### 5.3 颜色渐变预设

| 预设名称 | 色值范围 |
|----------|----------|
| 极光 | #0A0A2E → #7B2FFF → #FF6B35 |
| 熔岩 | #1A0000 → #FF4500 → #FFD700 |
| 深海 | #000020 → #006994 → #00FFCC |
| 霓虹 | #0D0221 → #FF00FF → #00FFFF |

## 6. 控制面板参数

| 参数 | 控件 | 范围 | 步长 | 默认值 |
|------|------|------|------|--------|
| 粒子扩散半径 | 滑块 | 5-30 | 0.5 | 15 |
| 颜色渐变模式 | 按钮组 | 4种预设 | - | 极光 |
| 粒子大小缩放 | 滑块 | 0.5-3.0 | 0.1 | 1.0 |
| 旋转速度 | 滑块 | 0-180度/秒 | 1 | 30 |
