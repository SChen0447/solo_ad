## 1. 架构设计

```mermaid
flowchart TB
    subgraph "前端层"
        "App.tsx[主组件：状态管理]"
        "KG[KeywordGrid：关键词选择]"
        "PV[PaletteViewer：色板预览+粒子]"
        "PG[paletteGenerator：色板算法]"
        "PS[particleSystem：粒子系统]"
    end

    "App.tsx" --> "KG"
    "App.tsx" --> "PV"
    "App.tsx" --> "PG"
    "PV" --> "PS"
    "KG" --> "|onSelect| App.tsx"
    "PG" --> "|色值数组| App.tsx"
```

## 2. 技术说明

- 前端：React@18 + TypeScript + Vite
- 初始化工具：vite-init
- 后端：无
- 数据库：无（本地收藏夹使用 localStorage）
- 额外依赖：uuid（唯一标识收藏项）

## 3. 路由定义

| 路由 | 用途 |
|------|------|
| / | 单页应用主页面 |

## 4. 文件结构

```
├── package.json
├── index.html
├── tsconfig.json
├── vite.config.js
└── src/
    ├── main.tsx
    ├── App.tsx
    ├── components/
    │   ├── KeywordGrid.tsx
    │   └── PaletteViewer.tsx
    ├── utils/
    │   ├── paletteGenerator.ts
    │   └── particleSystem.ts
    └── styles/
        └── global.css
```

## 5. 核心算法说明

### 5.1 色板生成算法 (paletteGenerator.ts)

- 预定义12个关键词到HSL色相的映射表
- 每个关键词映射一个基准HSL值
- 从基准色出发，在色环上选取：
  - 1个互补色（色相+180°）
  - 2-3个邻近色（色相±30°-60°）
  - 1-2个明暗变体（调整亮度）
- 返回4-6个HSL色值数组

### 5.2 粒子系统 (particleSystem.ts)

- 每个色块对应一种颜色的粒子群
- 粒子属性：x, y, size(2-5px), opacity(0.1-0.4), speed, angle, sinOffset
- 使用requestAnimationFrame驱动渲染循环
- 粒子位置更新：缓慢上升 + 正弦波水平扰动
- 透明度随机变化
- 切换色板时粒子颜色同步渐变（插值过渡）
- 使用Canvas 2D API渲染，保证50FPS+性能

### 5.3 状态管理

使用React useState + useRef管理：
- currentKeyword: 当前选中关键词
- currentPalette: 当前色板数组
- isDarkMode: 明暗模式
- savedPalettes: 收藏的色板列表（localStorage持久化）
- canvasRef: Canvas元素引用（粒子渲染）
