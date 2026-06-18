import { useEffect, useRef, useCallback } from 'react'
import { useAppStore } from './store'
import { generateMosaicBlocks, generateSVG } from './utils/mosaic'
import ImageUploader from './components/ImageUploader'
import MosaicCanvas from './components/MosaicCanvas'
import ControlPanel from './components/ControlPanel'
import { saveAs } from 'file-saver'

const App = () => {
  const {
    imageData,
    imageSrc,
    pixelSize,
    colorLevels,
    lockedColors,
    setMosaicBlocks,
    setAnimationKey,
    animationKey,
    removeLockedColor,
  } = useAppStore()

  const debounceRef = useRef<number | null>(null)
  const hasImage = !!imageData

  useEffect(() => {
    if (!imageData) {
      setMosaicBlocks([])
      return
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = window.setTimeout(() => {
      const blocks = generateMosaicBlocks(imageData, pixelSize, colorLevels, lockedColors)
      setMosaicBlocks(blocks)
      setAnimationKey(animationKey + 1)
    }, 200)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [imageData, pixelSize, colorLevels, lockedColors])

  const handleExportSVG = useCallback(() => {
    if (!imageData) return

    const blocks = generateMosaicBlocks(imageData, pixelSize, colorLevels, lockedColors)
    const svgString = generateSVG(blocks, imageData.width, imageData.height)
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    saveAs(blob, 'pixel-chromatography.svg')
  }, [imageData, pixelSize, colorLevels, lockedColors])

  const handleReset = useCallback(() => {
    useAppStore.setState({
      imageData: null,
      imageSrc: null,
      mosaicBlocks: [],
      pixelSize: 16,
      colorLevels: 8,
      animationKey: 0,
    })
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1 className="app-title">像素色谱</h1>
          <p className="app-subtitle">Pixel Chromatography</p>
        </div>
        {hasImage && (
          <div className="header-actions">
            <button className="btn btn-secondary" onClick={handleReset}>
              重新上传
            </button>
            <button className="btn btn-primary" onClick={handleExportSVG}>
              导出 SVG
            </button>
          </div>
        )}
      </header>

      <main className="app-main">
        {!hasImage ? (
          <div className="upload-section">
            <ImageUploader />
          </div>
        ) : (
          <>
            <div className="control-section">
              <ControlPanel />
            </div>

            <div className="preview-section">
              <div className="preview-panel">
                <div className="panel-label">原图</div>
                <div className="original-image-wrapper">
                  <img src={imageSrc || ''} alt="原图" className="original-image" />
                </div>
              </div>

              <div className="preview-panel mosaic-panel">
                <div className="panel-label">马赛克效果</div>
                <div className="mosaic-wrapper-inner">
                  <MosaicCanvas />
                </div>
              </div>
            </div>

            <div className="palette-section">
              <div className="palette-header">
                <span className="palette-title">锁定调色板</span>
                <span className="palette-count">{lockedColors.length} 种颜色</span>
              </div>
              <div className="palette-colors">
                {lockedColors.length === 0 ? (
                  <span className="palette-empty">点击马赛克色块锁定颜色</span>
                ) : (
                  lockedColors.map((color) => (
                    <div
                      key={color.id}
                      className="palette-color"
                      style={{ backgroundColor: color.hex }}
                      title={`${color.hex} - 点击移除`}
                      onClick={() => removeLockedColor(color.id)}
                    >
                      <div className="lock-icon">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                        </svg>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <style>{`
        * {
          box-sizing: border-box;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
          background: #ECF0F1;
          color: #2C3E50;
          min-width: 768px;
        }
        .app {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
        }
        .app-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px 32px;
          background: #2C3E50;
          color: white;
        }
        .header-content {
          display: flex;
          align-items: baseline;
          gap: 12px;
        }
        .app-title {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          letter-spacing: 2px;
        }
        .app-subtitle {
          font-size: 13px;
          color: rgba(255, 255, 255, 0.6);
          margin: 0;
          letter-spacing: 1px;
        }
        .header-actions {
          display: flex;
          gap: 12px;
        }
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease-out;
        }
        .btn-primary {
          background: #3498DB;
          color: white;
        }
        .btn-primary:hover {
          background: #2980B9;
          transform: translateY(-1px);
        }
        .btn-secondary {
          background: rgba(255, 255, 255, 0.1);
          color: white;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .btn-secondary:hover {
          background: rgba(255, 255, 255, 0.2);
        }
        .app-main {
          flex: 1;
          padding: 24px 32px;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }
        .upload-section {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 40px;
        }
        .upload-section > * {
          max-width: 500px;
          width: 100%;
        }
        .control-section {
          flex-shrink: 0;
        }
        .preview-section {
          display: flex;
          gap: 24px;
          flex: 1;
          min-height: 0;
        }
        .preview-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
        }
        .panel-label {
          font-size: 14px;
          font-weight: 500;
          color: #2C3E50;
          margin-bottom: 10px;
        }
        .original-image-wrapper {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #EBF0F5;
          border-radius: 8px;
          overflow: hidden;
          padding: 20px;
        }
        .original-image {
          max-width: 100%;
          max-height: 400px;
          object-fit: contain;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-radius: 4px;
        }
        .mosaic-wrapper-inner {
          flex: 1;
          display: flex;
          align-items: stretch;
          justify-content: stretch;
        }
        .mosaic-wrapper-inner > * {
          width: 100%;
          height: 100%;
        }
        .palette-section {
          flex-shrink: 0;
          background: white;
          border-radius: 12px;
          padding: 16px 20px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
        }
        .palette-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }
        .palette-title {
          font-size: 14px;
          font-weight: 600;
          color: #2C3E50;
        }
        .palette-count {
          font-size: 12px;
          color: #7f8c8d;
        }
        .palette-colors {
          display: flex;
          gap: 8px;
          overflow-x: auto;
          padding-bottom: 4px;
          min-height: 40px;
          align-items: center;
        }
        .palette-colors::-webkit-scrollbar {
          height: 6px;
        }
        .palette-colors::-webkit-scrollbar-track {
          background: #ECF0F1;
          border-radius: 3px;
        }
        .palette-colors::-webkit-scrollbar-thumb {
          background: #bdc3c7;
          border-radius: 3px;
        }
        .palette-color {
          width: 32px;
          height: 32px;
          border-radius: 4px;
          cursor: pointer;
          flex-shrink: 0;
          position: relative;
          transition: transform 0.3s ease-out, box-shadow 0.3s ease-out;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
        }
        .palette-color:hover {
          transform: scale(1.15);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
        }
        .lock-icon {
          position: absolute;
          bottom: -2px;
          right: -2px;
          width: 16px;
          height: 16px;
          background: #2C3E50;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0;
          transition: opacity 0.2s ease-out;
        }
        .palette-color:hover .lock-icon {
          opacity: 1;
        }
        .palette-empty {
          font-size: 13px;
          color: #bdc3c7;
          font-style: italic;
        }

        @media (max-width: 768px) {
          body {
            min-width: 100%;
          }
          .app-header {
            padding: 16px 20px;
            flex-direction: column;
            gap: 12px;
            align-items: flex-start;
          }
          .header-actions {
            width: 100%;
          }
          .header-actions .btn {
            flex: 1;
          }
          .app-main {
            padding: 16px;
          }
          .preview-section {
            flex-direction: column;
          }
          .original-image-wrapper {
            min-height: 250px;
          }
          .mosaic-wrapper-inner {
            min-height: 250px;
          }
        }
      `}</style>
    </div>
  )
}

export default App
