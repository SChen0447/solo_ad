import { useState, useRef } from 'react'

interface DrawingControlsProps {
  selectedColor: string
  onColorChange: (color: string) => void
  presetColors: string[]
  brushSize: number
  onBrushSizeChange: (size: number) => void
  brushSizes: number[]
  undoCount: number
  onUndo: () => void
  onSave: () => void
}

function DrawingControls({
  selectedColor,
  onColorChange,
  presetColors,
  brushSize,
  onBrushSizeChange,
  brushSizes,
  undoCount,
  onUndo,
  onSave,
}: DrawingControlsProps) {
  const [ripple, setRipple] = useState(false)
  const customColorRef = useRef<HTMLInputElement>(null)

  const handleSaveClick = () => {
    setRipple(true)
    onSave()
    setTimeout(() => setRipple(false), 300)
  }

  const handleUndoClick = () => {
    onUndo()
  }

  const handleCustomColorClick = () => {
    customColorRef.current?.click()
  }

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onColorChange(e.target.value)
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>咖啡拉花设计</h2>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>颜色选择</h3>
        <div style={styles.colorPalette}>
          {presetColors.map((color) => (
            <button
              key={color}
              style={{
                ...styles.colorButton,
                backgroundColor: color,
                ...(selectedColor === color ? styles.colorButtonActive : {}),
              }}
              onClick={() => onColorChange(color)}
              aria-label={`颜色 ${color}`}
            />
          ))}
          <button
            style={{
              ...styles.colorButton,
              ...styles.customColorButton,
              background: `linear-gradient(135deg, #ff6b6b, #4ecdc4, #45b7d1)`,
            }}
            onClick={handleCustomColorClick}
            aria-label="自定义颜色"
          >
            <span style={styles.customColorIcon}>+</span>
          </button>
          <input
            ref={customColorRef}
            type="color"
            value={selectedColor}
            onChange={handleCustomColorChange}
            style={styles.hiddenColorInput}
          />
        </div>
        <div style={styles.currentColorDisplay}>
          <div style={{ ...styles.currentColorSwatch, backgroundColor: selectedColor }} />
          <span style={styles.currentColorText}>{selectedColor}</span>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>笔刷大小</h3>
        <div style={styles.brushSizes}>
          {brushSizes.map((size, index) => (
            <button
              key={size}
              style={{
                ...styles.brushButton,
                ...(brushSize === size ? styles.brushButtonActive : {}),
              }}
              onClick={() => onBrushSizeChange(size)}
              aria-label={`笔刷大小 ${size}px`}
            >
              <div
                style={{
                  width: Math.min(size * 2 + 6, 24),
                  height: Math.min(size * 2 + 6, 24),
                  borderRadius: '50%',
                  backgroundColor: '#fff8dc',
                }}
              />
              <span style={styles.brushSizeLabel}>{size}px</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>操作</h3>
        <div style={styles.actionButtons}>
          <button
            style={styles.undoButton}
            onClick={handleUndoClick}
            disabled={undoCount === 0}
          >
            <span style={styles.undoIcon}>↶</span>
            <span>撤销</span>
            {undoCount > 0 && (
              <span style={styles.undoBadge}>{undoCount}</span>
            )}
          </button>
          <button
            className={ripple ? 'save-btn-ripple' : ''}
            style={styles.saveButton}
            onClick={handleSaveClick}
          >
            <span style={styles.saveIcon}>💾</span>
            <span>保存设计</span>
          </button>
        </div>
      </div>

      <div style={styles.tipsSection}>
        <h3 style={styles.sectionTitle}>提示</h3>
        <ul style={styles.tipsList}>
          <li style={styles.tipItem}>在咖啡表面拖拽鼠标进行绘制</li>
          <li style={styles.tipItem}>按 Ctrl+Z 可快速撤销</li>
          <li style={styles.tipItem}>松开鼠标后会有自然扩散效果</li>
          <li style={styles.tipItem}>拖动可旋转查看不同角度</li>
        </ul>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '24px',
    color: '#fff8dc',
    height: '100%',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    margin: 0,
    color: '#fff8dc',
    textShadow: '0 2px 4px rgba(0,0,0,0.3)',
    borderBottom: '2px solid rgba(212, 165, 116, 0.5)',
    paddingBottom: '12px',
  },
  section: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 500,
    margin: 0,
    color: '#d4a574',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
  },
  colorPalette: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  colorButton: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid transparent',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const,
  },
  colorButtonActive: {
    borderColor: '#d4a574',
    boxShadow: '0 0 15px rgba(212, 165, 116, 0.8), 0 2px 8px rgba(0,0,0,0.3)',
    transform: 'scale(1.1)',
  },
  customColorButton: {
    border: '2px dashed #d4a574',
  },
  customColorIcon: {
    fontSize: '20px',
    color: '#fff8dc',
    fontWeight: 'bold',
  },
  hiddenColorInput: {
    display: 'none',
  },
  currentColorDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '8px 12px',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: '8px',
  },
  currentColorSwatch: {
    width: '24px',
    height: '24px',
    borderRadius: '4px',
    border: '1px solid rgba(255,255,255,0.3)',
  },
  currentColorText: {
    fontSize: '12px',
    fontFamily: 'monospace',
    color: '#fff8dc',
  },
  brushSizes: {
    display: 'flex',
    gap: '12px',
  },
  brushButton: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '6px',
    padding: '12px 8px',
    backgroundColor: 'rgba(62, 39, 35, 0.8)',
    border: '2px solid transparent',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  brushButtonActive: {
    borderColor: '#d4a574',
    boxShadow: '0 0 15px rgba(212, 165, 116, 0.6), inset 0 0 10px rgba(212, 165, 116, 0.2)',
  },
  brushSizeLabel: {
    fontSize: '11px',
    color: '#d4a574',
  },
  actionButtons: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  undoButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px 20px',
    backgroundColor: 'rgba(62, 39, 35, 0.8)',
    color: '#fff8dc',
    border: '1px solid rgba(212, 165, 116, 0.5)',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    position: 'relative' as const,
  },
  undoIcon: {
    fontSize: '18px',
  },
  undoBadge: {
    position: 'absolute' as const,
    top: '-8px',
    right: '-8px',
    minWidth: '20px',
    height: '20px',
    padding: '0 6px',
    backgroundColor: '#e74c3c',
    color: 'white',
    fontSize: '11px',
    fontWeight: 'bold',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
  },
  saveButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 24px',
    backgroundColor: '#d4a574',
    color: '#3e2723',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 12px rgba(212, 165, 116, 0.4)',
    position: 'relative' as const,
    overflow: 'hidden',
  },
  saveButtonRipple: {
    animation: 'ripple 0.3s ease-out',
  },
  saveIcon: {
    fontSize: '18px',
  },
  tipsSection: {
    marginTop: 'auto',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.1)',
  },
  tipsList: {
    margin: 0,
    paddingLeft: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  tipItem: {
    fontSize: '12px',
    color: 'rgba(255, 248, 220, 0.7)',
    lineHeight: 1.5,
  },
}

export default DrawingControls
