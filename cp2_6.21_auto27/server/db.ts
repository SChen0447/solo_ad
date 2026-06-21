export interface Scent {
  id: string
  name: string
  noteType: 'top' | 'middle' | 'base'
  ratio: number
}

export interface Formula {
  id: string
  name: string
  authorId: string
  authorName: string
  authorAvatar: string
  scents: Scent[]
  createdAt: number
  likes: number
  likedBy: string[]
  comments: Comment[]
}

export interface Comment {
  id: string
  postId: string
  authorId: string
  authorName: string
  content: string
  createdAt: number
}

export interface Post {
  id: string
  formulaId: string
  formula: Formula
  title: string
  description: string
  authorId: string
  authorName: string
  authorAvatar: string
  createdAt: number
  likes: number
  likedBy: string[]
  comments: Comment[]
}

const formulasMap = new Map<string, Formula>()
const postsMap = new Map<string, Post>()

const seedScents: Scent[] = [
  { id: 's1', name: '佛手柑', noteType: 'top', ratio: 3 },
  { id: 's2', name: '柠檬', noteType: 'top', ratio: 2 },
  { id: 's3', name: '薰衣草', noteType: 'middle', ratio: 4 },
  { id: 's4', name: '玫瑰', noteType: 'middle', ratio: 3 },
  { id: 's5', name: '檀香', noteType: 'base', ratio: 5 },
  { id: 's6', name: '雪松', noteType: 'base', ratio: 3 },
]

const seedScents2: Scent[] = [
  { id: 's7', name: '柑橘', noteType: 'top', ratio: 4 },
  { id: 's8', name: '薄荷', noteType: 'top', ratio: 2 },
  { id: 's9', name: '茉莉', noteType: 'middle', ratio: 5 },
  { id: 's10', name: '依兰', noteType: 'middle', ratio: 3 },
  { id: 's11', name: '麝香', noteType: 'base', ratio: 4 },
  { id: 's12', name: '广藿香', noteType: 'base', ratio: 3 },
]

const seedFormula1: Formula = {
  id: 'f1',
  name: '晨曦花园',
  authorId: 'u1',
  authorName: '香氛达人',
  authorAvatar: '🌸',
  scents: seedScents,
  createdAt: Date.now() - 86400000 * 3,
  likes: 42,
  likedBy: [],
  comments: [],
}

const seedFormula2: Formula = {
  id: 'f2',
  name: '夏夜微风',
  authorId: 'u2',
  authorName: '调香师小明',
  authorAvatar: '🌙',
  scents: seedScents2,
  createdAt: Date.now() - 86400000 * 1,
  likes: 28,
  likedBy: [],
  comments: [],
}

const seedPost1: Post = {
  id: 'p1',
  formulaId: 'f1',
  formula: seedFormula1,
  title: '夏日清晨的一抹清新',
  description: '这款香水融合了柑橘的活泼与花香的温柔，后调的木质气息让整体更加沉稳。适合白天使用，给人清新自然的感觉。',
  authorId: 'u1',
  authorName: '香氛达人',
  authorAvatar: '🌸',
  createdAt: Date.now() - 86400000 * 2,
  likes: 42,
  likedBy: [],
  comments: [
    {
      id: 'c1',
      postId: 'p1',
      authorId: 'u3',
      authorName: '香水爱好者',
      content: '这个配方太棒了！前调非常清新',
      createdAt: Date.now() - 3600000,
    },
  ],
}

const seedPost2: Post = {
  id: 'p2',
  formulaId: 'f2',
  formula: seedFormula2,
  title: '神秘东方调的探索',
  description: '茉莉和依兰的组合带来浓郁的花香，后调的麝香和广藿香增添了神秘感。适合晚间约会或特殊场合。',
  authorId: 'u2',
  authorName: '调香师小明',
  authorAvatar: '🌙',
  createdAt: Date.now() - 86400000 * 1,
  likes: 28,
  likedBy: [],
  comments: [],
}

formulasMap.set('f1', seedFormula1)
formulasMap.set('f2', seedFormula2)
postsMap.set('p1', seedPost1)
postsMap.set('p2', seedPost2)

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

export const db = {
  getAllFormulas(): Formula[] {
    return Array.from(formulasMap.values())
  },

  getFormulaById(id: string): Formula | undefined {
    return formulasMap.get(id)
  },

  createFormula(data: Omit<Formula, 'id' | 'createdAt' | 'likes' | 'likedBy' | 'comments'>): Formula {
    const id = generateId()
    const formula: Formula = {
      ...data,
      id,
      createdAt: Date.now(),
      likes: 0,
      likedBy: [],
      comments: [],
    }
    formulasMap.set(id, formula)
    return formula
  },

  updateFormula(id: string, data: Partial<Formula>): Formula | undefined {
    const formula = formulasMap.get(id)
    if (!formula) return undefined
    const updated = { ...formula, ...data }
    formulasMap.set(id, updated)
    return updated
  },

  deleteFormula(id: string): boolean {
    return formulasMap.delete(id)
  },

  getAllPosts(): Post[] {
    return Array.from(postsMap.values()).sort((a, b) => b.createdAt - a.createdAt)
  },

  getPostById(id: string): Post | undefined {
    return postsMap.get(id)
  },

  createPost(data: Omit<Post, 'id' | 'createdAt' | 'likes' | 'likedBy' | 'comments'>): Post {
    const id = generateId()
    const post: Post = {
      ...data,
      id,
      createdAt: Date.now(),
      likes: 0,
      likedBy: [],
      comments: [],
    }
    postsMap.set(id, post)
    return post
  },

  toggleLikePost(id: string, userId: string): Post | undefined {
    const post = postsMap.get(id)
    if (!post) return undefined
    const idx = post.likedBy.indexOf(userId)
    if (idx >= 0) {
      post.likedBy.splice(idx, 1)
      post.likes--
    } else {
      post.likedBy.push(userId)
      post.likes++
    }
    postsMap.set(id, post)
    return post
  },

  addComment(postId: string, data: Omit<Comment, 'id' | 'postId' | 'createdAt'>): Post | undefined {
    const post = postsMap.get(postId)
    if (!post) return undefined
    const comment: Comment = {
      ...data,
      id: generateId(),
      postId,
      createdAt: Date.now(),
    }
    post.comments.push(comment)
    postsMap.set(postId, post)
    return post
  },

  deletePost(id: string): boolean {
    return postsMap.delete(id)
  },
}
