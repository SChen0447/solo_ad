## 1. 架构设计

```mermaid
graph TB
    subgraph "前端 (React + TypeScript + Vite)"
        "src/pages/index.tsx" --> "src/modules/inventory.ts"
        "src/pages/index.tsx" --> "src/modules/enchantment.ts"
        "src/pages/index.tsx" --> "src/modules/renderer.ts"
        "src/modules/enchantment.ts" --> "src/modules/effects.ts"
        "src/modules/renderer.ts" --> "src/modules/effects.ts"
        "src/pages/index.tsx" --> "HTTP API"
    end

    subgraph "后端 (Node.js + Express)"
        "server/server.ts"
    end

    "HTTP API" --> "server/server.ts"

    subgraph "数据流"
        "选择装备" --> "inventory.ts返回装备数据"
        "拖拽符文" --> "enchantment.ts计算属性"
        "元素连锁" --> "effects.ts生成粒子序列"
        "粒子序列" --> "renderer.ts绘制到Canvas"
        "铭刻保存" --> "POST /api/enchant保存到服务器"
        "配方加载" --> "GET /api/recipes从服务器获取"
    end
```

## 2. 技术描述

- 前端：React@18 + TypeScript + Vite
- 后端：Node.js + Express
- 样式：原生CSS（CSS Modules）
- 渲染：Canvas 2D API
- 数据存储：服务器内存存储（开发阶段）

## 3. 目录结构

```
auto85/
├── package.json
├── vite.config.js
├── tsconfig.json
├── index.html
├── server/
│   └── server.ts
└── src/
    ├── pages/
    │   └── index.tsx
    └── modules/
        ├── inventory.ts
        ├── enchantment.ts
        ├── effects.ts
        └── renderer.ts
```

## 4. API定义

### GET /api/recipes
获取所有符文配方及解锁状态

响应：
```typescript
interface Recipe {
  id: string;
  name: string;
  runes: string[];
  description: string;
  bonus: { stat: string; value: number }[];
  unlocked: boolean;
}
```

### POST /api/enchant
保存附魔后的装备

请求：
```typescript
interface EnchantRequest {
  equipmentId: string;
  runes: string[];
  stats: EquipmentStats;
  unlockedRecipeId?: string;
}
```

响应：
```typescript
interface EnchantResponse {
  success: boolean;
  equipment: Equipment;
  newUnlockedRecipes: string[];
}
```

### GET /api/equipment
获取玩家当前装备列表

## 5. 数据模型

### Equipment（装备）
```typescript
interface Equipment {
  id: string;
  name: string;
  icon: string;
  type: 'weapon' | 'armor' | 'accessory';
  baseStats: {
    attack: number;
    defense: number;
    resistance: number;
  };
  embeddedRunes: string[];
}
```

### Rune（符文）
```typescript
interface Rune {
  id: string;
  name: string;
  icon: string;
  color: string;
  stats: {
    attack?: number;
    defense?: number;
    resistance?: number;
    fireResist?: number;
    iceResist?: number;
    lightningResist?: number;
  };
}
```

### ElementalChain（元素连锁）
```typescript
interface ElementalChain {
  id: string;
  name: string;
  runes: [string, string];
  effectName: string;
  bonusStats: Record<string, number>;
  particleType: 'explosion' | 'frost' | 'lightning' | 'holy' | 'shadow';
}
```

## 6. 模块职责与调用关系

| 模块 | 职责 | 输入 | 输出 | 被调用者 |
|------|------|------|------|----------|
| inventory.ts | 装备符文背包管理 | 选择事件 | 装备/符文数据 | index.tsx |
| enchantment.ts | 附魔计算与元素连锁 | 装备+符文列表 | 属性变动+连锁描述 | index.tsx, effects.ts |
| effects.ts | 粒子系统 | 连锁类型字符串 | 粒子动画序列 | enchantment.ts, renderer.ts |
| renderer.ts | Canvas渲染 | 粒子序列+属性 | 逐帧绘制 | index.tsx |
| server.ts | 后端API服务 | HTTP请求 | JSON响应 | index.tsx |
