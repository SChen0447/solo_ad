import { v4 as uuidv4 } from 'uuid'

export type ItemCategory = 'electronics' | 'books' | 'home' | 'clothing' | 'other'

export interface User {
  id: string
  name: string
  avatar: string
  creditScore: number
  successfulExchanges: number
  badges: string[]
  consecutiveSuccess: number
}

export interface Item {
  id: string
  userId: string
  userName: string
  userAvatar: string
  userCreditScore: number
  title: string
  description: string
  category: ItemCategory
  condition: number
  expectedCategory: string
  expectedValueMin: number
  expectedValueMax: number
  imageUrl: string
  createdAt: number
}

export interface ExchangeRequest {
  id: string
  fromUserId: string
  toUserId: string
  fromItemId: string
  toItemId: string
  reason: string
  contactTime: string
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled'
  createdAt: number
}

const users = new Map<string, User>()
const items = new Map<string, Item>()
const exchangeRequests = new Map<string, ExchangeRequest>()

const mockUsers: User[] = [
  {
    id: 'user-001',
    name: '小明',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaoming',
    creditScore: 100,
    successfulExchanges: 0,
    badges: [],
    consecutiveSuccess: 0,
  },
  {
    id: 'user-002',
    name: '李华',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lihua',
    creditScore: 115,
    successfulExchanges: 3,
    badges: ['交换达人'],
    consecutiveSuccess: 3,
  },
  {
    id: 'user-003',
    name: '王芳',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang',
    creditScore: 105,
    successfulExchanges: 1,
    badges: [],
    consecutiveSuccess: 1,
  },
  {
    id: 'user-004',
    name: '张伟',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei',
    creditScore: 120,
    successfulExchanges: 5,
    badges: ['交换达人'],
    consecutiveSuccess: 2,
  },
  {
    id: 'user-005',
    name: '刘洋',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liuyang',
    creditScore: 55,
    successfulExchanges: 0,
    badges: [],
    consecutiveSuccess: 0,
  },
]

mockUsers.forEach((user) => users.set(user.id, user))

