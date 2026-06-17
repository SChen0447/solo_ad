import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useArchiveStore } from '@/store'
import {
  FileText,
  Image,
  FileCode,
  File,
  Upload,
} from 'lucide-react'

const TYPE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  jpg: Image,
  png: Image,
  svg: FileCode,
  txt: File,
}

const TYPE_COLORS: Record<string, string> = {
  pdf: '#e74c3c',
  svg: '#e67e22',
  png: '#3498db',
  txt: '#27ae60',
  jpg: '#9b59b6',
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function Archive() {
  const files = useArchiveStore((s) => s.files)
  const uploadFile = useArchiveStore((s) => s.uploadFile)
  const navigate = useNavigate()
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const droppedFiles = Array.from(e.dataTransfer.files)
      if (droppedFiles.length === 0) return
      setUploading(true)
      try {
        for (const f of droppedFiles) {
          await uploadFile(f)
        }
      } catch (err) {
        console.error('Upload error:', err)
      }
      setUploading(false)
    },
    [uploadFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragOver(false)
  }, [])

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files
      if (!selected || selected.length === 0) return
      setUploading(true)
      try {
        for (const f of Array.from(selected)) {
          await uploadFile(f)
        }
      } catch (err) {
        console.error('Upload error:', err)
      }
      setUploading(false)
      e.target.value = ''
    },
    [uploadFile]
  )

  return (
    <div className="archive-wrapper">
      <div
        className={`archive-dropzone ${dragOver ? 'drag-over' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <div className="dropzone-content">
          <Upload size={28} className="dropzone-icon" />
          <span className="dropzone-text">
            拖拽文件到此处上传
          </span>
          <span className="dropzone-subtext">
            支持 PDF、JPG、PNG、SVG、TXT，单文件上限 20MB
          </span>
          <label className="dropzone-button">
            选择文件
            <input
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.svg,.txt"
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {uploading && (
          <div className="upload-overlay">
            <div className="upload-spinner" />
            <span>上传中...</span>
          </div>
        )}
      </div>

      <div className="archive-grid">
        {files.map((file) => {
          const IconComp = TYPE_ICONS[file.fileType] || File
          const iconColor = TYPE_COLORS[file.fileType] || '#8b7a6a'
          return (
            <div
              key={file.id}
              className="archive-card"
              onClick={() => navigate(`/detail/${file.id}`)}
              style={{
                animationDelay: `${Math.random() * 0.3}s`,
              }}
            >
              <div className="card-preview">
                {(file.fileType === 'jpg' ||
                  file.fileType === 'png' ||
                  file.fileType === 'svg') &&
                file.dataUrl ? (
                  <img
                    src={file.dataUrl}
                    alt={file.fileName}
                    className="card-preview-img"
                  />
                ) : (
                  <div className="card-preview-placeholder">
                    <IconComp size={36} style={{ color: iconColor }} />
                    <span className="card-preview-ext">
                      .{file.fileType.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              <div className="card-info">
                <div className="card-info-left">
                  <IconComp size={14} style={{ color: iconColor }} />
                  <span className="card-filename" title={file.fileName}>
                    {file.fileName}
                  </span>
                </div>
                <div className="card-info-right">
                  <span className="card-meta">{formatDate(file.uploadTime)}</span>
                  <span className="card-meta">{formatSize(file.fileSize)}</span>
                </div>
              </div>
              {file.tags.length > 0 && (
                <div className="card-tags">
                  {file.tags.map((tag) => (
                    <span key={tag} className="card-tag">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {file.importance > 0 && (
                <div className="card-stars">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span
                      key={i}
                      className={`card-star ${i < file.importance ? 'filled' : ''}`}
                    >
                      ★
                    </span>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {files.length === 0 && !uploading && (
        <div className="archive-empty">
          <File size={48} style={{ color: '#d4c9b3' }} />
          <p>暂无档案，拖拽文件上传开始管理</p>
        </div>
      )}

      <style>{`
        .archive-wrapper {
          flex: 1;
          min-width: 0;
        }
        .archive-dropzone {
          border: 2px dashed #d4c9b3;
          border-radius: 12px;
          padding: 24px;
          margin-bottom: 20px;
          text-align: center;
          transition: all 0.25s ease;
          position: relative;
          background: rgba(245, 240, 225, 0.4);
        }
        .archive-dropzone.drag-over {
          border-color: #8b7a6a;
          background: rgba(232, 217, 200, 0.5);
          transform: scale(1.01);
        }
        .dropzone-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }
        .dropzone-icon {
          color: #8b7a6a;
        }
        .dropzone-text {
          font-size: 15px;
          color: #5a4a3a;
          font-weight: 500;
        }
        .dropzone-subtext {
          font-size: 12px;
          color: #8b7a6a;
        }
        .dropzone-button {
          display: inline-block;
          margin-top: 8px;
          padding: 8px 20px;
          background: #e8d9c8;
          color: #5a4a3a;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.15s;
        }
        .dropzone-button:hover {
          background: #d4c0a8;
        }
        .upload-overlay {
          position: absolute;
          inset: 0;
          background: rgba(245, 240, 225, 0.85);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #5a4a3a;
          font-size: 14px;
        }
        .upload-spinner {
          width: 32px;
          height: 32px;
          border: 3px solid #d4c9b3;
          border-top-color: #8b7a6a;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .archive-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }
        .archive-card {
          background: #f5f0e1;
          border-radius: 10px;
          border: 1px solid #d4c9b3;
          box-shadow: 0 8px 8px rgba(139, 122, 106, 0.08);
          cursor: pointer;
          transition: all 0.25s ease;
          overflow: hidden;
          animation: cardFadeIn 0.5s ease both;
        }
        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .archive-card:hover {
          box-shadow: 0 12px 16px rgba(139, 122, 106, 0.15);
          transform: translateY(-2px);
        }
        .card-preview {
          height: 120px;
          background: #ede7d9;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .card-preview-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .card-preview-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .card-preview-ext {
          font-size: 11px;
          color: #8b7a6a;
          font-weight: 600;
        }
        .card-info {
          padding: 10px 12px;
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          gap: 8px;
        }
        .card-info-left {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }
        .card-filename {
          font-size: 13px;
          color: #5a4a3a;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .card-info-right {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }
        .card-meta {
          font-size: 11px;
          color: #8b7a6a;
        }
        .card-tags {
          padding: 0 12px 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
        }
        .card-tag {
          height: 22px;
          padding: 0 8px;
          background: #e8d9c8;
          color: #5a4a3a;
          border-radius: 4px;
          font-size: 11px;
          line-height: 22px;
          transition: background 0.15s;
        }
        .card-tag:hover {
          background: #d4c0a8;
        }
        .card-stars {
          padding: 0 12px 8px;
          display: flex;
          gap: 2px;
        }
        .card-star {
          font-size: 12px;
          color: #d4c9b3;
        }
        .card-star.filled {
          color: #e6a817;
        }
        .archive-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          color: #8b7a6a;
          gap: 12px;
        }
        .archive-empty p {
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .archive-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>
    </div>
  )
}
