## 1. 架构设计

```mermaid
graph TD
    subgraph "前端 (React + TypeScript + Vite)"
        subgraph "UI层 (src/ui)"
            A["App.tsx<br/>主状态管理/场景切换"]
            B["HeroPanel.tsx<br/>角色养成/装备面板"]
            C["BattleScene.tsx<br/>战斗场景/回合指令"]
        end
        subgraph "业务逻辑层 (src/modules)"
            D["character.ts<br/>角色养成模块"]
            E["equipment.ts<br/>装备系统模块"]
            F["battle.ts<br/>战斗逻辑模块"]
        end
        subgraph "数据层"
            G["类型定义 IHero/IEquipment/IMonster"]
            H["职业初始数据/怪物基础数据"]
        end
    end

    A -->|调用| D
    A -->|调用| E
    A -->|调用| F
    B -->|渲染英雄数据| A
    C -->|渲染战斗数据| A
    D -->|操作| G
    E -->|操作| G
    F -->|操作| G
    D -->|读取| H
    F -->|读取| H
```

## 2. 技术描述
- **前端框架**：React@18.2.0 + React-DOM@18.2.0
- **语言**：TypeScript@5.3.3（严格模式，target ES2020，jsx react-jsx）
- **构建工具**：Vite@5.0.8 + @vitejs/plugin-react@4.2.0
- **路径别名**：@ → src目录
- **状态管理**：React useState（轻量级场景，无需额外状态库）
- **样式方案**：原生CSS + CSS变量 + CSS动画
- **后端**：纯前端，无后端服务

## 3. 路由定义
| 场景 | 说明 |
|------|------|
| create | 英雄创建场景 |
| panel | 角色养成面板 |
| map | 随机地图场景 |
| battle | 战斗场景 |
| result | 战斗结算场景 |
| gameover | 游戏结束场景 |

## 4. 数据模型

### 4.1 类型定义

```mermaid
erDiagram
    IHero {
        string name "角色名称"
        HeroClass heroClass "职业"
        number level "等级"
        number exp "经验值"
        number expToNext "下一级经验"
        number hp "当前HP"
        number maxHp "最大HP"
        number atk "攻击力"
        number def "防御力"
        number spd "速度"
        number matk "魔法攻击"
        number availablePoints "可用属性点"
        number str "力量"
        number agi "敏捷"
        number vit "耐力"
        number int "智力"
        IEquipment[] equipment "已装备(4槽)"
        IEquipment[] inventory "背包(上限10)"
        number potions "药水数量"
    }

    IEquipment {
        string id "唯一ID"
        string name "装备名称"
        EquipmentType type "类型"
        Quality quality "品质"
        object bonus "属性加成"
    }

    IBattleState {
        IHero hero "玩家英雄"
        IMonster monster "当前怪物"
        BattlePhase phase "战斗阶段"
        string[] logs "战斗日志"
        boolean playerTurn "是否玩家回合"
        boolean isDefending "防御状态"
    }

    IMonster {
        string id "怪物ID"
        string name "名称"
        MonsterType type "种类"
        number level "等级"
        number hp "当前HP"
        number maxHp "最大HP"
        number atk "攻击力"
        number def "防御力"
        number spd "速度"
        number expReward "经验奖励"
    }
```

### 4.2 数据流向
```
UI指令 → App.tsx(state) → modules/* 纯函数处理 → 返回新状态 → UI重新渲染
  ↑                                                        ↓
  └──────────────── 用户交互事件 ←─────────────────────────┘
```

- **character.ts数据流**：UI(createHero/分配属性) → 调用函数 → 更新IHero → 返回新对象
- **equipment.ts数据流**：战斗结果掉落ID → generateEquipment随机生成 → equipItem/unequipItem操作英雄装备栏 → 背包溢出警告
- **battle.ts数据流**：UI选择攻击/防御/药水 → executeTurn执行回合 → calculateDamage计算伤害 → checkVictory检测结果 → 返回战斗状态+日志

## 5. 文件结构

```
auto44/
├── package.json            # 依赖与脚本
├── vite.config.js          # Vite配置(@别名)
├── tsconfig.json           # TS配置(严格/ES2020)
├── index.html              # 入口(Press Start 2P/黑色背景)
└── src/
    ├── main.tsx            # React入口
    ├── index.css           # 全局像素风样式
    ├── modules/
    │   ├── character.ts    # 角色养成(IHero, createHero, gainExp, levelUp)
    │   ├── equipment.ts    # 装备系统(IEquipment, 生成/穿戴/卸下)
    │   └── battle.ts       # 战斗逻辑(回合制,伤害计算,胜负判定)
    └── ui/
        ├── App.tsx         # 主组件(状态管理,场景切换)
        ├── HeroPanel.tsx   # 养成面板(属性+装备)
        ├── BattleScene.tsx # 战斗场景(精灵/HP条/日志/按钮)
        └── MapScene.tsx    # 地图场景(怪物节点)
```
