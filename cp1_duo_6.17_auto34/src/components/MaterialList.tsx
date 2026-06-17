import React, { useState, useMemo, useRef } from 'react'
import { useAppContext } from '../context/AppContext'
import { createMaterial } from '../api'

const MaterialList: React.FC = () => {
  const {
    materials,
    tags,
    selectedMaterialId,
    selectMaterial,
    addMaterial,
    addTag,
    searchKeyword,
    setSearchKeyword,
    filterTagId,
    setFilterTagId,
  } = useAppContext()

  const [searchDisplay, setSearchDisplay] = useState('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showTagInput, setShowTagInput] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [isCreating, setIsCreating] = useState(false)

  const handleSearch = (value: string) => {
    setSearchDisplay(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      setSearchKeyword(value)
    }, 200)
  }

  const filteredMaterials = useMemo(() => {
    const kw = searchKeyword.trim().toLowerCase()
    return materials.filter(m => {
      if (filterTagId && !m.tags.includes(filterTagId)) return false
      if (kw && !m.title.toLowerCase().includes(kw) && !m.content.toLowerCase().includes(kw)) return false
      return true
    })
  }, [materials, searchKeyword, filterTagId])

  const handleCreate = async () => {
    setIsCreating(true)
    try {
      const newMat = await createMaterial({
        title: '新建素材',
        content: '',
        images: [],
        tags: filterTagId ? [filterTagId] : [],
      })
      addMaterial(newMat)
      selectMaterial(newMat.id)
    } finally {
      setIsCreating(false)
    }
  }

  const getTagById = (id: string) => tags.find(t => t.id === id)

  const handleAddTag = () => {
    if (!newTagName.trim()) {
      setShowTagInput(false)
      return
    }
    const colors = ['#E74C3C', '#3498DB', '#27AE60', '#9B59B6', '#F39C12', '#1ABC9C', '#E67E22']
    const color = colors[Math.floor(Math.random() * colors.length)]
    const newTag = { id: `t_${Date.now()}`, name: newTagName.trim(), color }
    addTag(newTag)
    setNewTagName('')
    setShowTagInput(false)
  }

  return (
    <div className="card shadow-md" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>素材列表</span>
        <button className="btn btn-primary" style={{ padding: '4px 12px', fontSize: 13 }} onClick={handleCreate} disabled={isCreating}>
          {isCreating ? '创建中...' : '+ 新建'}
        </button>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border-color)' }}>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <input
            type="text"
            placeholder="搜索标题或内容..."
            value={searchDisplay}
            onChange={e => handleSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '8px 12px 8px 34px',
              border: '1px solid var(--border-color)',
              borderRadius: 8,
              fontSize: 13,
              background: '#FAFBFC',
            }}
          />
          <svg
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#7F8C8D' }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <span
            className={`tag ${!filterTagId ? '' : ''}`}
            style={{
              background: !filterTagId ? 'var(--accent-blue)' : '#E0E6ED',
              color: !filterTagId ? '#fff' : '#7F8C8D',
              cursor: 'pointer',
            }}
            onClick={() => setFilterTagId(null)}
          >
            全部
          </span>
          {tags.map(tag => (
            <span
              key={tag.id}
              className="tag"
              style={{
                background: filterTagId === tag.id ? tag.color : '#E0E6ED',
                color: filterTagId === tag.id ? '#fff' : '#7F8C8D',
                cursor: 'pointer',
              }}
              onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
            >
              {tag.name}
            </span>
          ))}
          {showTagInput ? (
            <input
              autoFocus
              placeholder="新标签"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              onBlur={handleAddTag}
              onKeyDown={e => e.key === 'Enter' && handleAddTag()}
              style={{
                width: 80,
                padding: '3px 8px',
                fontSize: 12,
                borderRadius: 999,
                border: '1px solid var(--accent-blue)',
                outline: 'none',
              }}
            />
          ) : (
            <span
              className="tag"
              style={{ background: '#FAFBFC', color: '#7F8C8D', border: '1px dashed #CBD2D9', cursor: 'pointer' }}
              onClick={() => setShowTagInput(true)}
            >
              + 新建
            </span>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        {filteredMaterials.map((m, idx) => (
          <div
            key={m.id}
            className={`material-list-item fade-in ${selectedMaterialId === m.id ? 'selected' : ''}`}
            style={{ animationDelay: `${idx * 0.02}s` }}
            onClick={() => selectMaterial(m.id)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ fontWeight: 500, fontSize: 14, flex: 1, marginRight: 8 }}>{m.title || '无标题'}</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, flexShrink: 0 }}>
                {m.tags.map(tid => {
                  const t = getTagById(tid)
                  return t ? (
                    <span key={tid} className="tag" style={{ background: t.color, padding: '2px 8px', fontSize: 11 }}>
                      {t.name}
                    </span>
                  ) : null
                })}
              </div>
            </div>
            <div style={{ fontSize: 12, color: '#7F8C8D', lineHeight: 1.5, marginBottom: 6 }}>
              {m.content.slice(0, 50) || '暂无内容'}...
            </div>
            <div style={{ fontSize: 11, color: '#9AA5B1' }}>
              更新于 {new Date(m.updatedAt).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        {filteredMaterials.length === 0 && (
          <div style={{ padding: '32px 16px', textAlign: 'center', color: '#7F8C8D', fontSize: 13 }}>
            {searchKeyword || filterTagId ? '没有匹配的素材' : '暂无素材，点击上方新建按钮创建'}
          </div>
        )}
      </div>
    </div>
  )
}

export default MaterialList
