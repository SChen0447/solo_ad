import { useState, useCallback, useEffect } from 'react'
import { useStore } from '../store/useStore'

interface ColorPickerProps {
  label: string
  value: string
  onChange: (color: string) => void
}

const ColorPicker = ({ label, value, onChange }: ColorPickerProps) => {
  const [inputValue, setInputValue] = useState(value)

  useEffect(() => {
    setInputValue(value)
  }, [value])

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    if (/^#[0-9A-Fa-f]{6}$/.test(val)) {
      onChange(val)
    }
  }

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    onChange(val)
  }

  return (
    <div style={styles.colorPickerRow}>
      <label style={styles.label}>{label}</label>
      <div style={styles.pickerWrapper}>
        <input
          type="color"
          value={value}
          onChange={handleColorChange}
          style={styles.colorInput}
        />
        <input
          type="text"
          value={inputValue}
          onChange={handleHexChange}
          placeholder="#000000"
          style={styles.hexInput}
        />
      </div>
    </div>
  )
}

interface ControlPanelProps {
  onGenerateThumbnail: () => string
}

const ControlPanel = ({ onGenerateThumbnail }: ControlPanelProps) => {
  const {
    shadeColor,
    poleColor,
    baseColor,
    setShadeColor,
    setPoleColor,
    setBaseColor,
    addSnapshot,
    generateAutoSchemes,
    setShowToast,
    snapshots
  } = useStore()

  const [autoBtnPressed, setAutoBtnPressed] = useState(false)

  const handleColorChange = useCallback((part: 'shade' | 'pole' | 'base', color: string) => {
    if (part === 'shade') setShadeColor(color)
    else if (part === 'pole') setPoleColor(color)
    else setBaseColor(color)

    setTimeout(() => {
      const thumbnail = onGenerateThumbnail()
      const success = addSnapshot(thumbnail)
      if (!success) {
        setShowToast(true, '快照数量已达上限！')
        setTimeout(() => setShowToast(false), 2500)
      }
    }, 50)
  }, [addSnapshot, onGenerateThumbnail, setShadeColor, setPoleColor, setBaseColor, setShowToast])

  const handleAutoGenerate = () => {
    setAutoBtnPressed(true)
    setTimeout(() => setAutoBtnPressed(false), 100)
    generateAutoSchemes(onGenerateThumbnail)
  }

  return (
    <div className="control-panel" style={styles.panel}>
      <h3 style={styles.title}>颜色方案</h3>
      <div style={styles.pickersContainer}>
        <ColorPicker
          label="灯罩"
          value={shadeColor}
          onChange={(color) => handleColorChange('shade', color)}
        />
        <ColorPicker
          label="灯杆"
          value={poleColor}
          onChange={(color) => handleColorChange('pole', color)}
        />
        <ColorPicker
          label="底座"
          value={baseColor}
          onChange={(color) => handleColorChange('base', color)}
        />
      </div>
      <div style={styles.divider} />
      <button
        style={{
          ...styles.button,
          transform: autoBtnPressed ? 'scale(0.95)' : 'scale(1)',
          transition: 'transform 0.1s ease-out'
        }}
        onClick={handleAutoGenerate}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.18)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
        }}
      >
        自动生成方案
      </button>
      <div style={styles.snapshotCount}>
        快照: {snapshots.length} / 6
      </div>
    </div>
  )
}

const styles = {
  panel: {
    width: '220px',
    padding: '20px',
    zIndex: 100
  },
  title: {
    color: '#e0e0e0',
    fontSize: '16px',
    fontWeight: 600,
    marginBottom: '20px',
    textAlign: 'center' as const
  },
  pickersContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px'
  },
  colorPickerRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px'
  },
  label: {
    color: '#e0e0e0',
    fontSize: '13px',
    fontWeight: 500
  },
  pickerWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  colorInput: {
    width: '36px',
    height: '36px',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    padding: 0,
    background: 'none'
  },
  hexInput: {
    flex: 1,
    height: '36px',
    padding: '0 12px',
    background: 'rgba(0, 0, 0, 0.2)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '13px',
    fontFamily: 'monospace',
    outline: 'none',
    textTransform: 'uppercase' as const
  },
  divider: {
    height: '1px',
    background: 'rgba(255, 255, 255, 0.1)',
    margin: '20px 0'
  },
  button: {
    width: '100%',
    height: '36px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '18px',
    color: '#e0e0e0',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background 0.2s ease'
  },
  snapshotCount: {
    marginTop: '12px',
    textAlign: 'center' as const,
    color: 'rgba(224, 224, 224, 0.6)',
    fontSize: '12px'
  }
}

export default ControlPanel
