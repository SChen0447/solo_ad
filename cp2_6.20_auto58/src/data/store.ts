import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

export interface User {
  id: string
  name: string
  avatar: string
}

export interface DocVersion {
  version: number
  content: string
  author: string
  updatedAt: string
}

export interface Document {
  id: string
  title: string
  category: string
  content: string
  author: string
  createdAt: string
  updatedAt: string
  versions: DocVersion[]
  colorIndex: number
}

export interface SearchResult {
  document: Document
  snippet: string
  matches: number[]
}

export interface AppState {
  documents: Document[]
  currentUser: User
  searchQuery: string
  searchResults: SearchResult[]
  isSearching: boolean
}

export type AppAction =
  | { type: 'ADD_DOCUMENT'; payload: Omit<Document, 'id' | 'createdAt' | 'updatedAt' | 'versions' | 'colorIndex'> }
  | { type: 'UPDATE_DOCUMENT'; payload: { id: string; content: string; title?: string; category?: string } }
  | { type: 'DELETE_DOCUMENT'; payload: string }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_SEARCH_RESULTS'; payload: SearchResult[] }
  | { type: 'SET_SEARCHING'; payload: boolean }

const CATEGORY_COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
const CATEGORIES = ['前端开发', '后端架构', '运维部署', '产品设计', '团队协作']
const AUTHORS = ['张三', '李四', '王五', '赵六']

const SAMPLE_CONTENTS: Record<string, string[]> = {
  '前端开发': [
    '# React 性能优化指南\n\n## 1. 虚拟列表实现\n\n当渲染大量数据时，使用虚拟滚动可以显著提升性能。\n\n```tsx\nfunction VirtualList() {\n  // 只渲染可视范围内的元素\n  const items = getAllItems()\n  const visible = items.slice(start, end)\n  return visible.map(renderRow)\n}\n```\n\n## 2. 代码分割\n\n使用 React.lazy 和 Suspense 进行路由级代码分割，减少首屏加载体积。\n\n## 3. 状态管理\n\n全局状态使用 Context 配合 useReducer，避免不必要的重复渲染。',
    '# TypeScript 高级类型技巧\n\n## 条件类型\n\n```typescript\ntype IsString<T> = T extends string ? true : false\ntype A = IsString<string>\ntype B = IsString<number>\n```\n\n## 映射类型\n\n通过 keyof 操作符遍历类型的所有属性，实现灵活的类型转换。\n\n## 工具类型\n\n掌握 Partial、Required、Pick、Omit 等内置工具类型。',
    '# CSS Grid 实战布局\n\n使用 Grid 可以轻松实现复杂的响应式布局系统。\n\n```css\n.container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 24px;\n}\n```\n\n配合 auto-fit 和 minmax 实现自适应列数。'
  ],
  '后端架构': [
    '# 微服务架构设计原则\n\n## 服务拆分\n\n按照业务领域边界进行拆分，每个服务独立部署和扩展。\n\n```java\npublic class OrderService {\n  public Order createOrder(OrderDTO dto) {\n    // 执行业务逻辑\n    return saveToDB(order)\n  }\n}\n```\n\n## 服务通信\n\n使用消息队列实现异步解耦，提升系统整体可用性。',
    '# 数据库索引优化\n\n合理的索引设计可以将查询性能提升10倍以上。\n\n```sql\nCREATE INDEX idx_user_created_at\nON users(created_at, id, name, email)\n```\n\n覆盖索引避免回表，复合索引注意最左前缀原则。',
    '# RESTful API 设计规范\n\n使用正确的 HTTP 方法：GET 查询、POST 创建、PUT 更新、DELETE 删除。\n\n状态码规范：200 成功，400 参数错误，401 未授权，404 未找到，500 服务器内部错误。'
  ],
  '运维部署': [
    '# Docker 容器化最佳实践\n\n## Dockerfile 优化\n\n多阶段构建减少镜像体积，清理无用缓存层。\n\n```dockerfile\nFROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install --production\nCOPY . .\nCMD node server.js\n```\n\n## 镜像安全\n\n使用官方基础镜像，定期扫描安全漏洞。',
    '# Kubernetes 部署入门\n\nDeployment 资源管理应用的滚动更新和水平扩缩容。\n\nService 提供稳定的服务访问入口，Ingress 配置外部路由规则。\n\nConfigMap 和 Secret 分离管理配置信息与敏感数据。',
    '# CI 与 CD 流水线配置\n\n自动化构建和部署流程，每次提交自动触发单元测试、构建镜像、部署到测试环境。\n\n人工审核通过后发布到生产环境，支持一键快速回滚。'
  ],
  '产品设计': [
    '# 用户体验设计原则\n\n好的设计是隐形的，用户不需要思考如何使用产品。\n\n## 一致性原则\n\n整个产品的交互模式和视觉风格保持高度统一。\n\n```\n按钮高度规范：48px 移动端 / 40px 桌面端\n圆角规范体系：8px, 12px, 16px\n间距系统规范：4px, 8px, 16px, 24px, 32px\n```\n\n## 即时反馈原则\n\n每次操作都要有明确的视觉反馈。',
    '# 交互原型设计流程\n\n从低保真到高保真，逐步迭代完善设计方案。\n\n1. 需求梳理与信息架构设计\n2. 低保真线框图快速绘制\n3. 目标用户测试与验证迭代\n4. 高保真视觉精修设计\n5. 交付开发并跟进走查验收',
    '# 设计系统构建实践\n\n建立可复用的组件库和统一的设计 Token 体系。\n\n基础层包含颜色、字体、间距、圆角、阴影、动效等令牌。\n\n组件层封装 Button、Input、Card、Modal 等通用业务组件。'
  ],
  '团队协作': [
    '# Git 工作流规范\n\n采用简洁的主干开发模式配合特性分支。\n\n```bash\n# 创建功能分支并切换\ngit checkout -b feature-login-page\n\n# 提交代码到分支\ngit add . && git commit -m "feat: add login page"\n\n# 推送到远端并发起 PR\ngit push origin feature-login-page\n```\n\n## 提交信息规范\n\n使用 feat、fix、docs、refactor 等语义化前缀。',
    '# 代码审查 Checklist\n\n每次 Code Review 按以下关键点逐项检查：\n\n- 功能逻辑正确性与边界条件处理\n- 潜在性能瓶颈与内存泄漏风险\n- 安全漏洞与输入校验\n- 代码可读性与命名规范\n- 是否需要补充测试用例',
    '# 敏捷开发实践指南\n\n每日站会控制在15分钟内，同步昨日进展、今日计划和遇到的阻塞问题。\n\nSprint 周期建议两周，结束后进行回顾会议持续改进流程。\n\n需求优先级采用 MoSCoW 方法进行合理划分。'
  ]
}

