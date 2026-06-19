import { useState, useEffect } from 'react'
import { GraphNode, COLOR_PALETTE } from '../utils/graphLayout'

interface NodeEditorProps {
  open: boolean
  node: GraphNode | null
  onClose: () => void
  onSave: (node: GraphNode) => void
  onDelete: (nodeId: string) => void
}

export default function NodeEditor({ open, node, onClose, onSave, onDelete }: NodeEditorProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLOR_PALETTE[0])
  const [dirty, setDirty] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)

  useEffect(() => {
    if (node) {
      setTitle(node.title)
      setDescription(node.description)
      setColor(node.color)
      setDirty(false)
      setDeleteConfirm(false)
    }
  }, [node])

  const handleSave = () => {
    if (!node) return
    if (!title.trim()) {
      alert('标题不能为空')
      return
    }
    onSave({
      ...node,
      title: title.trim().substring(0, 20),
      description: description.substring(0, 200),
      color
    })
    setDirty(false)
  }

  const handleDelete = () => {
    if (!node) return
    if (!deleteConfirm) {
      setDeleteConfirm(true)
      return
    }
    onDelete(node.id)
  }

  return (
    <>
      <div
        style={{
          ...overlay,
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />
      <aside
        style={{
          ...panel,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          pointerEvents: open ? 'auto' : 'none',
        }}
      >
        {node && (
          <>
            <div style={header}>
              <div style={headerInfo}>
                <div
                  style={{
                    ...colorSwatch,
                    backgroundColor: color,
                    boxShadow: `0 0 12px ${color}66`,
                  }}
                />
                <div>
                  <div style={headerLabel}>节点属性</div>
                  <div style={headerId}>{node.id.slice(-8)}</div>
                </div>
              </div>
              <button style={closeBtn} onClick={onClose} title="关闭">
                ✕
              </button>
            </div>

            <div style={body}>
              <div style={field}>
                <label style={label}>
                  标题 <span style={charCount}>{title.length}/20</span>
                </label>
                <input
                  type="text"
                  style={input}
                  value={title}
                  maxLength={20}
                  onChange={e => {
                    setTitle(e.target.value)
                    setDirty(true)
                  }}
                  placeholder="输入节点标题..."
                />
              </div>

              <div style={field}>
                <label style={label}>
                  描述 <span style={charCount}>{description.length}/200</span>
                </label>
                <textarea
                  style={textarea}
                  value={description}
                  maxLength={200}
                  rows={5}
                  onChange={e => {
                    setDescription(e.target.value)
                    setDirty(true)
                  }}
                  placeholder="输入节点描述（可选）..."
                />
              </div>

              <div style={field}>
                <label style={label}>节点颜色</label>
                <div style={palette}>
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c}
                      onClick={() => {
                        setColor(c)
                        setDirty(true)
                      }}
                      style={{
                        ...paletteBtn,
                        backgroundColor: c,
                        transform: color === c ? 'scale(1.18)' : 'scale(1)',
                        outline: color === c ? `3px solid rgba(255,255,255,0.9)` : 'none',
                        boxShadow: color === c
                          ? `0 4px 16px ${c}99, 0 0 0 2px ${c}`
                          : '0 2px 6px rgba(0,0,0,0.15)',
                      }}
                      title={c}
                    />
                  ))}
                </div>
              </div>

              <div style={previewField}>
                <label style={label}>预览</label>
                <div style={previewBox}>
                  <div
                    style={{
                      ...previewNode,
                      backgroundColor: color,
                      boxShadow: `0 0 18px ${color}88`,
                    }}
                  >
                    <span style={previewTitle}>
                      {title.length > 8 ? title.substring(0, 8) + '…' : title || '节点'}
                    </span>
                  </div>
                  <div style={previewText}>
                    <div style={previewNodeTitle}>{title || '未命名节点'}</div>
                    <div style={previewDesc}>
                      {description || '暂无描述'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={footer}>
              <button
                style={{
                  ...deleteBtn,
                  backgroundColor: deleteConfirm ? '#e74c3c' : 'transparent',
                  color: deleteConfirm ? '#fff' : '#e74c3c',
                  borderColor: deleteConfirm ? '#e74c3c' : 'rgba(231,76,60,0.4)',
                }}
                onClick={handleDelete}
              >
                {deleteConfirm ? '⚠ 确认删除' : '🗑 删除节点'}
              </button>
              <div style={footerActions}>
                <button style={cancelBtn} onClick={onClose}>
                  取消
                </button>
                <button
                  style={{
                    ...saveBtn,
                    opacity: dirty ? 1 : 0.6,
                    cursor: dirty ? 'pointer' : 'not-allowed',
                  }}
                  onClick={handleSave}
                  disabled={!dirty}
                >
                  保存
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  )
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(0,0,0,0.15)',
  transition: 'opacity 300ms ease-in-out',
  zIndex: 200,
}

