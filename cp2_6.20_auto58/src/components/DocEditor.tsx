import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore, CATEGORY_COLORS } from '../data/store'
import type { DocVersion } from '../data/store'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = function (n: number) { return n.toString().padStart(2, '0') }
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes())
}

function parseMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  html = html.replace(/```([\s\S]*?)```/g, function (_, code) {
    const lang = code.split('\n')[0]?.trim() || ''
    const body = code.slice(lang.length).replace(/^\n/, '')
    const lines = body.split('\n')
    while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop()
    const lineNumbers = lines.map(function (_, i) {
      return '<span style="display:inline-block;width:2.5em;padding-right:1em;text-align:right;color:#475569;border-right:1px solid #334155;margin-right:1em;user-select:none;font-variant-numeric:tabular-nums">' + (i + 1) + '</span>'
    }).join('\n')
    return '<pre style="background:#1E293B;color:#E2E8F0;border-radius:10px;padding:16px 16px 16px 0;overflow-x:auto;font-size:13px;line-height:1.6;font-family:\'SF Mono\',\'Monaco\',\'Consolas\',monospace"><code style="display:block"><div style="white-space:pre">' + (lineNumbers ? lineNumbers + '\n' : '') + lines.map(function (l) { return l }).join('\n') + '</div></code></pre>'
  })

  html = html.replace(/`([^`]+)`/g, '<code style="background:#F1F5F9;color:#DB2777;padding:2px 6px;border-radius:4px;font-size:0.9em;font-family:\'SF Mono\',monospace">$1</code>')

  html = html.replace(/^######\s+(.+)$/gm, '<h6 style="font-size:13px;font-weight:600;color:#1E293B;margin:20px 0 10px">$1</h6>')
  html = html.replace(/^#####\s+(.+)$/gm, '<h5 style="font-size:14px;font-weight:600;color:#1E293B;margin:22px 0 10px">$1</h5>')
  html = html.replace(/^####\s+(.+)$/gm, '<h4 style="font-size:15px;font-weight:600;color:#1E293B;margin:24px 0 12px">$1</h4>')
  html = html.replace(/^###\s+(.+)$/gm, '<h3 style="font-size:17px;font-weight:600;color:#1E293B;margin:26px 0 12px">$1</h3>')
  html = html.replace(/^##\s+(.+)$/gm, '<h2 style="font-size:20px;font-weight:600;color:#0F172A;margin:30px 0 14px;padding-bottom:8px;border-bottom:1px solid #F1F5F9">$1</h2>')
  html = html.replace(/^#\s+(.+)$/gm, '<h1 style="font-size:26px;font-weight:600;color:#0F172A;margin:0 0 20px">$1</h1>')

  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:600;color:#1E293B">$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em style="color:#334155">$1</em>')

  html = html.replace(/^>\s*(.+)$/gm, '<blockquote style="border-left:3px solid #2563EB;padding:8px 16px;margin:16px 0;background:#EFF6FF;color:#334155;border-radius:0 6px 6px 0;line-height:1.6">$1</blockquote>')

  html = html.replace(/^\s*[-*+]\s+(.+)$/gm, function (_, item) { return '<li style="margin:4px 0;padding-left:4px">' + item + '</li>' })
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, function (m) { return '<ul style="margin:12px 0;padding-left:24px;line-height:1.7">' + m + '</ul>' })

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#2563EB;text-decoration:underline;text-underline-offset:2px" target="_blank" rel="noopener">$1</a>')

  html = html.replace(/\n{2,}/g, '</p><p style="margin:12px 0;line-height:1.75;color:#334155;font-size:14.5px">')
  html = html.replace(/\n/g, '<br>')
  html = '<p style="margin:12px 0;line-height:1.75;color:#334155;font-size:14.5px">' + html + '</p>'
  html = html.replace(/<p style="[^"]*">\s*<\/p>/g, '')
  html = html.replace(/<\/(h\d|pre|blockquote|ul|ol)>\s*<p[^>]*>/g, function (m) { return m.replace(/<p[^>]*>$/, '') })

  return html
}

interface DiffSegment {
  type: 'same' | 'removed' | 'added'
  text: string
}

interface DiffLine {
  type: 'same' | 'added' | 'removed' | 'modified'
  leftContent: string
  rightContent: string
  leftSegments: DiffSegment[]
  rightSegments: DiffSegment[]
}

function computeCharDiff(oldStr: string, newStr: string): DiffSegment[] {
  const segments: DiffSegment[] = []
  const oldChars = oldStr.split('')
  const newChars = newStr.split('')
  let i = 0, j = 0

  while (i < oldChars.length || j < newChars.length) {
    if (i < oldChars.length && j < newChars.length && oldChars[i] === newChars[j]) {
      let sameCount = 0
      while (i + sameCount < oldChars.length && j + sameCount < newChars.length && oldChars[i + sameCount] === newChars[j + sameCount]) {
        sameCount++
      }
      segments.push({ type: 'same', text: oldChars.slice(i, i + sameCount).join('') })
      i += sameCount
      j += sameCount
    } else {
      let foundMatch = false
      for (let look = 1; look <= 8 && !foundMatch; look++) {
        if (i + look < oldChars.length && j < newChars.length && oldChars[i + look] === newChars[j]) {
          segments.push({ type: 'removed', text: oldChars.slice(i, i + look).join('') })
          i += look
          foundMatch = true
        } else if (j + look < newChars.length && i < oldChars.length && oldChars[i] === newChars[j + look]) {
          segments.push({ type: 'added', text: newChars.slice(j, j + look).join('') })
          j += look
          foundMatch = true
        }
      }
      if (!foundMatch) {
        if (i < oldChars.length) {
          segments.push({ type: 'removed', text: oldChars[i] })
          i++
        }
        if (j < newChars.length) {
          segments.push({ type: 'added', text: newChars[j] })
          j++
        }
      }
    }
  }
  return segments
}

function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split('\n')
  const newLines = newContent.split('\n')
  const maxLen = Math.max(oldLines.length, newLines.length)
  const result: DiffLine[] = []

  for (let idx = 0; idx < maxLen; idx++) {
    const ol = oldLines[idx] ?? ''
    const nl = newLines[idx] ?? ''

    if (ol === nl) {
      result.push({
        type: 'same',
        leftContent: ol,
        rightContent: nl,
        leftSegments: [{ type: 'same', text: ol }],
        rightSegments: [{ type: 'same', text: nl }]
      })
    } else if (ol && !nl) {
      result.push({
        type: 'removed',
        leftContent: ol,
        rightContent: '',
        leftSegments: [{ type: 'removed', text: ol }],
        rightSegments: [{ type: 'same', text: '' }]
      })
    } else if (!ol && nl) {
      result.push({
        type: 'added',
        leftContent: '',
        rightContent: nl,
        leftSegments: [{ type: 'same', text: '' }],
        rightSegments: [{ type: 'added', text: nl }]
      })
    } else {
      const allSegments = computeCharDiff(ol, nl)
      const leftSegs: DiffSegment[] = []
      const rightSegs: DiffSegment[] = []
      for (const seg of allSegments) {
        if (seg.type === 'same') {
          leftSegs.push(seg)
          rightSegs.push(seg)
        } else if (seg.type === 'removed') {
          leftSegs.push(seg)
        } else if (seg.type === 'added') {
          rightSegs.push(seg)
        }
      }
      result.push({
        type: 'modified',
        leftContent: ol,
        rightContent: nl,
        leftSegments: leftSegs,
        rightSegments: rightSegs
      })
    }
  }
  return result
}

function renderSegments(segments: DiffSegment[]): React.ReactNode {
  return segments.map(function (seg, i) {
    if (seg.type === 'same') {
      return <span key={i} style={{ color: '#1E293B' }}>{seg.text}</span>
    } else if (seg.type === 'removed') {
      return (
        <del
          key={i}
          style={{
            color: '#DC2626',
            textDecoration: 'line-through',
            textDecorationColor: '#DC2626',
            background: '#FEE2E2',
            borderRadius: 2,
            padding: '0 1px'
          }}
        >
          {seg.text}
        </del>
      )
    } else {
      return (
        <ins
          key={i}
          style={{
            color: '#059669',
            textDecoration: 'underline',
            textDecorationColor: '#10B981',
            textUnderlineOffset: '2px',
            background: '#D1FAE5',
            borderRadius: 2,
            padding: '0 1px',
            textDecorationThickness: 2
          }}
        >
          {seg.text}
        </ins>
      )
    }
  })
}

function DiffView({ oldVer, newVer, onClose }: { oldVer: DocVersion; newVer: DocVersion; onClose: () => void }) {
  const diffLines = useMemo(function () { return computeDiff(oldVer.content, newVer.content) }, [oldVer, newVer])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        animation: 'diffFadeIn 0.2s ease-out'
      }}
      onClick={onClose}
    >
      <div
        onClick={function (e) { e.stopPropagation() }}
        style={{
          width: '100%',
          maxWidth: 1100,
          height: '85vh',
          background: 'white',
          borderRadius: 14,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'diffSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div
          style={{
            padding: '18px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: '#F8FAFC'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #F59E0B, #EF4444)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18 }}>
              ⚖
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: '#0F172A' }}>版本对比</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>
                版本 <span style={{ color: '#EF4444', fontWeight: 500 }}>v{oldVer.version}</span>
                <span style={{ margin: '0 6px', color: '#94A3B8' }}>→</span>
                <span style={{ color: '#10B981', fontWeight: 500 }}>v{newVer.version}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 34, height: 34,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 22,
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={function (e) { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A' }}
            onMouseLeave={function (e) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {[
            { title: '旧版本 v' + oldVer.version, author: oldVer.author, time: oldVer.updatedAt, isLeft: true },
            { title: '新版本 v' + newVer.version, author: newVer.author, time: newVer.updatedAt, isLeft: false }
          ].map(function (side, sideIdx) {
            return (
              <div key={sideIdx} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderLeft: sideIdx > 0 ? '1px solid #E2E8F0' : 'none' }}>
                <div style={{ padding: '12px 18px', background: side.isLeft ? '#FEF2F2' : '#F0FDF4', borderBottom: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: side.isLeft ? '#991B1B' : '#065F46' }}>{side.title}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{side.author} · {formatDateTime(side.time)}</div>
                </div>
                <div style={{ flex: 1, overflow: 'auto', fontFamily: "'SF Mono','Monaco','Consolas',monospace", fontSize: 13, lineHeight: 1.65 }}>
                  {diffLines.map(function (line, li) {
                    const hasDiff = line.type !== 'same'
                    const bg = hasDiff ? '#FEF9C3' : 'transparent'
                    const segments = side.isLeft ? line.leftSegments : line.rightSegments
                    const contentText = side.isLeft ? line.leftContent : line.rightContent

                    return (
                      <div
                        key={li}
                        style={{
                          display: 'flex',
                          background: bg,
                          borderRadius: 2,
                          margin: '1px 4px',
                          padding: '1px 6px',
                          minHeight: 22
                        }}
                      >
                        <span style={{
                          width: 40, flexShrink: 0, textAlign: 'right',
                          color: '#94A3B8', userSelect: 'none',
                          paddingRight: 10, fontSize: 11, paddingTop: 2,
                          fontFamily: "'SF Mono', monospace"
                        }}>
                          {li + 1}
                        </span>
                        <span style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#1E293B' }}>
                          {hasDiff ? renderSegments(segments) : (contentText || ' ')}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes diffFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes diffSlideUp {
          from { transform: translateY(30px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function VersionTimeline({ versions, onCompare, onClose }: { versions: DocVersion[]; onCompare: (old: DocVersion, newer: DocVersion) => void; onClose: () => void }) {
  const [selected, setSelected] = useState<number | null>(versions.length > 1 ? versions.length - 2 : null)

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 500
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15,23,42,0.25)',
          animation: 'tlFade 0.2s ease-out'
        }}
        onClick={onClose}
      />
      <div
        onClick={function (e) { e.stopPropagation() }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '60vh',
          background: 'white',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -10px 40px rgba(0,0,0,0.15)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'tlSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >
        <div style={{
          padding: '16px 24px 12px',
          borderBottom: '1px solid #F1F5F9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #2563EB, #8B5CF6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 16 }}>
              ⎇
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A' }}>历史版本</div>
              <div style={{ fontSize: 11, color: '#64748B' }}>共 {versions.length} 个版本 · 先点一个版本，再点另一个版本进行对比</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer', fontSize: 20, color: '#64748B',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
            onMouseEnter={function (e) { e.currentTarget.style.background = '#F1F5F9' }}
            onMouseLeave={function (e) { e.currentTarget.style.background = 'transparent' }}
          >×</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 24px 24px' }}>
          {[...versions].reverse().map(function (ver, idx) {
            const realIdx = versions.length - 1 - idx
            const isLatest = idx === 0
            const isSelected = selected === realIdx

            return (
              <div key={ver.version} style={{ display: 'flex', position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, marginRight: 16, paddingTop: 8 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: isLatest ? '#10B981' : isSelected ? '#2563EB' : '#CBD5E1',
                    border: '3px solid ' + (isLatest ? '#BBF7D0' : isSelected ? '#BFDBFE' : '#F1F5F9'),
                    flexShrink: 0,
                    transition: 'all 0.2s',
                    zIndex: 1
                  }} />
                  {idx < versions.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: '#E2E8F0', margin: '4px 0' }} />
                  )}
                </div>

                <div
                  onClick={function () { setSelected(realIdx) }}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    marginBottom: 4,
                    borderRadius: 10,
                    border: '1px solid ' + (isSelected ? '#BFDBFE' : '#E2E8F0'),
                    background: isSelected ? '#EFF6FF' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                  onMouseEnter={function (e) {
                    if (!isSelected) { (e.currentTarget as HTMLDivElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLDivElement).style.borderColor = '#CBD5E1' }
                  }}
                  onMouseLeave={function (e) {
                    if (!isSelected) { (e.currentTarget as HTMLDivElement).style.background = 'white'; (e.currentTarget as HTMLDivElement).style.borderColor = '#E2E8F0' }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: 'linear-gradient(135deg, ' + (isLatest ? '#10B981' : '#2563EB') + ', #8B5CF6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0
                    }}>
                      V{ver.version}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>版本 {ver.version}</span>
                        {isLatest && (
                          <span style={{
                            padding: '2px 8px', borderRadius: 20,
                            background: '#D1FAE5', color: '#065F46',
                            fontSize: 10.5, fontWeight: 600
                          }}>当前版本</span>
                        )}
                        {isSelected && !isLatest && (
                          <span style={{
                            padding: '2px 8px', borderRadius: 20,
                            background: '#DBEAFE', color: '#1D4ED8',
                            fontSize: 10.5, fontWeight: 600
                          }}>已选中</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ fontWeight: 500, color: '#475569' }}>{ver.author}</span> · {formatDateTime(ver.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {selected !== null && selected !== realIdx && (
                      <button
                        onClick={function (e) {
                          e.stopPropagation()
                          const newerIdx = Math.max(selected as number, realIdx)
                          const olderIdx = Math.min(selected as number, realIdx)
                          onCompare(versions[olderIdx], versions[newerIdx])
                        }}
                        style={{
                          padding: '7px 14px', borderRadius: 6,
                          border: 'none', background: '#2563EB',
                          color: 'white', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.15s'
                        }}
                        onMouseEnter={function (e) { (e.currentTarget as HTMLButtonElement).style.background = '#1D4ED8' }}
                        onMouseLeave={function (e) { (e.currentTarget as HTMLButtonElement).style.background = '#2563EB' }}
                      >
                        对比
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes tlFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes tlSlideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

interface FloatingPanelProps {
  onSave: () => void
  saving: boolean
  saved: boolean
  onShowHistory: () => void
  onShare: () => void
}

function FloatingPanel({ onSave, saving, saved, onShowHistory, onShare }: FloatingPanelProps) {
  const [pos, setPos] = useState({ x: -20, y: 120 })
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const onMouseDown = function (e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return
    setDragging(true)
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
  }

  useEffect(function () {
    if (!dragging) return
    const onMove = function (e: MouseEvent) {
      const maxX = window.innerWidth - 220
      const maxY = window.innerHeight - 140
      setPos({
        x: Math.min(maxX, Math.max(12, e.clientX - dragOffset.current.x - (window.innerWidth - 220))),
        y: Math.min(maxY, Math.max(80, e.clientY - dragOffset.current.y))
      })
    }
    const onUp = function () { setDragging(false) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return function () {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [dragging])

  return (
    <div
      ref={containerRef}
      onMouseDown={onMouseDown}
      style={{
        position: 'fixed',
        right: Math.abs(pos.x) + 'px',
        top: pos.y,
        zIndex: 200,
        padding: 10,
        borderRadius: 8,
        background: 'rgba(255, 255, 255, 0.72)',
        backdropFilter: 'blur(16px) saturate(180%)',
        WebkitBackdropFilter: 'blur(16px) saturate(180%)',
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 8px 32px rgba(15, 23, 42, 0.12), 0 2px 8px rgba(15, 23, 42, 0.06)',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        overflow: 'hidden'
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: 0.05,
          backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          backgroundSize: '120px 120px'
        }}
      />
      <div style={{ position: 'relative', display: 'flex', gap: 6 }}>
        <button
          onClick={onSave}
          disabled={saving}
          title="保存文档 (Ctrl+S)"
          style={{
            width: 44, height: 44,
            borderRadius: 8,
            border: 'none',
            background: saved ? '#10B981' : saving ? '#FFFFFF' : '#2563EB',
            color: 'white',
            cursor: saving ? 'progress' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.3s ease, transform 0.15s ease',
            position: 'relative',
            fontSize: 18,
            boxShadow: saved ? '0 2px 8px rgba(16,185,129,0.35)' : saving ? 'none' : '0 1px 3px rgba(37,99,235,0.3)'
          }}
          onMouseEnter={function (e) {
            if (!saving && !saved) { (e.currentTarget as HTMLButtonElement).style.background = '#1D4ED8'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)' }
          }}
          onMouseLeave={function (e) {
            if (!saving && !saved) { (e.currentTarget as HTMLButtonElement).style.background = '#2563EB'; (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)' }
          }}
        >
          {saving ? (
            <div style={{
              width: 20, height: 20,
              border: '2.5px solid rgba(37,99,235,0.18)',
              borderTopColor: '#2563EB',
              borderRadius: '50%',
              animation: 'saveSpin 0.8s linear infinite'
            }} />
          ) : saved ? (
            <span key="check" style={{
              fontSize: 22,
              fontWeight: 700,
              display: 'inline-block',
              animation: 'savePop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
            }}>✓</span>
          ) : (
            <span>💾</span>
          )}
        </button>

        <button
          onClick={onShowHistory}
          title="历史版本"
          style={{
            width: 44, height: 44,
            borderRadius: 8,
            border: '1px solid rgba(15,23,42,0.06)',
            background: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            fontSize: 18
          }}
          onMouseEnter={function (e) { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#CBD5E1' }}
          onMouseLeave={function (e) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.7)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(15,23,42,0.06)' }}
        >
          ⎇
        </button>

        <button
          onClick={onShare}
          title="分享文档"
          style={{
            width: 44, height: 44,
            borderRadius: 8,
            border: '1px solid rgba(15,23,42,0.06)',
            background: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            fontSize: 18
          }}
          onMouseEnter={function (e) { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#CBD5E1' }}
          onMouseLeave={function (e) { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255,255,255,0.7)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(15,23,42,0.06)' }}
        >
          🔗
        </button>
      </div>

      <style>{`
        @keyframes saveSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes savePop {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.25); }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

function ShareToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(function () {
    const t = setTimeout(onClose, 2500)
    return function () { clearTimeout(t) }
  }, [onClose])

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 2000,
        padding: '10px 20px',
        borderRadius: 10,
        background: 'rgba(15,23,42,0.9)',
        color: 'white',
        fontSize: 13,
        fontWeight: 500,
        boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
        backdropFilter: 'blur(8px)',
        animation: 'toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)'
      }}
    >
      {message}
      <style>{`
        @keyframes toastIn {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default function DocEditor() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { getDocumentById, updateDocument, categoryColors } = useStore()
  const doc = getDocumentById(id)

  const [editable, setEditable] = useState(false)
  const [editContent, setEditContent] = useState(doc?.content || '')
  const [editTitle, setEditTitle] = useState(doc?.title || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [diffPair, setDiffPair] = useState<{ old: DocVersion; new: DocVersion } | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(function () {
    if (doc) {
      setEditContent(doc.content)
      setEditTitle(doc.title)
    }
  }, [id, doc])

  const renderedContent = useMemo(function () {
    const content = editable ? editContent : (doc?.content || '')
    return parseMarkdown(content)
  }, [editable, editContent, doc])

  const handleSave = useCallback(function () {
    if (saving || !doc) return
    setSaving(true)
    setSaved(false)

    setTimeout(function () {
      updateDocument(id, editContent, editTitle, doc.category)
      setSaving(false)
      setSaved(true)
      setEditable(false)

      setTimeout(function () {
        setSaved(false)
      }, 2500)
    }, 1500)
  }, [saving, doc, updateDocument, id, editContent, editTitle])

  useEffect(function () {
    const handler = function (e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault()
        if (editable) handleSave()
      }
      if (e.key === 'Escape') {
        setShowHistory(false)
        setDiffPair(null)
      }
    }
    window.addEventListener('keydown', handler)
    return function () { window.removeEventListener('keydown', handler) }
  }, [editable, handleSave])

  if (!doc) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📄</div>
        <h2 style={{ margin: '0 0 8px', color: '#0F172A', fontWeight: 600 }}>文档不存在</h2>
        <p style={{ margin: '0 0 24px', color: '#64748B' }}>该文档可能已被删除或链接错误</p>
        <button onClick={function () { navigate('/') }} style={{
          padding: '9px 20px', borderRadius: 8, border: 'none',
          background: '#2563EB', color: 'white', fontWeight: 600,
          cursor: 'pointer', fontSize: 14
        }}>
          返回文档列表
        </button>
      </div>
    )
  }

  const cardColor = categoryColors[doc.colorIndex % categoryColors.length]

  return (
    <div style={{ padding: '32px 24px 80px', position: 'relative', maxWidth: 880, margin: '0 auto' }}>
      <button
        onClick={function () { navigate('/') }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 14px',
          marginBottom: 20,
          borderRadius: 8,
          border: '1px solid #E2E8F0',
          background: 'white',
          color: '#475569',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.15s'
        }}
        onMouseEnter={function (e) { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#CBD5E1'; (e.currentTarget as HTMLButtonElement).style.color = '#0F172A' }}
        onMouseLeave={function (e) { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLButtonElement).style.color = '#475569' }}
      >
        ← 返回列表
      </button>

      <article
        style={{
          background: 'white',
          borderRadius: 16,
          boxShadow: '0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04)',
          border: '1px solid #F1F5F9',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            height: 5,
            background: 'linear-gradient(90deg, ' + cardColor + ', #8B5CF6)'
          }}
        />
        <div style={{ padding: '28px 40px 48px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, flexWrap: 'wrap' }}>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: 20,
                background: cardColor + '15',
                color: cardColor,
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid ' + cardColor + '25'
              }}
            >
              {doc.category}
            </span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>版本 v{doc.versions.length}</span>
            <span style={{ fontSize: 12, color: '#CBD5E1' }}>·</span>
            <span style={{ fontSize: 12, color: '#94A3B8' }}>更新于 {formatDateTime(doc.updatedAt)}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16 }}>
            {editable ? (
              <input
                type="text"
                value={editTitle}
                onChange={function (e) { setEditTitle(e.target.value) }}
                style={{
                  flex: 1,
                  fontSize: 28,
                  fontWeight: 600,
                  color: '#0F172A',
                  lineHeight: 1.25,
                  border: '2px solid #2563EB',
                  borderRadius: 8,
                  padding: '8px 12px',
                  outline: 'none',
                  background: '#EFF6FF',
                  fontFamily: 'inherit'
                }}
              />
            ) : (
              <h1
                onDoubleClick={function () { setEditable(true) }}
                style={{
                  margin: 0,
                  fontSize: 28,
                  fontWeight: 600,
                  color: '#0F172A',
                  lineHeight: 1.25,
                  cursor: 'text'
                }}
              >
                {editTitle || doc.title}
              </h1>
            )}
            {!editable ? (
              <button
                onClick={function () { setEditable(true); setEditContent(doc.content); setEditTitle(doc.title) }}
                style={{
                  flexShrink: 0,
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid #E2E8F0',
                  background: 'white',
                  color: '#475569',
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={function (e) { (e.currentTarget as HTMLButtonElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#CBD5E1' }}
                onMouseLeave={function (e) { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#E2E8F0' }}
              >
                ✎ 编辑
              </button>
            ) : (
              <button
                onClick={function () { setEditable(false); setEditContent(doc.content); setEditTitle(doc.title) }}
                style={{
                  flexShrink: 0,
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: '1px solid #FECACA',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
                onMouseEnter={function (e) { (e.currentTarget as HTMLButtonElement).style.background = '#FEE2E2' }}
                onMouseLeave={function (e) { (e.currentTarget as HTMLButtonElement).style.background = '#FEF2F2' }}
              >
                取消
              </button>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              paddingBottom: 24,
              borderBottom: '1px solid #F1F5F9',
              marginBottom: 28
            }}
          >
            <div
              style={{
                width: 40, height: 40, borderRadius: '50%',
                background: 'linear-gradient(135deg, ' + cardColor + ', #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'white', fontSize: 15, fontWeight: 700
              }}
            >
              {doc.author.charAt(0)}
            </div>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#0F172A' }}>{doc.author}</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 1 }}>作者 · 创建于 {formatDateTime(doc.createdAt)}</div>
            </div>
          </div>

          {editable ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                padding: '8px 14px',
                fontSize: 12.5,
                color: '#64748B',
                background: '#F8FAFC',
                borderRadius: 8,
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span style={{ fontSize: 14 }}>💡</span>
                <span>支持 Markdown 语法编辑，按 <kbd style={{padding:'1px 6px',borderRadius:4,background:'white',border:'1px solid #E2E8F0',borderBottomWidth:2,fontSize:11,fontFamily:"'SF Mono',monospace"}}>Ctrl</kbd> + <kbd style={{padding:'1px 6px',borderRadius:4,background:'white',border:'1px solid #E2E8F0',borderBottomWidth:2,fontSize:11,fontFamily:"'SF Mono',monospace"}}>S</kbd> 或点击 💾 按钮保存</span>
              </div>
              <textarea
                value={editContent}
                onChange={function (e) { setEditContent(e.target.value) }}
                style={{
                  width: '100%',
                  minHeight: 500,
                  padding: 20,
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  background: '#FAFBFC',
                  fontSize: 14,
                  lineHeight: 1.7,
                  fontFamily: "'SF Mono','Monaco','Consolas',monospace",
                  color: '#1E293B',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'all 0.15s'
                }}
                onFocus={function (e) { (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#2563EB'; (e.currentTarget as HTMLTextAreaElement).style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                onBlur={function (e) { (e.currentTarget as HTMLTextAreaElement).style.borderColor = '#E2E8F0'; (e.currentTarget as HTMLTextAreaElement).style.boxShadow = 'none' }}
              />
            </div>
          ) : (
            <div
              onDoubleClick={function () { setEditable(true) }}
              className="markdown-body"
              style={{ cursor: 'text' }}
              dangerouslySetInnerHTML={{ __html: renderedContent }}
            />
          )}
        </div>
      </article>

      <FloatingPanel
        onSave={handleSave}
        saving={saving}
        saved={saved}
        onShowHistory={function () { setShowHistory(true) }}
        onShare={function () {
          try {
            navigator.clipboard?.writeText(window.location.href)
            setToast('链接已复制到剪贴板 ✓')
          } catch (_err) {
            setToast('分享链接: ' + window.location.href)
          }
        }}
      />

      {showHistory && (
        <VersionTimeline
          versions={doc.versions}
          onCompare={function (oldV, newV) { setDiffPair({ old: oldV, new: newV }); setShowHistory(false) }}
          onClose={function () { setShowHistory(false) }}
        />
      )}

      {diffPair && (
        <DiffView
          oldVer={diffPair.old}
          newVer={diffPair.new}
          onClose={function () { setDiffPair(null) }}
        />
      )}

      {toast && <ShareToast message={toast} onClose={function () { setToast(null) }} />}

      <style>{`
        .markdown-body pre { white-space: pre-wrap !important; }
        @media (max-width: 767px) {
          article > div:nth-child(2) { padding: 20px 18px 32px !important; }
        }
      `}</style>
    </div>
  )
}
