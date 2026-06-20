import { createContext, useContext, useReducer, ReactNode, useMemo } from 'react'
import { v4 as uuidv4 } from 'uuid'

export const CATEGORY_COLORS = [
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
]

export const CATEGORIES = [
  '前端开发',
  '后端开发',
  '数据库',
  '运维部署',
  '产品设计',
  '测试质量',
  '架构设计',
  '团队协作',
]

export interface Version {
  id: string
  versionNo: string
  author: string
  modifiedAt: string
  content: string
}

export interface Document {
  id: string
  title: string
  category: string
  content: string
  author: string
  createdAt: string
  updatedAt: string
  versions: Version[]
}

export interface SearchResult {
  docId: string
  title: string
  snippet: string
  category: string
}

export interface User {
  id: string
  name: string
  avatar: string
}

export interface AppState {
  documents: Document[]
  currentUser: User
  sidebarCollapsed: boolean
}

type Action =
  | { type: 'UPDATE_DOC'; payload: { id: string; content: string; author: string } }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SIDEBAR'; payload: boolean }

const USERS = ['张伟', '李娜', '王强', '刘洋', '陈静', '赵磊', '周婷', '吴军']

const SAMPLE_CONTENTS: Record<string, string> = {
  'React Hooks最佳实践': `# React Hooks 最佳实践

## useState 使用规范

当状态更新依赖前一个值时，务必使用函数式更新：

\`\`\`tsx
// 错误示例
setCount(count + 1)

// 正确示例
setCount(prev => prev + 1)
\`\`\`

## useEffect 依赖数组

严格把控依赖项，避免不必要的重渲染。

1. 仅添加真正需要的依赖
2. 使用 useCallback / useMemo 稳定引用
3. 考虑使用 useReducer 管理复杂状态

## 自定义 Hook 命名

始终以 use 开头，便于 lint 规则识别：

\`\`\`typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}
\`\`\`
`,
  'Node.js性能优化指南': `# Node.js 性能优化指南

## 事件循环优化

避免在主线程执行 CPU 密集型任务。

\`\`\`javascript
// 推荐使用 worker_threads
const { Worker } = require('worker_threads')

function runInWorker(data) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./heavy.js', { workerData: data })
    worker.on('message', resolve)
    worker.on('error', reject)
  })
}
\`\`\`

## 内存管理

1. 及时释放闭包引用
2. 使用流处理大文件，避免一次性加载
3. 定期使用 --inspect 检查内存泄漏

## 数据库连接

使用连接池并设置合理的 poolSize。
`,
  'MySQL索引优化详解': `# MySQL 索引优化详解

## 索引类型选择

\`\`\`sql
-- 单列索引
CREATE INDEX idx_user_name ON users(name);

-- 联合索引（注意最左前缀原则）
CREATE INDEX idx_user_age_city ON users(age, city);
\`\`\`

## EXPLAIN 分析

每次慢查询必须用 EXPLAIN 分析执行计划：

- type 字段避免 ALL（全表扫描）
- key 字段确认真正使用的索引
- rows 字段尽量控制在千级以内

## 覆盖索引

查询字段完全命中索引时，无需回表，性能提升显著。
`,
  'Docker容器化部署': `# Docker 容器化部署实战

## Dockerfile 最佳实践

\`\`\`dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
\`\`\`

## 多阶段构建

利用多阶段构建减小最终镜像体积，通常可节省 50% 以上。

## docker-compose

编排多个服务时使用 depends_on + healthcheck 控制启动顺序。
`,
  'Figma产品设计规范': `# Figma 产品设计规范

## 设计系统搭建

1. 建立统一的 Color Tokens
2. 字号使用 8px 栅格体系
3. 组件变体（Variants）管理状态

## 间距规范

所有间距必须是 4 的倍数：4、8、12、16、24、32、48。

## 原型交互

使用 Smart Animate 实现平滑过渡，提升方案演示效果。
`,
  'Jest单元测试入门': `# Jest 单元测试入门

## 基础用例结构

\`\`\`typescript
describe('MathUtils', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('add: 1 + 2 equals 3', () => {
    expect(add(1, 2)).toBe(3)
  })

  test('async fetch returns data', async () => {
    const res = await fetchData()
    expect(res).toHaveProperty('id')
  })
})
\`\`\`

## Mock 策略

- 外部 API 一律 Mock
- 数据库访问使用内存版 Repository
- 目标：单元测试跑在 100ms 以内
`,
  '微服务架构设计': `# 微服务架构设计模式

## 服务拆分原则

按业务领域（Bounded Context）而非技术层拆分。

- 订单服务（Order Service）
- 库存服务（Inventory Service）
- 支付服务（Payment Service）

## 服务间通信

1. 同步：gRPC / REST（内部用 gRPC）
2. 异步：Kafka / RabbitMQ 解耦
3. 避免循环依赖，绘制依赖图

## 分布式事务

使用 Saga 模式，避免 2PC 带来的性能损失。
`,
  'Agile敏捷开发流程': `# Agile 敏捷开发流程

## Scrum 三大角色

- **Product Owner**：定义需求、排优先级
- **Scrum Master**：消除障碍、主持仪式
- **Dev Team**：5-9 人跨职能自组织团队

## Sprint 周期

建议 2 周一个 Sprint：

| 阶段 | 时长 |
|------|------|
| Sprint Planning | 2h |
| Daily Standup | 15min |
| Review + Retro | 3h |

## 故事点估算

使用斐波那契数列：1、2、3、5、8、13。超过 13 的用户故事必须拆分。
`,
}