const panel: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  right: 0,
  width: 380,
  maxWidth: '90vw',
  height: '100%',
  backgroundColor: '#fff',
  boxShadow: '-8px 0 30px rgba(0,0,0,0.12)',
  zIndex: 201,
  transition: 'transform 300ms ease-in-out',
  display: 'flex',
  flexDirection: 'column',
}

const header: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '18px 20px',
  borderBottom: '1px solid #eee',
  backgroundColor: '#fafbfc',
}

const headerInfo: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const colorSwatch: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: '50%',
  flexShrink: 0,
}

const headerLabel: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: '#222',
}

const headerId: React.CSSProperties = {
  fontSize: 11,
  color: '#aaa',
  marginTop: 2,
  fontFamily: 'monospace',
}

const closeBtn: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 8,
  border: 'none',
  backgroundColor: 'transparent',
  color: '#888',
  fontSize: 16,
  cursor: 'pointer',
  transition: 'all 150ms',
}

const body: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: '20px',
  display: 'flex',
  flexDirection: 'column',
  gap: 20,
}

const field: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
}

const previewField: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  padding: 14,
  borderRadius: 10,
  backgroundColor: '#f7f8fa',
  border: '1px solid #eee',
}

const label: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#555',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  letterSpacing: 0.3,
}

const charCount: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 400,
  color: '#aaa',
}

const input: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1.5px solid #e1e4e8',
  fontSize: 14,
  outline: 'none',
  transition: 'all 150ms',
  fontFamily: 'inherit',
}

const textarea: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 8,
  border: '1.5px solid #e1e4e8',
  fontSize: 14,
  outline: 'none',
  resize: 'vertical',
  transition: 'all 150ms',
  fontFamily: 'inherit',
  lineHeight: 1.5,
}

const palette: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 10,
  padding: 4,
}

const paletteBtn: React.CSSProperties = {
  width: '100%',
  aspectRatio: '1',
  borderRadius: 10,
  border: 'none',
  cursor: 'pointer',
  transition: 'all 200ms ease-in-out',
}

const previewBox: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 16,
}

const previewNode: React.CSSProperties = {
  width: 54,
  height: 54,
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const previewTitle: React.CSSProperties = {
  color: '#fff',
  fontSize: 11,
  fontWeight: 600,
  textShadow: '0 1px 2px rgba(0,0,0,0.4)',
}

const previewText: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
}

const previewNodeTitle: React.CSSProperties = {
  fontSize: 14,
  fontWeight: 600,
  color: '#222',
  marginBottom: 4,
}

const previewDesc: React.CSSProperties = {
  fontSize: 12,
  color: '#888',
  lineHeight: 1.5,
  overflow: 'hidden',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
}

const footer: React.CSSProperties = {
  padding: '14px 20px',
  borderTop: '1px solid #eee',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  backgroundColor: '#fafbfc',
}

const footerActions: React.CSSProperties = {
  marginLeft: 'auto',
  display: 'flex',
  gap: 8,
}

const cancelBtn: React.CSSProperties = {
  padding: '9px 18px',
  borderRadius: 8,
  border: '1px solid #ddd',
  backgroundColor: '#fff',
  color: '#666',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 150ms',
}

const saveBtn: React.CSSProperties = {
  padding: '9px 20px',
  borderRadius: 8,
  border: 'none',
  backgroundColor: '#4a6fa5',
  color: '#fff',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 150ms',
}

const deleteBtn: React.CSSProperties = {
  padding: '9px 14px',
  borderRadius: 8,
  border: '1px solid',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'all 200ms ease-in-out',
}
