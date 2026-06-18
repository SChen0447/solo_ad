import React from 'react'
import { useStore, HistoryRecord } from './store'

const formatTime = (ts: number): string => {
  const d = new Date(ts)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return `${hh}:${mm}:${ss}`
}

const getTypeIcon = (type: HistoryRecord['type']): string => {
  const icons: Record<HistoryRecord['type'], string> = {
    'color-add': '➕',
    'color-edit': '✏️',
    'color-reorder': '🔀',
    'color-delete': '🗑️',
    'component-apply': '🎨',
    'bulk': '🔄'
  }
  return icons[type] || '📝'
}

const getTypeName = (type: HistoryRecord['type']): string => {
  const names: Record<HistoryRecord['type'], string> = {
    'color-add': '添加颜色',
    'color-edit': '编辑颜色',
    'color-reorder': '调整顺序',
    'color-delete': '删除颜色',
    'component-apply': '应用颜色',
    'bulk': '批量操作'
  }
  return names[type] || '操作'
}

const findChangedColor = (record: HistoryRecord): { before: string | null; after: string | null } => {
  if (record.type === 'component-apply') {
    for (const key of Object.keys(record.afterComponentColors)) {
      if (record.beforeComponentColors[key] !== record.afterComponentColors[key]) {
        return {
          before: record.beforeComponentColors[key],
          after: record.afterComponentColors[key]
        }
      }
    }
  }
  if (record.afterColors.length > record.beforeColors.length) {
    const added = record.afterColors.find(c => !record.beforeColors.find(b => b.id === c.id))
    return { before: null, after: added?.hex || null }
  }
  if (record.afterColors.length < record.beforeColors.length) {
    const removed = record.beforeColors.find(c => !record.afterColors.find(a => a.id === c.id))
    return { before: removed?.hex || null, after: null }
  }
  for (let i = 0; i < record.afterColors.length; i++) {
    const b = record.beforeColors[i]
    const a = record.afterColors[i]
    if (b && a && b.hex !== a.hex) {
      return { before: b.hex, after: a.hex }
    }
  }
  return { before: null, after: null }
}

