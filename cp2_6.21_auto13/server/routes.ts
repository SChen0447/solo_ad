import { Request, Response } from 'express'

interface Plant {
  id: string
  name: string
  species: string
  location: string
  lightNeeds: string
  imageUrl: string
  lastWatered: string
  createdAt: string
  careHistory: CareRecord[]
}

interface CareRecord {
  id: string
  type: 'water' | 'fertilize' | 'repot'
  date: string
  note?: string
}

interface Post {
  id: string
  author: string
  avatar: string
  time: string
  content: string
  likes: number
  liked: boolean
  comments: Comment[]
  saved: boolean
}

interface Comment {
  id: string
  author: string
  avatar: string
  content: string
  time: string
}

interface User {
  id: string
  name: string
  email: string
  avatar: string
  level: number
  stats: {
    totalPlants: number
    healthIndex: number
    careDays: number
  }
}

const plants = new Map<string, Plant>()
const posts = new Map<string, Post>()
const savedPostIds = new Set<string>()

const user: User = {
  id: 'user-1',
  name: '植物爱好者',
  email: 'plant@example.com',
  avatar: 'https://i.pravatar.cc/150?img=32',
  level: 3,
  stats: {
    totalPlants: 5,
    healthIndex: 85,
    careDays: 120
  }
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

function formatDate(daysAgo: number): string {
  const date = new Date()
  date.setDate(date.getDate() - daysAgo)
  return date.toISOString()
}

const initialPlants: Plant[] = [
  {
    id: generateId(),
    name: '绿萝',
    species: '天南星科',
    location: '客厅',
    lightNeeds: '散射光',
    imageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=300&fit=crop',
    lastWatered: formatDate(1),
    createdAt: formatDate(30),
    careHistory: [
      { id: generateId(), type: 'water', date: formatDate(1), note: '正常浇水' },
      { id: generateId(), type: 'fertilize', date: formatDate(7), note: '液态肥' },
      { id: generateId(), type: 'water', date: formatDate(4), note: '正常浇水' }
    ]
  },
  {
    id: generateId(),
    name: '多肉植物',
    species: '景天科',
    location: '阳台',
    lightNeeds: '全日照',
    imageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=300&fit=crop',
    lastWatered: formatDate(5),
    createdAt: formatDate(60),
    careHistory: [
      { id: generateId(), type: 'water', date: formatDate(5), note: '少量浇水' },
      { id: generateId(), type: 'repot', date: formatDate(20), note: '换盆' }
    ]
  },
  {
    id: generateId(),
    name: '龟背竹',
    species: '天南星科',
    location: '书房',
    lightNeeds: '散射光',
    imageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=300&fit=crop',
    lastWatered: formatDate(2),
    createdAt: formatDate(45),
    careHistory: [
      { id: generateId(), type: 'water', date: formatDate(2), note: '浇透' },
      { id: generateId(), type: 'fertilize', date: formatDate(10), note: '缓释肥' }
    ]
  },
  {
    id: generateId(),
    name: '虎皮兰',
    species: '百合科',
    location: '卧室',
    lightNeeds: '耐阴',
    imageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=300&fit=crop',
    lastWatered: formatDate(10),
    createdAt: formatDate(90),
    careHistory: [
      { id: generateId(), type: 'water', date: formatDate(10), note: '少量浇水' }
    ]
  },
  {
    id: generateId(),
    name: '发财树',
    species: '木棉科',
    location: '客厅',
    lightNeeds: '散射光',
    imageUrl: 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=300&fit=crop',
    lastWatered: formatDate(7),
    createdAt: formatDate(100),
    careHistory: [
      { id: generateId(), type: 'water', date: formatDate(7), note: '正常浇水' },
      { id: generateId(), type: 'fertilize', date: formatDate(15), note: '复合肥' }
    ]
  }
]

initialPlants.forEach(plant => plants.set(plant.id, plant))

const initialPosts: Post[] = [
  {
    id: generateId(),
    author: '园艺达人',
    avatar: 'https://i.pravatar.cc/150?img=12',
    time: formatDate(0),
    content: '今天给我的绿萝换了个新盆，长势越来越好了！分享一下养护心得：绿萝喜欢散射光，浇水要见干见湿，不能积水。每周施一次稀薄的液肥，叶子会更翠绿有光泽。',
    likes: 42,
    liked: false,
    comments: [
      { id: generateId(), author: '小花农', avatar: 'https://i.pravatar.cc/150?img=5', content: '学到了！我家绿萝总是黄叶子', time: formatDate(0) }
    ],
    saved: false
  },
  {
    id: generateId(),
    author: '多肉控',
    avatar: 'https://i.pravatar.cc/150?img=23',
    time: formatDate(1),
    content: '多肉植物度夏攻略来啦！1. 遮阴：避免正午直射阳光；2. 通风：保持空气流通很重要；3. 控水：夏天要少浇水，一个月浇一次都可以；4. 防虫：定期检查有没有蚧壳虫。',
    likes: 128,
    liked: true,
    comments: [
      { id: generateId(), author: '新手小白', avatar: 'https://i.pravatar.cc/150?img=45', content: '太实用了，收藏！', time: formatDate(1) },
      { id: generateId(), author: '植物医生', avatar: 'https://i.pravatar.cc/150?img=67', content: '补充一下，土壤也要透气哦', time: formatDate(0) }
    ],
    saved: true
  },
  {
    id: generateId(),
    author: '绿植美学',
    avatar: 'https://i.pravatar.cc/150?img=8',
    time: formatDate(3),
    content: '家里的植物角终于布置完成啦！用了龟背竹、散尾葵、橡皮树三种大型绿植，配上藤编花盆，整个空间都活起来了。',
    likes: 89,
    liked: false,
    comments: [],
    saved: false
  }
]

initialPosts.forEach(post => posts.set(post.id, post))
initialPosts.filter(p => p.saved).forEach(p => savedPostIds.add(p.id))

export function getPlants(_req: Request, res: Response) {
  const plantList = Array.from(plants.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )
  res.json(plantList)
}

export function addPlant(req: Request, res: Response) {
  const { name, species, location, lightNeeds, imageUrl } = req.body

  if (!name || !species || !location || !lightNeeds) {
    return res.status(400).json({ error: '缺少必要字段' })
  }

  const now = new Date().toISOString()
  const newPlant: Plant = {
    id: generateId(),
    name,
    species,
    location,
    lightNeeds,
    imageUrl: imageUrl || 'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=300&fit=crop',
    lastWatered: now,
    createdAt: now,
    careHistory: []
  }

  plants.set(newPlant.id, newPlant)
  res.status(201).json(newPlant)
}

export function getPlantById(req: Request, res: Response) {
  const { id } = req.params
  const plant = plants.get(id)

  if (!plant) {
    return res.status(404).json({ error: '植物不存在' })
  }

  res.json(plant)
}

export function waterPlant(req: Request, res: Response) {
  const { id } = req.params
  const plant = plants.get(id)

  if (!plant) {
    return res.status(404).json({ error: '植物不存在' })
  }

  const now = new Date().toISOString()
  plant.lastWatered = now
  plant.careHistory.unshift({
    id: generateId(),
    type: 'water',
    date: now,
    note: '浇水'
  })

  res.json(plant)
}

export function fertilizePlant(req: Request, res: Response) {
  const { id } = req.params
  const plant = plants.get(id)

  if (!plant) {
    return res.status(404).json({ error: '植物不存在' })
  }

  const now = new Date().toISOString()
  plant.careHistory.unshift({
    id: generateId(),
    type: 'fertilize',
    date: now,
    note: '施肥'
  })

  res.json(plant)
}

export function repotPlant(req: Request, res: Response) {
  const { id } = req.params
  const plant = plants.get(id)

  if (!plant) {
    return res.status(404).json({ error: '植物不存在' })
  }

  const now = new Date().toISOString()
  plant.careHistory.unshift({
    id: generateId(),
    type: 'repot',
    date: now,
    note: '换盆'
  })

  res.json(plant)
}

export function getPosts(_req: Request, res: Response) {
  const postList = Array.from(posts.values()).sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  )
  res.json(postList)
}

