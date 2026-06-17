## 1. 架构设计

```mermaid
graph TB
    "Frontend[前端 React+Vite+TypeScript]" --> "API[REST API]"
    "API" --> "Backend[后端 Express+TypeScript]"
    "Backend" --> "Memory[内存数组模拟持久化]"
```

## 2. 技术说明
- 前端：React 18 + TypeScript + Vite
- 后端：Express + TypeScript
- 状态管理：React useState（组件内状态）
- 数据持久化：后端内存数组模拟
- 前后端通信：REST API（fetch）
- 样式：CSS-in-JS（内联样式 + CSS模块）

## 3. 路由定义
| 路由 | 用途 |
|------|------|
| / | 首页 - 灵感生成 |
| /collection | 收藏夹页面 |

## 4. API 定义

### 4.1 TypeScript 类型定义

```typescript
interface InspirationItem {
  id: string;
  text: string;
  note: string;
  tags: string[];
  createdAt: number;
}

interface GeneratedInspiration {
  text: string;
}
```

### 4.2 API 端点

| 方法 | 路径 | 请求体 | 响应 | 用途 |
|------|------|--------|------|------|
| GET | /api/inspiration | - | `{ text: string }` | 随机生成灵感 |
| GET | /api/inspiration/collection | - | `InspirationItem[]` | 获取所有收藏 |
| POST | /api/inspiration/collection | `{ text: string, note?: string, tags?: string[] }` | `InspirationItem` | 添加收藏 |
| PATCH | /api/inspiration/collection/:id | `{ note?: string, tags?: string[] }` | `InspirationItem` | 更新收藏备注/标签 |
| DELETE | /api/inspiration/collection/:id | - | `{ success: boolean }` | 删除收藏 |

## 5. 服务器架构图

```mermaid
graph LR
    "Controller[路由控制器]" --> "Service[灵感生成服务]"
    "Controller" --> "Store[内存数据存储]"
    "Service" --> "Templates[预设模板与组合规则]"
```

## 6. 数据模型

### 6.1 灵感生成规则
- 主题词数组：[猫, 咖啡, 时间旅行, 太空, 音乐, ...]
- 形式词数组：[故事大纲, APP概念, 游戏设定, 绘画主题, ...]
- 组合词数组：[奇幻冒险, 赛博朋克, 温馨日常, 悬疑推理, ...]
- 随机从三个数组各取一个词，组合成灵感文本

### 6.2 收藏数据结构
```typescript
{
  id: string;        // UUID
  text: string;      // 灵感文本
  note: string;      // 备注（默认空字符串）
  tags: string[];    // 标签数组（最多3个）
  createdAt: number; // 收藏时间戳
}
```
