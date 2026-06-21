import { useState, useEffect, useCallback } from 'react'

export interface ScentData {
  id: string
  name: string
  noteType: 'top' | 'middle' | 'base'
  ratio: number
}

export interface FormulaData {
  id: string
  name: string
  authorId: string
  authorName: string
  authorAvatar: string
  scents: ScentData[]
  createdAt: number
  likes: number
  likedBy: string[]
  comments: CommentData[]
}

export interface CommentData {
  id: string
  postId: string
  authorId: string
  authorName: string
  content: string
  createdAt: number
}

export interface PostData {
  id: string
  formulaId: string
  formula: FormulaData
  title: string
  description: string
  authorId: string
  authorName: string
  authorAvatar: string
  createdAt: number
  likes: number
  likedBy: string[]
  comments: CommentData[]
}

export function useCommunityPosts() {
  const [posts, setPosts] = useState<PostData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/posts')
      if (!res.ok) throw new Error('获取帖子失败')
      const data = await res.json()
      setPosts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const toggleLike = useCallback(async (postId: string, userId: string = 'guest') => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      })
      if (!res.ok) throw new Error('操作失败')
      const updated: PostData = await res.json()
      setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误')
    }
  }, [])

  const addComment = useCallback(
    async (
      postId: string,
      content: string,
      authorId: string = 'guest',
      authorName: string = '匿名用户'
    ) => {
      try {
        const res = await fetch(`/api/posts/${postId}/comments`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authorId, authorName, content }),
        })
        if (!res.ok) throw new Error('评论失败')
        const updated: PostData = await res.json()
        setPosts((prev) => prev.map((p) => (p.id === postId ? updated : p)))
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误')
      }
    },
    []
  )

  const createPost = useCallback(
    async (post: Omit<PostData, 'id' | 'createdAt' | 'likes' | 'likedBy' | 'comments'>) => {
      try {
        const res = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(post),
        })
        if (!res.ok) throw new Error('发帖失败')
        const newPost: PostData = await res.json()
        setPosts((prev) => [newPost, ...prev])
        return newPost
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误')
        return null
      }
    },
    []
  )

  return {
    posts,
    loading,
    error,
    fetchPosts,
    toggleLike,
    addComment,
    createPost,
  }
}