const TITLE_CATEGORY_PAIRS: Array<[string, string]> = [
  ['React Hooks最佳实践', '前端开发'],
  ['Vue3 Composition API实战', '前端开发'],
  ['TypeScript高级类型体操', '前端开发'],
  ['Vite构建工具深度优化', '前端开发'],
  ['CSS Grid响应式布局', '前端开发'],
  ['Webpack5模块联邦', '前端开发'],
  ['Next.js 14 App Router', '前端开发'],
  ['TailwindCSS设计系统', '前端开发'],
  ['Electron桌面应用开发', '前端开发'],
  ['Three.js 3D可视化入门', '前端开发'],
  ['Node.js性能优化指南', '后端开发'],
  ['Spring Boot 3.0新特性', '后端开发'],
  ['Go并发编程实战', '后端开发'],
  ['Rust Web框架Axum', '后端开发'],
  ['Python FastAPI入门', '后端开发'],
  ['GraphQL Schema设计', '后端开发'],
  ['gRPC微服务通信', '后端开发'],
  ['RESTful API设计规范', '后端开发'],
  ['DDD领域驱动设计', '后端开发'],
  ['Kotlin Spring开发', '后端开发'],
  ['MySQL索引优化详解', '数据库'],
  ['PostgreSQL窗口函数', '数据库'],
  ['MongoDB聚合管道', '数据库'],
  ['Redis缓存设计模式', '数据库'],
  ['ElasticSearch搜索引擎', '数据库'],
  ['ClickHouse OLAP分析', '数据库'],
  ['数据库分库分表实战', '数据库'],
  ['SQL性能调优案例', '数据库'],
  ['Neo4j图数据库入门', '数据库'],
  ['DynamoDB主键设计', '数据库'],
  ['Docker容器化部署', '运维部署'],
  ['Kubernetes生产实践', '运维部署'],
  ['Nginx反向代理配置', '运维部署'],
  ['CI/CD Jenkins流水线', '运维部署'],
  ['Prometheus监控告警', '运维部署'],
  ['Terraform基础设施即代码', '运维部署'],
  ['AWS云服务架构', '运维部署'],
  ['Linux性能调优', '运维部署'],
  ['Istio服务网格', '运维部署'],
  ['Harbor镜像仓库搭建', '运维部署'],
  ['Figma产品设计规范', '产品设计'],
  ['用户体验UX原则', '产品设计'],
  ['PRD需求文档模板', '产品设计'],
  ['交互原型设计技巧', '产品设计'],
  ['设计系统建设指南', '产品设计'],
  ['用户调研方法论', '产品设计'],
  ['A/B测试数据驱动', '产品设计'],
  ['移动端iOS设计规范', '产品设计'],
  ['B端产品信息架构', '产品设计'],
  ['可用性测试实战', '产品设计'],
  ['Jest单元测试入门', '测试质量'],
  ['Selenium自动化测试', '测试质量'],
  ['Cypress E2E测试', '测试质量'],
  ['性能测试JMeter', '测试质量'],
  ['安全渗透测试基础', '测试质量'],
  ['测试用例设计方法', '测试质量'],
  ['接口测试PostMan', '测试质量'],
  ['Mock Server搭建', '测试质量'],
  ['测试报告撰写模板', '测试质量'],
  ['缺陷生命周期管理', '测试质量'],
  ['微服务架构设计', '架构设计'],
  ['高并发系统设计', '架构设计'],
  ['分布式ID生成方案', '架构设计'],
  ['分布式锁实现原理', '架构设计'],
  ['消息队列Kafka选型', '架构设计'],
  ['CAP定理权衡', '架构设计'],
  ['限流熔断降级策略', '架构设计'],
  ['异地多活架构', '架构设计'],
  ['API网关选型对比', '架构设计'],
  ['领域事件驱动架构', '架构设计'],
  ['Agile敏捷开发流程', '团队协作'],
  ['Git工作流最佳实践', '团队协作'],
  ['Code Review规范', '团队协作'],
  ['技术文档写作指南', '团队协作'],
  ['OKR目标设定方法', '团队协作'],
  ['高效会议主持技巧', '团队协作'],
  ['新人Onboarding流程', '团队协作'],
  ['跨团队沟通协作', '团队协作'],
  ['知识沉淀方法论', '团队协作'],
  ['复盘会议模板', '团队协作'],
  ['前端安全XSS防护', '前端开发'],
  ['JWT身份认证实现', '后端开发'],
  ['数据库主从复制', '数据库'],
  ['Helm包管理工具', '运维部署'],
  ['无障碍设计WCAG', '产品设计'],
  ['压力测试Locust', '测试质量'],
  ['中台架构设计思路', '架构设计'],
  ['Scrum Master职责', '团队协作'],
  ['React Server Components', '前端开发'],
  ['gRPC Gateway实践', '后端开发'],
  ['HBase列式存储', '数据库'],
  ['Ansible自动化运维', '运维部署'],
  ['Figma变量功能', '产品设计'],
  ['JUnit5参数化测试', '测试质量'],
  ['CQRS模式落地', '架构设计'],
  ['冲突管理方法论', '团队协作'],
  ['Pinia状态管理', '前端开发'],
  ['WebSocket实时推送', '后端开发'],
  ['TiDB分布式数据库', '数据库'],
  ['ArgoCD GitOps部署', '运维部署'],
  ['用户画像体系搭建', '产品设计'],
  ['SonarQube代码质量', '测试质量'],
]

