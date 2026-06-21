import React, { useState } from 'react'
import type { TimeMarker, EnvelopePoint } from './types'

interface EditorPanelProps {
  markers: TimeMarker[]
  envelopePoints: EnvelopePoint[]
  duration: number
  onMarkerClick: (id: string) => void
  onMarkerDelete: (id: string) => void
  onEnvelopePointDelete: (id: string) => void
  onJumpToMarker: (id: string) => void
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds) || seconds < 0) seconds = 0
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

const EditorPanel: React.FC<EditorPanelProps> = ({
  markers,
  envelopePoints,
  duration,
  onMarkerClick,
  onMarkerDelete,
  onEnvelopePointDelete,
  onJumpToMarker,
}) => {
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null)
  const [hoveredEnvelopeId, setHoveredEnvelopeId] = useState<string | null>(null)

  const sortedMarkers = [...markers].sort((a, b) => a.time - b.time)
  const sortedEnvelope = [...envelopePoints].sort((a, b) => a.time - b.time)

  return (
    <div style={styles.container}>
      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>时间标记</span>
          <span style={styles.sectionCount}>{markers.length}</span>
        </div>
        <div style={styles.listContainer}>
          {sortedMarkers.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📍</div>
              <div style={styles.emptyText}>单击波形区域添加时间标记</div>
            </div>
          ) : (
            <div style={styles.list}>
              {sortedMarkers.map((marker, index) => (
                <div
                  key={marker.id}
                  style={{
                    ...styles.markerItem,
                    background: hoveredMarkerId === marker.id ? '#3D3D55' : '#2D2D44',
                  }}
                  onMouseEnter={() => setHoveredMarkerId(marker.id)}
                  onMouseLeave={() => setHoveredMarkerId(null)}
                  onClick={() => {
                    onMarkerClick(marker.id)
                    onJumpToMarker(marker.id)
                  }}
                >
                  <div style={styles.markerIndex}>
                    <div style={styles.markerDot} />
                    <span style={styles.markerIndexText}>{index + 1}</span>
                  </div>
                  <div style={styles.markerContent}>
                    <div style={styles.markerLabel} title={marker.label}>
                      {marker.label || '未命名标记'}
                    </div>
                    <div style={styles.markerTime}>{formatTime(marker.time)}</div>
                  </div>
                  <button
                    style={{
                      ...styles.deleteButton,
                      opacity: hoveredMarkerId === marker.id ? 1 : 0,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onMarkerDelete(marker.id)
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3 3L11 11M11 3L3 11"
                        stroke="#FF6584"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>音量包络线</span>
          <span style={styles.sectionCount}>{envelopePoints.length}/10</span>
        </div>
        <div style={styles.listContainer}>
          {sortedEnvelope.length === 0 ? (
            <div style={styles.emptyState}>
              <div style={styles.emptyIcon}>📈</div>
              <div style={styles.emptyText}>点击下方包络线区域添加控制点</div>
            </div>
          ) : (
            <div style={styles.list}>
              {sortedEnvelope.map((point, index) => (
                <div
                  key={point.id}
                  style={{
                    ...styles.markerItem,
                    background: hoveredEnvelopeId === point.id ? '#3D3D55' : '#2D2D44',
                  }}
                  onMouseEnter={() => setHoveredEnvelopeId(point.id)}
                  onMouseLeave={() => setHoveredEnvelopeId(null)}
                >
                  <div style={styles.markerIndex}>
                    <div
                      style={{
                        ...styles.markerDot,
                        background: '#FF6584',
                      }}
                    />
                    <span style={styles.markerIndexText}>{index + 1}</span>
                  </div>
                  <div style={styles.markerContent}>
                    <div style={styles.markerLabel}>
                      控制点 {index + 1}
                    </div>
                    <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
                      <span style={styles.markerTime}>{formatTime(point.time)}</span>
                      <span style={{ ...styles.markerTime, color: '#FF6584' }}>
                        {(point.volume * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <button
                    style={{
                      ...styles.deleteButton,
                      opacity: hoveredEnvelopeId === point.id ? 1 : 0,
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onEnvelopePointDelete(point.id)
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path
                        d="M3 3L11 11M11 3L3 11"
                        stroke="#FF6584"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionHeader}>
          <span style={styles.sectionTitle}>使用说明</span>
        </div>
        <div style={styles.tipsContainer}>
          <div style={styles.tipItem}>
            <span style={styles.tipIcon}>🎵</span>
            <span style={styles.tipText}>上传 MP3 或 WAV 格式音频文件</span>
          </div>
          <div style={styles.tipItem}>
            <span style={styles.tipIcon}>📍</span>
            <span style={styles.tipText}>单击波形区域添加时间标记</span>
          </div>
          <div style={styles.tipItem}>
            <span style={styles.tipIcon}>✏️</span>
            <span style={styles.tipText}>双击标签编辑文字内容</span>
          </div>
          <div style={styles.tipItem}>
            <span style={styles.tipIcon}>↔️</span>
            <span style={styles.tipText}>拖拽标签调整位置（5%吸附）</span>
          </div>
          <div style={styles.tipItem}>
            <span style={styles.tipIcon}>📈</span>
            <span style={styles.tipText}>点击包络线区域添加控制点</span>
          </div>
          <div style={styles.tipItem}>
            <span style={styles.tipIcon}>🔊</span>
            <span style={styles.tipText}>拖拽控制点调整音量包络</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    padding: 16,
    gap: 20,
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 4px',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#FFFFFF',
  },
  sectionCount: {
    fontSize: 12,
    color: '#6C63FF',
    background: 'rgba(108, 99, 255, 0.15)',
    padding: '2px 8px',
    borderRadius: 10,
    fontVariantNumeric: 'tabular-nums',
  },
  listContainer: {
    flexShrink: 0,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 220,
    overflowY: 'auto',
  },
  markerItem: {
    display: 'flex',
    alignItems: 'center',
    height: 44,
    padding: '8px 12px',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background 0.2s ease-out',
    gap: 12,
    position: 'relative',
  },
  markerIndex: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  markerDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: '#FFD166',
    flexShrink: 0,
  },
  markerIndexText: {
    fontSize: 12,
    color: '#A0A0B8',
    fontVariantNumeric: 'tabular-nums',
    minWidth: 16,
  },
  markerContent: {
    flex: 1,
    minWidth: 0,
  },
  markerLabel: {
    fontSize: 13,
    color: '#FFFFFF',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  markerTime: {
    fontSize: 11,
    color: '#A0A0B8',
    fontVariantNumeric: 'tabular-nums',
  },
  deleteButton: {
    width: 24,
    height: 24,
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    borderRadius: 4,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'opacity 0.2s ease-out, background 0.2s ease-out',
    padding: 0,
    flexShrink: 0,
  },
  emptyState: {
    padding: '20px 12px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 8,
    background: '#2D2D44',
    borderRadius: 4,
  },
  emptyIcon: {
    fontSize: 24,
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 12,
    color: '#A0A0B8',
    textAlign: 'center',
    lineHeight: 1.5,
  },
  tipsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '8px 4px',
  },
  tipItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  tipIcon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
  },
  tipText: {
    fontSize: 12,
    color: '#A0A0B8',
    lineHeight: 1.4,
  },
}

export default EditorPanel
