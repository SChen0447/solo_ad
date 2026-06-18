import React, { useState, useCallback } from 'react'
import { useAppStore } from '../store'
import type { SpectrumStyle, BackgroundPreset, NoiseDensity } from '../types'

interface ControlPanelProps {
  onExport: () => void
}

const styleOptions: { value: SpectrumStyle; label: string; icon: string }[] = [
  { value: 'bar', label: '条形', icon: '▮▮▮' },
  { value: 'wave', label: '波浪', icon: '〰️' },
  { value: 'particle', label: '粒子', icon: '⚫⚫⚫' },
]

const bgOptions: { value: BackgroundPreset; label: string; colors: string[] }[] = [
  { value: 'aurora', label: '极光渐变', colors: ['#00d4ff', '#7b2ff7', '#ff006e'] },
  { value: 'neon', label: '霓虹都市', colors: ['#ff006e', '#8338ec', '#3a86ff'] },
  { value: 'starry', label: '暗夜星空', colors: ['#0f0c29', '#302b63', '#24243e'] },
  { value: 'sunset', label: '暖阳海滩', colors: ['#ff7e5f', '#feb47b', '#ffcc70'] },
]

const densityOptions: { value: NoiseDensity; label: string }[] = [
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
]

export const ControlPanel: React.FC<ControlPanelProps> = ({ onExport }) => {
  const {
    currentStyle,
    background,
    presets,
    selectedPresetId,
    isPanelCollapsed,
    setStyle,
    setBackground,
    addPreset,
    deletePreset,
    selectPreset,
    updatePresetName,
    togglePanel,
    audio,
  } = useAppStore()

  const [newPresetName, setNewPresetName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const handleStyleChange = useCallback(
    (style: SpectrumStyle) => {
      setStyle(style)
    },
    [setStyle]
  )

  const handleBgPresetChange = useCallback(
    (preset: BackgroundPreset) => {
      setBackground({ preset })
    },
    [setBackground]
  )

  const handleHueShiftChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const hueShift = parseFloat(e.target.value)
      setBackground({ hueShift })
    },
    [setBackground]
  )

  const handleNoiseToggle = useCallback(() => {
    setBackground({ noiseEnabled: !background.noiseEnabled })
  }, [background.noiseEnabled, setBackground])

  const handleDensityChange = useCallback(
    (density: NoiseDensity) => {
      setBackground({ noiseDensity: density })
    },
    [setBackground]
  )

  const handleAddPreset = useCallback(() => {
    if (presets.length >= 5) {
      alert('最多只能保存5套预设')
      return
    }
    const name = newPresetName.trim() || `预设${presets.length + 1}`
    addPreset(name)
    setNewPresetName('')
  }, [presets.length, newPresetName, addPreset])

  const handleStartEdit = useCallback(
    (preset: { id: string; name: string }) => {
      setEditingId(preset.id)
      setEditingName(preset.name)
    },
    []
  )

  const handleSaveEdit = useCallback(() => {
    if (editingId && editingName.trim()) {
      updatePresetName(editingId, editingName.trim())
    }
    setEditingId(null)
    setEditingName('')
  }, [editingId, editingName, updatePresetName])

  const handleDeletePreset = useCallback(
    (id: string) => {
      if (confirm('确定要删除这个预设吗？')) {
        deletePreset(id)
      }
    },
    [deletePreset]
  )

  if (isPanelCollapsed) {
    return (
      <div style={styles.collapsedPanel} onClick={togglePanel}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </div>
    )
  }

  return (
    <div style={styles.panel}>
      <div style={styles.panelHeader}>
        <span style={styles.panelTitle}>设置面板</span>
        <button style={styles.collapseBtn} onClick={togglePanel}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>频谱风格</div>
        <div style={styles.styleButtons}>
          {styleOptions.map((opt) => (
            <button
              key={opt.value}
              style={{
                ...styles.styleBtn,
                ...(currentStyle === opt.value ? styles.styleBtnActive : {}),
              }}
              onClick={() => handleStyleChange(opt.value)}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>背景预设</div>
        <div style={styles.bgGrid}>
          {bgOptions.map((opt) => (
            <button
              key={opt.value}
              style={{
                ...styles.bgCard,
                ...(background.preset === opt.value ? styles.bgCardActive : {}),
              }}
              onClick={() => handleBgPresetChange(opt.value)}
            >
              <div
                style={{
                  ...styles.bgPreview,
                  background: `linear-gradient(135deg, ${opt.colors.join(', ')})`,
                }}
              />
              <span style={styles.bgLabel}>{opt.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          色相偏移
          <span style={styles.valueTag}>{Math.round(background.hueShift)}°</span>
        </div>
        <input
          type="range"
          min="-180"
          max="180"
          value={background.hueShift}
          onChange={handleHueShiftChange}
          style={styles.slider}
        />
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>
          粒子噪声
          <label style={styles.switch}>
            <input
              type="checkbox"
              checked={background.noiseEnabled}
              onChange={handleNoiseToggle}
              style={styles.switchInput}
            />
            <span style={styles.switchSlider} />
          </label>
        </div>
        {background.noiseEnabled && (
          <div style={styles.densityButtons}>
            {densityOptions.map((opt) => (
              <button
                key={opt.value}
                style={{
                  ...styles.densityBtn,
                  ...(background.noiseDensity === opt.value ? styles.densityBtnActive : {}),
                }}
                onClick={() => handleDensityChange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>我的预设 ({presets.length}/5)</div>
        <div style={styles.presetList}>
          {presets.map((preset) => (
            <div
              key={preset.id}
              style={{
                ...styles.presetCard,
                ...(selectedPresetId === preset.id ? styles.presetCardActive : {}),
              }}
            >
              {editingId === preset.id ? (
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  onBlur={handleSaveEdit}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveEdit()
                  }}
                  style={styles.presetInput}
                  autoFocus
                  maxLength={10}
                />
              ) : (
                <>
                  <div style={styles.presetInfo} onClick={() => selectPreset(preset.id)}>
                    <div
                      style={{
                        ...styles.presetColor,
                        background:
                          preset.style === 'bar'
                            ? 'linear-gradient(90deg, #ff4444, #ff8844, #8844ff)'
                            : preset.style === 'wave'
                            ? 'linear-gradient(90deg, #44aaff, #aa44ff, #ff44aa)'
                            : 'linear-gradient(90deg, #4488ff, #ff4488, #ffaa44)',
                      }}
                    />
                    <span style={styles.presetName}>{preset.name}</span>
                  </div>
                  <div style={styles.presetActions}>
                    <button
                      style={styles.iconBtn}
                      onClick={() => handleStartEdit(preset)}
                      title="重命名"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                      </svg>
                    </button>
                    <button
                      style={styles.iconBtn}
                      onClick={() => handleDeletePreset(preset.id)}
                      title="删除"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
        {presets.length < 5 && (
          <div style={styles.addPresetRow}>
            <input
              type="text"
              placeholder="预设名称"
              value={newPresetName}
              onChange={(e) => setNewPresetName(e.target.value)}
              style={styles.addPresetInput}
              maxLength={10}
            />
            <button style={styles.addPresetBtn} onClick={handleAddPreset}>
              + 保存
            </button>
          </div>
        )}
      </div>

      <button
        style={{
          ...styles.exportBtn,
          opacity: audio.fileName ? 1 : 0.5,
          cursor: audio.fileName ? 'pointer' : 'not-allowed',
        }}
        onClick={onExport}
        disabled={!audio.fileName}
      >
        导出壁纸
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '280px',
    height: '100%',
    backgroundColor: 'rgba(21, 21, 32, 0.95)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
    flexShrink: 0,
    transition: 'width 0.3s ease',
  },
  collapsedPanel: {
    width: '40px',
    height: '100%',
    backgroundColor: 'rgba(21, 21, 32, 0.95)',
    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'rgba(255, 255, 255, 0.7)',
    flexShrink: 0,
    transition: 'width 0.3s ease',
  },
  panelHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
  },
  panelTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'white',
  },
  collapseBtn: {
    width: '28px',
    height: '28px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'rgba(255, 255, 255, 0.7)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '6px',
    transition: 'background-color 0.2s',
  },
  section: {
    padding: '12px 16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  sectionTitle: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'rgba(255, 255, 255, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueTag: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.5)',
    fontWeight: 400,
  },
  styleButtons: {
    display: 'flex',
    gap: '8px',
  },
  styleBtn: {
    flex: 1,
    padding: '8px 12px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: 'rgba(255, 255, 255, 0.7)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s ease',
  },
  styleBtnActive: {
    backgroundColor: 'rgba(123, 47, 247, 0.3)',
    borderColor: 'rgba(123, 47, 247, 0.6)',
    color: 'white',
  },
  bgGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  bgCard: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    padding: '6px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  bgCardActive: {
    borderColor: 'rgba(123, 47, 247, 0.6)',
    backgroundColor: 'rgba(123, 47, 247, 0.15)',
  },
  bgPreview: {
    height: '36px',
    borderRadius: '6px',
  },
  bgLabel: {
    fontSize: '11px',
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  slider: {
    width: '100%',
    height: '4px',
    WebkitAppearance: 'none',
    appearance: 'none',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    outline: 'none',
    cursor: 'pointer',
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    width: '36px',
    height: '20px',
  },
  switchInput: {
    opacity: 0,
    width: 0,
    height: 0,
  },
  switchSlider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    transition: '.3s',
    borderRadius: '20px',
  },
  densityButtons: {
    display: 'flex',
    gap: '6px',
  },
  densityBtn: {
    flex: 1,
    padding: '6px 10px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    color: 'rgba(255, 255, 255, 0.6)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '11px',
    transition: 'all 0.2s ease',
  },
  densityBtnActive: {
    backgroundColor: 'rgba(123, 47, 247, 0.3)',
    borderColor: 'rgba(123, 47, 247, 0.6)',
    color: 'white',
  },
  presetList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  presetCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '8px 10px',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    backdropFilter: 'blur(8px)',
    borderRadius: '8px',
    borderLeft: '3px solid transparent',
    transition: 'all 0.2s ease',
  },
  presetCardActive: {
    borderLeftColor: '#7b2ff7',
    backgroundColor: 'rgba(123, 47, 247, 0.12)',
  },
  presetInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    flex: 1,
    minWidth: 0,
  },
  presetColor: {
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    flexShrink: 0,
  },
  presetName: {
    fontSize: '12px',
    color: 'rgba(255, 255, 255, 0.85)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  presetInput: {
    flex: 1,
    padding: '4px 8px',
    fontSize: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(123, 47, 247, 0.5)',
    borderRadius: '4px',
    color: 'white',
    outline: 'none',
  },
  presetActions: {
    display: 'flex',
    gap: '4px',
  },
  iconBtn: {
    width: '24px',
    height: '24px',
    border: 'none',
    backgroundColor: 'transparent',
    color: 'rgba(255, 255, 255, 0.5)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    transition: 'all 0.2s',
  },
  addPresetRow: {
    display: 'flex',
    gap: '6px',
    marginTop: '4px',
  },
  addPresetInput: {
    flex: 1,
    padding: '6px 10px',
    fontSize: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    color: 'white',
    outline: 'none',
  },
  addPresetBtn: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: 'rgba(123, 47, 247, 0.4)',
    border: '1px solid rgba(123, 47, 247, 0.6)',
    color: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  exportBtn: {
    margin: '16px',
    padding: '12px',
    backgroundColor: 'linear-gradient(135deg, #7b2ff7, #ff006e)',
    background: 'linear-gradient(135deg, #7b2ff7, #ff006e)',
    border: 'none',
    borderRadius: '10px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    boxShadow: '0 4px 15px rgba(123, 47, 247, 0.3)',
  },
}