function pickAuthor(): string {
  return USERS[Math.floor(Math.random() * USERS.length)]
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function randomDate(daysAgoMax: number): string {
  const now = new Date()
  const d = new Date(now.getTime() - Math.floor(Math.random() * daysAgoMax * 86400000))
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function makeContent(title: string, category: string): string {
  if (SAMPLE_CONTENTS[title]) return SAMPLE_CONTENTS[title]
  return `# ${title}\n\n## 概述\n\n本文档系统介绍了「${title}」相关知识，归属于**${category}**分类。\n\n## 核心要点\n\n1. **第一要点**：理解基础概念和适用场景，避免盲目使用\n2. **第二要点**：结合实际项目案例，掌握常见的落地方式\n3. **第三要点**：关注性能、可维护性和团队协作的最佳实践\n\n## 详细内容\n\n### 背景\n\n在现代软件工程中，${title}已经成为${category}领域的重要主题。团队成员应充分理解其原理，并在日常开发中灵活运用。\n\n### 代码示例\n\n\`\`\`typescript\n// ${title} 核心实现\nclass ${title.replace(/[^a-zA-Z]/g, '')}Handler {\n  private config: Record<string, unknown>\n\n  constructor(config: Record<string, unknown>) {\n    this.config = config\n  }\n\n  execute(input: string): string {\n    console.log('[${category}] Processing:', input)\n    return \`processed-\${input}\`\n  }\n}\n\`\`\`\n\n## 注意事项\n\n- 关注最新版本的变更记录（Changelog）\n- 与组内同学对齐后再做重大改造\n- 配套编写单元测试，保证回归质量\n\n> 本文档由团队知识库自动维护，欢迎补充完善。\n`
}

function createInitialDocuments(): Document[] {
  const docs: Document[] = []
  for (let i = 0; i < TITLE_CATEGORY_PAIRS.length; i++) {
    const [title, category] = TITLE_CATEGORY_PAIRS[i]
    const content = makeContent(title, category)
    const author = pickAuthor()
    const createdAt = randomDate(180)
    const updatedAt = randomDate(30)
    const versions: Version[] = []
    const vCount = 2 + Math.floor(Math.random() * 4)
    for (let v = 1; v <= vCount; v++) {
      versions.push({
        id: uuidv4(),
        versionNo: `v${v}.${Math.floor(Math.random() * 5)}`,
        author: pickAuthor(),
        modifiedAt: randomDate(v * 5),
        content: v === vCount ? content : content + `\n\n<!-- v${v} 旧版标记 -->`,
      })
    }
    docs.push({
      id: uuidv4(),
      title,
      category,
      content,
      author,
      createdAt,
      updatedAt,
      versions,
    })
  }
  return docs
}

export function pickColorForCategory(category: string): string {
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash)
  }
  const idx = Math.abs(hash) % CATEGORY_COLORS.length
  return CATEGORY_COLORS[idx]
}

