import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import type { ComponentVersion, DiffResult } from '../types'
import { calculateDiff, drawImageOnCanvas, createHeatmapCanvas } from '../utils/diffCalculator'

interface VersionTimelineProps {
  versions: ComponentVersion[]
  componentName: string
}

const VersionTimeline: React.FC<VersionTimelineProps> = ({ versions, componentName }) => {
  const navigate = useNavigate()
  const [selectedVersionIds, setSelectedVersionIds] = useState<string[]>([])
  const [showDiff, setShowDiff] = useState(false)
  const [diffResult, setDiffResult] = useState<DiffResult | null>(null)
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.7)
  const [isComputingDiff, setIsComputingDiff] = useState(false)
  const originalCanvasRef = useRef<HTMLCanvasElement>(null)
  const diffCanvasRef = useRef<HTMLCanvasElement>(null)

  const sortedVersions = [...versions].sort(
    (a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime()
  )

  const toggleSelect = (id: string) => {
    setSelectedVersionIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((v) => v !== id)
      }
      if (prev.length >= 2) {
        return [prev[1], id]
      }
      return [...prev, id]
    })
    setShowDiff(false)
    setDiffResult(null)
  }

  const handleCompare = async () => {
    if (selectedVersionIds.length !== 2) return
    const v1 = versions.find((v) => v.id === selectedVersionIds[0])
    const v2 = versions.find((v) => v.id === selectedVersionIds[1])
    if (!v1 || !v2) return

    setIsComputingDiff(true)
    try {
      const result = await calculateDiff(v1.imageUrl, v2.imageUrl)
      setDiffResult(result)
      setShowDiff(true)
    } catch (err) {
      console.error('Diff calculation failed:', err)
    } finally {
      setIsComputingDiff(false)
    }
  }

  useEffect(() => {
    if (showDiff && diffResult && originalCanvasRef.current && diffCanvasRef.current) {
      const ctx1 = originalCanvasRef.current.getContext('2d')
      const ctx2 = diffCanvasRef.current.getContext('2d')
      if (ctx1 && ctx2) {
        originalCanvasRef.current.width = diffResult.width
        originalCanvasRef.current.height = diffResult.height
        diffCanvasRef.current.width = diffResult.width
        diffCanvasRef.current.height = diffResult.height

        const baseVersion = versions.find((v) => v.id === selectedVersionIds[1])
        if (baseVersion) {
          drawImageOnCanvas(ctx1, baseVersion.imageUrl).then(() => {
            drawImageOnCanvas(ctx2, baseVersion.imageUrl).then(() => {
              createHeatmapCanvas(ctx2, diffResult.heatmapBase64, heatmapOpacity)
            })
          })
        }
      }
    }
  }, [showDiff, diffResult, selectedVersionIds, versions])

  useEffect(() => {
    if (diffResult && diffCanvasRef.current) {
      const ctx = diffCanvasRef.current.getContext('2d')
      if (ctx) {
        const baseVersion = versions.find((v) => v.id === selectedVersionIds[1])
        if (baseVersion) {
          ctx.clearRect(0, 0, diffResult.width, diffResult.height)
          drawImageOnCanvas(ctx, baseVersion.imageUrl).then(() => {
            createHeatmapCanvas(ctx, diffResult.heatmapBase64, heatmapOpacity)
          })
        }
      }
    }
  }, [heatmapOpacity, diffResult, selectedVersionIds, versions])

  const clearSelection = () => {
    setSelectedVersionIds([])
    setShowDiff(false)
    setDiffResult(null)
  }

  return (
    <div className="timeline-container">
      <div className="timeline-header">
        <h2>{componentName} · 版本时间轴</h2>
        <div className="timeline-actions">
          {selectedVersionIds.length > 0 && (
            <span className="selected-count">已选择 {selectedVersionIds.length} 个版本</span>
          )}
          {selectedVersionIds.length === 2 && (
            <>
              <motion.button
                className="btn-primary"
                whileTap={{ scale: 0.95 }}
                onClick={handleCompare}
                disabled={isComputingDiff}
              >
                {isComputingDiff ? '计算中...' : '对比差异'}
              </motion.button>
              <motion.button
                className="btn-secondary"
                whileTap={{ scale: 0.95 }}
                onClick={clearSelection}
              >
                清除选择
              </motion.button>
            </>
          )}
        </div>
      </div>

      {showDiff && diffResult && (
        <motion.div
          className="diff-viewer"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <div className="diff-header">
            <h3>差异对比结果 · 差异率: {(diffResult.diffPercentage * 100).toFixed(2)}%</h3>
            <div className="diff-controls">
              <label>热力图透明度:</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={heatmapOpacity}
                onChange={(e) => setHeatmapOpacity(parseFloat(e.target.value))}
              />
              <span>{(heatmapOpacity * 100).toFixed(0)}%</span>
            </div>
          </div>
          <div className="diff-canvases">
            <div className="diff-canvas-wrapper">
              <p className="diff-label">原始版本</p>
              <canvas ref={originalCanvasRef} className="diff-canvas" />
            </div>
            <div className="diff-canvas-wrapper">
              <p className="diff-label">差异热力图</p>
              <canvas ref={diffCanvasRef} className="diff-canvas" />
            </div>
          </div>
          <div className="diff-legend">
            <div className="legend-item">
              <div className="legend-color" style={{ background: 'transparent' }} />
              <span>0-30% (无差异)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#FFD93D' }} />
              <span>30-60% (中等差异)</span>
            </div>
            <div className="legend-item">
              <div className="legend-color" style={{ background: '#FF6B6B' }} />
              <span>60-100% (显著差异)</span>
            </div>
          </div>
        </motion.div>
      )}

      <div className="timeline-scroll">
        <AnimatePresence>
          {sortedVersions.map((version, index) => (
            <motion.div
              key={version.id}
              className={`version-card ${selectedVersionIds.includes(version.id) ? 'selected' : ''}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              onClick={() => toggleSelect(version.id)}
              onDoubleClick={() => navigate(`/component/${encodeURIComponent(componentName)}/${version.id}`)}
            >
              <div className="card-image-wrap">
                <img src={version.imageUrl} alt={version.componentName} className="card-image" />
              </div>
              <div className="card-body">
                <div className="card-title">
                  <span className="version-badge">v{version.version}</span>
                  <span className="card-date">{new Date(version.uploadDate).toLocaleDateString()}</span>
                </div>
                <div className="card-colors">
                  {version.colors.map((c, i) => (
                    <div
                      key={i}
                      className="color-swatch"
                      style={{ backgroundColor: c.hex }}
                      title={`${c.hex} (${(c.percentage * 100).toFixed(1)}%)`}
                    />
                  ))}
                </div>
                <div className="card-fonts">
                  {version.fonts.slice(0, 2).map((f, i) => (
                    <span key={i} className="font-tag">{f.name}</span>
                  ))}
                  {version.fonts.length > 2 && (
                    <span className="font-tag font-tag-more">+{version.fonts.length - 2}</span>
                  )}
                </div>
              </div>
              <div className="card-tooltip">
                <p>双击查看详情</p>
                <p>单击选择对比</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {sortedVersions.length === 0 && (
        <div className="timeline-empty">
          <p>该组件暂无版本，请上传设计稿</p>
        </div>
      )}
    </div>
  )
}

export default VersionTimeline
