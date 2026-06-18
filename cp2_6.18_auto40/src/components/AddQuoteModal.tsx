import { useState, useEffect } from 'react'
import { Quote } from '../types'
import './AddQuoteModal.css'

interface QuoteItemForm {
  name: string
  quantity: string
  unitPrice: string
}

interface AddQuoteModalProps {
  onClose: () => void
  onCreated: (quote: Quote) => void
}

export default function AddQuoteModal({ onClose, onCreated }: AddQuoteModalProps) {
  const [customerName, setCustomerName] = useState('')
  const [items, setItems] = useState<QuoteItemForm[]>([
    { name: '', quantity: '1', unitPrice: '' }
  ])
  const [submitting, setSubmitting] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true)
    })
  }, [])

  const handleClose = () => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const addItem = () => {
    setItems([...items, { name: '', quantity: '1', unitPrice: '' }])
  }

  const removeItem = (index: number) => {
    if (items.length === 1) return
    setItems(items.filter((_, i) => i !== index))
  }

  const updateItem = (index: number, field: keyof QuoteItemForm, value: string) => {
    const newItems = [...items]
    newItems[index][field] = value
    setItems(newItems)
  }

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0
      const price = parseFloat(item.unitPrice) || 0
      return sum + qty * price
    }, 0)
  }

  const formatAmount = (amount: number): string => {
    return `¥${amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customerName.trim()) {
      alert('请输入客户名称')
      return
    }

    const validItems = items.filter(item => item.name.trim() && item.quantity && item.unitPrice)
    if (validItems.length === 0) {
      alert('请至少添加一个有效的商品条目')
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          customerName: customerName.trim(),
          items: validItems.map(item => ({
            name: item.name.trim(),
            quantity: parseFloat(item.quantity),
            unitPrice: parseFloat(item.unitPrice)
          }))
        })
      })

      if (!response.ok) {
        throw new Error('创建报价单失败')
      }

      const newQuote = await response.json()
      onCreated(newQuote)
    } catch (err) {
      alert(err instanceof Error ? err.message : '创建失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const modalClass = isVisible ? 'modal-overlay visible' : 'modal-overlay'
  const contentClass = isVisible ? 'modal-content visible' : 'modal-content'

  return (
    <div className={modalClass} onClick={handleClose}>
      <div className={contentClass} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>创建报价单</h3>
          <button className="modal-close" onClick={handleClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>客户名称</label>
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="请输入客户名称"
              autoFocus
            />
          </div>

          <div className="form-group">
            <div className="items-header">
              <label>商品/服务条目</label>
              <button
                type="button"
                className="btn-add"
                onClick={addItem}
              >
                + 添加条目
              </button>
            </div>

            <div className="items-list">
              {items.map((item, index) => (
                <div key={index} className="item-row">
                  <input
                    type="text"
                    className="item-name"
                    placeholder="名称"
                    value={item.name}
                    onChange={e => updateItem(index, 'name', e.target.value)}
                  />
                  <input
                    type="number"
                    className="item-quantity"
                    placeholder="数量"
                    min="0"
                    step="1"
                    value={item.quantity}
                    onChange={e => updateItem(index, 'quantity', e.target.value)}
                  />
                  <input
                    type="number"
                    className="item-price"
                    placeholder="单价"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={e => updateItem(index, 'unitPrice', e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn-remove"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                  >
                    删除
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="modal-footer">
            <div className="total-amount">
              <span>总金额：</span>
              <span className="total-value">{formatAmount(calculateTotal())}</span>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={submitting}
              >
                取消
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? '创建中...' : '创建报价'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