const initialState: AppState = {
  documents: createInitialDocuments(),
  currentUser: { id: 'u-001', name: '张伟', avatar: '张' },
  sidebarCollapsed: false,
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'UPDATE_DOC': {
      const { id, content, author } = action.payload
      return {
        ...state,
        documents: state.documents.map((doc) => {
          if (doc.id !== id) return doc
          const latest = doc.versions[doc.versions.length - 1]
          const oldVerNum = latest ? parseFloat(latest.versionNo.replace('v', '')) : 0
          const nextMajor = Math.floor(oldVerNum) + 1
          const nextVersion: Version = {
            id: uuidv4(),
            versionNo: `v${nextMajor}.0`,
            author,
            modifiedAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
            content: doc.content,
          }
          return {
            ...doc,
            content,
            updatedAt: nextVersion.modifiedAt,
            versions: [...doc.versions, nextVersion],
          }
        }),
      }
    }
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarCollapsed: !state.sidebarCollapsed }
    case 'SET_SIDEBAR':
      return { ...state, sidebarCollapsed: action.payload }
    default:
      return state
  }
}

interface AppContextValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  updateDocument: (id: string, content: string) => void
  searchDocuments: (query: string) => SearchResult[]
  toggleSidebar: () => void
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const value = useMemo<AppContextValue>(() => {
    const updateDocument = (id: string, content: string) => {
      dispatch({ type: 'UPDATE_DOC', payload: { id, content, author: state.currentUser.name } })
    }

    const searchDocuments = (query: string): SearchResult[] => {
      const q = query.trim().toLowerCase()
      if (!q) return []
      const keywords = q.split(/\s+/).filter(Boolean)
      const results: SearchResult[] = []
      for (let i = 0; i < state.documents.length && results.length < 15; i++) {
        const doc = state.documents[i]
        const hay = `${doc.title}\n${doc.content}\n${doc.category}`.toLowerCase()
        const hit = keywords.every((k) => hay.includes(k))
        if (!hit) continue
        const idx = Math.max(0, hay.indexOf(keywords[0]) - 20)
        const rawSnippet = (doc.title + ' ' + doc.content).slice(idx, idx + 100).replace(/\s+/g, ' ')
        results.push({
          docId: doc.id,
          title: doc.title,
          snippet: rawSnippet.length > 96 ? rawSnippet.slice(0, 96) + '…' : rawSnippet,
          category: doc.category,
        })
      }
      return results
    }

    const toggleSidebar = () => dispatch({ type: 'TOGGLE_SIDEBAR' })

    return { state, dispatch, updateDocument, searchDocuments, toggleSidebar }
  }, [state])

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
