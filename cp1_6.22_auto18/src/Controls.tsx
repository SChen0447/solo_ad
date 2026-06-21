import { useRef } from 'react'
import type { VisualizerType } from './Visualizer'
import type { PlaybackInfo } from './AudioEngine'

interface GainSettings {
  low: number
  mid: number
  high: number
}

interface ControlsProps {
  gains: GainSettings
  onGainChange: (band: 'low' | 'mid' | 'high', value: number) => void
  onFileUpload: (file: File) => void
  playback: PlaybackInfo
  onPlayPause: () => void
  onSeek: (time: number) => void
  effectType: VisualizerType
  onEffectChange: (type: VisualizerType) => void
}

const formatTime = (sec: number): string => {
  if (!isFinite(sec) || sec < 0) sec = 0
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export default function Controls({
  gains,
  onGainChange,
  onFileUpload,
  playback,
  onPlayPause,
  onSeek,
  effectType,
  onEffectChange,
}: ControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  const panelStyle: React.CSSProperties = {
    width: '30%',
    minWidth: 360,
    height: '100%',
    padding: '28px 24px',
    background: 'rgba(20,20,40,0.55)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderLeft: '1px solid rgba(59,130,246,0.15)',
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
    boxSizing: 'border-box',
    overflowY: 'auto',
  }

  const sectionTitle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
    color: 'rgba(255,255,255,0.55)',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 14,
  }

  const sectionStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
  }

  const uploadBtnStyle: React.CSSProperties = {
    padding: '14px 22px',
    background: '#3b82f6',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease',
    boxShadow: '0 4px 20px rgba(59,130,246,0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  }

  const sliderTrackStyle: React.CSSProperties = {
    position: 'relative',
    height: 4,
    background: '#4a4a6a',
    borderRadius: 2,
    marginBottom: 20,
  }

  const effectBtnBase: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: '2px solid transparent',
    background: 'rgba(255,255,255,0.06)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    color: 'rgba(255,255,255,0.6)',
  }

  const effectBtnActive: React.CSSProperties = {
    ...effectBtnBase,
    background: '#3b82f6',
    borderColor: '#60a5fa',
    color: '#fff',
    boxShadow: '0 0 20px rgba(59,130,246,0.5)',
  }

  const renderSlider = (band: 'low' | 'mid' | 'high', label: string, rangeLabel: string) => {
    const value = gains[band]
    const percent = ((value + 20) / 40) * 100
    return (
      <div key={band} style={{ marginBottom: band === 'high' ? 0 : 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
          <div>
            <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>{label}</span>
            <span style={{ marginLeft: 8, fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{rangeLabel}</span>
          </div>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              fontFamily: '"SF Mono", Menlo, Consolas, monospace',
              color: value > 0 ? '#f87171' : value < 0 ? '#60a5fa' : '#4ade80',
              minWidth: 52,
              textAlign: 'right',
              display: 'inline-block',
            }}
          >
            {value > 0 ? '+' : ''}{value}dB
          </span>
        </div>
        <div style={sliderTrackStyle}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              height: '100%',
              width: `${percent}%`,
              background: value >= 0
                ? 'linear-gradient(90deg, #3b82f6, #4ade80 50%, #f87171)'
                : `linear-gradient(90deg, #3b82f6 ${percent}%, #4a4a6a ${percent}%)`,
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: `calc(${percent}% - 8px)`,
              top: -6,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 0 3px rgba(59,130,246,0.25)',
              cursor: 'grab',
            }}
          />
        </div>
        <input
          type="range"
          min={-20}
          max={20}
          step={1}
          value={value}
          onChange={(e) => onGainChange(band, parseInt(e.target.value, 10))}
          style={{
            position: 'absolute',
            width: 'calc(100% - 0px)',
            opacity: 0,
            cursor: 'pointer',
            marginTop: -30,
            height: 20,
            pointerEvents: 'auto',
          }}
          className="gain-slider"
        />
      </div>
    )
  }

  const hasAudio = playback.duration > 0
  const progressPercent = playback.duration > 0 ? (playback.currentTime / playback.duration) * 100 : 0

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !hasAudio) return
    const rect = progressRef.current.getBoundingClientRect()
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(ratio * playback.duration)
  }

  return (
    <div style={panelStyle}>
      <div style={sectionStyle}>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            background: 'linear-gradient(90deg, #60a5fa, #a78bfa, #f472b6)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: 4,
          }}
        >
          Music Visualizer
        </h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>交互式混音与可视化工作室</p>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>可视化效果</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            style={effectType === 'bars' ? effectBtnActive : effectBtnBase}
            onClick={() => onEffectChange('bars')}
            title="频谱柱状图"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <rect x="3" y="12" width="3" height="9" rx="1" />
              <rect x="9" y="6" width="3" height="15" rx="1" />
              <rect x="15" y="3" width="3" height="18" rx="1" />
              <rect x="21" y="9" width="3" height="12" rx="1" />
            </svg>
          </button>
          <button
            style={effectType === 'particles' ? effectBtnActive : effectBtnBase}
            onClick={() => onEffectChange('particles')}
            title="圆形粒子扩散"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="3" fill="currentColor" opacity="0.8" />
              <circle cx="12" cy="12" r="7" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </button>
          <button
            style={effectType === 'waveform' ? effectBtnActive : effectBtnBase}
            onClick={() => onEffectChange('waveform')}
            title="波形曲线"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12 C6 4, 8 20, 12 12 C16 4, 18 20, 22 12" />
            </svg>
          </button>
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>音频源</div>
        <input
          ref={fileInputRef}
          type="file"
          accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onFileUpload(f)
            if (fileInputRef.current) fileInputRef.current.value = ''
          }}
        />
        <button
          style={uploadBtnStyle}
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#2563eb'
            e.currentTarget.style.transform = 'translateY(-1px)'
            e.currentTarget.style.boxShadow = '0 6px 24px rgba(37,99,235,0.4)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#3b82f6'
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(59,130,246,0.3)'
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          上传音频
        </button>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 10, textAlign: 'center' }}>
          支持 MP3 / WAV 格式
        </div>
      </div>

      <div style={sectionStyle}>
        <div style={sectionTitle}>播放控制</div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 16px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 12,
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <button
            onClick={onPlayPause}
            disabled={!hasAudio}
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: hasAudio ? '#3b82f6' : 'rgba(255,255,255,0.08)',
              border: 'none',
              cursor: hasAudio ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
          >
            {playback.isPlaying ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style={{ marginLeft: 2 }}>
                <polygon points="6,4 20,12 6,20" />
              </svg>
            )}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              ref={progressRef}
              onClick={handleProgressClick}
              style={{
                position: 'relative',
                height: 6,
                background: '#4a4a6a',
                borderRadius: 3,
                cursor: hasAudio ? 'pointer' : 'default',
                overflow: 'visible',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  height: '100%',
                  width: `${progressPercent}%`,
                  background: '#3b82f6',
                  borderRadius: 3,
                  transition: 'width 0.1s linear',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `calc(${progressPercent}% - 7px)`,
                  top: -4,
                  width: 14,
                  height: 14,
                  borderRadius: '50%',
                  background: '#fff',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 0 3px rgba(59,130,246,0.3)',
                  transition: 'left 0.1s linear',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 11,
                fontFamily: '"SF Mono", Menlo, Consolas, monospace',
                color: 'rgba(255,255,255,0.5)',
              }}
            >
              <span>{formatTime(playback.currentTime)}</span>
              <span>{formatTime(playback.duration)}</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ ...sectionStyle, position: 'relative' }}>
        <div style={sectionTitle}>均衡混音</div>
        <div style={{ position: 'relative' }}>
          {renderSlider('low', '低频', '0 - 200Hz')}
          {renderSlider('mid', '中频', '200 - 2000Hz')}
          {renderSlider('high', '高频', '2000Hz +')}
        </div>
      </div>

      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 11,
            color: 'rgba(255,255,255,0.3)',
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: playback.isPlaying ? '#4ade80' : '#6b7280',
              boxShadow: playback.isPlaying ? '0 0 10px rgba(74,222,128,0.6)' : 'none',
              animation: playback.isPlaying ? 'pulse 1.5s ease-in-out infinite' : 'none',
            }}
          />
          <span>{playback.isPlaying ? '正在播放音频...' : hasAudio ? '已就绪 · 点击播放' : '等待上传音频文件'}</span>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }
        .gain-slider {
          position: relative !important;
          width: 100% !important;
          opacity: 0 !important;
          -webkit-appearance: none;
          appearance: none;
          background: transparent;
          margin-top: -30px;
          margin-bottom: 28px;
          display: block;
        }
        .gain-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: transparent;
          cursor: pointer;
        }
        .gain-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: transparent;
          border: none;
          cursor: pointer;
        }
      `}</style>
    </div>
  )
}
