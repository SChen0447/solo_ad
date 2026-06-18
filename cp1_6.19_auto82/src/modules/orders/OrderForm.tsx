import { useState } from 'react'
import { useOrderStore } from '../../store'
import type { CakeFlavor, CakeSize, CreamType, PatternType } from '../../types'
import './orderForm.css'

const patterns: { key: PatternType; svg: string }[] = [
  {
    key: '数字蜡烛',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><rect x="35" y="25" width="10" height="40" fill="#ffa502" rx="2"/><rect x="38" y="15" width="4" height="12" fill="#ff6b6b"/><ellipse cx="40" cy="12" rx="6" ry="8" fill="#ffd93d"/><text x="40" y="55" text-anchor="middle" font-size="16" fill="white" font-weight="bold">7</text></svg>`
  },
  {
    key: '花朵',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="25" r="10" fill="#ff9ff3"/><circle cx="25" cy="35" r="10" fill="#ff9ff3"/><circle cx="55" cy="35" r="10" fill="#ff9ff3"/><circle cx="30" cy="50" r="10" fill="#ff9ff3"/><circle cx="50" cy="50" r="10" fill="#ff9ff3"/><circle cx="40" cy="38" r="8" fill="#feca57"/><rect x="37" y="55" width="6" height="20" fill="#2ed573"/></svg>`
  },
  {
    key: '卡通动物',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><ellipse cx="40" cy="48" rx="25" ry="22" fill="#feca57"/><circle cx="22" cy="30" r="10" fill="#feca57"/><circle cx="58" cy="30" r="10" fill="#feca57"/><circle cx="22" cy="30" r="5" fill="#ff9ff3"/><circle cx="58" cy="30" r="5" fill="#ff9ff3"/><circle cx="32" cy="45" r="4" fill="#333"/><circle cx="48" cy="45" r="4" fill="#333"/><ellipse cx="40" cy="55" rx="6" ry="4" fill="#ff6b6b"/><path d="M35 60 Q40 65 45 60" stroke="#333" stroke-width="2" fill="none"/></svg>`
  },
  {
    key: '简约几何',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><polygon points="40,15 55,40 25,40" fill="#1e90ff"/><rect x="25" y="45" width="30" height="20" fill="#ff6b6b" rx="3"/><circle cx="40" cy="55" r="8" fill="#2ed573"/></svg>`
  }
]

const flavors: CakeFlavor[] = ['原味', '巧克力', '抹茶', '红丝绒']
const sizes: CakeSize[] = ['6寸', '8寸', '10寸']
const creamTypes: CreamType[] = ['淡奶油', '奶油霜', '乳酪']

interface OrderFormProps {
  onBack: () => void
}