export function addPost(req: Request, res: Response) {
  const { content } = req.body

  if (!content) {
    return res.status(400).json({ error: '内容不能为空' })
  }

  const newPost: Post = {
    id: generateId(),
    author: user.name,
    avatar: user.avatar,
    time: new Date().toISOString(),
    content,
    likes: 0,
    liked: false,
    comments: [],
    saved: false
  }

  posts.set(newPost.id, newPost)
  res.status(201).json(newPost)
}

export function addComment(req: Request, res: Response) {
  const { id } = req.params
  const { content } = req.body
  const post = posts.get(id)

  if (!post) {
    return res.status(404).json({ error: '帖子不存在' })
  }

  if (!content) {
    return res.status(400).json({ error: '评论内容不能为空' })
  }

  const newComment: Comment = {
    id: generateId(),
    author: user.name,
    avatar: user.avatar,
    content,
    time: new Date().toISOString()
  }

  post.comments.unshift(newComment)
  res.status(201).json(newComment)
}

export function likePost(req: Request, res: Response) {
  const { id } = req.params
  const post = posts.get(id)

  if (!post) {
    return res.status(404).json({ error: '帖子不存在' })
  }

  if (post.liked) {
    post.likes--
    post.liked = false
  } else {
    post.likes++
    post.liked = true
  }

  res.json(post)
}

export function savePost(req: Request, res: Response) {
  const { id } = req.params
  const post = posts.get(id)

  if (!post) {
    return res.status(404).json({ error: '帖子不存在' })
  }

  post.saved = !post.saved

  if (post.saved) {
    savedPostIds.add(id)
  } else {
    savedPostIds.delete(id)
  }

  res.json(post)
}

export function getProfile(_req: Request, res: Response) {
  user.stats.totalPlants = plants.size
  res.json(user)
}

export function getSavedPosts(_req: Request, res: Response) {
  const savedPosts = Array.from(posts.values())
    .filter(post => post.saved)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
  res.json(savedPosts)
}