const HistoryPanel: React.FC = () => {
  const { history, historyIndex, undoToHistory, clearHistory } = useStore()

  const sortedHistory = [...history].reverse()
  const currentAbsIndex = historyIndex

  return (
    <aside style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>📜 操作历史</h2>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            style={styles.clearBtn}
            title="清空历史"
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#FEE2E2'
              e.currentTarget.style.color = '#DC2626'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#6C757D'
            }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            清空
          </button>
        )}
      </div>

      <div style={styles.statsBar}>
        <div style={styles.statItem}>
          <span style={styles.statValue}>{history.length}</span>
          <span style={styles.statLabel}>条记录</span>
        </div>
        <div style={styles.statItem}>
          <span style={{ ...styles.statValue, color: '#28A745' }}>
            {history.filter((_, i) => i <= currentAbsIndex).length}
          </span>
          <span style={styles.statLabel}>可撤销</span>
        </div>
        <div style={styles.statItem}>
          <span style={{ ...styles.statValue, color: '#6C757D' }}>
            {history.length - currentAbsIndex - 1 > 0 ? history.length - currentAbsIndex - 1 : 0}
          </span>
          <span style={styles.statLabel}>已失效</span>
        </div>
      </div>

      <div style={styles.historyList}>
        {sortedHistory.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>🕐</div>
            <div style={{ fontSize: '13px', color: '#6C757D', fontWeight: 500 }}>暂无操作记录</div>
            <div style={{ fontSize: '11px', color: '#ADB5BD', marginTop: '4px' }}>
              修改配色方案后将在此显示
            </div>
          </div>
        ) : (
          sortedHistory.map((record, revIdx) => {
            const absIdx = history.length - 1 - revIdx
            const isRevertible = absIdx <= currentAbsIndex
            const isCurrent = absIdx === currentAbsIndex
            const colorChange = findChangedColor(record)

            return (
              <div
                key={record.id}
                onClick={() => isRevertible && undoToHistory(record.id)}
                style={{
                  ...styles.recordCard,
                  opacity: isRevertible ? 1 : 0.45,
                  borderLeft: isCurrent ? '3px solid #28A745' : '3px solid transparent',
                  background: isCurrent ? '#F0FFF4' : (isRevertible ? '#FFFFFF' : '#F8F9FA'),
                  cursor: isRevertible ? 'pointer' : 'not-allowed',
                  filter: !isRevertible ? 'grayscale(0.3)' : 'none'
                }}
                onMouseEnter={(e) => {
                  if (isRevertible && !isCurrent) {
                    e.currentTarget.style.background = '#F0F9FF'
                    e.currentTarget.style.transform = 'translateX(-2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = isCurrent ? '#F0FFF4' : (isRevertible ? '#FFFFFF' : '#F8F9FA')
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <div style={styles.recordIndicator}>
                  <span
                    style={{
                      ...styles.indicatorDot,
                      background: isRevertible ? '#28A745' : '#CED4DA',
                      boxShadow: isRevertible ? '0 0 0 3px rgba(40, 167, 69, 0.15)' : 'none'
                    }}
                  />
                </div>

                <div style={styles.recordContent}>
                  <div style={styles.recordHeader}>
                    <div style={styles.recordType}>
                      <span style={styles.typeIcon}>{getTypeIcon(record.type)}</span>
                      <span style={styles.typeName}>{getTypeName(record.type)}</span>
                    </div>
                    <span style={styles.recordTime}>{formatTime(record.timestamp)}</span>
                  </div>

                  <div style={styles.recordDesc}>
                    {record.description}
                  </div>

                  {(colorChange.before || colorChange.after) && (record.type !== 'color-reorder') && (
                    <div style={styles.colorChangeRow}>
                      {colorChange.before && (
                        <div style={styles.colorChip}>
                          <div
                            style={{
                              ...styles.colorChipSwatch,
                              background: colorChange.before,
                              border: '1px solid rgba(0,0,0,0.1)'
                            }}
                          />
                          <span style={styles.colorChipText}>{colorChange.before}</span>
                        </div>
                      )}
                      {colorChange.before && colorChange.after && (
                        <span style={styles.arrow}>→</span>
                      )}
                      {colorChange.after && (
                        <div style={styles.colorChip}>
                          <div
                            style={{
                              ...styles.colorChipSwatch,
                              background: colorChange.after,
                              border: '1px solid rgba(0,0,0,0.1)'
                            }}
                          />
                          <span style={{ ...styles.colorChipText, fontWeight: 600 }}>{colorChange.after}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {isRevertible && !isCurrent && (
                    <div style={styles.revertHint}>
                      点击撤销到此状态
                    </div>
                  )}
                  {isCurrent && (
                    <div style={{ ...styles.revertHint, color: '#28A745' }}>
                      ● 当前状态
                    </div>
                  )}
                  {!isRevertible && (
                    <div style={{ ...styles.revertHint, color: '#ADB5BD' }}>
                      已被后续操作覆盖
                    </div>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      <div style={styles.footer}>
        <span style={{ fontSize: '11px', color: '#ADB5BD' }}>
          最多保留 50 条历史记录
        </span>
      </div>
    </aside>
  )
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: '300px',
    minWidth: '300px',
    background: '#F8F9FA',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
    borderLeft: '1px solid #DEE2E6'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 16px',
    borderBottom: '1px solid #DEE2E6',
    background: '#fff'
  },
  title: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#212529',
    margin: 0
  },
  clearBtn: {
    padding: '4px 10px',
    fontSize: '11px',
    color: '#6C757D',
    borderRadius: '5px',
    transition: 'all 0.2s ease',
    fontWeight: 500
  },
  statsBar: {
    display: 'flex',
    padding: '10px 16px',
    background: '#fff',
    borderBottom: '1px solid #E9ECEF',
    gap: '16px'
  },
  statItem: {
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px'
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#007BFF'
  },
  statLabel: {
    fontSize: '11px',
    color: '#6C757D'
  },
  historyList: {
    flex: 1,
    overflowY: 'auto',
    padding: '10px 10px'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    textAlign: 'center'
  },
  recordCard: {
    display: 'flex',
    gap: '10px',
    padding: '12px 12px',
    marginBottom: '6px',
    borderRadius: '8px',
    border: '1px solid #E9ECEF',
    transition: 'all 0.2s ease'
  },
  recordIndicator: {
    paddingTop: '3px',
    flexShrink: 0
  },
  indicatorDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'block'
  },
  recordContent: {
    flex: 1,
    minWidth: 0
  },
  recordHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '4px'
  },
  recordType: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px'
  },
  typeIcon: {
    fontSize: '13px'
  },
  typeName: {
    fontSize: '12px',
    fontWeight: 600,
    color: '#212529'
  },
  recordTime: {
    fontSize: '10px',
    color: '#ADB5BD',
    fontFamily: 'monospace'
  },
  recordDesc: {
    fontSize: '11px',
    color: '#495057',
    lineHeight: 1.5,
    marginBottom: '8px'
  },
  colorChangeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '6px'
  },
  colorChip: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    background: '#F8F9FA',
    padding: '3px 7px',
    borderRadius: '4px'
  },
  colorChipSwatch: {
    width: '14px',
    height: '14px',
    borderRadius: '3px'
  },
  colorChipText: {
    fontSize: '10px',
    fontFamily: 'monospace',
    color: '#495057'
  },
  arrow: {
    fontSize: '11px',
    color: '#ADB5BD'
  },
  revertHint: {
    fontSize: '10px',
    color: '#007BFF',
    fontStyle: 'italic',
    fontWeight: 500
  },
  footer: {
    padding: '10px 16px',
    textAlign: 'center',
    background: '#fff',
    borderTop: '1px solid #DEE2E6'
  }
}

export default HistoryPanel
