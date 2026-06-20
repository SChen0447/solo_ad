import { useState, useEffect, useRef, useMemo } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useApp, pickColorForCategory, Version } from '../data/store'

/* ========= Markdown 解析 ========= */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderInline(text: string): string {
  let s = text
  s = s.replace(/`([^`]+)`/g, (_m, c) => `<code style="background:#F1F5F9;padding:2px 6px;border-radius:4px;font-size:12.5px;color:#DB2777;font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${escapeHtml(c)}</code>`)
  s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  s = s.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  s = s.replace(/__([^_]+)__/g, '<strong>$1</strong>')
  s = s.replace(/_([^_]+)_/g, '<em>$1</em>')
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
  return s
}

function parseMarkdown(md: string): { html: string } {
  const lines = md.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (/^```/.test(line)) {
      const lang = line.replace(/^```/, '').trim() || 'text'
      const code: string[] = []
      i++
      while (i < lines.length && !/^```/.test(lines[i])) {
        code.push(lines[i])
        i++
      }
      i++
      const codeHtml = escapeHtml(code.join('\n'))
      const linesArr = code.length ? code : ['']
      const lineNums = linesArr.map((_, idx) => idx + 1).join('\n')
      out.push(
        `<div class="code-wrap"><span class="code-lang">${escapeHtml(lang)}</span><div class="code-inner"><div class="code-line-numbers">${lineNums}</div><pre class="code-body">${codeHtml || ' '}</pre></div></div>`,
      )
      continue
    }

    if (/^###### (.+)/.test(line)) { out.push(`<h6>${renderInline(escapeHtml(RegExp.$1))}</h6>`); i++; continue }
    if (/^##### (.+)/.test(line)) { out.push(`<h5>${renderInline(escapeHtml(RegExp.$1))}</h5>`); i++; continue }
    if (/^#### (.+)/.test(line)) { out.push(`<h4>${renderInline(escapeHtml(RegExp.$1))}</h4>`); i++; continue }
    if (/^### (.+)/.test(line)) { out.push(`<h3>${renderInline(escapeHtml(RegExp.$1))}</h3>`); i++; continue }
    if (/^## (.+)/.test(line)) { out.push(`<h2>${renderInline(escapeHtml(RegExp.$1))}</h2>`); i++; continue }
    if (/^# (.+)/.test(line)) { out.push(`<h1>${renderInline(escapeHtml(RegExp.$1))}</h1>`); i++; continue }

    if (/^> ?(.*)/.test(line)) {
      const bs: string[] = []
      while (i < lines.length && /^> ?(.*)/.test(lines[i])) {
        bs.push(RegExp.$1)
        i++
      }
      out.push(`<blockquote>${renderInline(escapeHtml(bs.join(' ')))}</blockquote>`)
      continue
    }

    if (/^(\s*)[-*+] (.+)/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^(\s*)[-*+] (.+)/.test(lines[i])) {
        items.push(RegExp.$2)
        i++
      }
      out.push(`<ul>${items.map((it) => `<li>${renderInline(escapeHtml(it))}</li>`).join('')}</ul>`)
      continue
    }

    if (/^(\s*)(\d+)\. (.+)/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^(\s*)(\d+)\. (.+)/.test(lines[i])) {
        items.push(RegExp.$3)
        i++
      }
      out.push(`<ol>${items.map((it) => `<li>${renderInline(escapeHtml(it))}</li>`).join('')}</ol>`)
      continue
    }

    if (/^\|(.+)\|$/.test(line)) {
      const rows: string[][] = []
      while (i < lines.length && /^\|(.+)\|$/.test(lines[i])) {
        rows.push(RegExp.$1.split('|').map((c) => c.trim()))
        i++
      }
      if (rows.length >= 2 && rows[1].every((c) => /^-+$/.test(c.replace(/:/g, '')))) {
        const [head, , ...body] = rows
        const t = `<table><thead><tr>${head.map((h) => `<th>${renderInline(escapeHtml(h))}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${r.map((c) => `<td>${renderInline(escapeHtml(c))}</td>`).join('')}</tr>`).join('')}</tbody></table>`
        out.push(t)
        continue
      }
    }

    if (/^---+$/.test(line.trim())) {
      out.push('<hr style="border:none;border-top:1px solid var(--border-soft);margin:20px 0;">')
      i++
      continue
    }

    if (line.trim() === '') {
      i++
      continue
    }

    const para: string[] = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^#/.test(lines[i]) &&
      !/^```/.test(lines[i]) &&
      !/^>/.test(lines[i]) &&
      !/^(\s*)[-*+] /.test(lines[i]) &&
      !/^(\s*)(\d+)\. /.test(lines[i]) &&
      !/^\|/.test(lines[i])
    ) {
      para.push(lines[i])
      i++
    }
    out.push(`<p>${renderInline(escapeHtml(para.join(' ')))}</p>`)
  }

  return { html: out.join('\n') }
}

