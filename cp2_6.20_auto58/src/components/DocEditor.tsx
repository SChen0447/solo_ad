import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useStore, CATEGORY_COLORS } from '../data/store'
import type { DocVersion } from '../data/store'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function parseMarkdown(md: string): string {
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  html = html.replace(/```([\s\S]*?)```/g, (_, code) => {
    const lang = code.split('\n')[0]?.trim() || ''
    const body = code.slice(lang.length).replace(/^\n/, '')
    const lines = body.split('\n')
    const lastEmpty = lines.length > 0 && lines[lines.length - 1] === '' ? lines.pop() : ''
    const lineNumbers = lines.map((_, i) => `<span style="display:inline-block;width:2.5em;padding-right:1em;text-align:right;color:#475569;border-right:1px solid #334155;margin-right:1em;user-select:none;font-variant-numeric:tabular-nums">${i + 1}</span>`).join('\n')
    return `<pre style="background:#1E293B;color:#E2E8F0;border-radius:10px;padding:16px 16px 16px 0;overflow-x:auto;font-size:13px;line-height:1.6;font-family:'SF Mono','Monaco','Consolas',monospace"><code style="display:block"><div style="white-space:pre">${lineNumbers ? lineNumbers + '\n' : ''}${lines.map(l => l).join('\n')}</div></code></pre>`
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
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
  html = html.replace(/__(.+?)__/g, '<strong style="font-weight:600;color:#1E293B">$1</strong>')
  html = html.replace(/_(.+?)_/g, '<em style="color:#334155">$1</em>')
  html = html.replace(/~~(.+?)~~/g, '<del style="color:#94A3B8">$1</del>')

  html = html.replace(/^>\s*(.+)$/gm, '<blockquote style="border-left:3px solid #2563EB;padding:8px 16px;margin:16px 0;background:#EFF6FF;color:#334155;border-radius:0 6px 6px 0;line-height:1.6">$1</blockquote>')

  html = html.replace(/^\s*[-*+]\s+(.+)$/gm, (_, item) => `<li style="margin:4px 0;padding-left:4px">${item}</li>`)
  html = html.replace(/(<li[^>]*>.*<\/li>\n?)+/g, m => `<ul style="margin:12px 0;padding-left:24px;line-height:1.7">${m}</ul>`)

  html = html.replace(/^\s*(\d+)\.\s+(.+)$/gm, (_, n, item) => `<li value="${n}" style="margin:4px 0;padding-left:4px">${item}</li>`)
  html = html.replace(/(<li value=.*<\/li>\n?)+/g, m => `<ol style="margin:12px 0;padding-left:24px;line-height:1.7">${m}</ol>`)

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color:#2563EB;text-decoration:underline;text-underline-offset:2px" target="_blank" rel="noopener">$1</a>')

  html = html.replace(/\n{2,}/g, '</p><p style="margin:12px 0;line-height:1.75;color:#334155;font-size:14.5px">')
  html = html.replace(/\n/g, '<br>')
  html = `<p style="margin:12px 0;line-height:1.75;color:#334155;font-size:14.5px">${html}</p>`
  html = html.replace(/<p style="[^"]*">\s*<\/p>/g, '')
  html = html.replace(/<h(\d)[^>]*>([\s\S]*?)<\/h\1><p[^>]*>/g, (m, lvl, inner) => m.replace(/<p[^>]*>$/, ''))
  html = html.replace(/<\/(h\d|pre|blockquote|ul|ol)>\s*<p[^>]*>/g, m => m.replace(/<p[^>]*>$/, ''))

  return html
}

interface DiffLine {
  type: 'same' | 'added' | 'removed' | 'modified'
  content: string
  leftHtml?: string
  rightHtml?: string
}

function computeDiff(oldStr: string, newStr: string): { left: DiffLine[]; right: DiffLine[] } {
  const oldLines = oldStr.split('\n')
  const newLines = newStr.split('\n')
  const maxLen = Math.max(oldLines.length, newLines.length)
  const left: DiffLine[] = []
  const right: DiffLine[] = []

  for (let i = 0; i < maxLen; i++) {
    const ol = oldLines[i] ?? ''
    const nl = newLines[i] ?? ''

    if (ol === nl) {
      left.push({ type: 'same', content: ol })
      right.push({ type: 'same', content: nl })
    } else if (ol && !nl) {
      left.push({ type: 'removed', content: ol })
      right.push({ type: 'same', content: '' })
    } else if (!ol && nl) {
      left.push({ type: 'same', content: '' })
      right.push({ type: 'added', content: nl })
    } else {
      const oldChars = ol.split('')
      const newChars = nl.split('')
      let leftHtml = ''
      let rightHtml = ''
      const minLen = Math.min(oldChars.length, newChars.length)

      let iL = 0
      while (iL < minLen) {
        if (oldChars[iL] === newChars[iL]) {
          let sameLen = 1
          while (iL + sameLen < minLen && oldChars[iL + sameLen] === newChars[iL + sameLen] && sameLen < 3) sameLen++
          leftHtml += oldChars.slice(iL, iL + sameLen).join('')
          rightHtml += newChars.slice(iL, iL + sameLen).join('')
          iL += sameLen
        } else {
          let diffLen = 1
          while (iL + diffLen < minLen && oldChars[iL + diffLen] !== newChars[iL + diffLen]) diffLen++
          leftHtml += `<del style="color:#DC2626;text-decoration:line-through;background:#FEE2E2;border-radius:2px;padding:0 1px">${oldChars.slice(iL, iL + diffLen).join('')}</del>`
          rightHtml += `<ins style="color:#059669;text-decoration:underline;text-decoration-color:#10B981;text-underline-offset:2px;background:#D1FAE5;border-radius:2px;padding:0 1px">${newChars.slice(iL, iL + diffLen).join('')}</ins>`
          iL += diffLen
        }
      }
      if (oldChars.length > minLen) {
        leftHtml += `<del style="color:#DC2626;text-decoration:line-through;background:#FEE2E2;border-radius:2px;padding:0 1px">${oldChars.slice(minLen).join('')}</del>`
      }
      if (newChars.length > minLen) {
        rightHtml += `<ins style="color:#059669;text-decoration:underline;text-decoration-color:#10B981;text-underline-offset:2px;background:#D1FAE5;border-radius:2px;padding:0 1px">${newChars.slice(minLen).join('')}</ins>`
      }

      left.push({ type: 'modified', content: ol, leftHtml })
      right.push({ type: 'modified', content: nl, rightHtml })
    }
  }
  return { left, right }
}

function DiffView({ oldVer, newVer, onClose }: { oldVer: DocVersion; newVer: DocVersion; onClose: () => void }) {
  const { left, right } = useMemo(() => computeDiff(oldVer.content, newVer.content), [oldVer, newVer])

  return (
    <div
      className="fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px'
      }}
      onClick={onClose}
    >
      <div
        className="slide-up"
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 1100,
          height: '85vh',
          background: 'white',
          borderRadius: 14,
          boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
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
              fontSize: 20,
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#E2E8F0'; e.currentTarget.style.color = '#0F172A' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' }}
          >
            ×
          </button>
        </div>

        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {[
            { title: `旧版本 v${oldVer.version}`, author: oldVer.author, time: oldVer.updatedAt, lines: left, isOld: true },
            { title: `新版本 v${newVer.version}`, author: newVer.author, time: newVer.updatedAt, lines: right, isOld: false }
          ].map((side, idx) => (
            <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, borderLeft: idx > 0 ? '1px solid #E2E8F0' : 'none' }}>
              <div style={{ padding: '12px 18px', background: side.isOld ? '#FEF2F2' : '#F0FDF4', borderBottom: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: side.isOld ? '#991B1B' : '#065F46' }}>{side.title}</div>
                <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>{side.author} · {formatDateTime(side.time)}</div>
              </div>
              <div style={{ flex: 1, overflow: 'auto', padding: 16, fontFamily: "'SF Mono','Monaco','Consolas',monospace", fontSize: 13, lineHeight: 1.6 }}>
                {side.lines.map((line, li) => {
                  let bg = 'transparent'
                  if (line.type === 'removed' || (line.type === 'modified' && side.isOld)) bg = '#FEF9C3'
                  if (line.type === 'added' || (line.type === 'modified' && !side.isOld)) bg = '#FEF9C3'
                  const content = (line as any)[side.isOld ? 'leftHtml' : 'rightHtml'] || line.content
                  return (
                    <div key={li} style={{ display: 'flex', background: bg, borderRadius: 2, margin: '1px 0', padding: '1px 4px' }}>
                      <span style={{ width: 40, flexShrink: 0, textAlign: 'right', color: '#94A3B8', userSelect: 'none', paddingRight: 8, fontSize: 11, paddingTop: 2 }}>
                        {li + 1}
                      </span>
                      <span style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-all', color: '#1E293B' }}>
                        {content || ' '}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
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
        zIndex: 500,
        pointerEvents: 'none'
      }}
      onClick={onClose}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(15,23,42,0.25)',
          opacity: 1,
          pointerEvents: 'auto'
        }}
        onClick={onClose}
      />
      <div
        className="slide-up"
        onClick={e => e.stopPropagation()}
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
          pointerEvents: 'auto',
          overflow: 'hidden'
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
              <div style={{ fontSize: 11, color: '#64748B' }}>共 {versions.length} 个版本 · 点击两个版本进行对比</div>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: 8, border: 'none',
            background: 'transparent', cursor: 'pointer', fontSize: 18, color: '#64748B',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F1F5F9' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >×</button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 24px 24px' }}>
          {[...versions].reverse().map((ver, idx) => {
            const realIdx = versions.length - 1 - idx
            const isLatest = idx === 0
            const isSelected = selected === realIdx

            return (
              <div key={ver.version} style={{ display: 'flex', position: 'relative' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 24, marginRight: 16, paddingTop: 8 }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%',
                    background: isLatest ? '#10B981' : isSelected ? '#2563EB' : '#CBD5E1',
                    border: `3px solid ${isLatest ? '#BBF7D0' : isSelected ? '#BFDBFE' : '#F1F5F9'}`,
                    flexShrink: 0,
                    transition: 'all 0.2s',
                    zIndex: 1
                  }} />
                  {idx < versions.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: '#E2E8F0', margin: '4px 0' }} />
                  )}
                </div>

                <div
                  onClick={() => setSelected(realIdx)}
                  style={{
                    flex: 1,
                    padding: '12px 16px',
                    marginBottom: 4,
                    borderRadius: 10,
                    border: `1px solid ${isSelected ? '#BFDBFE' : '#E2E8F0'}`,
                    background: isSelected ? '#EFF6FF' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1' }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E2E8F0' }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `linear-gradient(135deg, ${isLatest ? '#10B981' : '#2563EB'}, #8B5CF6)`,
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
                      </div>
                      <div style={{ fontSize: 12, color: '#64748B', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        <span style={{ fontWeight: 500, color: '#475569' }}>{ver.author}</span> · {formatDateTime(ver.updatedAt)}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {!isLatest && selected !== null && selected !== realIdx && (
                      <button
                        onClick={e => {
                          e.stopPropagation()
                          const newerIdx = Math.max(selected, realIdx)
                          const olderIdx = Math.min(selected, realIdx)
                          onCompare(versions[olderIdx], versions[newerIdx])
                        }}
                        style={{
                          padding: '7px 14px', borderRadius: 6,
                          border: 'none', background: '#2563EB',
                          color: 'white', fontSize: 12, fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.15s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#1D4ED8'}
                        onMouseLeave={e => e.currentTarget.style.background = '#2563EB'}
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
    </div>
  )
}

interface FloatingPanelProps {
  onSave: () => void
  saving: boolean
  saved: boolean
  onShowHistory: () => void
  onShare: () => void
  documentId: string
}

function FloatingPanel({ onSave, saving, saved, onShowHistory, onShare }: FloatingPanelProps) {
  const [pos, setPos] = useState({ x: -20, y: 120 })
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const onMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    setDragging(true)
    const rect = containerRef.current?.getBoundingClientRect()
    if (rect) {
      dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
  }

  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const maxX = window.innerWidth - 220
      const maxY = window.innerHeight - 140
      setPos({
        x: Math.min(maxX, Math.max(12, e.clientX - dragOffset.current.x - (window.innerWidth - 220))),
        y: Math.min(maxY, Math.max(80, e.clientY - dragOffset.current.y))
      })
    }
    const onUp = () => setDragging(false)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
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
        right: `${Math.abs(pos.x)}px`,
        top: pos.y,
        zIndex: 200,
        padding: 10,
        borderRadius: 8,
        background: 'rgba(255, 255, 255, 0.75)',
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
          opacity: 0.04,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: '120px 120px'
        }}
      />
      <div style={{ position: 'relative', display: 'flex', gap: 6 }}>
        <button
          onClick={onSave}
          disabled={saving}
          title="保存文档 (Ctrl+S)"
          style={{
            width: 42, height: 42,
            borderRadius: 8,
            border: 'none',
            background: saved ? '#10B981' : saving ? 'white' : '#2563EB',
            color: 'white',
            cursor: saving ? 'progress' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
            position: 'relative',
            fontSize: 18
          }}
          onMouseEnter={e => { if (!saving && !saved) e.currentTarget.style.background = '#1D4ED8' }}
          onMouseLeave={e => { if (!saving && !saved) e.currentTarget.style.background = '#2563EB' }}
        >
          {saving ? (
            <div style={{
              width: 18, height: 18,
              border: `2.5px solid rgba(37,99,235,0.2)`,
              borderTopColor: '#2563EB',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }} />
          ) : saved ? (
            <span className="pop-in" style={{ fontSize: 20 }}>✓</span>
          ) : (
            '💾'
          )}
        </button>

        <button
          onClick={onShowHistory}
          title="历史版本"
          style={{
            width: 42, height: 42,
            borderRadius: 8,
            border: '1px solid rgba(15,23,42,0.06)',
            background: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            fontSize: 17
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#CBD5E1' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(15,23,42,0.06)' }}
        >
          ⎇
        </button>

        <button
          onClick={onShare}
          title="分享文档"
          style={{
            width: 42, height: 42,
            borderRadius: 8,
            border: '1px solid rgba(15,23,42,0.06)',
            background: 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.15s',
            fontSize: 17
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#CBD5E1' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.7)'; e.currentTarget.style.borderColor = 'rgba(15,23,42,0.06)' }}
        >
          🔗
        </button>
      </div>
    </div>
  )
}

function ShareToast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 2500)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div
      className="pop-in"
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
        backdropFilter: 'blur(8px)'
      }}
    >
      {message}
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

  useEffect(() => {
    if (doc) {
      setEditContent(doc.content)
      setEditTitle(doc.title)
    }
  }, [id, doc])

  const renderedContent = useMemo(() => {
    const content = editable ? editContent : (doc?.content || '')
    return parseMarkdown(content)
  }, [editable, editContent, doc])

  const handleSave = useCallback(() => {
    if (saving || !doc) return
    setSaving(true)
    setSaved(false)

    setTimeout(() => {
      updateDocument(id, editContent, editTitle, doc.category)
      setSaving(false)
      setSaved(true)
      setEditable(false)

      setTimeout(() => {
        setSaved(false)
      }, 2000)
    }, 1500)
  }, [saving, doc, updateDocument, id, editContent, editTitle])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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
    return () => window.removeEventListener('keydown', handler)
  }, [editable, handleSave])

  if (!doc) {
    return (
      <div style={{ padding: 80, textAlign: 'center' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>📄</div>
        <h2 style={{ margin: '0 0 8px', color: '#0F172A', fontWeight: 600 }}>文档不存在</h2>
        <p style={{ margin: '0 0 24px', color: '#64748B' }}>该文档可能已被删除或链接错误</p>
        <button onClick={() => navigate('/')} style={{
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
        onClick={() => navigate('/')}
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
        onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#0F172A' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#475569' }}
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
            background: `linear-gradient(90deg, ${cardColor}, #8B5CF6)`
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
                border: `1px solid ${cardColor}25`
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
                onChange={e => setEditTitle(e.target.value)}
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
                onDoubleClick={() => setEditable(true)}
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
                onClick={() => { setEditable(true); setEditContent(doc.content); setEditTitle(doc.title) }}
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
                onMouseEnter={e => { e.currentTarget.style.background = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E2E8F0' }}
              >
                ✎ 编辑
              </button>
            ) : (
              <button
                onClick={() => { setEditable(false); setEditContent(doc.content); setEditTitle(doc.title) }}
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
                onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}
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
                background: `linear-gradient(135deg, ${cardColor}, #8B5CF6)`,
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
                padding: '6px 12px',
                fontSize: 12,
                color: '#64748B',
                background: '#F8FAFC',
                borderRadius: 8,
                border: '1px solid #E2E8F0'
              }}>
                💡 提示：支持 Markdown 语法，按 Ctrl+S 或点击 💾 按钮保存
              </div>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
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
                onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.1)' }}
                onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none' }}
              />
            </div>
          ) : (
            <div
              onDoubleClick={() => setEditable(true)}
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
        onShowHistory={() => setShowHistory(true)}
        onShare={() => {
          navigator.clipboard?.writeText(window.location.href)
          setToast('链接已复制到剪贴板 ✓')
        }}
        documentId={id}
      />

      {showHistory && (
        <VersionTimeline
          versions={doc.versions}
          onCompare={(oldV, newV) => { setDiffPair({ old: oldV, new: newV }); setShowHistory(false) }}
          onClose={() => setShowHistory(false)}
        />
      )}

      {diffPair && (
        <DiffView
          oldVer={diffPair.old}
          newVer={diffPair.new}
          onClose={() => setDiffPair(null)}
        />
      )}

      {toast && <ShareToast message={toast} onClose={() => setToast(null)} />}

      <style>{`
        .markdown-body pre { white-space: pre-wrap !important; }
        @media (max-width: 767px) {
          article > div:nth-child(2) { padding: 20px 18px 32px !important; }
        }
      `}</style>
    </div>
  )
}
