/**
 * apiClient.ts - 前端 REST API 客户端统一封装
 * 
 * 职责：
 * - 统一封装所有对后端 Express 服务器的 HTTP 请求（使用浏览器 fetch API）
 * - 所有 API 调用统一加前缀 /api，实际请求通过 vite.config.js 的代理
 *   从 http://localhost:5173/api/xxx 转发到 http://localhost:3001/api/xxx
 * - 统一处理 Content-Type header 和 HTTP 错误响应解析
 * - 所有方法返回 Promise<T>，由业务组件自己 await/.then
 * 
 * 调用方 & 数据流向：
 * ┌────────────────────┐     fetch('/api/...')     ┌───────────────────────┐
 * │   前端业务组件      │  ──────────────────────▶  │ vite 代理 (port 5173) │
 * │  - App.tsx         │                            └──────────┬────────────┘
 * │  - BookShelf.tsx   │                                       │ 转发
 * │  - WordCloud.tsx   │    Promise<T> (JSON)                 ▼
 * │  - HomePage.tsx    │  ◀──────────────────────   Express 后端 (port 3001)
 * └────────────────────┘                                     │ server/server.ts
 *                                                             └─ 内存数组 → JSON
 * 
 * 方法清单（对应 server.ts 的 Express 路由）：
 *   书架管理：
 *   getShelves()           → GET  /api/shelves
 *   getShelf(id)           → GET  /api/shelves/:id
 *   createShelf(data)      → POST /api/shelves
 *   joinShelf(data)        → POST /api/shelves/join
 *
 *   成员：
 *   getShelfMembers(id)    → GET  /api/shelves/:id/members
 *
 *   书籍：
 *   getShelfBooks(id)      → GET  /api/shelves/:id/books        (BookShelf 调用)
 *   addBook(id, data)      → POST /api/shelves/:id/books        (BookShelf 调用)
 *   updateProgress(id,data)→ POST /api/books/:bookId/progress   (BookShelf 调用)
 *
 *   聚合数据：
 *   getAverageProgress(id) → GET  /api/shelves/:id/average-progress (BookShelf 调用)
 *   getWordCloud(id)       → GET  /api/shelves/:id/wordcloud        (WordCloud 调用)
 *   getDiscussions(word?)  → GET  /api/discussions?word=xxx         (WordCloud 调用)
 */

import type {
  Shelf,
  Member,
  Book,
  DiscussionKeyword,
  Discussion,
  AverageProgress,
  JoinShelfResult,
  ReadingProgress,
  BookHistory,
} from './types'

/** API 前缀，所有请求都走 /api，由 vite 代理到后端 3001 端口 */
const API_BASE = '/api'

/**
 * 通用 fetch 封装
 * @param url  相对路径（如 /shelves），会自动拼 API_BASE
 * @param options  fetch 选项（method、body、headers 等）
 * @returns 解析后的 JSON 数据，类型为 T
 * @throws HTTP 非 2xx 时抛出 Error，message 为后端返回的 { error } 字段
 */
async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }))
    throw new Error(error.error || `HTTP error! status: ${response.status}`)
  }

  return response.json()
}

export const apiClient = {
  /**
   * 获取所有书架列表
   * GET /api/shelves → 被 App.tsx (loadShelves) 调用
   */
  getShelves: (): Promise<Shelf[]> => request<Shelf[]>('/shelves'),

  /**
   * 获取单个书架详情
   * GET /api/shelves/:id → 被 App.tsx (useEffect currentShelfId) 调用
   */
  getShelf: (id: string): Promise<Shelf> => request<Shelf>(`/shelves/${id}`),

  /**
   * 创建新书架
   * POST /api/shelves → 被 App.tsx (handleCreateShelf) 调用
   * @param data { name, description }
   */
  createShelf: (data: { name: string; description: string }): Promise<Shelf> =>
    request<Shelf>('/shelves', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 通过邀请码加入书架
   * POST /api/shelves/join → 被 App.tsx (handleJoinShelf) 调用
   * @param data { inviteCode, nickname }
   */
  joinShelf: (data: { inviteCode: string; nickname: string }): Promise<JoinShelfResult> =>
    request<JoinShelfResult>('/shelves/join', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 获取书架所有成员
   * GET /api/shelves/:shelfId/members
   */
  getShelfMembers: (shelfId: string): Promise<Member[]> =>
    request<Member[]>(`/shelves/${shelfId}/members`),

  /**
   * 获取书架下所有成员的所有书籍
   * GET /api/shelves/:shelfId/books → 被 BookShelf.tsx (loadBooks) 调用
   */
  getShelfBooks: (shelfId: string): Promise<Book[]> =>
    request<Book[]>(`/shelves/${shelfId}/books`),

  /**
   * 给当前书架添加一本属于某成员的新书
   * POST /api/shelves/:shelfId/books → 被 BookShelf.tsx (handleAddBook) 调用
   */
  addBook: (shelfId: string, data: { title: string; author: string; totalPages: number; memberId: string }): Promise<Book> =>
    request<Book>(`/shelves/${shelfId}/books`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 更新某本书的阅读进度
   * POST /api/books/:bookId/progress → 被 BookShelf.tsx (handleUpdateProgress) 调用
   */
  updateProgress: (bookId: string, data: { currentPage: number; memberId: string }): Promise<ReadingProgress> =>
    request<ReadingProgress>(`/books/${bookId}/progress`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /**
   * 获取书架小组平均进度曲线数据（按日期聚合）
   * GET /api/shelves/:shelfId/average-progress → 被 BookShelf.tsx (loadAverageProgress) 调用
   */
  getAverageProgress: (shelfId: string): Promise<AverageProgress[]> =>
    request<AverageProgress[]>(`/shelves/${shelfId}/average-progress`),

  /**
   * 获取书架的讨论热词词云数据（动态按书架ID聚合）
   * GET /api/shelves/:shelfId/wordcloud → 被 WordCloud.tsx (loadWordCloud) 调用
   */
  getWordCloud: (shelfId: string): Promise<DiscussionKeyword[]> =>
    request<DiscussionKeyword[]>(`/shelves/${shelfId}/wordcloud`),

  /**
   * 获取讨论记录列表
   * GET /api/discussions → 被 WordCloud.tsx (handleWordClick) 调用
   * @param word 可选，指定关键词筛选
   */
  getDiscussions: (word?: string): Promise<Discussion[]> =>
    request<Discussion[]>(word ? `/discussions?word=${encodeURIComponent(word)}` : '/discussions'),

  /**
   * 获取某本书的完整阅读历史记录（含页数增量、完成百分比）
   * GET /api/books/:bookId/history → 被 BookShelf.tsx (handleViewHistory) 调用
   */
  getBookHistory: (bookId: string): Promise<BookHistory> =>
    request<BookHistory>(`/books/${bookId}/history`),
}
