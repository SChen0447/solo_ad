import { useState, useRef, useEffect } from 'react'
import { useAppStore, BALL_COLORS } from '../store/useAppStore'
import type { OrnamentType, BallColor } from '../store/useAppStore'
import './UIControlPanel.css'

const ornamentTypes: { type: OrnamentType; name: string; icon: string }[] = [
  { type: 'ball', name: '彩球', icon: '🔴' },
  { type: 'star', name: '星星', icon: '⭐' },
  { type: 'gift', name: '礼物盒', icon: '🎁' }
]

const ballColors: { color: BallColor; name: string }[] = [
  { color: 'red', name: '红色' },
  { color: 'gold', name: '金色' },
  { color: 'blue', name: '蓝色' },
  { color: 'silver', name: '银色' }
]

export function UIControlPanel() {
  const {
    selectedOrnamentType,
    selectedBallColor,
    ornamentSize,
    blessingText,
    isMobilePanelOpen,
    setSelectedOrnamentType,
    setSelectedBallColor,
    setOrnamentSize,
    setBlessingText,
    saveToLocalStorage,
    generateShareLink,
    showToastMessage,
    setIsMobilePanelOpen
  } = useAppStore()

  const panelRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startY, setStartY] = useState(0)
  const [panelHeight, setPanelHeight] = useState(0)

  useEffect(() => {
    const checkMobile = () => {
      if (window.innerWidth >= 768) {
        setIsMobilePanelOpen(false)
      }
    }
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobilePanelOpen])

  const handleShare = () => {
    const link = generateShareLink()
    navigator.clipboard.writeText(link).then(() => {
      showToastMessage('分享链接已复制到剪贴板！')
    }).catch(() => {
      showToastMessage('复制失败，请手动复制')
    })
  }

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (window.innerWidth >= 768) return
    setIsDragging(true)
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    setStartY(clientY)
    setPanelHeight(panelRef.current?.clientHeight || 300)
  }

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging) return
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
    const deltaY = startY - clientY
    
    if (deltaY > 50 && !isMobilePanelOpen) {
      setIsMobilePanelOpen(true)
      setIsDragging(false)
    } else if (deltaY < -50 && isMobilePanelOpen) {
      setIsMobilePanelOpen(false)
      setIsDragging(false)
    }
  }

  const handleDragEnd = () => {
    setIsDragging(false)
  }

  const handleOrnamentSelect = (type: OrnamentType) => {
    if (selectedOrnamentType === type) {
      setSelectedOrnamentType(null)
    } else {
      setSelectedOrnamentType(type)
    }
  }

  return (
    <>
      <div
        ref={panelRef}
        className={`control-panel ${isMobilePanelOpen ? 'mobile-open' : ''}`}
      >
        <div
          className="panel-handle"
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
        >
          <div className="handle-bar" />
        </div>

        <div className="panel-content">
          <h2 className="panel-title">装饰品</h2>

          <div className="ornament-types">
            {ornamentTypes.map(({ type, name, icon }) => (
              <button
                key={type}
                className={`ornament-type-btn ${selectedOrnamentType === type ? 'selected' : ''}`}
                onClick={() => handleOrnamentSelect(type)}
              >
                <span className="ornament-icon">{icon}</span>
                <span className="ornament-name">{name}</span>
                {type === 'ball' && (
                  <div
                    className="color-preview"
                    style={{ backgroundColor: BALL_COLORS[selectedBallColor] }}
                  />
                )}
              </button>
            ))}
          </div>

          {selectedOrnamentType === 'ball' && (
            <div className="color-selector">
              <label className="section-label">球的颜色</label>
              <div className="color-options">
                {ballColors.map(({ color, name }) => (
                  <button
                    key={color}
                    className={`color-btn ${selectedBallColor === color ? 'selected' : ''}`}
                    style={{ backgroundColor: BALL_COLORS[color] }}
                    onClick={() => setSelectedBallColor(color)}
                    title={name}
                  />
                ))}
              </div>
            </div>
          )}

          <div className="size-slider">
            <label className="section-label">
              尺寸: <span className="size-value">{ornamentSize.toFixed(2)}</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="0.5"
              step="0.01"
              value={ornamentSize}
              onChange={(e) => setOrnamentSize(parseFloat(e.target.value))}
              className="slider"
            />
            <div className="slider-labels">
              <span>小</span>
              <span>大</span>
            </div>
          </div>

          <div className="blessing-input">
            <label className="section-label">祝福语（最多30字）</label>
            <input
              type="text"
              maxLength={30}
              value={blessingText}
              onChange={(e) => setBlessingText(e.target.value)}
              placeholder="输入你的祝福..."
              className="text-input"
            />
            <span className="char-count">{blessingText.length}/30</span>
          </div>

          <div className="action-buttons">
            <button className="action-btn save-btn" onClick={saveToLocalStorage}>
              💾 保存方案
            </button>
            <button className="action-btn share-btn" onClick={handleShare}>
              🔗 分享
            </button>
          </div>

          <p className="panel-tip">
            选择装饰品后，点击圣诞树即可放置
            <br />
            拖拽可调整位置，右键删除
          </p>
        </div>
      </div>
    </>
  )
}
