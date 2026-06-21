import { useState, useEffect, useCallback, useRef } from 'react'
import { api, Post, TAGS } from './api'
import PostCard from './components/PostCard'
import PostForm from './components/PostForm'
import FilterSortBar from './components/FilterSortBar'

type SortType = 'newest' | 'oldest' | 'likes'

interface ToastState {
  message: string
  type: 'success' | 'error'
  show: boolean
}

function getUserId(): string {
  let userId = localStorage.getItem('drift_bottle_user_id')
  if (!userId) {
    userId = 'user_' + Math.random().toString(36).substr(2, 9)
    localStorage.setItem('drift_bottle_user_id', userId)
  }
  return userId
}

function getUserName(): string {
  let userName = localStorage.getItem('drift_bottle_user_name')
  if (!userName) {
    userName = '漂流者' + Math.floor(Math.random() * 10000)
    localStorage.setItem('drift_bottle_user_name', userName)
  }
  return userName
}

function App() {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTag, setFilterTag] = useState<string>('all')
  const [sort, setSort] = useState<SortType>('newest')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState<ToastState>({ message: '', type: 'success', show: false })
  const [newPostId, setNewPostId] = useState<string | null>(null)

  const userIdRef = useRef(getUserId())
  const userNameRef = useRef(getUserName())

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type, show: true })
    setTimeout(() => {
      setToast((prev) => ({ ...prev, show: false }))
    }, 2000)
  }, [])

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true)
      const data = await api.getPosts(filterTag === 'all' ? undefined : filterTag, sort)
      setPosts(data)
    } catch (err) {
      showToast(err instanceof Error ? err.message : '加载失败', 'error')
    } finally {
      setLoading(false)
    }
  }, [filterTag, sort, showToast])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleCreatePost = async (content: string, tags: string[]) => {
    try {
      const newPost = await api.createPost({
        content,
        author: userNameRef.current,
        tags,
      })
      setPosts((prev) => {
        if (filterTag === 'all' || tags.includes(filterTag)) {
          if (sort === 'newest') {
            return [newPost, ...prev]
          }
          return [newPost, ...prev].sort((a, b) => {
            if (sort === 'oldest') return a.createdAt - b.createdAt
            if (sort === 'likes') return b.likes - a.likes
            return b.createdAt - a.createdAt
          })
        }
        return prev
      })
      setNewPostId(newPost.id)
      setTimeout(() => setNewPostId(null), 500)
      setShowForm(false)
      showToast('发布成功！', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '发布失败', 'error')
    }
  }

  const handleUpdatePost = async (id: string, content: string, tags: string[]) => {
    try {
      const updatedPost = await api.updatePost(id, { content, tags })
      setPosts((prev) =>
        prev.map((post) => (post.id === id ? updatedPost : post)).sort((a, b) => {
          if (sort === 'newest') return b.createdAt - a.createdAt
          if (sort === 'oldest') return a.createdAt - b.createdAt
          if (sort === 'likes') return b.likes - a.likes
          return 0
        })
      )
      showToast('修改成功！', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '修改失败', 'error')
    }
  }

  const handleDeletePost = async (id: string) => {
    try {
      await api.deletePost(id)
      setPosts((prev) => prev.filter((post) => post.id !== id))
      showToast('删除成功！', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : '删除失败', 'error')
    }
  }

  const handleLikePost = async (id: string) => {
    try {
      const result = await api.likePost(id, userIdRef.current)
      setPosts((prev) =>
        prev.map((post) => (post.id === id ? result.post : post)).sort((a, b) => {
          if (sort === 'newest') return b.createdAt - a.createdAt
          if (sort === 'oldest') return a.createdAt - b.createdAt
          if (sort === 'likes') return b.likes - a.likes
          return 0
        })
      )
    } catch (err) {
      showToast(err instanceof Error ? err.message : '操作失败', 'error')
    }
  }

  const handleCommentAdded = () => {
    fetchPosts()
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-title" onClick={() => setFilterTag('all')}>
          🍾 漂流瓶
        </div>
        <div className="header-center">
          <button
            className={`tag-filter-btn ${filterTag === 'all' ? 'active' : ''}`}
            onClick={() => setFilterTag('all')}
          >
            全部
          </button>
          {TAGS.map((tag) => (
            <button
              key={tag.name}
              className={`tag-filter-btn ${filterTag === tag.name ? 'active' : ''}`}
              onClick={() => setFilterTag(tag.name)}
            >
              #{tag.name}
            </button>
          ))}
        </div>
        <button className="publish-btn" onClick={() => setShowForm(true)}>
          发布
        </button>
      </header>

      <main className="main-content">
        <FilterSortBar sort={sort} onSortChange={setSort} />

        {loading ? (
          <div className="loading">加载中...</div>
        ) : posts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">🍾</div>
            <div className="empty-state-text">
              {filterTag === 'all' ? '还没有漂流瓶，来发布第一个吧！' : `没有#${filterTag}相关的帖子`}
            </div>
          </div>
        ) : (
          <div className="posts-container" key={`${filterTag}-${sort}`}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                isNew={post.id === newPostId}
                currentUserName={userNameRef.current}
                isLiked={post.likedBy.includes(userIdRef.current)}
                onLike={() => handleLikePost(post.id)}
                onUpdate={handleUpdatePost}
                onDelete={handleDeletePost}
                onCommentAdded={handleCommentAdded}
              />
            ))}
          </div>
        )}
      </main>

      {showForm && (
        <PostForm
          onClose={() => setShowForm(false)}
          onSubmit={handleCreatePost}
          userName={userNameRef.current}
        />
      )}

      <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`}>
        {toast.message}
      </div>
    </div>
  )
}

export default App
