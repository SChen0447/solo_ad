import { useRef, useState } from 'react'
import { useAppStore, FragmentData } from '../store/appStore'

interface FragmentListProps {
  onFilesSelected: (files: FileList) => void
}

export function FragmentList({ onFilesSelected }: FragmentListProps) {
  const fragments = useAppStore((s) => s.fragments)
  const selectedFragmentId = useAppStore((s) => s.selectedFragmentId)
  const selectFragment = useAppStore((s) => s.selectFragment)
  const removeFragment = useAppStore((s) => s.removeFragment)
  const panelExpanded = useAppStore((s) => s.panelExpanded.fragmentList)
  const setPanelExpanded = useAppStore((s) => s.setPanelExpanded)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files)
      e.target.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  return (
    <div className="panel" style={{ marginBottom: '12px' }}>
      <div
        className="panel-header"
        onClick={() => setPanelExpanded('fragmentList', !panelExpanded)}
      >
        <span className="panel-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 6h-8l-2-2H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm0 12H4V8h16v10z" />
          </svg>
          碎片列表
          <span className="fragment-count">({fragments.length})</span>
        </span>
        <svg
          className={`chevron ${panelExpanded ? 'expanded' : ''}`}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="currentColor"
        >
          <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6z" />
        </svg>
      </div>

      <div
        className={`panel-content ${panelExpanded ? 'expanded' : ''}`}
        style={{ maxHeight: panelExpanded ? '400px' : '0px' }}
      >
        <div
          className={`upload-zone ${isDragging ? 'dragging' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
          </svg>
          <p>拖拽或点击上传 OBJ 文件</p>
          <p className="upload-hint">最多8个，单个文件≤20MB</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".obj"
            multiple
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
        </div>

        <div className="fragment-cards">
          {fragments.length === 0 && (
            <div className="empty-state">暂无碎片，请上传OBJ文件</div>
          )}
          {fragments.map((fragment) => (
            <FragmentCard
              key={fragment.id}
              fragment={fragment}
              isSelected={selectedFragmentId === fragment.id}
              formatFileSize={formatFileSize}
              onSelect={() => selectFragment(fragment.id)}
              onRemove={() => removeFragment(fragment.id)}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

interface FragmentCardProps {
  fragment: FragmentData
  isSelected: boolean
  formatFileSize: (bytes: number) => string
  onSelect: () => void
  onRemove: () => void
}

function FragmentCard({
  fragment,
  isSelected,
  formatFileSize,
  onSelect,
  onRemove
}: FragmentCardProps) {
  return (
    <div
      className={`fragment-card ${isSelected ? 'selected' : ''} ${fragment.isAnimating ? 'animating' : ''}`}
      onClick={onSelect}
    >
      <div className="fragment-thumbnail">
        {fragment.thumbnail ? (
          <img src={fragment.thumbnail} alt={fragment.name} />
        ) : (
          <div className="thumbnail-placeholder">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" />
            </svg>
          </div>
        )}
        {isSelected && (
          <div className="selected-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
        )}
      </div>
      <div className="fragment-info">
        <div className="fragment-name" title={fragment.name}>
          {fragment.name}
        </div>
        <div className="fragment-size">{formatFileSize(fragment.size)}</div>
        <div className="fragment-status">
          {fragment.geometry ? '已加载' : '加载中...'}
          {fragment.edgePoints.length > 0 && (
            <span className="status-dot" style={{ background: '#44ff88' }} />
          )}
        </div>
      </div>
      <button
        className="remove-btn"
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        title="删除碎片"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
        </svg>
      </button>
    </div>
  )
}
