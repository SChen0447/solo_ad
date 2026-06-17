import { useState } from 'react'

interface ToolbarProps {
  onInsertSymbol: (template: string, cursorOffset?: number) => void
}

interface SymbolButton {
  label: string
  template: string
  cursorOffset?: number
  title: string
}

const greekLetters: { label: string; template: string }[] = [
  { label: 'α', template: '\\alpha' },
  { label: 'β', template: '\\beta' },
  { label: 'γ', template: '\\gamma' },
  { label: 'δ', template: '\\delta' },
  { label: 'ε', template: '\\varepsilon' },
  { label: 'θ', template: '\\theta' },
  { label: 'λ', template: '\\lambda' },
  { label: 'π', template: '\\pi' },
  { label: 'σ', template: '\\sigma' },
  { label: 'μ', template: '\\mu' },
  { label: 'φ', template: '\\varphi' },
  { label: 'ψ', template: '\\psi' },
  { label: 'ω', template: '\\omega' },
  { label: 'Γ', template: '\\Gamma' },
  { label: 'Δ', template: '\\Delta' },
  { label: 'Θ', template: '\\Theta' },
  { label: 'Σ', template: '\\Sigma' },
  { label: 'Π', template: '\\Pi' },
  { label: 'Ω', template: '\\Omega' },
]

const row1: SymbolButton[] = [
  { label: 'a/b', template: '\\frac{}{}', cursorOffset: 7, title: '分数 (Ctrl+F)' },
  { label: '√', template: '\\sqrt{}', cursorOffset: 7, title: '根号 (Ctrl+R)' },
  { label: 'xⁿ', template: '^{}', cursorOffset: 2, title: '上标 (Ctrl+Shift+U)' },
  { label: 'xₙ', template: '_{}', cursorOffset: 2, title: '下标 (Ctrl+Shift+L)' },
  { label: '{ }', template: '\\left\\{\\right\\}', cursorOffset: 7, title: '大括号' },
]

const row2: SymbolButton[] = [
  { label: '∫', template: '\\int_{}^{}', cursorOffset: 7, title: '积分' },
  { label: '∑', template: '\\sum_{i=1}^{n}', cursorOffset: 13, title: '求和' },
  { label: '∏', template: '\\prod_{i=1}^{n}', cursorOffset: 14, title: '乘积' },
  { label: 'lim', template: '\\lim_{x \\to \\infty}', cursorOffset: 21, title: '极限' },
]

const row4: SymbolButton[] = [
  { label: '2×2', template: '\\begin{matrix} a & b \\\\ c & d \\end{matrix}', cursorOffset: 14, title: '2×2矩阵' },
  { label: '3×3', template: '\\begin{matrix} a & b & c \\\\ d & e & f \\\\ g & h & i \\end{matrix}', cursorOffset: 14, title: '3×3矩阵' },
  { label: 'Mat', template: '\\begin{matrix}  \\end{matrix}', cursorOffset: 14, title: '通用矩阵' },
  { label: '→', template: '\\rightarrow', cursorOffset: 12, title: '箭头' },
  { label: '⇒', template: '\\Rightarrow', cursorOffset: 11, title: '双箭头' },
  { label: '∞', template: '\\infty', cursorOffset: 6, title: '无穷大' },
  { label: '≈', template: '\\approx', cursorOffset: 7, title: '约等于' },
  { label: '≠', template: '\\neq', cursorOffset: 4, title: '不等于' },
  { label: '≤', template: '\\leq', cursorOffset: 4, title: '小于等于' },
  { label: '≥', template: '\\geq', cursorOffset: 4, title: '大于等于' },
]

function Toolbar({ onInsertSymbol }: ToolbarProps) {
  const [showGreek, setShowGreek] = useState(false)

  const renderButton = (btn: SymbolButton) => (
    <button
      key={btn.label}
      className="toolbar-btn"
      onClick={() => onInsertSymbol(btn.template, btn.cursorOffset)}
      title={btn.title}
    >
      <span>{btn.label}</span>
    </button>
  )

  return (
    <div className="toolbar">
      <div className="toolbar-row">
        {row1.map(renderButton)}
        <div className="toolbar-divider" />
        {row2.map(renderButton)}
        <div className="toolbar-divider" />
        <div className="greek-wrapper">
          <button
            className={`toolbar-btn greek-toggle ${showGreek ? 'active' : ''}`}
            onClick={() => setShowGreek(!showGreek)}
            title="希腊字母"
          >
            <span>αβ</span>
          </button>
          {showGreek && (
            <div className="greek-panel">
              {greekLetters.map(g => (
                <button
                  key={g.label}
                  className="greek-btn"
                  onClick={() => {
                    onInsertSymbol(g.template, g.template.length)
                    setShowGreek(false)
                  }}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="toolbar-row">
        {row4.map(renderButton)}
      </div>
    </div>
  )
}

export default Toolbar
