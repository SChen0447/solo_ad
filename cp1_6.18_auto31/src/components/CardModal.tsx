import { useState, useEffect } from 'react'
import { useKanbanStore } from '../store/useKanbanStore'
import { Card as CardType } from '../types'
import '../styles/CardModal.css'

interface CardModalProps {
  card: CardType | null
  onClose: () => void
}

function CardModal({ card, onClose }: CardModalProps) {
  const { addCard, updateCard, deleteCard } = useKanbanStore()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [urgency, setUrgency] = useState(3)
  const [importance, setImportance] = useState(3)

  const isEditing = !!card

  useEffect(() => {
    if (card) {
      setTitle(card.title)
      setDescription(card.description)
      setUrgency(card.urgency)
      setImportance(card.importance)
    } else {
      setTitle('')
      setDescription('')
      setUrgency(3)
      setImportance(3)
    }
  }, [card])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return

    if (isEditing && card) {
      await updateCard(card.id, {
        title,
        description,
        urgency,
        importance,
      })
    } else {
      await addCard({
        title,
        description,
        urgency,
        importance,
      })
    }
    onClose()
  }

  const handleDelete = async () => {
    if (card && window.confirm('确定删除这个需求吗？')) {
      await deleteCard(card.id)
      onClose()
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? '编辑需求' : '添加需求'}</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="输入需求标题"
              autoFocus
            />
          </div>

          <div className="form-group">
            <label>描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述需求详情..."
              rows={4}
            />
          </div>

          <div className="form-group">
            <label>
              紧急程度: <span className="slider-value">{urgency}</span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={urgency}
              onChange={(e) => setUrgency(Number(e.target.value))}
              className="slider urgency-slider"
            />
            <div className="slider-labels">
              <span>低</span>
              <span>高</span>
            </div>
          </div>

          <div className="form-group">
            <label>
              重要程度: <span className="slider-value">{importance}</span>
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={importance}
              onChange={(e) => setImportance(Number(e.target.value))}
              className="slider importance-slider"
            />
            <div className="slider-labels">
              <span>低</span>
              <span>高</span>
            </div>
          </div>

          <div className="modal-actions">
            {isEditing && (
              <button
                type="button"
                className="btn-delete"
                onClick={handleDelete}
              >
                删除
              </button>
            )}
            <div className="modal-actions-right">
              <button
                type="button"
                className="btn-cancel"
                onClick={onClose}
              >
                取消
              </button>
              <button type="submit" className="btn-primary">
                {isEditing ? '保存' : '创建'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CardModal
