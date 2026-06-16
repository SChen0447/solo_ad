import React, { useState, useCallback, useEffect, useMemo } from 'react'
import MusicPlayer from './components/MusicPlayer'
import HistoryPanel from './components/HistoryPanel'
import {
  analyzeEmotion,
  generateMusic,
  createHistoryItem,
  validateEmotionInput,
} from './utils/emotionAnalyzer'
import type {
  AnalyzeResult,
  SheetMusic,
  HistoryItem,
  EmotionInput,
} from './utils/emotionAnalyzer'

const STORAGE_KEY = 'emotion-music-history-v1'
const MAX_HISTORY = 20

const QUICK_EMOTIONS: string[] = [
  '兴奋', '快乐', '焦虑', '疲惫', '怀旧',
  '放松', '浪漫', '神秘', '悲伤', '庄严',
]

const App: React.FC = () => {
  const [keywords, setKeywords] = useState<string[]>([])
  const [keywordInput, setKeywordInput] = useState('')
  const [description, setDescription] = useState(
    '在黄昏时分漫步于古老的街道，夕阳将斑驳的光影洒在青石板上，远处传来隐约的钟声，心中既有对往昔的怀念，又有一丝对未来的淡淡期许。'
  )
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [analyzeResult, setAnalyzeResult] = useState<AnalyzeResult | null>(null)
  const [sheetMusic, setSheetMusic] = useState<SheetMusic | null>(null)
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as HistoryItem[]
        setHistory(parsed.slice(0, MAX_HISTORY))
      }
    } catch {}
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
    } catch {}
  }, [history])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  const descLength = useMemo(() => description.trim().length, [description])

  const addKeyword = useCallback((kw: string) => {
    const trimmed = kw.trim()
    if (!trimmed) return
    if (keywords.length >= 3) {
      setError('最多只能添加3个情绪关键词')
      return
    }
    if (keywords.includes(trimmed)) return
    setKeywords((prev) => [...prev, trimmed])
    setKeywordInput('')
    setError(null)
  }, [keywords])

  const removeKeyword = useCallback((idx: number) => {
    setKeywords((prev) => prev.filter((_, i) => i !== idx))
  }, [])

  const handleGenerate = useCallback(async () => {
    setError(null)
    const input: EmotionInput = { keywords, description }
    const validation = validateEmotionInput(input)
    if (!validation.valid) {
      setError(validation.error || '输入校验失败')
      return
    }

    setIsLoading(true)
    const t0 = performance.now()
    try {
      const analysis = await analyzeEmotion(input)
      setAnalyzeResult(analysis)
      const music = await generateMusic(analysis)
      setSheetMusic(music)

      const item = createHistoryItem(input, analysis, music)
      setHistory((prev) => {
        const filtered = prev.filter((p) => p.id !== item.id)
        return [item, ...filtered].slice(0, MAX_HISTORY)
      })
      setActiveHistoryId(item.id)
      const elapsed = Math.round(performance.now() - t0)
      setToast(`生成完成，耗时 ${elapsed}ms`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '生成失败，请重试'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }, [keywords, description])

  const handleHistorySelect = useCallback((id: string) => {
    const item = history.find((h) => h.id === id)
    if (!item) return
    setAnalyzeResult(item.analyzeResult)
    setSheetMusic(item.sheetMusic)
    setKeywords(item.keywords)
    setDescription(item.description)
    setActiveHistoryId(id)
    setError(null)
  }, [history])

  const handleHistoryExport = useCallback((item: HistoryItem) => {
    setActiveHistoryId(item.id)
    setSheetMusic(item.sheetMusic)
    setToast('请使用底部"导出WAV"按钮导出音乐')
    setTimeout(() => {
      const btn = document.querySelector('.player-bar .btn-secondary') as HTMLButtonElement
      if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }, [])

  const polarityClass = analyzeResult
    ? analyzeResult.polarity === 'positive'
      ? 'polarity-positive'
      : analyzeResult.polarity === 'negative'
      ? 'polarity-negative'
      : 'polarity-neutral'
    : ''
  const polarityText = analyzeResult
    ? analyzeResult.polarity === 'positive'
      ? '😊 积极'
      : analyzeResult.polarity === 'negative'
      ? '😢 消极'
      : '😐 中性'
    : ''

  return (
    <div className="app-container">
      <h1 className="gradient-title">🎵 情绪音乐生成器</h1>
      <p className="subtitle">输入情绪关键词和场景描述，AI为你创作专属背景音乐</p>

      {error && (
        <div style={{ maxWidth: 700, margin: '0 auto 1rem' }}>
          <div className="error-message">⚠ {error}</div>
        </div>
      )}

      {toast && <div className="toast">✅ {toast}</div>}

      <section className="input-section glass neon-border">
        <div className="input-group">
          <label className="input-label">情绪关键词（最多3个）</label>
          <div className="emotion-tags-container">
            {keywords.map((kw, idx) => (
              <span key={`${kw}-${idx}`} className="emotion-tag">
                {kw}
                <button
                  className="remove-btn"
                  onClick={() => removeKeyword(idx)}
                  aria-label={`移除 ${kw}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="emotion-input-row">
            <input
              type="text"
              className="text-input"
              placeholder="输入情绪词后按回车或点击添加"
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addKeyword(keywordInput)
                }
              }}
              disabled={keywords.length >= 3}
            />
            <button
              className="btn btn-secondary"
              onClick={() => addKeyword(keywordInput)}
              disabled={keywords.length >= 3 || !keywordInput.trim()}
            >
              添加
            </button>
          </div>
          <div style={{ marginTop: '0.8rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {QUICK_EMOTIONS.map((q) => (
              <button
                key={q}
                onClick={() => addKeyword(q)}
                disabled={keywords.length >= 3 || keywords.includes(q)}
                style={{
                  padding: '0.25rem 0.7rem',
                  fontSize: '0.8rem',
                  borderRadius: '15px',
                  background: keywords.includes(q)
                    ? 'rgba(233, 69, 96, 0.3)'
                    : 'rgba(15, 52, 96, 0.5)',
                  color: keywords.includes(q) ? '#e94560' : 'var(--text-secondary)',
                  border: '1px solid var(--border-glass)',
                  cursor: keywords.length >= 3 || keywords.includes(q) ? 'not-allowed' : 'pointer',
                  opacity: keywords.length >= 3 && !keywords.includes(q) ? 0.4 : 1,
                  transition: 'all 0.15s ease',
                }}
              >
                + {q}
              </button>
            ))}
          </div>
        </div>

        <div className="input-group">
          <label className="input-label">
            场景描述（50-200字）
          </label>
          <textarea
            className="textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="详细描述你想要表达的场景、氛围或情感故事..."
            rows={5}
          />
          <div className={`char-counter ${descLength < 50 || descLength > 200 ? 'style="color: var(--error)"' : ''}`}>
            {descLength < 50 || descLength > 200 ? (
              <span style={{ color: 'var(--error)' }}>{descLength} / 200 字（需50-200字）</span>
            ) : (
              <span>{descLength} / 200 字</span>
            )}
          </div>
        </div>

        <button
          className="btn btn-primary generate-btn"
          onClick={handleGenerate}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              正在生成，请稍候...
            </>
          ) : (
            <>✨ 生成音乐</>
          )}
        </button>
      </section>

      {analyzeResult && (
        <section className="emotion-vector-section glass">
          <h3 className="section-title">🎭 情绪分析结果</h3>
          <div>
            <span className={`polarity-badge ${polarityClass}`}>
              {polarityText}（得分 {Math.round(analyzeResult.polarityScore)}）
            </span>
          </div>
          <div className="vector-bars">
            {analyzeResult.emotions.map((e) => (
              <div key={e.label} className="vector-bar-item">
                <span className="vector-label">{e.label}</span>
                <div className="vector-bar-container">
                  <div
                    className="vector-bar-fill"
                    style={{ width: `${Math.min(100, e.intensity)}%` }}
                  />
                </div>
                <span className="vector-value">{Math.round(e.intensity)}</span>
              </div>
            ))}
          </div>
          {sheetMusic && (
            <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.2rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                <span>🎼 <strong style={{ color: 'var(--text-primary)' }}>{sheetMusic.bars}</strong> 小节</span>
                <span>⏱ <strong style={{ color: 'var(--text-primary)' }}>{sheetMusic.bpm}</strong> BPM</span>
                <span>📐 <strong style={{ color: 'var(--text-primary)' }}>{sheetMusic.timeSignature.join('/')}</strong> 拍</span>
                <span>🎵 <strong style={{ color: 'var(--text-primary)' }}>{sheetMusic.notes.length}</strong> 音符</span>
                <span>和弦: <strong style={{ color: 'var(--accent-primary)' }}>{sheetMusic.chordProgression.join(' - ')}</strong></span>
              </div>
            </div>
          )}
        </section>
      )}

      <HistoryPanel
        history={history}
        activeId={activeHistoryId}
        onSelect={handleHistorySelect}
        onExport={handleHistoryExport}
      />

      <MusicPlayer sheetMusic={sheetMusic} />
    </div>
  )
}

export default App
