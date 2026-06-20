import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchItemById, requestExchange, type Item } from '@/api'
import { ArrowLeft, Tag, User, CheckCircle2, Loader2 } from 'lucide-react'
import { CURRENT_USER_ID, CURRENT_USER_NAME } from '@/App'

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [loading, setLoading] = useState(true)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('我很喜欢这件物品，可以和我交换吗？')
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    fetchItemById(id).then(data => {
      setItem(data)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [id])

  const handleExchange = async () => {
    if (!item || sending) return
    setSending(true)
    try {
      await requestExchange(item.id, {
        requesterId: CURRENT_USER_ID,
        requesterName: CURRENT_USER_NAME,
        message
      })
      setSent(true)
      setTimeout(() => {
        setConfirmOpen(false)
        setSent(false)
      }, 1400)
    } catch (e) {
      alert('发送失败，请重试')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="detail-skeleton"
      >
        <Loader2 className="spinner" size={36} />
      </motion.div>
    )
  }

  if (!item) {
    return <div className="detail-skeleton">物品不存在或已下架</div>
  }

  return (
    <>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className="detail-page"
      >
        <div className="detail-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
          <span>返回</span>
        </div>

        <div className="detail-image-wrap">
          <img src={item.imageUrl} alt={item.title} />
        </div>

        <div className="detail-body">
          <div className="detail-header">
            <h1 className="detail-title">{item.title}</h1>
            <span className="condition-tag-lg">
              <Tag size={14} />
              {item.condition}
            </span>
          </div>

          <div className="detail-owner">
            <div className="owner-avatar-sm" style={{ background: `linear-gradient(135deg, #FFD5A8, #FF9F43)` }}>
              <User size={18} color="#fff" />
            </div>
            <div>
              <div className="owner-name">{item.ownerName}</div>
              <div className="owner-sub">物品发布者</div>
            </div>
          </div>

          <div className="detail-desc">
            <h3>物品描述</h3>
            <p>{item.description || '暂无描述'}</p>
          </div>

          <div className="detail-footer">
            <button
              className="exchange-btn"
              onClick={() => setConfirmOpen(true)}
              disabled={item.ownerId === CURRENT_USER_ID}
            >
              {item.ownerId === CURRENT_USER_ID ? '这是你发布的物品' : '申请交换'}
            </button>
          </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {confirmOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="modal-mask"
            onClick={() => !sending && !sent && setConfirmOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              transition={{ duration: 0.25, type: 'spring', bounce: 0.3 }}
              className="confirm-dialog"
              onClick={e => e.stopPropagation()}
            >
              {sent ? (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="confirm-success"
                >
                  <CheckCircle2 size={56} color="#22c55e" />
                  <h3>交换请求已发送！</h3>
                  <p>请等待 {item.ownerName} 回复</p>
                </motion.div>
              ) : (
                <>
                  <h3>确认申请交换？</h3>
                  <p className="confirm-desc">将向 <b>{item.ownerName}</b> 发送交换请求：</p>
                  <textarea
                    className="confirm-textarea"
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={3}
                    placeholder="可以说说你想用什么交换或者留言..."
                  />
                  <div className="confirm-actions">
                    <button className="btn-cancel" onClick={() => setConfirmOpen(false)} disabled={sending}>取消</button>
                    <button className="btn-confirm" onClick={handleExchange} disabled={sending}>
                      {sending && <Loader2 className="spinner" size={16} />}
                      确认发送
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
