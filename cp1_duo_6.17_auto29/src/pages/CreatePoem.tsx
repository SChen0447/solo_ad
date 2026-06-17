import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getPalettes, getFonts, getTextures, createPoem,
  Palette, FontOption, Texture
} from '../api/poems'
import { useFadeIn } from '../utils/animations'

const autosize = (el: HTMLTextAreaElement) => {
  el.style.height = 'auto'
  el.style.height = el.scrollHeight + 'px'
}

export default function CreatePoem() {
  const navigate = useNavigate()
  const { style: fadeStyle } = useFadeIn(500)

  const [title, setTitle] = useState('')
  const [poet, setPoet] = useState('')
  const [content, setContent] = useState('')
  const [paletteId, setPaletteId] = useState(1)
  const [fontId, setFontId] = useState('serif')
  const [textureId, setTextureId] = useState(1)
  const [submitting, setSubmitting] = useState(false)

  const [palettes, setPalettes] = useState<Palette[]>([])
  const [fonts, setFonts] = useState<FontOption[]>([])
  const [textures, setTextures] = useState<Texture[]>([])

  const contentRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const load = async () => {
      const [pals, fnts, texs] = await Promise.all([
        getPalettes().catch(() => []),
        getFonts().catch(() => []),
        getTextures().catch(() => []),
      ])
      setPalettes(pals)
      setFonts(fnts)
      setTextures(texs)
      if (pals.length) setPaletteId(pals[0].id)
      if (fnts.length) setFontId(fnts[0].id)
      if (texs.length) setTextureId(texs[0].id)
    }
    load()
  }, [])

  useEffect(() => {
    if (contentRef.current) autosize(contentRef.current)
  }, [content])

  const selectedPalette = palettes.find((p) => p.id === paletteId)
  const selectedFont = fonts.find((f) => f.id === fontId)
  const selectedTexture = textures.find((t) => t.id === textureId)

  const canSubmit = title.trim() && content.trim()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canSubmit || submitting) return
    setSubmitting(true)
    try {
      const poem = await createPoem({
        title: title.trim(),
        poet: poet.trim() || '佚名',
        content: content.trim(),
        palette_id: paletteId,
        font_id: fontId,
        texture_id: textureId,
      })
      navigate(`/poem/${poem.id}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="create-page" style={fadeStyle}>
      <form className="create-form" onSubmit={handleSubmit}>
        <h1 className="form-title">创建新诗</h1>

        <div className="form-group">
          <label className="form-label">标题 *</label>
          <input
            className="form-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="诗歌标题"
            maxLength={60}
          />
        </div>

        <div className="form-group">
          <label className="form-label">诗人 / 作者</label>
          <input
            className="form-input"
            value={poet}
            onChange={(e) => setPoet(e.target.value)}
            placeholder="可填原创或原作者"
            maxLength={40}
          />
        </div>

        <div className="form-group">
          <label className="form-label">诗句 *</label>
          <textarea
            ref={contentRef}
            className="form-textarea"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="支持多段落，每段一行..."
          />
        </div>

        <div className="form-group">
          <label className="form-label">主题色板</label>
          <div className="palette-grid">
            {palettes.map((p) => (
              <div
                key={p.id}
                className={`palette-item ${paletteId === p.id ? 'selected' : ''}`}
                style={{
                  background: `linear-gradient(135deg, ${p.background} 0%, ${p.secondary} 100%)`,
                  color: p.text,
                }}
                onClick={() => setPaletteId(p.id)}
              >
                {p.name}
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">字体风格</label>
          <div className="font-selector">
            {fonts.map((f) => (
              <div
                key={f.id}
                className={`font-option ${fontId === f.id ? 'selected' : ''}`}
                style={{ fontFamily: f.family }}
                onClick={() => setFontId(f.id)}
              >
                {f.name}
              </div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">背景纹理</label>
          <div className="texture-selector">
            {textures.map((t) => (
              <div
                key={t.id}
                className={`texture-option ${textureId === t.id ? 'selected' : ''}`}
                onClick={() => setTextureId(t.id)}
                title={t.name}
              >
                <div
                  className="texture-preview-svg"
                  dangerouslySetInnerHTML={{ __html: t.svg }}
                  style={{ filter: 'invert(0.8)' }}
                />
              </div>
            ))}
          </div>
        </div>

        <button className="submit-btn" type="submit" disabled={!canSubmit || submitting}>
          {submitting ? '提交中...' : '创建诗歌'}
        </button>

        {selectedPalette && selectedFont && (
          <div style={{ marginTop: 32 }}>
            <div className="form-label">预览</div>
            <div
              className="preview-card"
              style={{
                background: `linear-gradient(135deg, ${selectedPalette.background} 0%, ${selectedPalette.secondary} 100%)`,
                color: selectedPalette.text,
                fontFamily: selectedFont.family,
                position: 'relative',
              }}
            >
              {selectedTexture && (
                <div
                  dangerouslySetInnerHTML={{ __html: selectedTexture.svg }}
                  style={{ position: 'absolute', inset: 0, opacity: 0.08, pointerEvents: 'none', borderRadius: 16, overflow: 'hidden' }}
                />
              )}
              <div className="preview-title">{title || '诗歌标题'}</div>
              <div className="preview-poet">—— {poet || '佚名'}</div>
              <div className="preview-content">{content || '诗句内容将显示在这里...'}</div>
            </div>
          </div>
        )}
      </form>
    </div>
  )
}
