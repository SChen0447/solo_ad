import { useEffect, useState, useRef, useMemo } from 'react'
import { useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import {
  getPoem, getPalettes, getFonts, getTextures,
  getNote, saveNote, searchNotes,
  Poem, Palette, FontOption, Texture, Note
} from '../api/poems'
import { useTypewriter, radialGradient } from '../utils/animations'

const MAX_NOTE_LENGTH = 500

export default function PoemDetail() {
  const { id } = useParams<{ id: string }>()
  const [poem, setPoem] = useState<Poem | null>(null)
  const [palette, setPalette] = useState<Palette | null>(null)
  const [font, setFont] = useState<FontOption | null>(null)
  const [texture, setTexture] = useState<Texture | null>(null)

  const [note, setNote] = useState('')
  const [noteShake, setNoteShake] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Note[]>([])

  const { displayText, isComplete } = useTypewriter(poem?.content || '', 60)

  const saveTimer = useRef<number | null>(null)

  useEffect(() => {
    if (!id) return
    const load = async () => {
      try {
        const [p, pals, fnts, texs] = await Promise.all([
          getPoem(id),
          getPalettes(),
          getFonts(),
          getTextures(),
        ])
        setPoem(p)
        setPalette(pals.find((x) => x.id === p.palette_id) || pals[0])
        setFont(fnts.find((x) => x.id === p.font_id) || fnts[0])
        setTexture(texs.find((x) => x.id === p.texture_id) || texs[0])

        const saved = await getNote(id)
        if (saved) setNote(saved.content)
        else {
          const local = localStorage.getItem(`note_${id}`)
          if (local) setNote(local)
        }
      } catch (err) {
        console.error(err)
      }
    }
    load()
  }, [id])

  const handleNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    if (value.length > MAX_NOTE_LENGTH) {
      setNoteShake(true)
      setTimeout(() => setNoteShake(false), 200)
      return
    }
    setNote(value)
    localStorage.setItem(`note_${id}`, value)

    if (saveTimer.current) window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      if (poem) {
        try {
          await saveNote(id!, poem.title, value)
        } catch (err) {
          console.error(err)
        }
      }
    }, 500)
  }

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const run = async () => {
      try {
        const res = await searchNotes(searchQuery)
        setSearchResults(res)
      } catch (err) {
        setSearchResults([])
      }
    }
    run()
  }, [searchQuery])

  const mainStyle = useMemo<React.CSSProperties>(() => {
    if (!palette) return {}
    return {
      background: radialGradient(palette.primary, palette.secondary),
      color: palette.text,
      fontFamily: font?.family,
    }
  }, [palette, font])

  if (!poem || !palette) {
    return <div className="loading-spinner" style={{ paddingTop: 120 }}>加载中...</div>
  }

  return (
    <div className="poem-detail-container">
      <div className="poem-detail-main" style={mainStyle}>
        {texture && (
          <div
            dangerouslySetInnerHTML={{ __html: texture.svg }}
            style={{ position: 'absolute', inset: 0, opacity: 0.06, pointerEvents: 'none', borderRadius: 20, overflow: 'hidden' }}
          />
        )}
        <h1 className="poem-detail-title">{poem.title}</h1>
        <div className="poem-detail-poet">—— {poem.poet}</div>
        <div className="poem-detail-content">
          {displayText}
          {!isComplete && <span className="typing-cursor" />}
        </div>
      </div>

      <aside className="notes-panel">
        <h3 className="notes-panel-title">我的笔记</h3>
        <input
          type="text"
          className="notes-search"
          placeholder="搜索历史笔记..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchResults.length > 0 && (
          <div style={{ marginBottom: 16, maxHeight: 150, overflowY: 'auto' }}>
            {searchResults.map((r) => (
              <div key={r.poem_id} style={{
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: 8,
                marginBottom: 6,
                fontSize: 13,
              }}>
                <div style={{ fontWeight: 600 }}>{r.poem_title}</div>
                <div style={{ opacity: 0.7, marginTop: 2 }}>{r.content.slice(0, 40)}...</div>
              </div>
            ))}
          </div>
        )}
        <textarea
          className={`notes-textarea ${noteShake ? 'error' : ''}`}
          placeholder="在这里写下你的感想、赏析、笔记...（支持 Markdown）"
          value={note}
          onChange={handleNoteChange}
        />
        <div className="notes-counter">{note.length} / {MAX_NOTE_LENGTH}</div>
        {note && (
          <div className="notes-preview">
            <div style={{ fontSize: 12, opacity: 0.6, marginBottom: 8 }}>预览</div>
            <ReactMarkdown>{note}</ReactMarkdown>
          </div>
        )}
      </aside>
    </div>
  )
}
