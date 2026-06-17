import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useAppContext, type Material, type PlatformType } from '../context/AppContext'
import { fetchMaterial, updateMaterial, deleteMaterial, PLATFORM_LIMITS, PLATFORM_NAMES } from '../api'

interface Props {
  materialId: string
}

const platformList: PlatformType[] = ['weibo', 'xiaohongshu', 'wechat']

const CharCounterBar: React.FC<{ platform: PlatformType; contentLength: number }> = ({ platform, contentLength }) => {
  const limit = PLATFORM_LIMITS[platform]
  const overflow = Math.max(0, contentLength - limit)
  const isOver = overflow > 0
  const percent = Math.min(100, (contentLength / limit) * 100)

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
        <span style={{ fontWeight: 500, color: isOver ? 'var(--danger)' : 'var(--text-secondary)' }}>
          {PLATFORM_NAMES[platform]}
        </span>
        <span style={{ color: isOver ? 'var(--danger)' : 'var(--text-secondary)', fontWeight: 500 }}>
          {contentLength}/{limit}
          {isOver && <span style={{ marginLeft: 6 }}>超出 {overflow} 字</span>}
        </span>
      </div>
      <div className="char-counter-bar">
        <div
          className={`char-counter-fill ${isOver ? 'warning' : ''}`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  )
}

