import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { BrandProject } from '../../types'
import { brandDB } from '../../store/db'
import { lightenColor, getContrastColor } from '../../utils/colorUtils'
import ColorPicker from '../color/ColorPicker'

const FONT_OPTIONS = [
  'Roboto', 'Inter', 'Open Sans', 'Montserrat', 'Poppins',
  'Lato', 'Raleway', 'Nunito', 'Playfair Display', 'Merriweather'
]

interface Props {
  onSelectProject: (project: BrandProject) => void
  onOpenGenerator: () => void
}

export default function BrandManager({ onSelectProject, onOpenGenerator }: Props) {
  const [projects, setProjects] = useState<BrandProject[]>([])
  const [recentProjects, setRecentProjects] = useState<BrandProject[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingProject, setEditingProject] = useState<BrandProject | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    logoDataUrl: '',
    primaryColor: '#5B7B9A',
    secondaryColor: '#7A95AD',
    accentColor: '#E8913A',
    headingFont: 'Inter',
    bodyFont: 'Roboto'
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    const all = await brandDB.getAll()
    setProjects(all)
    setRecentProjects(all.slice(0, 4))
  }

  const openCreateModal = () => {
    setEditingProject(null)
    setFormData({
      name: '',
      logoDataUrl: '',
      primaryColor: '#5B7B9A',
      secondaryColor: '#7A95AD',
      accentColor: '#E8913A',
      headingFont: 'Inter',
      bodyFont: 'Roboto'
    })
    setShowModal(true)
  }

  const openEditModal = (project: BrandProject) => {
    setEditingProject(project)
    setFormData({
      name: project.name,
      logoDataUrl: project.logoDataUrl,
      primaryColor: project.primaryColor,
      secondaryColor: project.secondaryColor,
      accentColor: project.accentColor,
      headingFont: project.headingFont,
      bodyFont: project.bodyFont
    })
    setShowModal(true)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setFormData(prev => ({ ...prev, logoDataUrl: reader.result as string }))
    }
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!formData.name.trim()) return
    const now = new Date().toISOString()
    if (editingProject) {
      const updated: BrandProject = {
        ...editingProject,
        ...formData,
        lastAccessedAt: now
      }
      await brandDB.update(updated)
    } else {
      const newProject: BrandProject = {
        id: uuidv4(),
        ...formData,
        createdAt: now,
        lastAccessedAt: now
      }
      await brandDB.add(newProject)
    }
    setShowModal(false)
    loadProjects()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此品牌项目？')) return
    await brandDB.delete(id)
    loadProjects()
  }

  const handleCardClick = async (project: BrandProject) => {
    const updated = { ...project, lastAccessedAt: new Date().toISOString() }
    await brandDB.update(updated)
    onSelectProject(updated)
  }

  const copyPrimaryColor = async (e: React.MouseEvent, color: string, id: string) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(color)
      setCopiedId(id)
      setTimeout(() => setCopiedId(null), 1000)
    } catch {}
  }

  const loadFont = (fontName: string) => {
    const safeFont = fontName.replace(/\s+/g, '+')
    if (!document.getElementById(`font-${safeFont}`)) {
      const link = document.createElement('link')
      link.id = `font-${safeFont}`
      link.rel = 'stylesheet'
      link.href = `https://fonts.googleapis.com/css2?family=${safeFont}:wght@400;600;700&display=swap`
      document.head.appendChild(link)
    }
  }

  const renderCard = (project: BrandProject, isRecent = false) => {
    const gradientStart = project.primaryColor
    const gradientEnd = lightenColor(project.primaryColor, 35)
    const textColor = getContrastColor(project.primaryColor)

    return (
      <div
        key={project.id}
        className={`brand-card ${isRecent ? 'recent-card' : ''}`}
        style={{ background: `linear-gradient(135deg, ${gradientStart} 0%, ${gradientEnd} 100%)` }}
        onClick={() => handleCardClick(project)}
      >
        <button
          className="copy-color-btn"
          style={{ color: textColor, borderColor: textColor }}
          onClick={(e) => copyPrimaryColor(e, project.primaryColor, project.id + (isRecent ? '-r' : ''))}
          title="复制主色"
        >
          {copiedId === project.id + (isRecent ? '-r' : '') ? '✓' : '🎨'}
        </button>

        {project.logoDataUrl ? (
          <img src={project.logoDataUrl} alt={project.name} className="brand-logo" />
        ) : (
          <div className="brand-logo-placeholder" style={{ color: textColor }}>
            {project.name.charAt(0).toUpperCase()}
          </div>
        )}

        <h3 className="brand-name" style={{ color: textColor }}>{project.name}</h3>

        <div className="brand-colors-dots">
          <span className="color-dot" style={{ backgroundColor: project.primaryColor }} title="主色" />
          <span className="color-dot" style={{ backgroundColor: project.secondaryColor }} title="辅助色" />
          <span className="color-dot" style={{ backgroundColor: project.accentColor }} title="强调色" />
        </div>

        {!isRecent && (
          <div className="card-actions">
            <button
              className="card-action-btn"
              style={{ color: textColor }}
              onClick={(e) => { e.stopPropagation(); openEditModal(project) }}
            >
              编辑
            </button>
            <button
              className="card-action-btn"
              style={{ color: textColor }}
              onClick={(e) => { e.stopPropagation(); handleDelete(project.id) }}
            >
              删除
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="view-container">
      <div className="home-header">
        <div>
          <h1 className="app-title">Brand Studio</h1>
          <p className="app-subtitle">品牌视觉资产管理与配色方案生成器</p>
        </div>
        <div className="header-actions">
          <button className="btn-secondary" onClick={onOpenGenerator}>
            ✨ 配色生成器
          </button>
          <button className="btn-primary" onClick={openCreateModal}>
            + 新建品牌项目
          </button>
        </div>
      </div>

      {recentProjects.length > 0 && (
        <section className="section">
          <h2 className="section-title">最近访问</h2>
          <div className="recent-grid">
            {recentProjects.map(p => renderCard(p, true))}
          </div>
        </section>
      )}

      <section className="section">
        <h2 className="section-title">所有项目</h2>
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <p>还没有品牌项目，点击上方按钮创建第一个吧！</p>
          </div>
        ) : (
          <div className="brand-grid">
            {projects.map(p => renderCard(p))}
          </div>
        )}
      </section>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 className="modal-title">{editingProject ? '编辑品牌项目' : '新建品牌项目'}</h2>

            <div className="form-group">
              <label>项目名称</label>
              <input
                type="text"
                className="form-input"
                placeholder="输入品牌名称"
                value={formData.name}
                onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label>Logo 图片</label>
              <div className="logo-upload-area">
                {formData.logoDataUrl ? (
                  <div className="logo-preview">
                    <img src={formData.logoDataUrl} alt="预览" />
                    <button
                      className="btn-small"
                      onClick={() => setFormData(p => ({ ...p, logoDataUrl: '' }))}
                    >
                      移除
                    </button>
                  </div>
                ) : (
                  <button
                    className="btn-secondary"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    📷 上传 Logo
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleLogoUpload}
                />
              </div>
            </div>

            <div className="colors-row">
              <ColorPicker
                label="主色"
                value={formData.primaryColor}
                onChange={v => setFormData(p => ({ ...p, primaryColor: v }))}
              />
              <ColorPicker
                label="辅助色"
                value={formData.secondaryColor}
                onChange={v => setFormData(p => ({ ...p, secondaryColor: v }))}
              />
              <ColorPicker
                label="强调色"
                value={formData.accentColor}
                onChange={v => setFormData(p => ({ ...p, accentColor: v }))}
              />
            </div>

            <div className="form-row">
              <div className="form-group flex-1">
                <label>标题字体</label>
                <select
                  className="form-input"
                  value={formData.headingFont}
                  onChange={e => {
                    loadFont(e.target.value)
                    setFormData(p => ({ ...p, headingFont: e.target.value }))
                  }}
                  style={{ fontFamily: formData.headingFont }}
                >
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="form-group flex-1">
                <label>正文字体</label>
                <select
                  className="form-input"
                  value={formData.bodyFont}
                  onChange={e => {
                    loadFont(e.target.value)
                    setFormData(p => ({ ...p, bodyFont: e.target.value }))
                  }}
                  style={{ fontFamily: formData.bodyFont }}
                >
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div className="font-preview" style={{ fontFamily: formData.headingFont }}>
              标题预览 - The quick brown fox
            </div>
            <div className="font-preview body-preview" style={{ fontFamily: formData.bodyFont }}>
              正文预览 - 这是一段正文示例文字，展示选中字体的效果。
            </div>

            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowModal(false)}>取消</button>
              <button className="btn-primary" onClick={handleSubmit}>
                {editingProject ? '保存修改' : '创建项目'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
