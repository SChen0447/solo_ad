import { useState, useMemo, useCallback } from 'react'
import { useAppStore, MosaicBlock, rgbToHex } from '../store'

interface HoverInfo {
  block: MosaicBlock
  x: number
  y: number
}

const MosaicCanvas = () => {
  const { mosaicBlocks, imageData, animationKey, addLockedColor, pixelSize } = useAppStore()
  const [hoveredBlock, setHoveredBlock] = useState<HoverInfo | null>(null)

  const cols = useMemo(() => {
    if (!imageData || mosaicBlocks.length === 0) return 0
    return Math.ceil(imageData.width / pixelSize)
  }, [imageData, pixelSize, mosaicBlocks.length])

  const handleMouseMove = useCallback((e: React.MouseEvent, block: MosaicBlock) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setHoveredBlock({
      block,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredBlock(null)
  }, [])

  const handleBlockClick = useCallback((block: MosaicBlock) => {
    addLockedColor(block.color)
  }, [addLockedColor])

  const animationDelay = useCallback((block: MosaicBlock) => {
    return (block.row * cols + block.col) * 30
  }, [cols])

  const hexColor = hoveredBlock ? rgbToHex(
    hoveredBlock.block.color.r,
    hoveredBlock.block.color.g,
    hoveredBlock.block.color.b
  ) : ''

  if (!imageData || mosaicBlocks.length === 0) {
    return (
      <div className="mosaic-empty">
        <p>上传图片后查看马赛克效果</p>
        <style>{`
          .mosaic-empty {
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            min-height: 300px;
            background: #EBF0F5;
            border-radius: 8px;
            color: #7f8c8d;
          }
        `}</style>
      </div>
    )
  }

  const scale = Math.min(400 / imageData.width, 400 / imageData.height, 1)
  const displayWidth = imageData.width * scale
  const displayHeight = imageData.height * scale

  return (
    <div className="mosaic-wrapper">
      <div
        className="mosaic-container"
        style={{
          width: displayWidth,
          height: displayHeight,
        }}
        key={animationKey}
      >
        {mosaicBlocks.map((block, index) => {
          const delay = animationDelay(block)
          return (
            <div
              key={`${animationKey}-${index}`}
              className="mosaic-block"
              style={{
                left: block.x * scale,
                top: block.y * scale,
                width: block.width * scale,
                height: block.height * scale,
                backgroundColor: `rgb(${block.color.r}, ${block.color.g}, ${block.color.b})`,
                animationDelay: `${delay}ms`,
              }}
              onMouseMove={(e) => handleMouseMove(e, block)}
              onMouseLeave={handleMouseLeave}
              onClick={() => handleBlockClick(block)}
            />
          )
        })}

        {hoveredBlock && (
          <div
            className="tooltip"
            style={{
              left: hoveredBlock.x + 10,
              top: hoveredBlock.y - 40,
            }}
          >
            <div className="tooltip-hex">{hexColor}</div>
            <div className="tooltip-rgb">
              RGB({hoveredBlock.block.color.r}, {hoveredBlock.block.color.g}, {hoveredBlock.block.color.b})
            </div>
          </div>
        )}
      </div>

      <style>{`
        .mosaic-wrapper {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 100%;
          background: #EBF0F5;
          border-radius: 8px;
          overflow: hidden;
          padding: 20px;
          box-sizing: border-box;
        }
        .mosaic-container {
          position: relative;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .mosaic-block {
          position: absolute;
          cursor: pointer;
          opacity: 0;
          animation: fadeIn 0.2s ease-out forwards;
          transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
          z-index: 1;
        }
        .mosaic-block:hover {
          transform: scale(1.3);
          z-index: 10;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
          border-radius: 2px;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .tooltip {
          position: absolute;
          background: #2C3E50;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          pointer-events: none;
          z-index: 100;
          white-space: nowrap;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
          transition: opacity 0.2s ease-out;
        }
        .tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 12px;
          border: 6px solid transparent;
          border-top-color: #2C3E50;
        }
        .tooltip-hex {
          font-weight: 600;
          font-size: 13px;
          margin-bottom: 2px;
        }
        .tooltip-rgb {
          font-size: 11px;
          opacity: 0.8;
        }
      `}</style>
    </div>
  )
}

export default MosaicCanvas