const MaterialEditor: React.FC<Props> = ({ materialId }) => {
  const { materials, tags, updateMaterial: updateCtxMaterial, deleteMaterial: deleteCtxMaterial, selectMaterial } = useAppContext()
  const [material, setMaterial] = useState<Material | null>(null)
  const [saving, setSaving] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)
  const [activeTab, setActiveTab] = useState<'title' | 'content'>('content')
  const contentRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const existing = materials.find(m => m.id === materialId)
    if (existing) {
      setMaterial(existing)
    } else {
      fetchMaterial(materialId).then(m => setMaterial(m)).catch(() => {})
    }
  }, [materialId, materials])

  const saveChanges = useCallback(async (updates: Partial<Material>) => {
    if (!material) return
    const updated = { ...material, ...updates }
    setMaterial(updated)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      setSaving(true)
      try {
        const result = await updateMaterial(material.id, updates)
        updateCtxMaterial(result)
      } catch {
      } finally {
        setSaving(false)
      }
    }, 500)
  }, [material, updateCtxMaterial])

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    saveChanges({ title: e.target.value })
  }

  const handleContentInput = () => {
    if (!contentRef.current) return
    const text = contentRef.current.innerText || ''
    saveChanges({ content: text })
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (!contentRef.current) return
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        const img = document.createElement('img')
        img.src = reader.result as string
        img.style.maxWidth = '100%'
        img.style.borderRadius = '8px'
        img.style.margin = '8px 0'
        img.style.display = 'block'
        const selection = window.getSelection()
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0)
          if (contentRef.current?.contains(range.commonAncestorContainer)) {
            range.insertNode(img)
            range.setStartAfter(img)
            range.setEndAfter(img)
            selection.removeAllRanges()
            selection.addRange(range)
          } else {
            contentRef.current?.appendChild(img)
          }
        } else {
          contentRef.current?.appendChild(img)
        }
        const imgs = (material?.images || []).concat([reader.result as string])
        saveChanges({ images: imgs })
        handleContentInput()
      }
      reader.readAsDataURL(file)
    })
  }, [material, saveChanges])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => setIsDragOver(false)

  const toggleTag = (tagId: string) => {
    if (!material) return
    const hasTag = material.tags.includes(tagId)
    const newTags = hasTag
      ? material.tags.filter(t => t !== tagId)
      : [...material.tags, tagId]
    saveChanges({ tags: newTags })
  }

  const insertImageFromInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []).filter(f => f.type.startsWith('image/'))
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        if (!contentRef.current) return
        const img = document.createElement('img')
        img.src = reader.result as string
        img.style.maxWidth = '100%'
        img.style.borderRadius = '8px'
        img.style.margin = '8px 0'
        img.style.display = 'block'
        contentRef.current.appendChild(img)
        const imgs = (material?.images || []).concat([reader.result as string])
        saveChanges({ images: imgs })
        handleContentInput()
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  const handleDelete = async () => {
    if (!material || !window.confirm('确定要删除这个素材吗？')) return
    try {
      await deleteMaterial(material.id)
      deleteCtxMaterial(material.id)
      selectMaterial(null)
    } catch {
    }
  }

  const execFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value)
    contentRef.current?.focus()
    handleContentInput()
  }

  if (!material) {
    return (
      <div className="card shadow-md" style={{ padding: 40, textAlign: 'center', color: '#7F8C8D' }}>
        加载中...
      </div>
    )
  }

  return (
    <div className="card shadow-lg" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>编辑素材</span>
          {saving && (
            <span style={{ fontSize: 12, color: 'var(--accent-blue)' }}>保存中...</span>
          )}
        </div>
        <button className="btn btn-danger" style={{ padding: '4px 12px', fontSize: 13 }} onClick={handleDelete}>
          删除
        </button>
      </div>

      <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
          {platformList.map(p => (
            <CharCounterBar key={p} platform={p} contentLength={material.content.length} />
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-color)' }}>
            <input
              ref={titleRef}
              type="text"
              value={material.title}
              onChange={handleTitleChange}
              placeholder="请输入标题..."
              style={{
                width: '100%',
                fontSize: 20,
                fontWeight: 600,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                padding: '8px 0',
                color: 'var(--text-primary)',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: '8px 20px',
              borderBottom: '1px solid var(--border-color)',
              background: '#FAFBFC',
              flexWrap: 'wrap',
            }}
          >
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 13, fontWeight: 600 }}
              onClick={() => execFormat('bold')}
            >
              B
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 13, fontStyle: 'italic' }}
              onClick={() => execFormat('italic')}
            >
              I
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 13, textDecoration: 'underline' }}
              onClick={() => execFormat('underline')}
            >
              U
            </button>
            <div style={{ width: 1, background: 'var(--border-color)', margin: '4px 4px' }} />
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 13 }}
              onClick={() => execFormat('formatBlock', 'H2')}
            >
              H2
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 13 }}
              onClick={() => execFormat('formatBlock', 'H3')}
            >
              H3
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 13 }}
              onClick={() => execFormat('insertUnorderedList')}
            >
              • 列表
            </button>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 10px', fontSize: 13 }}
              onClick={() => execFormat('insertOrderedList')}
            >
              1. 编号
            </button>
            <div style={{ width: 1, background: 'var(--border-color)', margin: '4px 4px' }} />
            <label className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: 13, cursor: 'pointer' }}>
              📷 插入图片
              <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={insertImageFromInput} />
            </label>
          </div>

          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleContentInput}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            dangerouslySetInnerHTML={{ __html: material.content }}
            style={{
              flex: 1,
              padding: '20px',
              outline: 'none',
              overflow: 'auto',
              fontSize: 15,
              lineHeight: 1.75,
              background: isDragOver ? 'rgba(52, 152, 219, 0.05)' : 'transparent',
              border: isDragOver ? '2px dashed var(--accent-blue)' : '2px solid transparent',
              borderRadius: 8,
              margin: 12,
              transition: 'all 0.2s ease',
            }}
          />
        </div>

        <div style={{ width: 220, borderLeft: '1px solid var(--border-color)', padding: 16, overflow: 'auto' }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>标签</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {tags.map(tag => {
              const active = material.tags.includes(tag.id)
              return (
                <span
                  key={tag.id}
                  className="tag"
                  style={{
                    background: active ? tag.color : '#E0E6ED',
                    color: active ? '#fff' : '#7F8C8D',
                    cursor: 'pointer',
                    padding: '5px 12px',
                  }}
                  onClick={() => toggleTag(tag.id)}
                >
                  {active && '✓ '}
                  {tag.name}
                </span>
              )
            })}
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>素材信息</div>
            <div style={{ fontSize: 12, color: '#7F8C8D', lineHeight: 1.8 }}>
              <div>创建时间：{new Date(material.createdAt).toLocaleString('zh-CN')}</div>
              <div>更新时间：{new Date(material.updatedAt).toLocaleString('zh-CN')}</div>
              <div>正文长度：{material.content.length} 字</div>
              <div>图片数量：{material.images.length} 张</div>
            </div>
          </div>
          <div style={{ marginTop: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>拖拽上传</div>
            <div
              style={{
                padding: 20,
                border: '2px dashed var(--border-color)',
                borderRadius: 8,
                textAlign: 'center',
                fontSize: 12,
                color: '#7F8C8D',
              }}
            >
              将图片拖入编辑区域即可上传
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MaterialEditor
