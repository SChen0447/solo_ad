export interface Post {
  id: string
  content: string
  author: string
  tags: string[]
  likes: number
  likedBy: string[]
  createdAt: number
  updatedAt: number
}

export interface Comment {
  id: string
  postId: string
  author: string
  content: string
  createdAt: number
}

export interface CreatePostData {
  content: string
  author: string
  tags: string[]
}

export interface UpdatePostData {
  content?: string
  tags?: string[]
}

export interface CreateCommentData {
  author: string
  content: string
}

const API_BASE = '/api'

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
    throw new Error(error.error || `请求失败: ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

export const api = {
  getPosts: (tag?: string, sort?: string): Promise<Post[]> => {
    const params = new URLSearchParams()
    if (tag) params.set('tag', tag)
    if (sort) params.set('sort', sort)
    const query = params.toString() ? `?${params.toString()}` : ''
    return request<Post[]>(`/posts${query}`)
  },

  createPost: (data: CreatePostData): Promise<Post> => {
    return request<Post>('/posts', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updatePost: (id: string, data: UpdatePostData): Promise<Post> => {
    return request<Post>(`/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  deletePost: (id: string): Promise<void> => {
    return request<void>(`/posts/${id}`, {
      method: 'DELETE',
    })
  },

  likePost: (id: string, userId: string): Promise<{ post: Post; liked: boolean }> => {
    return request<{ post: Post; liked: boolean }>(`/posts/${id}/like`, {
      method: 'POST',
      body: JSON.stringify({ userId }),
    })
  },

  getComments: (postId: string): Promise<Comment[]> => {
    return request<Comment[]>(`/posts/${postId}/comments`)
  },

  createComment: (postId: string, data: CreateCommentData): Promise<Comment> => {
    return request<Comment>(`/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },
}

export const TAGS = [
  { name: '日常', color: '#e2e8f0', textColor: '#4a5568' },
  { name: '技术', color: '#2c5282', textColor: '#ffffff' },
  { name: '读书', color: '#fefcbf', textColor: '#744210' },
  { name: '旅行', color: '#68d391', textColor: '#22543d' },
  { name: '美食', color: '#ed8936', textColor: '#ffffff' },
  { name: '音乐', color: '#805ad5', textColor: '#ffffff' },
  { name: '电影', color: '#d53f8c', textColor: '#ffffff' },
  { name: '游戏', color: '#276749', textColor: '#ffffff' },
  { name: '健身', color: '#4299e1', textColor: '#ffffff' },
  { name: '闲聊', color: '#fbb6ce', textColor: '#742a2a' },
]

export function getTagColor(tagName: string): { bg: string; text: string } {
  const tag = TAGS.find((t) => t.name === tagName)
  if (tag) {
    return { bg: tag.color, text: tag.textColor }
  }
  return { bg: '#e2e8f0', text: '#4a5568' }
}
