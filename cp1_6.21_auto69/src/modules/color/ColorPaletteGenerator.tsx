import { useState, useEffect, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import ColorPicker from './ColorPicker'
import { generatePalette, getContrastColor } from '../../utils/colorUtils'
import { ColorRuleType, ColorPalette } from '../../types'
import { paletteDB } from '../../store/db'

const RULES: { key: ColorRuleType; label: string; desc: string }[] = [
  { key: 'complementary', label: '互补色', desc: '色轮上相对的颜色' },
  { key: 'analogous', label: '类似色', desc: '色轮上相邻的颜色' },
  { key: 'triadic', label: '三色', desc: '色轮上等距三色' },
  { key: 'split-complementary', label: '分割互补', desc: '互补色两侧的颜色' },
  { key: 'monochromatic', label: '单色', desc: '同色相不同明度' }
]

interface Props {
  onBack: () => void
}

export default function ColorPaletteGenerator({ onBack }: Props) {
  const [baseColor, setBaseColor] = useState('#5B7B9A')
  const [rule, setRule] = useState<ColorRuleType>('analogous')
  const [palette, setPalette] = useState<string[]>([])
  const [fade, setFade] = useState(true)
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [savedPalettes, setSavedPalettes] = useState<ColorPalette[]>([])
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setFade(false)
    const timer = setTimeout(() => {
      if (!cancelled) {
        const start = performance.now()
        const result = generatePalette(baseColor, rule)
        const elapsed = performance.now() - start
        const delay = Math.max(0, 300 - elapsed)
        rafRef.current = requestAnimationFrame(() => {
          setTimeout(() => {
            if (!cancelled) {
              setPalette(result)
              setFade(true)
            }
          }, delay)
        })
      }
    }, 50)
    return () => {
      cancelled = true
      clearTimeout(timer)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [baseColor, rule])

  useEffect(() => {
    paletteDB.getAll().then(setSavedPalettes)
  }, [])

  const copyToClipboard = async (hex: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(hex)
      setCopiedIdx(idx)
      setTimeout(() => setCopiedIdx(null), 1200)
    } catch {}
  }

  const savePalette = async () => {
    const saved: ColorPalette = {
      id: uuidv4(),
      baseColor,
      ruleType: rule,
      colors: palette,
      createdAt: new Date().toISOString()
    }
    await paletteDB.add(saved)
    const list = await paletteDB.getAll()
    setSavedPalettes(list)
  }

  const deletePalette = async (id: string) => {
    await paletteDB.delete(id)
    const list = await paletteDB.getAll()
    setSavedPalettes(list)
  }

  return (
    <div className="view-container">
      <div className="view-header">
        <button className="btn-back" onClick={onBack}>← 返回首页</button>
        <h1 className="view-title">配色方案生成器</h1>
        <div style={{ width: 120 }} />
      </div>

      <div className="generator-panel">
        <div className="generator-controls">
          <div className="control-group">
            <h3 className="control-title">基础色</h3>
            <ColorPicker value={baseColor} onChange={setBaseColor} />
          </div>

          <div className="control-group">
            <h3 className="control-title">配色规则</h3>
            <div className="rule-buttons">
              {RULES.map(r => (
                <button
                  key={r.key}
                  className={`rule-btn ${rule === r.key ? 'active' : ''}`}
                  onClick={() => setRule(r.key)}
                >
                  <span className="rule-label">{r.label}</span>
                  <span className="rule-desc">{r.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="palette-display">
          <div className="palette-header">
            <h3>生成的色板</h3>
            <button className="btn-primary" onClick={savePalette}>💾 保存此方案</button>
          </div>
          <div className={`palette-scroll ${fade ? 'fade-in' : 'fade-out'}`}>
            {palette.map((color, idx) => (
              <div
                key={color + idx}
                className="palette-swatch"
                style={{ backgroundColor: color }}
                onClick={() => copyToClipboard(color, idx)}
              >
                <span className="swatch-hex" style={{ color: getContrastColor(color) }}>
                  {copiedIdx === idx ? '✓ 已复制' : color.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
          <p className="hint">点击色块可复制 HEX 值到剪贴板</p>
        </div>

        {savedPalettes.length > 0 && (
          <div className="saved-palettes">
            <h3 className="control-title">已保存的方案</h3>
            <div className="saved-list">
              {savedPalettes.map(p => (
                <div key={p.id} className="saved-item">
                  <div className="saved-colors">
                    {p.colors.map((c, i) => (
                      <div
                        key={i}
                        className="saved-dot"
                        style={{ backgroundColor: c }}
                        onClick={() => copyToClipboard(c, -1)}
                      />
                    ))}
                  </div>
                  <div className="saved-meta">
                    <span>{RULES.find(r => r.key === p.ruleType)?.label}</span>
                    <button className="btn-delete-small" onClick={() => deletePalette(p.id)}>删除</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
