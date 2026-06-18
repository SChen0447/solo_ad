import { create } from 'zustand'
import { v4 as uuidv4 } from 'uuid'

export interface Card {
  id: string
  title: string
  description: string
  url: string
  screenshot: string
  tags: string[]
  note: string
  createdAt: number
}

interface CollectionState {
  cards: Card[]
  isLoading: boolean
  addCard: (card: Omit<Card>) => void
  removeCard: (id: string) => void
  updateCard: (id: string, updates: Partial<Card>) => void
  fetchUrl: (url: string) => Promise<void>
}

const generateScreenshot = (title: string, width: number = 300): string => {
  const canvas = document.createElement('canvas')
  const height = Math.round(width * 0.75)
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  const gradient = ctx.createLinearGradient(0, 0, width, height)
  const hue = (title.charCodeAt(0) * 37) % 360
  gradient.addColorStop(0, `hsl(${hue}, 60%, 95%)`)
  gradient.addColorStop(1, `hsl(${(hue + 40) % 360}, 55%, 85%)`)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, 28)

  for (let i = 0; i < 3; i++) {
    ctx.beginPath()
    ctx.arc(10 + i * 12, 14, 4, 0, Math.PI * 2)
    ctx.fillStyle = ['#FF5F57', '#FEBC2E', '#28C840'][i]
    ctx.fill()
  }

  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  ctx.fillRect(50, 8, width - 70, 12)

  ctx.fillStyle = 'rgba(255,255,255,0.85)'
  ctx.fillRect(12, 44, width - 24, 16)
  ctx.fillStyle = 'rgba(255,255,255,0.6)'
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(12, 72 + i * 14, width - 24 - (i % 2) * 30, 8)
  }

  ctx.fillStyle = `hsl(${hue}, 40%, 90%)`
  ctx.fillRect(12, 130, width - 24, 40)

  ctx.fillStyle = `hsl(${hue}, 45%, 70%)`
  ctx.font = 'bold 14px sans-serif'
  ctx.textAlign = 'center'
  const displayTitle = title.length > 20 ? title.slice(0, 20) + '...' : title
  ctx.fillText(displayTitle, width / 2, height / 2 + 4)

  return canvas.toDataURL('image/png')
}

const fetchFavicon = (url: string): string => {
  try {
    const domain = new URL(url).hostname
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`
  } catch {
    return ''
  }
}

const mockFetch = async (url: string): Promise<{ title: string; description: string; screenshot: string }> => {
  await new Promise((resolve) => setTimeout(resolve, 600))

  let hostname = '示例网站'
  try {
    hostname = new URL(url).hostname.replace('www.', '')
  } catch {}

  const title = `${hostname} - ${Math.random().toString(36).slice(2, 8)}`
  const description = `这是来自 ${hostname} 的网页剪报，包含了有用的信息和内容。URL: ${url}`
  const screenshot = generateScreenshot(title)

  return { title, description, screenshot }
}

export const useCollectionStore = create<CollectionState>((set) => ({
  cards: [
    {
      id: uuidv4(),
      title: '笔墨档案 - 项目介绍',
      description: '欢迎使用笔墨档案，这是一个帮助你整理网页剪报、笔记片段和书签链接的数字画布工具。',
      url: 'https://example.com/intro',
      screenshot: generateScreenshot('笔墨档案'),
      tags: ['欢迎', '介绍'],
      note: '',
      createdAt: Date.now(),
    },
    {
      id: uuidv4(),
      title: 'React 官方文档',
      description: 'React 是一个用于构建用户界面的 JavaScript 库',
      url: 'https://react.dev',
      screenshot: generateScreenshot('React Docs'),
      tags: ['前端', 'React'],
      note: '需要学习 hooks 的使用',
      createdAt: Date.now(),
    },
    {
      id: uuidv4(),
      title: 'TypeScript Handbook',
      description: 'TypeScript 是 JavaScript 的超集，添加了类型系统',
      url: 'https://www.typescriptlang.org',
      screenshot: generateScreenshot('TypeScript'),
      tags: ['前端', 'TypeScript'],
      note: '',
      createdAt: Date.now(),
    },
  ],
  isLoading: false,

  addCard: (card) =>
    set((state) => ({
      cards: [card, ...state.cards],
    })),

  removeCard: (id) =>
    set((state) => ({
      cards: state.cards.filter((c) => c.id !== id),
    })),

  updateCard: (id, updates) =>
    set((state) => ({
      cards: state.cards.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    })),

  fetchUrl: async (url) => {
    set({ isLoading: true })
    try {
      const { title, description, screenshot } = await mockFetch(url)
      const card: Card = {
        id: uuidv4(),
        title,
        description,
        url,
        screenshot,
        tags: [],
        note: '',
        createdAt: Date.now(),
      }
      set((state) => ({
        cards: [card, ...state.cards],
        isLoading: false,
      }))
    } catch (e) {
      console.error('Failed to fetch URL:', e)
      set({ isLoading: false })
    }
  },
}))

export { generateScreenshot, fetchFavicon }