const mockItems: Omit<Item, 'id' | 'createdAt'>[] = [
  {
    userId: 'user-002',
    userName: '李华',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lihua',
    userCreditScore: 115,
    title: 'iPad Pro 2021 11寸 256G',
    description: '自用iPad Pro 2021款，保养良好，无磕碰，配件齐全。平时主要用来看剧和做笔记，现在换新款了所以出掉。',
    category: 'electronics',
    condition: 5,
    expectedCategory: 'electronics',
    expectedValueMin: 3000,
    expectedValueMax: 5000,
    imageUrl: 'https://picsum.photos/seed/ipad/400/400',
  },
  {
    userId: 'user-003',
    userName: '王芳',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang',
    userCreditScore: 105,
    title: '《百年孤独》精装典藏版',
    description: '马尔克斯经典著作，精装版，书脊有轻微磨损，内页干净无笔记。适合藏书爱好者收藏。',
    category: 'books',
    condition: 4,
    expectedCategory: 'books',
    expectedValueMin: 50,
    expectedValueMax: 150,
    imageUrl: 'https://picsum.photos/seed/book1/400/400',
  },
  {
    userId: 'user-004',
    userName: '张伟',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei',
    userCreditScore: 120,
    title: '小米空气净化器Pro H',
    description: '小米空气净化器Pro H，除醛除菌效果好，使用两年，滤网刚更换过。搬家带不走，希望交换其他家居用品。',
    category: 'home',
    condition: 4,
    expectedCategory: 'home',
    expectedValueMin: 1000,
    expectedValueMax: 2000,
    imageUrl: 'https://picsum.photos/seed/purifier/400/400',
  },
  {
    userId: 'user-002',
    userName: '李华',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lihua',
    userCreditScore: 115,
    title: '索尼 WH-1000XM4 降噪耳机',
    description: '索尼顶级降噪耳机，音质出色，续航强劲。用了一年，外观9成新，配件齐全。',
    category: 'electronics',
    condition: 4,
    expectedCategory: 'electronics',
    expectedValueMin: 800,
    expectedValueMax: 1500,
    imageUrl: 'https://picsum.photos/seed/headphone/400/400',
  },
  {
    userId: 'user-003',
    userName: '王芳',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang',
    userCreditScore: 105,
    title: 'Kindle Paperwhite 第10代',
    description: 'Kindle Paperwhite，墨水屏阅读体验好，防水设计。用了两年，屏幕完好，电池健康。',
    category: 'electronics',
    condition: 4,
    expectedCategory: 'books',
    expectedValueMin: 300,
    expectedValueMax: 600,
    imageUrl: 'https://picsum.photos/seed/kindle/400/400',
  },
  {
    userId: 'user-004',
    userName: '张伟',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei',
    userCreditScore: 120,
    title: '戴森吸尘器 V7',
    description: '戴森V7无线吸尘器，吸力强劲，配件齐全。电池续航正常，家用非常方便。',
    category: 'home',
    condition: 4,
    expectedCategory: 'home',
    expectedValueMin: 800,
    expectedValueMax: 1500,
    imageUrl: 'https://picsum.photos/seed/dyson/400/400',
  },
  {
    userId: 'user-002',
    userName: '李华',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lihua',
    userCreditScore: 115,
    title: '优衣库羽绒服 男款M码',
    description: '优衣库薄款羽绒服，黑色M码，穿了一冬天，保暖性好。正常穿着痕迹，无破损。',
    category: 'clothing',
    condition: 3,
    expectedCategory: 'clothing',
    expectedValueMin: 100,
    expectedValueMax: 300,
    imageUrl: 'https://picsum.photos/seed/jacket/400/400',
  },
  {
    userId: 'user-003',
    userName: '王芳',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang',
    userCreditScore: 105,
    title: '《三体》全集 全新未拆',
    description: '三体全集，刘慈欣科幻经典，全新未拆封。买来一直没看，希望交换其他科幻书籍。',
    category: 'books',
    condition: 5,
    expectedCategory: 'books',
    expectedValueMin: 80,
    expectedValueMax: 200,
    imageUrl: 'https://picsum.photos/seed/book2/400/400',
  },
  {
    userId: 'user-005',
    userName: '刘洋',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liuyang',
    userCreditScore: 55,
    title: '任天堂Switch Lite 蓝色',
    description: 'Switch Lite蓝色版，成色一般，摇杆有轻微漂移。功能正常，带充电器。',
    category: 'electronics',
    condition: 3,
    expectedCategory: 'electronics',
    expectedValueMin: 500,
    expectedValueMax: 1000,
    imageUrl: 'https://picsum.photos/seed/switch/400/400',
  },
  {
    userId: 'user-004',
    userName: '张伟',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei',
    userCreditScore: 120,
    title: '北欧风简约台灯',
    description: '北欧风格设计台灯，三档调光，USB充电。颜值高，适合书房或卧室使用。',
    category: 'home',
    condition: 5,
    expectedCategory: 'home',
    expectedValueMin: 100,
    expectedValueMax: 300,
    imageUrl: 'https://picsum.photos/seed/lamp/400/400',
  },
  {
    userId: 'user-002',
    userName: '李华',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lihua',
    userCreditScore: 115,
    title: 'Nike Air Max 运动鞋 42码',
    description: 'Nike Air Max经典款，42码，只穿了几次，鞋底几乎全新。颜色百搭，穿着舒适。',
    category: 'clothing',
    condition: 4,
    expectedCategory: 'other',
    expectedValueMin: 200,
    expectedValueMax: 500,
    imageUrl: 'https://picsum.photos/seed/shoes/400/400',
  },
  {
    userId: 'user-003',
    userName: '王芳',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangfang',
    userCreditScore: 105,
    title: '乐高创意系列 航天飞机',
    description: '乐高创意系列航天飞机，零件齐全，有说明书。拼过一次，现在想换其他乐高套装。',
    category: 'other',
    condition: 5,
    expectedCategory: 'other',
    expectedValueMin: 300,
    expectedValueMax: 600,
    imageUrl: 'https://picsum.photos/seed/lego/400/400',
  },
  {
    userId: 'user-004',
    userName: '张伟',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangwei',
    userCreditScore: 120,
    title: '机械键盘 青轴 87键',
    description: '87键机械键盘，青轴手感清脆，RGB背光。程序员必备，换了静电容键盘所以出掉。',
    category: 'electronics',
    condition: 4,
    expectedCategory: 'electronics',
    expectedValueMin: 200,
    expectedValueMax: 500,
    imageUrl: 'https://picsum.photos/seed/keyboard/400/400',
  },
  {
    userId: 'user-002',
    userName: '李华',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lihua',
    userCreditScore: 115,
    title: '《人类简史》+《未来简史》套装',
    description: '尤瓦尔·赫拉利两部曲，几乎全新，只看过一遍。对人类历史和未来感兴趣的不要错过。',
    category: 'books',
    condition: 5,
    expectedCategory: 'books',
    expectedValueMin: 100,
    expectedValueMax: 250,
    imageUrl: 'https://picsum.photos/seed/book3/400/400',
  },
  {
    userId: 'user-005',
    userName: '刘洋',
    userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liuyang',
    userCreditScore: 55,
    title: '小米手环7 NFC版',
    description: '小米手环7，NFC版，功能正常，表带略有磨损。续航两周左右，性价比高。',
    category: 'electronics',
    condition: 3,
    expectedCategory: 'electronics',
    expectedValueMin: 100,
    expectedValueMax: 250,
    imageUrl: 'https://picsum.photos/seed/band/400/400',
  },
]

