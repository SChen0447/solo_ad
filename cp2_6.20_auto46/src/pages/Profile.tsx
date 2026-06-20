import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchItems, fetchQuestions, fetchUser, deleteItem, deleteQuestion, type Item, type Question, type User } from '@/api'
import ItemCard from '@/components/ItemCard'
import { User as UserIcon, Loader2, Package, MessageCircle } from 'lucide-react'

type Tab = 'items' | 'qa'

export default function Profile() {
  const { userId } = useParams()
  const [tab, setTab] = useState<Tab>('items')
  const [user, setUser] = useState<User | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [deleting, setDeleting] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    if (!userId) return
    setLoading(true)
    try {
      const [u, iRes, qs] = await Promise.all([
        fetchUser(userId),
        fetchItems(1, 100, userId),
        fetchQuestions(undefined, userId)
      ])
      setUser(u)
      setItems(iRes.items)
      setQuestions(qs)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [userId])

  const handleDeleteItem = async (item: Item) => {
    setDeleting(item.id)
    setTimeout(async () => {
      await deleteItem(item.id)
      setItems(prev => prev.filter(i => i.id !== item.id))
      setDeleting(null)
    }, 300)
  }

  const handleDeleteQuestion = async (q: Question) => {
    setDeleting(q.id)
    setTimeout(async () => {
      await deleteQuestion(q.id)
      setQuestions(prev => prev.filter(x => x.id !== q.id))
      setDeleting(null)
    }, 300)
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="page-wrap"
    >
      <div className="profile-header">
        {loading ? (
          <Loader2 className="spinner" size={28} />
        ) : (
          <>
            <div className="profile-avatar">
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} />
              ) : (
                <UserIcon size={40} color="#fff" />
              )}
            </div>
            <h2 className="profile-name">{user?.name || '邻居朋友'}</h2>
            <p className="profile-bio">ID: {userId}</p>
          </>
        )}
      </div>

      <div className="profile-tabs">
        <button
          className={`profile-tab ${tab === 'items' ? 'active' : ''}`}
          onClick={() => setTab('items')}
        >
          <Package size={16} />
          我的物品
          <span className="tab-count">{items.length}</span>
        </button>
        <button
          className={`profile-tab ${tab === 'qa' ? 'active' : ''}`}
          onClick={() => setTab('qa')}
        >
          <MessageCircle size={16} />
          我的问答
          <span className="tab-count">{questions.length}</span>
        </button>
        <span className="tab-indicator" style={{ transform: tab === 'items' ? 'translateX(0)' : 'translateX(100%)' }} />
      </div>

      <div className="profile-content">
        <AnimatePresence mode="wait">
          {tab === 'items' ? (
            <motion.div
              key="items"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="waterfall"
            >
              {items.length === 0 ? (
                <div className="empty-full">你还没有发布闲置物品~</div>
              ) : (
                items.map(item => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    showActions
                    deleting={deleting === item.id}
                    onEdit={() => alert('编辑功能演示')}
                    onDelete={handleDeleteItem}
                  />
                ))
              )}
            </motion.div>
          ) : (
            <motion.div
              key="qa"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="questions-list"
            >
              {questions.length === 0 ? (
                <div className="empty-full">你还没有提出过问题~</div>
              ) : (
                questions.map(q => (
                  <motion.div
                    key={q.id}
                    layout
                    initial={{ opacity: 1, scale: 1 }}
                    animate={{
                      opacity: deleting === q.id ? 0 : 1,
                      scale: deleting === q.id ? 0.3 : 1,
                      rotate: deleting === q.id ? 90 : 0
                    }}
                    transition={{ duration: 0.3 }}
                    className="question-card"
                  >
                    <div className="question-blue-bar" />
                    <div className="question-body">
                      <div className="q-head">
                        <h3 className="q-title">{q.title}</h3>
                        <div className="card-actions">
                          <button className="btn-edit" onClick={() => alert('编辑功能演示')}>编辑</button>
                          <button className="btn-delete" onClick={() => handleDeleteQuestion(q)}>删除</button>
                        </div>
                      </div>
                      <p className="q-content">{q.content}</p>
                      <div className="q-meta">
                        <span>{q.answers.length} 回答</span>
                        <span>{new Date(q.createdAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
