import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '../store'
import { countUniqueColors } from '../utils/quantize'

const ControlPanel = () => {
  const { colorLevels, setColorLevels, mosaicBlocks, pixelSize, setPixelSize, imageData } = useAppStore()
  const [displayCount, setDisplayCount] = useState(0)
  const [isFlipping, setIsFlipping] = useState(false)
  const prevCountRef = useRef(0)

  const uniqueColorCount = countUniqueColors(mosaicBlocks.map(b => b.color))

  useEffect(() => {
    if (uniqueColorCount !== prevCountRef.current) {
      setIsFlipping(true)
      const timer = setTimeout(() => {
        setDisplayCount(uniqueColorCount)
        prevCountRef.current = uniqueColorCount
      }, 150)
      const timer2 = setTimeout(() => {
        setIsFlipping(false)
      }, 300)
      return () => {
        clearTimeout(timer)
        clearTimeout(timer2)
      }
    }
  }, [uniqueColorCount])

  const handleLevelsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setColorLevels(parseInt(e.target.value))
  }

  const handlePixelSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPixelSize(parseInt(e.target.value))
  }

  return (
    <div className="control-panel">
      <div className="control-row">
        <div className="control-item">
          <div className="control-header">
            <label className="control-label">颜色量化精度</label>
            <span className="control-value">{colorLevels} 阶</span>
          </div>
          <input
            type="range"
            min="2"
            max="16"
            step="1"
            value={colorLevels}
            onChange={handleLevelsChange}
            className="slider"
            disabled={!imageData}
          />
          <div className="slider-labels">
            <span>2</span>
            <span>16</span>
          </div>
        </div>

        <div className="color-count-wrapper">
          <div className={`color-count ${isFlipping ? 'flipping' : ''}`}>
            <span className="count-number">{displayCount}</span>
            <span className="count-label">种颜色</span>
          </div>
        </div>
      </div>

      <div className="control-row">
        <div className="control-item full-width">
          <div className="control-header">
            <label className="control-label">像素块大小</label>
            <span className="control-value">{pixelSize}px</span>
          </div>
          <input
            type="range"
            min="4"
            max="64"
            step="2"
            value={pixelSize}
            onChange={handlePixelSizeChange}
            className="slider"
            disabled={!imageData}
          />
          <div className="slider-labels">
            <span>4px</span>
            <span>64px</span>
          </div>
        </div>
      </div>

      <style>{`
        .control-panel {
          background: #ECF0F1;
          padding: 20px 24px;
          border-radius: 12px;
        }
        .control-row {
          display: flex;
          gap: 24px;
          align-items: center;
          margin-bottom: 16px;
        }
        .control-row:last-child {
          margin-bottom: 0;
        }
        .control-item {
          flex: 1;
          min-width: 0;
        }
        .control-item.full-width {
          flex: 1;
        }
        .control-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .control-label {
          font-size: 14px;
          color: #2C3E50;
          font-weight: 500;
        }
        .control-value {
          font-size: 14px;
          color: #3498DB;
          font-weight: 600;
        }
        .slider {
          width: 100%;
          height: 6px;
          -webkit-appearance: none;
          appearance: none;
          background: #d5dbdb;
          border-radius: 3px;
          outline: none;
          cursor: pointer;
          transition: all 0.3s ease-out;
        }
        .slider:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          background: #3498DB;
          border-radius: 50%;
          cursor: pointer;
          transition: all 0.3s ease-out;
          box-shadow: 0 2px 6px rgba(52, 152, 219, 0.4);
        }
        .slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
          box-shadow: 0 3px 10px rgba(52, 152, 219, 0.5);
        }
        .slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          background: #3498DB;
          border-radius: 50%;
          cursor: pointer;
          border: none;
          transition: all 0.3s ease-out;
          box-shadow: 0 2px 6px rgba(52, 152, 219, 0.4);
        }
        .slider::-moz-range-thumb:hover {
          transform: scale(1.1);
        }
        .slider-labels {
          display: flex;
          justify-content: space-between;
          margin-top: 4px;
          font-size: 12px;
          color: #95a5a6;
        }
        .color-count-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          min-width: 120px;
        }
        .color-count {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px 20px;
          background: white;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          transition: transform 0.3s ease-out;
        }
        .color-count.flipping {
          animation: flip 0.3s ease-out;
        }
        @keyframes flip {
          0% {
            transform: rotateX(0deg);
          }
          50% {
            transform: rotateX(90deg);
          }
          100% {
            transform: rotateX(0deg);
          }
        }
        .count-number {
          font-size: 28px;
          font-weight: 700;
          color: #3498DB;
          line-height: 1;
        }
        .count-label {
          font-size: 12px;
          color: #7f8c8d;
          margin-top: 4px;
        }

        @media (max-width: 768px) {
          .control-row {
            flex-direction: column;
            gap: 16px;
          }
          .color-count-wrapper {
            width: 100%;
          }
          .color-count {
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}

export default ControlPanel
