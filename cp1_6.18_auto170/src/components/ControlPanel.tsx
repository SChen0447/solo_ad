import { useEmotionStore } from '../store/emotionStore'

export default function ControlPanel() {
  const { particleParams, setParticleParams } = useEmotionStore()
  const { baseColor, speedMultiplier } = particleParams

  const handleColorChange = (channel: 'r' | 'g' | 'b', value: number) => {
    setParticleParams({
      baseColor: { ...baseColor, [channel]: value }
    })
  }

  const handleAlphaChange = (value: number) => {
    setParticleParams({
      baseColor: { ...baseColor, a: value }
    })
  }

  const handleSpeedChange = (value: number) => {
    setParticleParams({ speedMultiplier: value })
  }

  const rgbString = `rgb(${Math.round(baseColor.r)}, ${Math.round(baseColor.g)}, ${Math.round(baseColor.b)})`

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <div style={styles.sectionTitle}>主色调</div>
        
        <div style={styles.colorPreview}>
          <div
            style={{
              ...styles.colorSwatch,
              backgroundColor: rgbString,
              opacity: baseColor.a
            }}
          />
        </div>

        <div style={styles.sliderGroup}>
          <label style={styles.sliderLabel}>
            <span style={{ ...styles.colorDot, background: '#ff4444' }} />
            红
          </label>
          <input
            type="range"
            min="0"
            max="255"
            value={baseColor.r}
            onChange={(e) => handleColorChange('r', Number(e.target.value))}
            style={{ ...styles.slider, accentColor: '#ff4444' }}
          />
          <span style={styles.sliderValue}>{Math.round(baseColor.r)}</span>
        </div>

        <div style={styles.sliderGroup}>
          <label style={styles.sliderLabel}>
            <span style={{ ...styles.colorDot, background: '#44ff44' }} />
            绿
          </label>
          <input
            type="range"
            min="0"
            max="255"
            value={baseColor.g}
            onChange={(e) => handleColorChange('g', Number(e.target.value))}
            style={{ ...styles.slider, accentColor: '#44ff44' }}
          />
          <span style={styles.sliderValue}>{Math.round(baseColor.g)}</span>
        </div>

        <div style={styles.sliderGroup}>
          <label style={styles.sliderLabel}>
            <span style={{ ...styles.colorDot, background: '#4444ff' }} />
            蓝
          </label>
          <input
            type="range"
            min="0"
            max="255"
            value={baseColor.b}
            onChange={(e) => handleColorChange('b', Number(e.target.value))}
            style={{ ...styles.slider, accentColor: '#4444ff' }}
          />
          <span style={styles.sliderValue}>{Math.round(baseColor.b)}</span>
        </div>

        <div style={styles.sliderGroup}>
          <label style={styles.sliderLabel}>
            <span style={{ ...styles.colorDot, background: 'rgba(255,255,255,0.5)' }} />
            透明度
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.01"
            value={baseColor.a}
            onChange={(e) => handleAlphaChange(Number(e.target.value))}
            style={{ ...styles.slider, accentColor: '#ffffff' }}
          />
          <span style={styles.sliderValue}>{(baseColor.a * 100).toFixed(0)}%</span>
        </div>
      </div>

      <div style={{ ...styles.section, borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '16px' }}>
        <div style={styles.sectionTitle}>运动速度</div>
        <div style={styles.speedDisplay}>
          <span style={styles.speedValue}>{speedMultiplier.toFixed(1)}x</span>
        </div>
        <input
          type="range"
          min="0.5"
          max="3"
          step="0.1"
          value={speedMultiplier}
          onChange={(e) => handleSpeedChange(Number(e.target.value))}
          style={{ ...styles.slider, ...styles.fullWidthSlider, accentColor: '#667eea' }}
        />
        <div style={styles.speedLabels}>
          <span>慢</span>
          <span>标准</span>
          <span>快</span>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: '20px',
    left: '20px',
    width: '280px',
    padding: '20px',
    background: 'rgba(26, 26, 46, 0.85)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 100,
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
  },
  section: {},
  sectionTitle: {
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px'
  },
  colorPreview: {
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'center'
  },
  colorSwatch: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    boxShadow: '0 0 20px rgba(102, 126, 234, 0.5)',
    border: '2px solid rgba(255, 255, 255, 0.2)'
  },
  sliderGroup: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '10px',
    gap: '10px'
  },
  sliderLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '12px',
    width: '50px',
    flexShrink: 0
  },
  colorDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%'
  },
  slider: {
    flex: 1,
    height: '4px',
    cursor: 'pointer',
    appearance: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '2px',
    outline: 'none'
  },
  fullWidthSlider: {
    width: '100%',
    marginBottom: '8px'
  },
  sliderValue: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '11px',
    width: '35px',
    textAlign: 'right',
    flexShrink: 0
  },
  speedDisplay: {
    textAlign: 'center',
    marginBottom: '8px'
  },
  speedValue: {
    color: '#fff',
    fontSize: '24px',
    fontWeight: 700,
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text'
  },
  speedLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '11px'
  }
}
