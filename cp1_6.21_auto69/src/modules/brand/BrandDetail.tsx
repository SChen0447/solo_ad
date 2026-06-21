import { useState, useEffect, useRef } from 'react'
import { BrandProject } from '../../types'
import { brandDB } from '../../store/db'
import ColorPicker from '../color/ColorPicker'
import { getContrastColor } from '../../utils/colorUtils'

const FONT_OPTIONS = [
  'Roboto', 'Inter', 'Open Sans', 'Montserrat', 'Poppins',
  'Lato', 'Raleway', 'Nunito', 'Playfair Display', 'Merriweather'
]

interface AssetItem {
  id: string
  name: string
  value: string
  type: 'logo' | 'color' | 'font'
}

interface Props {
  project: BrandProject
  onBack: () => void
  onUpdate: (project: BrandProject) => void
}

type CategoryKey = 'logo' | 'colors' | 'fonts' | 'icons'

export default function BrandDetail({ project, onBack, onUpdate }: Props) {
  const [currentProject, setCurrentProject] = useState(project)
  const [expanded, setExpanded] = useState<Record<CategoryKey, boolean>>({
    logo: true,
    colors: true,
    fonts: true,
    icons: true
  })
  const [selectedAsset, setSelectedAsset] = useState<AssetItem | null>(null)
  const [editingAsset, setEditingAsset] = useState<AssetItem | null>(null)
  const [editName, setEditName] = useState('')
  const [editingColor, setEditingColor] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCurrentProject(project)
  }, [project])

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

  useEffect(() => {
    loadFont(currentProject.headingFont)
    loadFont(currentProject.bodyFont)
  }, [currentProject.headingFont, currentProject.bodyFont])

  const toggleCategory = (key: CategoryKey) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const persistAndNotify = async (updated: BrandProject) => {
    setCurrentProject(updated)
    await brandDB.update(updated)
    onUpdate(updated)
  }

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      persistAndNotify({
        ...currentProject,
        logoDataUrl: reader.result as string,
        lastAccessedAt: new Date().toISOString()
      })
    }
    reader.readAsDataURL(file)
  }

  const updateColor = (key: 'primaryColor' | 'secondaryColor' | 'accentColor', value: string) => {
    persistAndNotify({ ...currentProject, [key]: value })
  }

  const updateFont = (key: 'headingFont' | 'bodyFont', value: string) => {
    loadFont(value)
    persistAndNotify({ ...currentProject, [key]: value })
  }

  const deleteLogo = () => {
    persistAndNotify({ ...currentProject, logoDataUrl: '' })
    if (selectedAsset?.id === 'logo') setSelectedAsset(null)
  }

  const startEditAsset = (asset: AssetItem) => {
    setEditingAsset(asset)
    setEditName(asset.name)
  }

  const saveAssetName = () => {
    if (!editingAsset) return
    if (editingAsset.type === 'font') {
      // 字体不重命名
    }
    setEditingAsset(null)
  }

  const deleteAsset = (asset: AssetItem) => {
    if (asset.id === 'logo') {
      deleteLogo()
    }
  }

  const copyValue = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {}
  }

  const renderCategory = (
    key: CategoryKey,
    title: string,
    icon: string,
    content: React.ReactNode
  ) => (
    <div className={`accordion-item ${expanded[key] ? 'expanded' : ''}`}>
      <button
        type="button"
        className="accordion-header"
        onClick={() => toggleCategory(key)}
      >
        <span className="accordion-icon">{icon}</span>
        <span className="accordion-title">{title}</span>
        <span className={`accordion-chevron ${expanded[key] ? 'open' : ''}`}>▾</span>
      </button>
      <div className="accordion-content-wrapper">
        <div className="accordion-content">{content}</div>
      </div>
    </div>
  )

  const logoAsset: AssetItem = {
    id: 'logo',
    name: '品牌 Logo',
    value: currentProject.logoDataUrl,
    type: 'logo'
  }

  const colorAssets: AssetItem[] = [
    { id: 'primary', name: '主色', value: currentProject.primaryColor, type: 'color' },
    { id: 'secondary', name: '辅助色', value: currentProject.secondaryColor, type: 'color' },
    { id: 'accent', name: '强调色', value: currentProject.accentColor, type: 'color' }
  ]

  const fontAssets: AssetItem[] = [
    { id: 'heading', name: '标题字体', value: currentProject.headingFont, type: 'font' },
    { id: 'body', name: '正文字体', value: currentProject.bodyFont, type: 'font' }
  ]

  const selectAsset = (asset: AssetItem) => {
    setSelectedAsset(asset)
    setEditingColor(null)
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <button className="btn-back" onClick={onBack}>← 返回首页</button>
        <h1 className="view-title" style={{
          background: `linear-gradient(90deg, ${currentProject.primaryColor}, ${currentProject.accentColor})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          {currentProject.name}
        </h1>
        <div style={{ width: 120 }} />
      </div>

      <div className="detail-layout">
        <aside className="detail-sidebar">
          {renderCategory('logo', 'Logo', '🖼️',
            <div>
              <div
                className={`asset-item ${selectedAsset?.id === 'logo' ? 'selected' : ''}`}
                onClick={() => selectAsset(logoAsset)}
              >
                {currentProject.logoDataUrl ? (
                  <img src={currentProject.logoDataUrl} alt="" className="asset-thumb" />
                ) : (
                  <div className="asset-thumb placeholder">无 Logo</div>
                )}
                <div className="asset-info">
                  {editingAsset?.id === 'logo' ? (
                    <input
                      className="asset-name-input"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onBlur={saveAssetName}
                      onKeyDown={e => e.key === 'Enter' && saveAssetName()}
                      autoFocus
                    />
                  ) : (
                    <span className="asset-name">{currentProject.logoDataUrl ? '品牌 Logo' : '点击上传 Logo'}</span>
                  )}
                </div>
                <div className="asset-actions">
                  <button className="icon-btn" onClick={(e) => {
                    e.stopPropagation()
                    fileInputRef.current?.click()
                  }}>📤</button>
                  {currentProject.logoDataUrl && (
                    <button className="icon-btn" onClick={(e) => {
                      e.stopPropagation()
                      deleteAsset(logoAsset)
                    }}>🗑️</button>
                  )}
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleLogoUpload}
              />
            </div>
          )}

          {renderCategory('colors', '品牌色板', '🎨',
            colorAssets.map((asset, idx) => (
              <div
                key={asset.id}
                className={`asset-item ${selectedAsset?.id === asset.id ? 'selected' : ''}`}
                onClick={() => selectAsset(asset)}
              >
                <div
                  className="asset-thumb color-thumb"
                  style={{ backgroundColor: asset.value }}
                />
                <div className="asset-info">
                  <span className="asset-name">{asset.name}</span>
                  <span className="asset-sub">{asset.value.toUpperCase()}</span>
                </div>
                <div className="asset-actions">
                  <button className="icon-btn" onClick={(e) => {
                    e.stopPropagation()
                    copyValue(asset.value)
                  }} title="复制色值">📋</button>
                </div>
              </div>
            ))
          )}

          {renderCategory('fonts', '字体', '🔤',
            fontAssets.map(asset => (
              <div
                key={asset.id}
                className={`asset-item ${selectedAsset?.id === asset.id ? 'selected' : ''}`}
                onClick={() => selectAsset(asset)}
              >
                <div className="asset-thumb font-thumb" style={{ fontFamily: asset.value }}>
                  Aa
                </div>
                <div className="asset-info">
                  <span className="asset-name">{asset.name}</span>
                  <span className="asset-sub" style={{ fontFamily: asset.value }}>{asset.value}</span>
                </div>
                <div className="asset-actions">
                  <button className="icon-btn" onClick={(e) => {
                    e.stopPropagation()
                    copyValue(asset.value)
                  }} title="复制字体名">📋</button>
                </div>
              </div>
            ))
          )}

          {renderCategory('icons', '图标库', '✨',
            <div className="empty-asset">
              <p>图标资源即将支持</p>
              <p className="hint-small">在后续版本中添加 SVG 图标集合管理</p>
            </div>
          )}
        </aside>

        <section className="detail-preview">
          {!selectedAsset ? (
            <div className="preview-empty">
              <div className="preview-empty-icon">👈</div>
              <h3>从左侧选择一个资产进行预览</h3>
              <p>点击左侧列表中的 Logo、颜色或字体即可在此查看详情</p>
            </div>
          ) : selectedAsset.type === 'logo' ? (
            <div className="preview-section">
              <h3 className="preview-title">Logo 预览</h3>
              {currentProject.logoDataUrl ? (
                <div className="logo-preview-large">
                  <img src={currentProject.logoDataUrl} alt={currentProject.name} />
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🖼️</div>
                  <p>还没有上传 Logo</p>
                  <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
                    上传 Logo
                  </button>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleLogoUpload}
              />
            </div>
          ) : selectedAsset.type === 'color' ? (
            <div className="preview-section">
              <h3 className="preview-title">{selectedAsset.name} 详情</h3>
              <div
                className="color-preview-large"
                style={{
                  backgroundColor: selectedAsset.value,
                  color: getContrastColor(selectedAsset.value)
                }}
              >
                <div className="color-preview-hex">{selectedAsset.value.toUpperCase()}</div>
                <div className="color-preview-label">{selectedAsset.name}</div>
              </div>
              <div className="color-edit-area">
                <h4>编辑色值</h4>
                <ColorPicker
                  value={selectedAsset.value}
                  onChange={v => {
                    if (selectedAsset.id === 'primary') updateColor('primaryColor', v)
                    else if (selectedAsset.id === 'secondary') updateColor('secondaryColor', v)
                    else if (selectedAsset.id === 'accent') updateColor('accentColor', v)
                    setSelectedAsset(prev => prev ? { ...prev, value: v } : null)
                  }}
                />
                <button className="btn-primary" onClick={() => copyValue(selectedAsset.value)}>
                  📋 复制 HEX 值
                </button>
              </div>
              <div className="color-applications">
                <h4>应用效果</h4>
                <div className="application-card" style={{
                  backgroundColor: selectedAsset.value,
                  color: getContrastColor(selectedAsset.value)
                }}>
                  <h5 style={{ fontFamily: currentProject.headingFont }}>示例卡片标题</h5>
                  <p style={{ fontFamily: currentProject.bodyFont }}>
                    这是一段示例正文，展示使用该颜色作为卡片背景的视觉效果。
                  </p>
                  <button style={{
                    background: getContrastColor(selectedAsset.value),
                    color: selectedAsset.value,
                    fontFamily: currentProject.bodyFont
                  }}>
                    按钮示例
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="preview-section">
              <h3 className="preview-title">{selectedAsset.name} 详情</h3>
              <div className="font-preview-large" style={{ fontFamily: selectedAsset.value }}>
                <div className="font-display">Aa 你好</div>
                <div className="font-name">{selectedAsset.value}</div>
              </div>
              <div className="font-edit-area">
                <h4>更换字体</h4>
                <select
                  className="form-input"
                  value={selectedAsset.value}
                  onChange={e => {
                    const fontKey = selectedAsset.id === 'heading' ? 'headingFont' : 'bodyFont'
                    updateFont(fontKey as 'headingFont' | 'bodyFont', e.target.value)
                    setSelectedAsset(prev => prev ? { ...prev, value: e.target.value } : null)
                  }}
                  style={{ fontFamily: selectedAsset.value }}
                >
                  {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
                <button className="btn-primary" onClick={() => copyValue(selectedAsset.value)}>
                  📋 复制字体名
                </button>
              </div>
              <div className="font-samples">
                <h4>字体样例</h4>
                <div className="sample-row" style={{ fontFamily: selectedAsset.value, fontWeight: 700 }}>
                  <span className="sample-label">Bold 700</span>
                  <span className="sample-text">The quick brown fox jumps over the lazy dog</span>
                </div>
                <div className="sample-row" style={{ fontFamily: selectedAsset.value, fontWeight: 600 }}>
                  <span className="sample-label">Semibold 600</span>
                  <span className="sample-text">The quick brown fox jumps over the lazy dog</span>
                </div>
                <div className="sample-row" style={{ fontFamily: selectedAsset.value, fontWeight: 400 }}>
                  <span className="sample-label">Regular 400</span>
                  <span className="sample-text">The quick brown fox jumps over the lazy dog</span>
                </div>
                <div className="sample-row" style={{ fontFamily: selectedAsset.value, fontWeight: 300 }}>
                  <span className="sample-label">Light 300</span>
                  <span className="sample-text">The quick brown fox jumps over the lazy dog</span>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