mockItems.forEach((item) => {
  const newItem: Item = {
    ...item,
    id: uuidv4(),
    createdAt: Date.now() - Math.random() * 86400000 * 7,
  }
  items.set(newItem.id, newItem)
})

export function addItem(item: Omit<Item, 'id' | 'createdAt'>): Item {
  const newItem: Item = {
    ...item,
    id: uuidv4(),
    createdAt: Date.now(),
  }
  items.set(newItem.id, newItem)
  return newItem
}

export function getItems(params: {
  page?: number
  limit?: number
  search?: string
  category?: string
}): { items: Item[]; hasMore: boolean; total: number } {
  const { page = 1, limit = 12, search, category } = params

  let filteredItems = Array.from(items.values())

  if (category && category !== 'all') {
    filteredItems = filteredItems.filter((item) => item.category === category)
  }

  if (search) {
    const searchLower = search.toLowerCase()
    filteredItems = filteredItems.filter(
      (item) =>
        item.title.toLowerCase().includes(searchLower) ||
        item.description.toLowerCase().includes(searchLower)
    )
  }

  filteredItems.sort((a, b) => {
    const userA = users.get(a.userId)
    const userB = users.get(b.userId)

    let scoreA = b.createdAt - a.createdAt
    let scoreB = b.createdAt - a.createdAt

    if (userA && userA.creditScore < 60) {
      scoreA *= 0.5
    }
    if (userB && userB.creditScore < 60) {
      scoreB *= 0.5
    }

    return scoreB - scoreA
  })

  const start = (page - 1) * limit
  const end = start + limit
  const paginatedItems = filteredItems.slice(start, end)

  return {
    items: paginatedItems,
    hasMore: end < filteredItems.length,
    total: filteredItems.length,
  }
}

export function addExchangeRequest(request: Omit<ExchangeRequest, 'id' | 'status' | 'createdAt'>): ExchangeRequest {
  const newRequest: ExchangeRequest = {
    ...request,
    id: uuidv4(),
    status: 'pending',
    createdAt: Date.now(),
  }
  exchangeRequests.set(newRequest.id, newRequest)
  return newRequest
}

function calculateMatchScore(userItem: Item, targetItem: Item): number {
  const categoryMatch = userItem.expectedCategory === targetItem.category ? 1 : 0.5
  const targetCategoryMatch = targetItem.expectedCategory === userItem.category ? 1 : 0.5
  const categoryScore = (categoryMatch + targetCategoryMatch) / 2

  const valueOverlapMin = Math.max(userItem.expectedValueMin, targetItem.expectedValueMin)
  const valueOverlapMax = Math.min(userItem.expectedValueMax, targetItem.expectedValueMax)
  const valueOverlap = valueOverlapMax > valueOverlapMin ? valueOverlapMax - valueOverlapMin : 0
  const totalRange = userItem.expectedValueMax - userItem.expectedValueMin + targetItem.expectedValueMax - targetItem.expectedValueMin
  const valueScore = totalRange > 0 ? (valueOverlap * 2) / totalRange : 0

  return categoryScore * 0.7 + valueScore * 0.3
}

export function getRecommendations(userId: string): { items: Item[] } {
  const userItems = Array.from(items.values()).filter((item) => item.userId === userId)

  if (userItems.length === 0) {
    return { items: [] }
  }

  const allOtherItems = Array.from(items.values()).filter((item) => item.userId !== userId)

  const scoredItems = allOtherItems.map((targetItem) => {
    let maxScore = 0
    for (const userItem of userItems) {
      const score = calculateMatchScore(userItem, targetItem)
      if (score > maxScore) {
        maxScore = score
      }
    }

    const user = users.get(targetItem.userId)
    if (user && user.creditScore < 60) {
      maxScore *= 0.5
    }

    return { item: targetItem, score: maxScore }
  })

  scoredItems.sort((a, b) => b.score - a.score)

  return { items: scoredItems.map((si) => si.item) }
}

export function getUser(userId: string): User | undefined {
  return users.get(userId)
}

export function updateUserCredit(userId: string, delta: number): User | null {
  const user = users.get(userId)
  if (!user) return null

  user.creditScore = Math.max(0, user.creditScore + delta)

  if (delta > 0) {
    user.consecutiveSuccess += 1
    user.successfulExchanges += 1

    if (user.consecutiveSuccess === 3 && !user.badges.includes('交换达人')) {
      user.creditScore += 20
      user.badges.push('交换达人')
    }
  } else {
    user.consecutiveSuccess = 0
  }

  return user
}
