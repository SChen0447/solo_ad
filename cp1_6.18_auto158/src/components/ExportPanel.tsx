import { useState, useRef } from 'react'
import { useAppStore } from '../store/appStore'
import { MatchingEngine } from '../engine/MatchingEngine'
import * as THREE from 'three'

interface ExportPanelProps {
  getSceneScreenshot?: () => string | null
}

export function ExportPanel({ getSceneScreenshot }: ExportPanelProps) {
  const fragments = useAppStore((s) => s.fragments)
  const isPreviewMode = useAppStore((s) => s.isPreviewMode)
  const mergedGeometry = useAppStore((s) => s.mergedGeometry)
  const setPreviewMode = useAppStore((s) => s.setPreviewMode)
  const matchHistory = useAppStore((s) => s.matchHistory)
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const handleGeneratePreview = () => {
    if (fragments.length < 2) {
      setExportStatus('至少需要2个碎片才能生成预览')
      setTimeout(() => setExportStatus(null), 3000)
      return
    }

    const geometryData = fragments
      .filter((f) => f.geometry)
      .map((f) => {
        const matrix = new THREE.Matrix4()
        matrix.makeRotationFromEuler(f.rotation)
        matrix.setPosition(f.position)
        matrix.scale(f.scale)
        return {
          geometry: f.geometry!,
          matrix
        }
      })

    if (geometryData.length < 2) {
      setExportStatus('碎片数据未完全加载')
      setTimeout(() => setExportStatus(null), 3000)
      return
    }

    const merged = MatchingEngine.mergeGeometries(geometryData)
    setPreviewMode(true, merged)
    setExportStatus('预览已生成')
    setTimeout(() => setExportStatus(null), 2000)
  }

  const handleExitPreview = () => {
    setPreviewMode(false, null)
  }

  const handleExportOBJ = () => {
    if (!mergedGeometry) {
      setExportStatus('请先生成预览')
      setTimeout(() => setExportStatus(null), 3000)
      return
    }

    setIsExporting(true)
    try {
      const objContent = MatchingEngine.exportOBJ(mergedGeometry)
      const blob = new Blob([objContent], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pottery_reconstruction_${Date.now()}.obj`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportStatus('OBJ模型导出成功')
    } catch (err) {
      setExportStatus('导出失败：' + (err as Error).message)
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportStatus(null), 3000)
    }
  }

  const handleExportReport = () => {
    if (fragments.length === 0) {
      setExportStatus('没有可导出的数据')
      setTimeout(() => setExportStatus(null), 3000)
      return
    }

    setIsExporting(true)
    try {
      const reportContent = generateReportHTML()
      const blob = new Blob([reportContent], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `reconstruction_report_${Date.now()}.html`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setExportStatus('复原报告导出成功')
    } catch (err) {
      setExportStatus('导出失败：' + (err as Error).message)
    } finally {
      setIsExporting(false)
      setTimeout(() => setExportStatus(null), 3000)
    }
  }

  const generateReportHTML = (): string => {
    const screenshot = getSceneScreenshot?.() || ''
    const avgMatchScore =
      matchHistory.length > 0
        ? Math.round(
            matchHistory.reduce((sum, h) => sum + h.score, 0) / matchHistory.length
          )
        : 0

    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>陶器碎片复原报告</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f5f5f5;
      padding: 40px;
      color: #333;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.1);
    }
    h1 {
      color: #1a1a2e;
      border-bottom: 3px solid #e94560;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    h2 {
      color: #16213e;
      margin: 24px 0 16px;
      font-size: 18px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .info-item {
      background: #f8f9fa;
      padding: 16px;
      border-radius: 6px;
      border-left: 3px solid #e94560;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 4px;
    }
    .info-value {
      font-size: 20px;
      font-weight: bold;
      color: #1a1a2e;
    }
    .screenshot {
      width: 100%;
      max-height: 400px;
      object-fit: contain;
      background: #1a1a2e;
      border-radius: 6px;
      margin: 16px 0;
    }
    .fragment-list {
      list-style: none;
    }
    .fragment-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 16px;
      background: #f8f9fa;
      border-radius: 4px;
      margin-bottom: 8px;
    }
    .match-history {
      margin-top: 16px;
    }
    .match-item {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      border-bottom: 1px solid #eee;
    }
    .score-bar {
      height: 6px;
      background: #eee;
      border-radius: 3px;
      overflow: hidden;
      flex: 1;
      margin: 0 16px;
    }
    .score-fill {
      height: 100%;
      background: linear-gradient(90deg, #44ff88, #ffcc44, #ff4444);
      border-radius: 3px;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      text-align: center;
      color: #999;
      font-size: 12px;
    }
    .no-screenshot {
      background: #1a1a2e;
      color: #666;
      padding: 80px;
      text-align: center;
      border-radius: 6px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>🏺 陶器碎片虚拟拼接复原报告</h1>
    
    <h2>📊 拼接概览</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">碎片总数</div>
        <div class="info-value">${fragments.length}</div>
      </div>
      <div class="info-item">
        <div class="info-label">匹配操作次数</div>
        <div class="info-value">${matchHistory.length}</div>
      </div>
      <div class="info-item">
        <div class="info-label">平均匹配度</div>
        <div class="info-value">${avgMatchScore}%</div>
      </div>
      <div class="info-item">
        <div class="info-label">生成时间</div>
        <div class="info-value" style="font-size:14px;">${new Date().toLocaleString('zh-CN')}</div>
      </div>
    </div>

    <h2>🖼️ 最终模型截图</h2>
    ${
      screenshot
        ? `<img src="${screenshot}" class="screenshot" alt="模型截图" />`
        : '<div class="no-screenshot">无截图数据</div>'
    }

    <h2>📁 碎片清单</h2>
    <ul class="fragment-list">
      ${fragments
        .map(
          (f, i) => `
        <li class="fragment-item">
          <span><strong>#${i + 1}</strong> ${f.name}</span>
          <span style="color:#666;">
            位置: (${f.position.x.toFixed(2)}, ${f.position.y.toFixed(2)}, ${f.position.z.toFixed(2)})
          </span>
        </li>
      `
        )
        .join('')}
    </ul>

    <h2>📈 匹配度历史</h2>
    ${
      matchHistory.length > 0
        ? `<div class="match-history">
        ${matchHistory
          .slice(-20)
          .map((h) => {
            const fragA = fragments.find((f) => f.id === h.fragmentAId)
            const fragB = fragments.find((f) => f.id === h.fragmentBId)
            return `
            <div class="match-item">
              <span style="width:200px; font-size:13px;">
                ${fragA?.name || '碎片A'} ↔ ${fragB?.name || '碎片B'}
              </span>
              <div class="score-bar">
                <div class="score-fill" style="width:${h.score}%"></div>
              </div>
              <span style="font-weight:bold; width:60px; text-align:right;">${h.score}%</span>
            </div>
          `
          })
          .join('')}
      </div>`
        : '<p style="color:#666;">暂无匹配记录</p>'
    }

    <h2>📐 尺寸标注</h2>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">X轴范围</div>
        <div class="info-value" style="font-size:14px;">
          ${fragments.length > 0 ? calculateAxisRange(fragments, 'x') : '-'}
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">Y轴范围</div>
        <div class="info-value" style="font-size:14px;">
          ${fragments.length > 0 ? calculateAxisRange(fragments, 'y') : '-'}
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">Z轴范围</div>
        <div class="info-value" style="font-size:14px;">
          ${fragments.length > 0 ? calculateAxisRange(fragments, 'z') : '-'}
        </div>
      </div>
      <div class="info-item">
        <div class="info-label">总体包围盒</div>
        <div class="info-value" style="font-size:14px;">
          ${fragments.length > 0 ? calculateOverallBounds(fragments) : '-'}
        </div>
      </div>
    </div>

    <div class="footer">
      <p>本报告由陶器碎片虚拟拼接系统自动生成</p>
      <p>生成时间: ${new Date().toLocaleString('zh-CN')}</p>
    </div>
  </div>
</body>
</html>`
  }

  const calculateAxisRange = (
    frags: typeof fragments,
    axis: 'x' | 'y' | 'z'
  ): string => {
    const values = frags.map((f) => f.position[axis])
    const min = Math.min(...values).toFixed(2)
    const max = Math.max(...values).toFixed(2)
    return `${min} ~ ${max}`
  }

  const calculateOverallBounds = (frags: typeof fragments): string => {
    const positions = frags.map((f) => f.position)
    const minX = Math.min(...positions.map((p) => p.x))
    const maxX = Math.max(...positions.map((p) => p.x))
    const minY = Math.min(...positions.map((p) => p.y))
    const maxY = Math.max(...positions.map((p) => p.y))
    const minZ = Math.min(...positions.map((p) => p.z))
    const maxZ = Math.max(...positions.map((p) => p.z))
    return `${(maxX - minX).toFixed(1)} × ${(maxY - minY).toFixed(
      1
    )} × ${(maxZ - minZ).toFixed(1)}`
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
          </svg>
          导出操作
        </span>
      </div>

      <div className="panel-content expanded">
        <div className="export-buttons">
          {!isPreviewMode ? (
            <button
              className="btn btn-primary"
              onClick={handleGeneratePreview}
              disabled={fragments.length < 2}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
              </svg>
              生成预览
            </button>
          ) : (
            <button
              className="btn btn-secondary"
              onClick={handleExitPreview}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
              </svg>
              退出预览
            </button>
          )}

          <button
            className="btn btn-success"
            onClick={handleExportOBJ}
            disabled={!mergedGeometry || isExporting}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
            </svg>
            导出 OBJ
          </button>

          <button
            className="btn btn-info"
            onClick={handleExportReport}
            disabled={fragments.length === 0 || isExporting}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" />
            </svg>
            导出报告
          </button>
        </div>

        {exportStatus && (
          <div
            className={`export-status ${
              exportStatus.includes('成功') ? 'success' : 'error'
            }`}
          >
            {exportStatus}
          </div>
        )}

        <div className="export-hints">
          <p>📌 操作提示：</p>
          <ul>
            <li>先调整所有碎片至合适位置</li>
            <li>点击"生成预览"查看合并效果</li>
            <li>绿色区域表示拼接良好，红色表示断裂</li>
            <li>确认无误后导出模型和报告</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
