import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import type { ComponentVersion } from '../types'
import { getContrastColor } from '../utils/imageProcessor'

interface ComponentDetailProps {
  versions: ComponentVersion[]
  onDelete: (componentName: string, versionId: string) => void
}

const ComponentDetail: React.FC<ComponentDetailProps> = ({ versions, onDelete }) => {
  const { componentName, versionId } = useParams<{ componentName: string; versionId: string }>()
  const navigate = useNavigate()
  const [showConfirm, setShowConfirm] = useState(false)

  const decodedName = decodeURIComponent(componentName || '')
  const version = versions.find((v) => v.id === versionId)

  if (!version) {
    return (
      <div className="detail-notfound">
        <p>未找到该版本</p>
        <motion.button
          className="btn-primary"
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
        >
          返回
        </motion.button>
      </div>
    )
  }

  const handleDelete = async () => {
    try {
      await axios.delete(`/api/versions/${version.id}`)
      onDelete(decodedName, version.id)
      navigate(-1)
    } catch (err) {
      console.error('Delete failed:', err)
    }
  }

  return (
    <motion.div
      className="detail-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="detail-header">
        <motion.button
          className="btn-secondary btn-back"
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
        >
          ← 返回
        </motion.button>
        <h2>{decodedName} · 版本 {version.version}</h2>
        <motion.button
          className="btn-danger"
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowConfirm(true)}
        >
          删除版本
        </motion.button>
      </div>

      <div className="detail-content">
        <div className="detail-image-section">
          <img
            src={version.imageUrl}
            alt={`${version.componentName} v${version.version}`}
            className="detail-large-image"
          />
        </div>

        <div className="detail-info-section">
          <div className="detail-meta">
            <p><strong>上传时间:</strong> {new Date(version.uploadDate).toLocaleString()}</p>
          </div>

          <div className="detail-colors">
            <h3>主色调</h3>
            <div className="colors-grid">
              {version.colors.map((c, i) => (
                <motion.div
                  key={i}
                  className="color-block"
                  style={{ backgroundColor: c.hex }}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <span
                    className="color-hex"
                    style={{ color: getContrastColor(c.hex) }}
                  >
                    {c.hex}
                  </span>
                  <span
                    className="color-percent"
                    style={{ color: getContrastColor(c.hex) }}
                  >
                    {(c.percentage * 100).toFixed(1)}%
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="detail-fonts">
            <h3>字体列表</h3>
            <div className="fonts-list">
              {version.fonts.map((f, i) => (
                <motion.div
                  key={i}
                  className="font-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <span className="font-name">{f.name}</span>
                  <span
                    className="font-sample"
                    style={{ fontFamily: f.name }}
                  >
                    {f.sampleText}
                  </span>
                  <span className="font-confidence">
                    置信度 {(f.confidence * 100).toFixed(0)}%
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showConfirm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowConfirm(false)}
          >
            <motion.div
              className="modal-dialog"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3>确认删除</h3>
              <p>确定要删除版本 {version.version} 吗？此操作不可撤销。</p>
              <div className="modal-actions">
                <motion.button
                  className="btn-secondary"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConfirm(false)}
                >
                  取消
                </motion.button>
                <motion.button
                  className="btn-danger"
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDelete}
                >
                  确认删除
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default ComponentDetail
