import type { ColorMap } from '../theme/themeManager'

interface ThemePreviewProps {
  colors: ColorMap
}

export function ThemePreview({ colors }: ThemePreviewProps) {
  const previewStyle: React.CSSProperties = {
    '--preview-primary': colors['--primary'],
    '--preview-secondary': colors['--secondary'],
    '--preview-accent': colors['--accent'],
    '--preview-background': colors['--background'],
    '--preview-text': colors['--text'],
    '--preview-border': colors['--border'],
    '--preview-shadow': colors['--shadow'],
    '--preview-success': colors['--success'],
  } as React.CSSProperties

  const extraVariables = Object.entries(colors).filter(
    ([key]) =>
      ![
        '--primary',
        '--secondary',
        '--accent',
        '--background',
        '--text',
        '--border',
        '--shadow',
        '--success',
      ].includes(key)
  )

  return (
    <main className="theme-preview" style={previewStyle}>
      <div className="preview-header">
        <h1>主题实时预览</h1>
        <p>修改左侧颜色变量，此处立即更新效果</p>
      </div>

      <div className="preview-section">
        <h3>按钮</h3>
        <div className="button-demo">
          <button className="demo-btn primary">主要按钮</button>
          <button className="demo-btn secondary">次要按钮</button>
          <button className="demo-btn success">成功按钮</button>
        </div>
      </div>

      <div className="preview-section">
        <h3>文本段落</h3>
        <div className="text-demo">
          <p>
            这是一段示例文本，使用 text 颜色显示在 background 背景上。主题配色的可读性在此处可以直观预览。
          </p>
          <p className="text-accent">
            这是一段强调文本，使用 accent 颜色突出显示重点内容。
          </p>
        </div>
      </div>

      <div className="preview-section">
        <h3>渐变背景</h3>
        <div className="gradient-demo">
          <span>accent → secondary 渐变效果</span>
        </div>
      </div>

      <div className="preview-section">
        <h3>带阴影卡片</h3>
        <div className="card-demo">
          <div className="demo-card">
            <h4>卡片标题</h4>
            <p>这是一个带有边框和阴影的卡片组件，展示了 border 和 shadow 变量的实际效果。</p>
            <button className="demo-btn primary small">查看详情</button>
          </div>
        </div>
      </div>

      {extraVariables.length > 0 && (
        <div className="preview-section">
          <h3>自定义变量</h3>
          <div className="custom-vars-demo">
            {extraVariables.map(([name, value]) => (
              <div key={name} className="custom-var-item" style={{ backgroundColor: value }}>
                <span>{name}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="preview-section">
        <h3>当前变量一览</h3>
        <div className="var-table">
          {Object.entries(colors).map(([name, value]) => (
            <div key={name} className="var-row">
              <div className="var-swatch" style={{ backgroundColor: value }} />
              <code>{name}</code>
              <code className="var-value">{value}</code>
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
