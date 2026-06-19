## 1. 架构设计

```mermaid
graph TD
    "GameScene" --> "WorldManager"
    "GameScene" --> "Player"
    "GameScene" --> "EnemyManager"
    "GameScene" --> "InventoryManager"
    "WorldManager" --> "Tile"
    "Player" --> "WorldManager"
    "Player" --> "InventoryManager"
    "EnemyManager" --> "GameScene"
    "InventoryManager" --> "GameScene"
```

## 2. 技术说明

- 前端框架：Phaser 3.60.0（2D游戏引擎）
- 开发语言：TypeScript 5.3.3（strict模式，target ES2020）
- 构建工具：Vite 5.0.8
- 无后端服务，纯前端游戏

## 3. 文件结构

| 文件路径 | 职责 |
|---------|------|
| package.json | 项目依赖和启动脚本 |
| index.html | 入口页面，全屏Canvas，背景色#2c1810 |
| tsconfig.json | TypeScript配置，strict模式 |
| vite.config.js | Vite默认配置 |
| src/main.ts | 游戏入口，创建Phaser.Game实例 |
| src/map/Tile.ts | 地形块类，地形类型/像素纹理索引/可采集属性 |
| src/map/WorldManager.ts | 16x16网格地图生成/管理/碰撞检测 |
| src/entities/Player.ts | 玩家角色，移动/采集/攻击逻辑 |
| src/entities/EnemyManager.ts | 史莱姆生成/AI巡逻/死亡掉落 |
| src/entities/InventoryManager.ts | 背包物品增删改查/事件通知 |

## 4. 模块接口定义

### 4.1 WorldManager

```typescript
class WorldManager {
  generateMap(): void
  getTile(x: number, y: number): Tile
  setTile(x: number, y: number, tile: Tile): void
  isWalkable(x: number, y: number): boolean
  getMovementSpeed(x: number, y: number): number
}
```

### 4.2 Tile

```typescript
enum TerrainType { GRASS, TREE, STONE, WATER }
class Tile {
  type: TerrainType
  textureIndex: number
  harvestable: boolean
  walkable: boolean
}
```

### 4.3 Player

```typescript
class Player {
  x: number; y: number
  hp: number; maxHp: number
  exp: number; level: number
  speed: number
  currentTool: ItemType
  move(dx: number, dy: number): void
  harvest(target: Tile): void
  attack(target: Enemy): void
}
```

### 4.4 EnemyManager

```typescript
class EnemyManager {
  spawnEnemy(): void
  updatePatrol(delta: number): void
  onEnemyDeath(callback: (enemy: Enemy) => void): void
}
```

### 4.5 InventoryManager

```typescript
enum ItemType { WOOD, STONE, IRON, GOLD, HAMMER, SWORD, WOODEN_FENCE, IRON_SWORD }
class InventoryManager {
  addItem(type: ItemType, amount: number): void
  removeItem(type: ItemType, amount: number): boolean
  hasItem(type: ItemType, amount: number): boolean
  getCount(type: ItemType): number
  onInventoryChange(callback: () => void): void
}
```

## 5. 合成配方

| 配方名称 | 输入材料 | 输出物品 |
|---------|---------|---------|
| 木栅栏 | 3x 木材 | 1x 木栅栏 |
| 铁剑 | 2x 石头 + 1x 铁锭 | 1x 铁剑(攻击+50%) |

## 6. 性能策略

- 目标帧率：30FPS以上
- 降级阈值：帧率<25FPS时自动关闭粒子效果和行走动画细节
- 降级策略：切换为静态帧显示，减少每帧计算量
- 恢复条件：帧率回升至30FPS以上时恢复全部效果
