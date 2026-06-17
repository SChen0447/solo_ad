## 1. 架构设计

```mermaid
flowchart TD
    "index.html" --> "main.ts"
    "main.ts" --> "sceneSetup.ts"
    "main.ts" --> "terrainManager.ts"
    "main.ts" --> "sunSimulator.ts"
    "main.ts" --> "uiController.ts"
    "sceneSetup.ts" --> "Three.js Scene/Camera/Renderer"
    "terrainManager.ts" --> "sceneSetup.ts (Scene对象)"
    "sunSimulator.ts" --> "sceneSetup.ts (Scene对象)"
    "uiController.ts" --> "terrainManager.ts (方法调用)"
    "uiController.ts" --> "sunSimulator.ts (方法调用)"
```

## 2. 技术说明

- 前端框架：纯TypeScript + Three.js（不使用React/Vue，用户指定）
- 构建工具：Vite
- UI组件：lil-gui（用户指定）+ 自定义CSS控制面板
- 3D引擎：Three.js + OrbitControls + DragControls
- 包管理：npm
- 无后端、无数据库、纯前端应用

### 依赖列表

| 依赖 | 版本 | 用途 |
|------|------|------|
| typescript | ^5.3 | TypeScript编译 |
| vite | ^5.0 | 开发服务器与构建 |
| three | ^0.160 | 3D渲染引擎 |
| @types/three | ^0.160 | Three.js类型定义 |
| lil-gui | ^0.19 | 控制面板UI框架 |

## 3. 路由定义

本项目为单页面应用，无路由。所有功能在同一页面内完成。

## 4. 模块架构

### 4.1 sceneSetup.ts

- 初始化WebGLRenderer（antialias, alpha）
- 创建PerspectiveCamera（FOV 50, 适合建筑场景）
- 创建Scene，设置深空渐变背景
- 添加AmbientLight（低强度环境光）
- 配置OrbitControls
- 配置阴影渲染器（PCFSoftShadowMap, 1024x1024）
- 导出scene, camera, renderer, controls, animate循环

### 4.2 terrainManager.ts

- 管理矩形规划区域（GridHelper或PlaneGeometry）
- 控制点系统：5-8个可拖拽柱状控制点（CylinderGeometry, 半透明蓝色MeshPhongMaterial）
- 建筑体块系统：100-200个BoxGeometry建筑（12x12x高度，灰色材质）
- 插值算法：每个建筑体块高度 = 距离加权插值所有控制点高度值
- DragControls：控制点拖拽限制在Y轴，范围0-50
- 平滑过渡：使用easeInOut缓动函数，0.5秒过渡动画
- 预设模式：
  - 中心递减式：中心控制点最高，向外递减
  - 线性递增式：从一端到另一端线性递增
  - 参差波动式：随机波动，高低参差
  - 均匀分布式：所有控制点相同高度
- 对比模式：创建半透明建筑体块副本（蓝色/橙色材质，透明度0.5）

### 4.3 sunSimulator.ts

- 管理DirectionalLight（平行光模拟太阳）
- 色温映射：2700K（暖黄）→ 6500K（冷白），基于时间0-24h
- 太阳位置：根据时间计算平行光方向角（日出东→正午顶→日落西）
- 阴影参数：shadow.mapSize 1024x1024，shadow.camera范围动态调整
- 时间接口：setTime(hour: number) 供UI层调用

### 4.4 uiController.ts

- 创建左侧可折叠控制面板（深灰半透明，圆角12px，毛玻璃效果）
- 控制组件：
  - 模式选择下拉框（4种预设）
  - 时间轴滑块（0-24h，显示当前时间）
  - 快照保存按钮
  - 对比模式切换按钮
- 事件绑定：面板操作 → 调用terrainManager/sunSimulator方法
- 响应式：<768px时面板折叠为底部抽屉

### 4.5 main.ts

- 初始化sceneSetup
- 创建terrainManager、sunSimulator、uiController实例
- 启动渲染循环（requestAnimationFrame）
- 窗口resize事件处理

## 5. 文件结构

```
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
└── src/
    ├── main.ts
    └── modules/
        ├── sceneSetup.ts
        ├── terrainManager.ts
        ├── sunSimulator.ts
        └── uiController.ts
```

## 6. 性能约束

| 指标 | 目标值 |
|------|--------|
| 场景总三角面数 | ≤ 100,000 |
| 拖拽控制点时帧率 | ≥ 24 FPS |
| 滑块拖动时帧率 | ≥ 30 FPS |
| 阴影分辨率 | ≥ 1024x1024 |
| 建筑体块数量 | 100-200 |
| 过渡动画时长 | 0.5秒 |
