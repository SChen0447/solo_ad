import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchQuestions, postAnswer, likeAnswer, postReply, type Question, type Answer } from '@/api'
import { MessageCirclePlus, ChevronDown, ChevronUp, Heart, MessageSquare, Send, User, Clock, Tag, Loader2 } from 'lucide-react'
import { CURRENT_USER_ID, CURRENT_USER_NAME } from '@/App'

function TagPill({ tag, active, onClick }: { tag: string; active?: boolean; onClick?: () => void }) {
  return (
    <button
      className={`tag-pill ${active ? 'active' : ''}`}
      onClick={onClick}
    >
      <Tag size={11} />
      {tag}
    </button>
  )
}

function AnswerItem({ answer, questionId, onUpdate }: { answer: Answer; questionId: string; onUpdate: () => void }) {
  const [liked, setLiked] = useState(answer.likedBy.includes(CURRENT_USER_ID))
  const [likes, setLikes] = useState(answer.likes)
  const [likeAnim, setLikeAnim] = useState(false)
  const [showReplies, setShowReplies] = useState(answer.replies.length > 0)
  const [replying, setReplying] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [sending, setSending] = useState(false)

  const handleLike = async () => {
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 300)
    try {
      const res = await likeAnswer(answer.id, CURRENT_USER_ID)
      setLiked(res.liked)
      setLikes(res.likes)
    } catch (e) {
      console.error(e)
    }
  }

  const handleReply = async () => {
    if (!replyText.trim() || sending) return
    setSending(true)
    try {
      await postReply(answer.id, {
        content: replyText.trim(),
        authorId: CURRENT_USER_ID,
        authorName: CURRENT_USER_NAME
      })
      setReplyText('')
      setReplying(false)
      onUpdate()
    } finally {
      setSending(false)
    }
  }

  return (
    <motion.div
      layout
      className="answer-item"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="answer-head">
        <div className="owner-avatar-sm" style={{ background: 'linear-gradient(135deg, #A8D0F5, #4A90D9)' }}>
          <User size={16} color="#fff" />
        </div>
        <div className="answer-meta">
          <span className="answer-author">{answer.authorName}</span>
          <span className="answer-time"><Clock size={11} />{new Date(answer.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
      <div className="answer-content">{answer.content}</div>
      <div className="answer-actions">
        <button className={`like-btn ${liked ? 'liked' : ''}`} onClick={handleLike}>
          <motion.span
            className="like-icon"
            animate={likeAnim ? { scale: [1, 0.4, 1.4, 1] } : {}}
            transition={{ duration: 0.3 }}
          >
            <Heart size={16} fill={liked ? '#FF6B35' : 'none'} color={liked ? '#FF6B35' : 'currentColor'} />
          </motion.span>
          <span>{likes > 0 ? likes : '点赞'}</span>
        </button>
        <button className="reply-toggle" onClick={() => setReplying(v => !v)}>
          <MessageSquare size={16} />
          <span>回复</span>
        </button>
        {answer.replies.length > 0 && (
          <button className="collapse-btn" onClick={() => setShowReplies(v => !v)}>
            {showReplies ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{answer.replies.length}条回复</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {showReplies && answer.replies.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="replies-wrap"
          >
            {answer.replies.map(reply => (
              <div key={reply.id} className="reply-item">
                <div className="reply-author">{reply.authorName}：</div>
                <div className="reply-content">{reply.content}</div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {replying && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="reply-input-wrap"
          >
            <input
              type="text"
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={`回复 ${answer.authorName}...`}
              onKeyDown={e => e.key === 'Enter' && handleReply()}
            />
            <button onClick={handleReply} disabled={sending || !replyText.trim()}>
              {sending ? <Loader2 className="spinner" size={16} /> : <Send size={16} />}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

function QuestionCard({ question, onUpdate, onDelete, showActions }: { question: Question; onUpdate: () => void; onDelete?: () => void; showActions?: boolean; deleting?: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const [answerText, setAnswerText] = useState('')
  const [answering, setAnswering] = useState(false)
  const navigate = useNavigate()

  const handleAnswer = async () => {
    if (!answerText.trim() || answering) return
    setAnswering(true)
    try {
      await postAnswer(question.id, {
        content: answerText.trim(),
        authorId: CURRENT_USER_ID,
        authorName: CURRENT_USER_NAME
      })
      setAnswerText('')
      setExpanded(true)
      onUpdate()
    } finally {
      setAnswering(false)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="question-card"
    >
      <div className="question-blue-bar" />
      <div className="question-body">
        <div className="q-head">
          <h3 className="q-title">{question.title}</h3>
          {showActions && (
            <div className="card-actions">
              <button className="btn-edit" onClick={() => alert('编辑功能演示')}>编辑</button>
              <button className="btn-delete" onClick={onDelete}>删除</button>
            </div>
          )}
        </div>
        <div className="q-tags">
          {question.tags.map(t => <TagPill key={t} tag={t} />)}
        </div>
        <p className="q-content">{question.content}</p>
        <div className="q-meta">
          <div className="owner-avatar-sm" style={{ background: 'linear-gradient(135deg, #A8D0F5, #4A90D9)' }}>
            <User size={14} color="#fff" />
          </div>
          <span className="q-author">{question.authorName}</span>
          <span className="q-time"><Clock size={11} />{new Date(question.createdAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          <span className="q-answer-count"><MessageSquare size={12} />{question.answers.length} 回答</span>
        </div>

        <div className="q-actions-row">
          <button className="expand-btn" onClick={() => setExpanded(v => !v)}>
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{expanded ? '收起回答' : `查看 ${question.answers.length} 个回答`}</span>
          </button>
        </div>

        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="answers-container"
            >
              {question.answers.length === 0 ? (
                <div className="empty-answers">暂无回答，来做第一个热心邻居吧~</div>
              ) : (
                question.answers.map(a => (
                  <AnswerItem key={a.id} answer={a} questionId={question.id} onUpdate={onUpdate} />
                ))
              )}
              <div className="answer-input-wrap">
                <textarea
                  value={answerText}
                  onChange={e => setAnswerText(e.target.value)}
                  placeholder="写下你的回答，帮助邻居..."
                  rows={2}
                />
                <button onClick={handleAnswer} disabled={answering || !answerText.trim()}>
                  {answering ? <Loader2 className="spinner" size={16} /> : <Send size={16} />}
                  提交回答
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}

export default function QA() {
  const [questions, setQuestions] = useState<Question[]>([])
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [allTags, setAllTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    try {
      const list = await fetchQuestions(activeTag || undefined)
      setQuestions(list)
      const tags = new Set<string>()
      list.forEach(q => q.tags.forEach(t => tags.add(t)))
      setAllTags(Array.from(tags))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [activeTag])

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -30 }}
      transition={{ duration: 0.3 }}
      className="page-wrap"
    >
      <div className="qa-header">
        <div>
          <h1 className="page-title">社区问答</h1>
          <p className="page-sub">邻里互助，有问题问邻居</p>
        </div>
        <button className="ask-btn" onClick={() => navigate('/ask')}>
          <MessageCirclePlus size={18} />
          我要提问
        </button>
      </div>

      {allTags.length > 0 && (
        <div className="tag-filter">
          <TagPill tag="全部" active={activeTag === null} onClick={() => setActiveTag(null)} />
          {allTags.map(t => (
            <TagPill key={t} tag={t} active={activeTag === t} onClick={() => setActiveTag(activeTag === t ? null : t)} />
          ))}
        </div>
      )}

      <div className="questions-list">
        {loading ? (
          <div className="loading-wrap"><Loader2 className="spinner" size={28} /></div>
        ) : questions.length === 0 ? (
          <div className="empty">暂无相关问题，<Link to="/ask">去提问</Link></div>
        ) : (
          <AnimatePresence>
            {questions.map(q => (
              <QuestionCard key={q.id} question={q} onUpdate={load} />
            ))}
          </AnimatePresence>
        )}
      </div>
    </motion.div>
  )
}