function pickSample(category: string, idx: number): string {
  const arr = SAMPLE_CONTENTS[category] || SAMPLE_CONTENTS['前端开发']
  return arr[idx % arr.length]
}

function generateInitialDocuments(): Document[] {
  const docs: Document[] = []
  let counter = 0
  for (let ci = 0; ci < CATEGORIES.length; ci++) {
    const category = CATEGORIES[ci]
    for (let i = 0; i < 4; i++) {
      const title = category + ' - 文档 ' + (i + 1)
      const author = AUTHORS[counter % AUTHORS.length]
      const content = pickSample(category, counter)
      const now = new Date(Date.now() - counter * 86400000 * 2).toISOString()
      const versions: DocVersion[] = []
      for (let v = 1; v <= 3; v++) {
        const vContent = v === 3 ? content : content.replace(/文档 \d/, '文档 ' + (i + 1) + ' v' + v)
        versions.push({
          version: v,
          content: vContent,
          author: AUTHORS[(counter + v - 1) % AUTHORS.length],
          updatedAt: new Date(Date.now() - counter * 86400000 * 2 - (3 - v) * 3600000).toISOString()
        })
      }
      docs.push({
        id: uuidv4(),
        title,
        category,
        content,
        author,
        createdAt: now,
        updatedAt: now,
        versions,
        colorIndex: counter % 5
      })
      counter++
    }
  }
  return docs
}

const initialState: AppState = {
  documents: generateInitialDocuments(),
  currentUser: { id: 'user-1', name: '当前用户', avatar: 'U' },
  searchQuery: '',
  searchResults: [],
  isSearching: false
}