/* ========= Diff ========= */
interface DiffLine {
  left: string | null
  right: string | null
  changed: boolean
}

function diffLines(a: string, b: string): DiffLine[] {
  const la = a.split('\n')
  const lb = b.split('\n')
  const n = la.length
  const m = lb.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = la[i] === lb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const out: DiffLine[] = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (la[i] === lb[j]) {
      out.push({ left: la[i], right: lb[j], changed: false })
      i++; j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      out.push({ left: la[i], right: null, changed: true })
      i++
    } else {
      out.push({ left: null, right: lb[j], changed: true })
      j++
    }
  }
  while (i < n) { out.push({ left: la[i], right: null, changed: true }); i++ }
  while (j < m) { out.push({ left: null, right: lb[j], changed: true }); j++ }
  return out
}

function diffInlineChars(a: string, b: string): { leftHtml: string; rightHtml: string } {
  const ca = Array.from(a)
  const cb = Array.from(b)
  const n = ca.length
  const m = cb.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = ca[i] === cb[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const lh: string[] = []
  const rh: string[] = []
  let i = 0, j = 0
  let lBuf = ''
  let rBuf = ''
  const flush = () => {
    if (lBuf) { lh.push(`<span class="inline-del">${escapeHtml(lBuf)}</span>`); lBuf = '' }
    if (rBuf) { rh.push(`<span class="inline-add">${escapeHtml(rBuf)}</span>`); rBuf = '' }
  }
  while (i < n && j < m) {
    if (ca[i] === cb[j]) {
      flush()
      lh.push(escapeHtml(ca[i]))
      rh.push(escapeHtml(cb[j]))
      i++; j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      lBuf += ca[i]; i++
    } else {
      rBuf += cb[j]; j++
    }
  }
  while (i < n) { lBuf += ca[i]; i++ }
  while (j < m) { rBuf += cb[j]; j++ }
  flush()
  return { leftHtml: lh.join(''), rightHtml: rh.join('') }
}

/* ========= 组件 ========= */
type SaveState = 'idle' | 'saving' | 'success'
type CompareSelection = string | null

export default function DocEditor() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { state, updateDocument } = useApp()

  const doc = state.documents.find((d) => d.id === id)
  const [content, setContent] = useState('')
  const [tab, setTab] = useState<'edit' | 'preview'>('preview')
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [shareToast, setShareToast] = useState(false)
  const [compareSel, setCompareSel] = useState<CompareSelection>(null)
  const [diffModal, setDiffModal] = useState<{ a: Version; b: Version } | null>(null)

  const panelRef = useRef<HTMLDivElement>(null)
  const dragInfo = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null)

  useEffect(() => {
    if (doc) {
      setContent(doc.content)
      setTab('preview')
      setSaveState('idle')
      setHistoryOpen(false)
      setCompareSel(null)
    }
  }, [id, doc?.id])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
      if (e.key === 'Escape') {
        setHistoryOpen(false)
        setDiffModal(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [content])

  if (!doc) {
    return (
      <div className="editor-wrap">
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-400)' }}>
          <div style={{ fontSize: 52, marginBottom: 12 }}>🔍</div>
          <p>文档不存在，<Link to="/" style={{ color: 'var(--primary)' }}>返回列表</Link></p>
        </div>
      </div>
    )
  }

  const color = pickColorForCategory(doc.category)

  const handleSave = () => {
    if (!doc || saveState === 'saving') return
    if (content === doc.content) {
      setSaveState('success')
      setTimeout(() => setSaveState('idle'), 1200)
      return
    }
    setSaveState('saving')
    setTimeout(() => {
      updateDocument(doc.id, content)
      setSaveState('success')
      setTimeout(() => setSaveState('idle'), 1500)
    }, 1500)
  }

  const handleShare = () => {
    const url = `${window.location.origin}${window.location.pathname}#/doc/${doc.id}`
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).catch(() => {})
    }
    setShareToast(true)
    setTimeout(() => setShareToast(false), 1800)
  }

  /* 浮动面板拖动 */
  const onPanelMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!panelRef.current) return
    const rect = panelRef.current.getBoundingClientRect()
    const point = 'touches' in e ? e.touches[0] : e
    dragInfo.current = {
      startX: point.clientX,
      startY: point.clientY,
      origX: rect.left,
      origY: rect.top,
    }
    e.preventDefault()
  }

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragInfo.current || !panelRef.current) return
      const point = 'touches' in e ? e.touches[0] : e
      const dx = point.clientX - dragInfo.current.startX
      const dy = point.clientY - dragInfo.current.startY
      const nx = Math.max(10, Math.min(window.innerWidth - panelRef.current.offsetWidth - 10, dragInfo.current.origX + dx))
      const ny = Math.max(80, Math.min(window.innerHeight - panelRef.current.offsetHeight - 20, dragInfo.current.origY + dy))
      panelRef.current.style.left = `${nx}px`
      panelRef.current.style.top = `${ny}px`
      panelRef.current.style.right = 'auto'
    }
    const onUp = () => { dragInfo.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onUp)
    }
  }, [])

  /* 对比 */
  const compareWith = (versionId: string) => {
    if (!compareSel) {
      setCompareSel(versionId)
      return
    }
    const versions = doc.versions
    const a = versions.find((v) => v.id === compareSel)
    const b = versions.find((v) => v.id === versionId)
    if (a && b) {
      const order = a.modifiedAt.localeCompare(b.modifiedAt)
      setDiffModal({ a: order <= 0 ? a : b, b: order <= 0 ? b : a })
    }
    setCompareSel(null)
  }

  const rendered = useMemo(() => parseMarkdown(content), [content])
  const diffResult = useMemo(
    () => (diffModal ? diffLines(diffModal.a.content, diffModal.b.content) : []),
    [diffModal],
  )

  return (
    <div className="editor-wrap">
      <div className="editor-breadcrumb">
        <Link to="/">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
          文档列表
        </Link>
        <span>/</span>
        <span>{doc.category}</span>
        <span>/</span>
        <span style={{ color: 'var(--text-600)' }}>{doc.title}</span>
      </div>

      <div className="editor-title-row">
        <div className="editor-title-col">
          <h1>{doc.title}</h1>
          <div className="editor-meta" style={{ ['--stripe' as string]: color }}>
            <span className="meta-chip">{doc.category}</span>
            <span>✍️ 作者：{doc.author}</span>
            <span>🕒 创建于 {doc.createdAt}</span>
            <span>🔄 最近更新 {doc.updatedAt}</span>
            <span>📋 版本数 {doc.versions.length}</span>
          </div>
        </div>
      </div>

      <div className="editor-content-layout">
        <div className="editor-pane">
          <div className="editor-toolbar">
            {tab === 'edit' && (
              <>
                <button className="toolbar-btn" onClick={() => wrapSelection('**')}>粗体</button>
                <button className="toolbar-btn" onClick={() => wrapSelection('*')}>斜体</button>
                <button className="toolbar-btn" onClick={() => wrapSelection('`')}>行内代码</button>
                <button className="toolbar-btn" onClick={() => insertAtCursor('\n```ts\n\n```\n')}>代码块</button>
                <button className="toolbar-btn" onClick={() => wrapSelection('## ', '\n', true)}>标题</button>
                <button className="toolbar-btn" onClick={() => insertAtCursor('\n- 列表项\n')}>列表</button>
                <button className="toolbar-btn" onClick={() => insertAtCursor('\n> 引用\n')}>引用</button>
              </>
            )}
          </div>

          <div className="editor-tabs">
            <button className={`editor-tab ${tab === 'preview' ? 'active' : ''}`} onClick={() => setTab('preview')}>
              👁 预览
            </button>
            <button className={`editor-tab ${tab === 'edit' ? 'active' : ''}`} onClick={() => setTab('edit')}>
              ✏️ 编辑
            </button>
          </div>

          {tab === 'preview' ? (
            <div className="md" dangerouslySetInnerHTML={{ __html: rendered.html }} />
          ) : (
            <textarea
              className="editor-textarea"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="使用 Markdown 开始写作..."
              spellCheck={false}
            />
          )}
        </div>
      </div>

      {/* 浮动操作面板 */}
      <div className="floating-panel" ref={panelRef}>
        <div className="panel-handle" onMouseDown={onPanelMouseDown} onTouchStart={onPanelMouseDown} />
        <div className="panel-buttons">
          <button
            className={`panel-btn ${saveState === 'success' ? 'success' : 'primary'}`}
            onClick={handleSave}
            disabled={saveState === 'saving'}
          >
            <span className="btn-icon-wrap">
              {saveState === 'saving' ? (
                <span className="spinner" />
              ) : saveState === 'success' ? (
                <svg className="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              ) : (
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
              )}
            </span>
            {saveState === 'saving' ? '保存中' : saveState === 'success' ? '已保存' : '保存'}
          </button>
          <button className="panel-btn" onClick={() => setHistoryOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            历史版本
          </button>
          <button className="panel-btn" onClick={handleShare}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            分享
          </button>
        </div>
      </div>

      {shareToast && (
        <div style={{
          position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--secondary)', color: '#fff', padding: '10px 20px',
          borderRadius: 999, fontWeight: 500, fontSize: 13.5,
          boxShadow: '0 8px 20px rgba(16,185,129,.35)', zIndex: 70,
          animation: 'fadeSlideUp .25s var(--ease)',
        }}>
          ✓ 链接已复制到剪贴板
        </div>
      )}

      {/* 历史版本面板 */}
      <div className={`history-panel ${historyOpen ? 'open' : ''}`}>
        <div className="history-header">
          <div>
            <h3>📜 历史版本</h3>
            <div className="sub">
              {compareSel
                ? `已选择第一个版本，点击另一个版本进行对比`
                : `共 ${doc.versions.length} 个历史版本，点击「对比」两次选择版本查看差异`}
            </div>
          </div>
          <button className="history-close" onClick={() => { setHistoryOpen(false); setCompareSel(null) }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        <div className="history-body">
          <div className="timeline">
            {doc.versions.slice().reverse().map((v, idx, arr) => (
              <div key={v.id} className={`timeline-item ${idx === 0 ? 'current' : ''}`}>
                <div className="timeline-card">
                  <div className="timeline-info">
                    <div className="timeline-version">
                      {v.versionNo}
                      {idx === 0 && <span className="current-tag">当前</span>}
                      {compareSel === v.id && <span style={{ fontSize: 11, color: 'var(--primary)', background: 'rgba(37,99,235,.1)', padding: '2px 8px', borderRadius: 999 }}>已选 · 待对比</span>}
                    </div>
                    <div className="timeline-meta">
                      <span>👤 {v.author}</span>
                      <span>🕒 {v.modifiedAt}</span>
                      <span>📝 {v.content.length} 字</span>
                    </div>
                  </div>
                  <button
                    className="diff-btn"
                    onClick={() => compareWith(v.id)}
                    disabled={arr.length < 2}
                  >
                    {compareSel === v.id ? '取消选择' : '对比'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Diff Modal */}
      {diffModal && (
        <div className="diff-modal-mask" onClick={() => setDiffModal(null)}>
          <div className="diff-modal" onClick={(e) => e.stopPropagation()}>
            <div className="diff-header">
              <div className="diff-header-wrap">
                <h3>版本对比</h3>
                <div className="sub">
                  旧版本 <b style={{ color: '#991B1B' }}>{diffModal.a.versionNo}</b>（{diffModal.a.modifiedAt}，作者 {diffModal.a.author}）
                  {' → '}
                  新版本 <b style={{ color: '#166534' }}>{diffModal.b.versionNo}</b>（{diffModal.b.modifiedAt}，作者 {diffModal.b.author}）
                </div>
                <button className="diff-close" onClick={() => setDiffModal(null)} title="关闭">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
              </div>
            </div>
            <div className="diff-body">
              <div className="diff-col">
                <div className="diff-col-header">删除 · {diffModal.a.versionNo}</div>
                <div className="diff-lines">
                  {diffResult.map((line, i) => {
                    const leftTxt = line.left ?? ''
                    let leftHtml = escapeHtml(leftTxt)
                    if (line.changed && line.right != null) {
                      const { leftHtml: inline } = diffInlineChars(leftTxt, line.right)
                      leftHtml = inline
                    }
                    return (
                      <div key={i} className={`diff-line ${line.changed ? 'changed' : ''}`}>
                        <div className="diff-line-num">{line.left != null ? i + 1 : ''}</div>
                        <div className="diff-line-content" dangerouslySetInnerHTML={{ __html: leftHtml }} />
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="diff-col">
                <div className="diff-col-header">新增 · {diffModal.b.versionNo}</div>
                <div className="diff-lines">
                  {diffResult.map((line, i) => {
                    const rightTxt = line.right ?? ''
                    let rightHtml = escapeHtml(rightTxt)
                    if (line.changed && line.left != null) {
                      const { rightHtml: inline } = diffInlineChars(line.left, rightTxt)
                      rightHtml = inline
                    }
                    return (
                      <div key={i} className={`diff-line ${line.changed ? 'changed' : ''}`}>
                        <div className="diff-line-num">{line.right != null ? i + 1 : ''}</div>
                        <div className="diff-line-content" dangerouslySetInnerHTML={{ __html: rightHtml }} />
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  /* ========= 编辑辅助 ========= */
  function wrapSelection(before: string, after: string = before, prefix = false) {
    const ta = document.querySelector<HTMLTextAreaElement>('.editor-textarea')
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const sel = value.slice(s, e) || '文字'
    const newVal = prefix
      ? value.slice(0, s) + before + sel.replace(/^##\s*/, '') + after + value.slice(e)
      : value.slice(0, s) + before + sel + after + value.slice(e)
    setContent(newVal)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = prefix ? s + before.length : s + before.length
      ta.setSelectionRange(pos, pos + sel.length)
    })
  }

  function insertAtCursor(txt: string) {
    const ta = document.querySelector<HTMLTextAreaElement>('.editor-textarea')
    if (!ta) return
    const { selectionStart: s, selectionEnd: e, value } = ta
    const newVal = value.slice(0, s) + txt + value.slice(e)
    setContent(newVal)
    requestAnimationFrame(() => {
      ta.focus()
      const pos = s + txt.length
      ta.setSelectionRange(pos, pos)
    })
  }
}
