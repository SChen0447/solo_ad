import axios from 'axios'

export interface Book {
  id: number
  title: string
  author: string
  isbn: string
  year: number
  description: string
  category: string
  subtag: string
  createdAt: string
}

export interface BorrowHistory {
  date: string
  type: string
  completed: boolean
}

export interface BookRecords {
  borrowCount: number
  history: BorrowHistory[]
}

export interface BookDetail {
  book: Book
  records: BookRecords
}

export interface Recommendation {
  book: Book
  matchScore: number
}

export interface CategoryStats {
  name: string
  color: string
  count: number
}

export interface DashboardData {
  todayNewBooks: number
  totalInventory: number
  totalBorrowCount: number
  trendDates: string[]
  trendValues: number[]
  categoryStats: CategoryStats[]
}

export interface CategoryConfig {
  color: string
  subtags: string[]
}

export interface CategoriesResponse {
  categories: Record<string, CategoryConfig>
}

const instance = axios.create({
  baseURL: '/api',
  timeout: 10000
})

instance.interceptors.response.use(
  (res) => res,
  (error) => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)

export const api = {
  getBooks: (params?: { category?: string; subtag?: string; search?: string }) => {
    return instance.get<{ books: Book[]; total: number }>('/books', { params })
  },

  getBook: (id: number) => {
    return instance.get<BookDetail>(`/books/${id}`)
  },

  createBook: (data: Partial<Book>) => {
    return instance.post<{ book: Book }>('/books', data)
  },

  updateBook: (id: number, data: Partial<Book>) => {
    return instance.put<{ book: Book }>(`/books/${id}`, data)
  },

  deleteBook: (id: number) => {
    return instance.delete<{ message: string }>(`/books/${id}`)
  },

  batchCreateBooks: (books: Partial<Book>[]) => {
    return instance.post<{ created: Book[]; count: number }>('/books/batch', { books })
  },

  getCategories: () => {
    return instance.get<CategoriesResponse>('/categories')
  },

  getRecommendations: (tags: string[]) => {
    return instance.post<{ recommendations: Recommendation[] }>('/recommend', { tags })
  },

  getDashboard: () => {
    return instance.get<DashboardData>('/dashboard')
  },

  addRecord: (bookId: number, type: string = '借阅', completed: boolean = true) => {
    return instance.post(`/books/${bookId}/record`, { type, completed })
  }
}

export const CATEGORY_COLORS: Record<string, string> = {
  '文学小说': '#E74C3C',
  '历史社科': '#F39C12',
  '科技理工': '#3498DB',
  '艺术设计': '#9B59B6',
  '生活育儿': '#2ECC71'
}

export const NAV_ITEMS = [
  { key: 'dashboard', label: '仪表盘', icon: '📊', color: '#3498DB' },
  { key: 'books', label: '全部图书', icon: '📚', color: '#3498DB' },
  { key: '文学小说', label: '文学小说', icon: '📖', color: '#E74C3C' },
  { key: '历史社科', label: '历史社科', icon: '🏛️', color: '#F39C12' },
  { key: '科技理工', label: '科技理工', icon: '🔬', color: '#3498DB' },
  { key: '艺术设计', label: '艺术设计', icon: '🎨', color: '#9B59B6' },
  { key: '生活育儿', label: '生活育儿', icon: '🌿', color: '#2ECC71' },
  { key: 'recommend', label: '智能推荐', icon: '✨', color: '#3498DB' }
]

export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || '#888888'
}

export function formatDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${d.getFullYear()}-${month}-${day}`
  } catch {
    return isoString
  }
}

export function formatShortDate(isoString: string): string {
  try {
    const d = new Date(isoString)
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${month}-${day}`
  } catch {
    return isoString
  }
}