function getHighlightedSnippet(content: string, query: string): string {
  const clean = content.replace(/[#*`\n]/g, ' ')
  const lower = clean.toLowerCase()
  const lowerQ = query.toLowerCase()
  const idx = lower.indexOf(lowerQ)
  if (idx === -1) return clean.slice(0, 80) + '...'
  const start = Math.max(0, idx - 30)
  const end = Math.min(clean.length, idx + query.length + 30)
  return (start > 0 ? '...' : '') + clean.slice(start, end) + (end < clean.length ? '...' : '')
}

function findMatchIndices(content: string, query: string): number[] {
  const indices: number[] = []
  if (!query) return indices
  const lower = content.toLowerCase()
  const lowerQ = query.toLowerCase()
  let idx = lower.indexOf(lowerQ)
  while (idx !== -1 && indices.length < 50) {
    indices.push(idx)
    idx = lower.indexOf(lowerQ, idx + 1)
  }
  return indices
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_DOCUMENT': {
      const now = new Date().toISOString()
      const content = action.payload.content || ''
      const newDoc: Document = {
        ...action.payload,
        id: uuidv4(),
        createdAt: now,
        updatedAt: now,
        colorIndex: Math.floor(Math.random() * 5),
        versions: [{
          version: 1,
          content,
          author: state.currentUser.name,
          updatedAt: now
        }]
      }
      return { ...state, documents: [newDoc, ...state.documents] }
    }
    case 'UPDATE_DOCUMENT': {
      const now = new Date().toISOString()
      const updated = state.documents.map(doc => {
        if (doc.id !== action.payload.id) return doc
        const nextV = doc.versions.length + 1
        return {
          ...doc,
          title: action.payload.title ?? doc.title,
          category: action.payload.category ?? doc.category,
          content: action.payload.content,
          updatedAt: now,
          versions: [
            ...doc.versions,
            {
              version: nextV,
              content: action.payload.content,
              author: state.currentUser.name,
              updatedAt: now
            }
          ]
        }
      })
      return { ...state, documents: updated }
    }
    case 'DELETE_DOCUMENT':
      return { ...state, documents: state.documents.filter(d => d.id !== action.payload) }
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload }
    case 'SET_SEARCH_RESULTS':
      return { ...state, searchResults: action.payload }
    case 'SET_SEARCHING':
      return { ...state, isSearching: action.payload }
    default:
      return state
  }
}

interface StoreContextType {
  state: AppState
  dispatch: React.Dispatch<AppAction>
  getDocumentById: (id: string) => Document | undefined
  performSearch: (query: string) => void
  addDocument: (doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt' | 'versions' | 'colorIndex'>) => void
  updateDocument: (id: string, content: string, title?: string, category?: string) => void
  deleteDocument: (id: string) => void
  categoryColors: string[]
  categories: string[]
}

const StoreContext = createContext<StoreContextType | null>(null)

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)

  const getDocumentById = useCallback((id: string) => {
    return state.documents.find(d => d.id === id)
  }, [state.documents])

  const performSearch = useCallback((query: string) => {
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query })
    if (!query.trim()) {
      dispatch({ type: 'SET_SEARCH_RESULTS', payload: [] })
      dispatch({ type: 'SET_SEARCHING', payload: false })
      return
    }
    dispatch({ type: 'SET_SEARCHING', payload: true })
    const results: SearchResult[] = []
    const lowerQ = query.toLowerCase().trim()
    for (const doc of state.documents) {
      const searchable = (doc.title + ' ' + doc.content + ' ' + doc.category).toLowerCase()
      if (searchable.includes(lowerQ)) {
        results.push({
          document: doc,
          snippet: getHighlightedSnippet(doc.content, query.trim()),
          matches: findMatchIndices(doc.title + ' ' + doc.content, query.trim())
        })
      }
      if (results.length >= 15) break
    }
    dispatch({ type: 'SET_SEARCH_RESULTS', payload: results })
    dispatch({ type: 'SET_SEARCHING', payload: false })
  }, [state.documents])

  const addDocument = useCallback((doc: Omit<Document, 'id' | 'createdAt' | 'updatedAt' | 'versions' | 'colorIndex'>) => {
    dispatch({ type: 'ADD_DOCUMENT', payload: doc })
  }, [])

  const updateDocument = useCallback((id: string, content: string, title?: string, category?: string) => {
    dispatch({ type: 'UPDATE_DOCUMENT', payload: { id, content, title, category } })
  }, [])

  const deleteDocument = useCallback((id: string) => {
    dispatch({ type: 'DELETE_DOCUMENT', payload: id })
  }, [])

  const value = useMemo(() => ({
    state, dispatch,
    getDocumentById, performSearch,
    addDocument, updateDocument, deleteDocument,
    categoryColors: CATEGORY_COLORS,
    categories: CATEGORIES
  }), [state, getDocumentById, performSearch, addDocument, updateDocument, deleteDocument])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error('useStore must be used within StoreProvider')
  return ctx
}

export { CATEGORY_COLORS, CATEGORIES }