export default function OrderForm({ onBack }: OrderFormProps) {
  const [customerName, setCustomerName] = useState('')
  const [flavor, setFlavor] = useState<CakeFlavor>('原味')
  const [size, setSize] = useState<CakeSize>('6寸')
  const [creamType, setCreamType] = useState<CreamType>('淡奶油')
  const [decorationText, setDecorationText] = useState('')
  const [pattern, setPattern] = useState<PatternType>('花朵')
  const [customImage, setCustomImage] = useState<string | undefined>(undefined)
  const [showConfirm, setShowConfirm] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addOrder = useOrderStore((s) => s.addOrder)

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setCustomImage(ev.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) {
      alert('请输入顾客昵称')
      return
    }
    setShowConfirm(true)
  }

  const confirmSubmit = async () => {
    setIsSubmitting(true)
    const result = await addOrder({
      customerName: customerName.trim(),
      flavor,
      size,
      creamType,
      decorationText,
      pattern,
      customImage
    })
    setIsSubmitting(false)
    if (result) {
      setSubmitted(true)
    }
  }

  const handleCloseConfirm = () => {
    setShowConfirm(false)
    if (submitted) {
      setCustomerName('')
      setFlavor('原味')
      setSize('6寸')
      setCreamType('淡奶油')
      setDecorationText('')
      setPattern('花朵')
      setCustomImage(undefined)
      setSubmitted(false)
      onBack()
    }
  }

  return (
    <div className="order-form-container">
      <div className="form-header">
        <button className="btn btn-outline back-btn" onClick={onBack}>
          ← 返回
        </button>
        <h2>蛋糕定制订单</h2>
      </div>

      <form className="order-form card" onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">顾客昵称</label>
          <input
            type="text"
            className="form-input"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="请输入顾客昵称"
            maxLength={20}
          />
        </div>

        <div className="form-group">
          <label className="form-label">蛋糕口味</label>
          <select
            className="form-select"
            value={flavor}
            onChange={(e) => setFlavor(e.target.value as CakeFlavor)}
          >
            {flavors.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">蛋糕尺寸</label>
          <div className="radio-group size-radio">
            {sizes.map((s) => (
              <label key={s} className="radio-item size-radio-item">
                <input
                  type="radio"
                  name="size"
                  value={s}
                  checked={size === s}
                  onChange={(e) => setSize(e.target.value as CakeSize)}
                />
                <span>{s}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">奶油类型</label>
          <select
            className="form-select"
            value={creamType}
            onChange={(e) => setCreamType(e.target.value as CreamType)}
          >
            {creamTypes.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">
            装饰文字 <span className="char-count">({decorationText.length}/12)</span>
          </label>
          <input
            type="text"
            className="form-input"
            value={decorationText}
            onChange={(e) => setDecorationText(e.target.value.slice(0, 12))}
            placeholder="请输入蛋糕上的装饰文字"
            maxLength={12}
          />
        </div>

        <div className="form-group">
          <label className="form-label">图案偏好</label>
          <div className="pattern-grid">
            {patterns.map((p) => (
              <div
                key={p.key}
                className={`pattern-item ${pattern === p.key ? 'active' : ''}`}
                onClick={() => setPattern(p.key)}
                dangerouslySetInnerHTML={{ __html: p.svg }}
              />
            ))}
          </div>
          <div className="pattern-labels">
            {patterns.map((p) => (
              <span key={p.key} className="pattern-label">
                {p.key}
              </span>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">上传参考图片（可选）</label>
          <div className="image-upload">
            {customImage ? (
              <div className="preview-image">
                <img src={customImage} alt="预览" />
                <button
                  type="button"
                  className="remove-image"
                  onClick={() => setCustomImage(undefined)}
                >
                  ×
                </button>
              </div>
            ) : (
              <label className="upload-placeholder">
                <span className="upload-icon">📷</span>
                <span>点击上传图片</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  hidden
                />
              </label>
            )}
          </div>
        </div>

        <button type="submit" className="btn btn-primary submit-btn">
          提交订单
        </button>
      </form>

      {showConfirm && (
        <div className="modal-overlay" onClick={handleCloseConfirm}>
          <div
            className="confirm-modal fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {submitted ? (
              <div className="confirm-success">
                <div className="success-icon">✓</div>
                <h3>订单提交成功！</h3>
                <p>我们会尽快为您制作</p>
                <button className="btn btn-primary" onClick={handleCloseConfirm}>
                  确定
                </button>
              </div>
            ) : (
              <div className="confirm-content">
                <h3>确认订单</h3>
                <div className="order-summary">
                  <div className="summary-row">
                    <span className="summary-label">顾客：</span>
                    <span className="summary-value">{customerName}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">口味：</span>
                    <span className="summary-value">{flavor}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">尺寸：</span>
                    <span className="summary-value">{size}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">奶油：</span>
                    <span className="summary-value">{creamType}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">装饰文字：</span>
                    <span className="summary-value">{decorationText || '无'}</span>
                  </div>
                  <div className="summary-row">
                    <span className="summary-label">图案：</span>
                    <span className="summary-value">{pattern}</span>
                  </div>
                </div>
                <div className="confirm-actions">
                  <button
                    className="btn btn-outline"
                    onClick={handleCloseConfirm}
                    disabled={isSubmitting}
                  >
                    取消
                  </button>
                  <button
                    className="btn btn-primary"
                    onClick={confirmSubmit}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? '提交中...' : '确认提交'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
