import { useState, useEffect, useMemo } from 'react'
import type { Card, CardType, CardContent, TextContent, ImageContent, ColorContent } from '../types'

const PRESET_COLORS = [
  '#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db',
  '#9b59b6', '#8e44ad', '#ec407a', '#533483', '#00bcd4', '#ff5722',
]

interface Props {
  card: Card
  isNew: boolean
  autoCreate?: boolean
  onClose: () => void
  onSave: (content: CardContent) => void
}

function simpleMarkdown(text: string) {
  const lines = text.split('\n')
  const els: React.ReactNode[] = []
  let list: string[] | null = null
  const flushList = () => {
    if (list) {
      els.push(
        <ul key={`ul-${els.length}`}>
          {list.map((it, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: renderInline(it) }} />
          ))}
        </ul>
      )
      list = null
    }
  }
  const renderInline = (s: string) => {
    return s
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
  }
  lines.forEach((l, i) => {
    const h3 = l.match(/^###\s+(.+)/)
    const h2 = l.match(/^##\s+(.+)/)
    const h1 = l.match(/^#\s+(.+)/)
    const li = l.match(/^[-*]\s+(.+)/)
    if (li) {
      if (!list) list = []
      list.push(li[1])
    } else {
      flushList()
      if (h3) els.push(<h3 key={i}>{h3[1]}</h3>)
      else if (h2) els.push(<h2 key={i}>{h2[1]}</h2>)
      else if (h1) els.push(<h1 key={i}>{h1[1]}</h1>)
      else if (l.trim()) els.push(<p key={i} dangerouslySetInnerHTML={{ __html: renderInline(l) }} />)
      else els.push(<br key={i} />)
    }
  })
  flushList()
  return <div className="markdown-preview">{els}</div>
}

export default function CardEditor({ card, isNew, autoCreate, onClose, onSave }: Props) {
  const [type, setType] = useState<CardType>(card.type)
  const [textContent, setTextContent] = useState<TextContent>(
    card.type === 'text' ? (card.content as TextContent) : { title: '', body: '' }
  )
  const [imageContent, setImageContent] = useState<ImageContent>(
    card.type === 'image' ? (card.content as ImageContent) : { url: '', caption: '' }
  )
  const [colorContent, setColorContent] = useState<ColorContent>(
    card.type === 'color' ? (card.content as ColorContent) : { name: '', color: PRESET_COLORS[9] }
  )
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setType(card.type)
    if (card.type === 'text') setTextContent(card.content as TextContent)
    if (card.type === 'image') setImageContent(card.content as ImageContent)
    if (card.type === 'color') setColorContent(card.content as ColorContent)
  }, [card.id, card.type, card.content])

  const canSave = useMemo(() => {
    if (type === 'text') return textContent.title.trim() || textContent.body.trim()
    if (type === 'image') return imageContent.url.trim()
    if (type === 'color') return colorContent.color && colorContent.name.trim()
    return false
  }, [type, textContent, imageContent, colorContent])

  const getContent = (): CardContent => {
    if (type === 'text') return textContent
    if (type === 'image') return imageContent
    return colorContent
  }

  const handleSave = () => {
    if (!canSave) return
    onSave(getContent())
  }

  return (
    <>
      <div className="editor-overlay" onClick={onClose} />
      <div className="editor-panel" onClick={e => e.stopPropagation()}>
        <div className="editor-header">
          <h2 className="editor-title">
            {isNew ? '新建' : '编辑'}
            {type === 'text' ? '文字卡片' : type === 'image' ? '图片卡片' : '色块卡片'}
          </h2>
          <button className="editor-close" onClick={onClose} title="关闭">
            ×
          </button>
        </div>

        <div className="editor-type-tabs">
          {([
            { t: 'text' as CardType, name: '📝 文字' },
            { t: 'image' as CardType, name: '🖼️ 图片' },
            { t: 'color' as CardType, name: '🎨 色块' },
          ]).map(tab => (
            <div
              key={tab.t}
              className={`editor-type-tab ${type === tab.t ? 'active' : ''}`}
              onClick={() => setType(tab.t)}
            >
              {tab.name}
            </div>
          ))}
        </div>

        {type === 'text' && (
          <>
            <div className="form-group">
              <label className="form-label">标题</label>
              <input
                className="form-input"
                placeholder="输入卡片标题..."
                value={textContent.title}
                onChange={e => setTextContent(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">正文（支持 Markdown）</label>
              <textarea
                className="form-input"
                placeholder="## 副标题&#10;&#10;**加粗** - 列表项"
                rows={6}
                value={textContent.body}
                onChange={e => setTextContent(prev => ({ ...prev, body: e.target.value }))}
              />
            </div>
            <div className="editor-preview">
              <div className="preview-label">实时预览</div>
              {simpleMarkdown(
                (textContent.title ? `# ${textContent.title}\n\n` : '') +
                (textContent.body || '_暂无内容_')
              )}
            </div>
          </>
        )}

        {type === 'image' && (
          <>
            <div className="form-group">
              <label className="form-label">图片 URL</label>
              <input
                className="form-input"
                placeholder="https://example.com/image.jpg"
                value={imageContent.url}
                onChange={e => {
                  setImageContent(prev => ({ ...prev, url: e.target.value }))
                  setImageError(false)
                }}
              />
            </div>
            <div className="form-group">
              <label className="form-label">图片说明</label>
              <input
                className="form-input"
                placeholder="（可选）为图片添加描述"
                value={imageContent.caption}
                onChange={e => setImageContent(prev => ({ ...prev, caption: e.target.value }))}
              />
            </div>
            <div className="editor-preview">
              <div className="preview-label">缩略图预览</div>
              {imageContent.url ? (
                <img
                  className="image-preview"
                  src={imageContent.url}
                  alt=""
                  onError={() => setImageError(true)}
                />
              ) : (
                <div
                  style={{
                    height: 160,
                    borderRadius: 8,
                    background: '#2a2a3e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#a0a0b0',
                    fontSize: 13,
                  }}
                >
                  请输入图片 URL 查看预览
                </div>
              )}
              {imageError && (
                <div style={{ marginTop: 8, fontSize: 12, color: '#e74c3c' }}>
                  ⚠️ 图片加载失败，请检查 URL
                </div>
              )}
            </div>
          </>
        )}

        {type === 'color' && (
          <>
            <div className="form-group">
              <label className="form-label">颜色名称</label>
              <input
                className="form-input"
                placeholder="例如：日落橙、星空蓝"
                value={colorContent.name}
                onChange={e => setColorContent(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">选择颜色</label>
              <div className="color-picker-ring">
                {PRESET_COLORS.map(c => (
                  <div
                    key={c}
                    className={`color-dot ${c === colorContent.color ? 'selected' : ''}`}
                    style={{ background: c, color: c }}
                    onClick={() => setColorContent(prev => ({ ...prev, color: c }))}
                  />
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">自定义色值</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  className="form-input"
                  placeholder="#RRGGBB"
                  value={colorContent.color}
                  onChange={e => setColorContent(prev => ({ ...prev, color: e.target.value }))}
                  style={{ flex: 1, fontFamily: 'monospace', letterSpacing: 1 }}
                />
                <input
                  type="color"
                  value={colorContent.color}
                  onChange={e => setColorContent(prev => ({ ...prev, color: e.target.value }))}
                  style={{
                    width: 48,
                    height: 48,
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: 10,
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                />
              </div>
            </div>
            <div className="editor-preview">
              <div className="preview-label">颜色预览</div>
              <div
                style={{
                  height: 120,
                  borderRadius: 12,
                  background: colorContent.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 18,
                  textShadow: '0 1px 6px rgba(0,0,0,0.5)',
                  letterSpacing: 1,
                }}
              >
                {colorContent.name || '未命名'}
              </div>
              <div
                style={{
                  marginTop: 10,
                  textAlign: 'center',
                  fontSize: 12,
                  color: '#a0a0b0',
                  letterSpacing: 2,
                  fontFamily: 'monospace',
                }}
              >
                {colorContent.color.toUpperCase()}
              </div>
            </div>
          </>
        )}

        <div className="editor-actions">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn" onClick={handleSave} disabled={!canSave}>
            {autoCreate ? '创建卡片' : '保存修改'}
          </button>
        </div>
      </div>
    </>
  )
}
