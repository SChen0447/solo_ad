import React from 'react'
import dayjs from 'dayjs'
import { Entry, useStore } from '../store'

interface Props {
  entries: Entry[]
  selectedId: string | undefined
  onSelect: (id: string | null) => void
}

interface Group {
  key: string
  label: string
  entries: Entry[]
}

function groupEntries(entries: Entry[]): Group[] {
  const groupsMap = new Map<string, Group>()
  entries.forEach(e => {
    const d = dayjs(e.date)
    const key = d.format('YYYY-MM')
    const label = d.format('YYYY 年 M 月')
    if (!groupsMap.has(key)) {
      groupsMap.set(key, { key, label, entries: [] })
    }
    groupsMap.get(key)!.entries.push(e)
  })
  return Array.from(groupsMap.values())
}

const moodEmoji: Record<string, string> = {
  happy: '😊', calm: '😌', moved: '🥹',
  anxious: '😰', tired: '😴', surprise: '🎉',
}

export default function Sidebar({ entries, selectedId, onSelect }: Props) {
  const { expandedGroups, toggleGroup } = useStore()
  const groups = React.useMemo(() => groupEntries(entries), [entries])

  if (groups.length === 0) {
    return (
      <div style={{
        padding: '24px 8px',
        textAlign: 'center',
        color: '#999',
        fontSize: 14,
      }}>
        暂无记录
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {groups.map(group => {
        const isExpanded = expandedGroups[group.key] ?? false
        const displayEntries = isExpanded ? group.entries : group.entries.slice(0, 3)
        const hasMore = group.entries.length > 3

        return (
          <div key={group.key}>
            <div
              onClick={() => toggleGroup(group.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 4px',
                marginBottom: 6,
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <span style={{
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--deep-brown)',
              }}>
                {group.label}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 11,
                  color: '#999',
                  background: '#eee',
                  padding: '2px 8px',
                  borderRadius: 999,
                }}>
                  {group.entries.length}
                </span>
                <span style={{
                  fontSize: 12,
                  color: '#888',
                  transition: 'transform 0.2s ease',
                  transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                }}>
                  ▾
                </span>
              </div>
            </div>

            <div style={{
              overflow: 'hidden',
              animation: isExpanded ? 'expand-down 0.25s ease-out' : undefined,
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {displayEntries.map(entry => (
                  <EntryThumb
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedId === entry.id}
                    onClick={() => onSelect(entry.id)}
                  />
                ))}
              </div>
            </div>

            {hasMore && !isExpanded && (
              <button
                onClick={(e) => { e.stopPropagation(); toggleGroup(group.key) }}
                style={{
                  marginTop: 8,
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-green)',
                  fontSize: 12,
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                展开全部 {group.entries.length} 条 →
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

function EntryThumb({
  entry,
  isSelected,
  onClick,
}: {
  entry: Entry
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        gap: 10,
        padding: 10,
        borderRadius: 10,
        cursor: 'pointer',
        background: isSelected ? 'rgba(46, 125, 111, 0.12)' : 'white',
        border: isSelected ? '1px solid var(--brand-green-light)' : '1px solid #ebe5da',
        transition: 'all 0.15s ease',
      }}
    >
      <div style={{
        width: 48,
        height: 48,
        borderRadius: 8,
        background: entry.thumbnail
          ? `url(${entry.thumbnail}) center/cover no-repeat`
          : 'linear-gradient(135deg, #f5f0e8, #e8e0d0)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 22,
        overflow: 'hidden',
      }}>
        {!entry.thumbnail && (moodEmoji[entry.mood] || '📝')}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13,
          fontWeight: 600,
          color: 'var(--deep-brown)',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          marginBottom: 3,
        }}>
          {entry.title}
        </div>
        <div style={{
          fontSize: 11,
          color: '#888',
          marginBottom: 4,
        }}>
          {dayjs(entry.date).format('M月D日 HH:mm')}
        </div>
        {entry.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {entry.tags.slice(0, 2).map(t => (
              <span key={t} style={{
                fontSize: 10,
                background: 'var(--tag-bg)',
                color: 'var(--tag-text)',
                padding: '1px 6px',
                borderRadius: 999,
              }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
