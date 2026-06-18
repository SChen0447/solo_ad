import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useAppStore, COLOR_THEMES, TemplateType, ColorTheme } from './store'
import { FontEngine } from './FontEngine'

const TEMPLATES: Record<TemplateType, { label: string; content: string; code?: boolean }> = {
  title: {
    label: '短标题',
    content: '字体之美，形神兼备。'
  },
  paragraph: {
    label: '段落文章',
    content: `排版设计是一门融合艺术与技术的学问。优秀的字体排印不仅关乎视觉美感，更直接影响信息传达的效率与读者的阅读体验。字距的疏密、行高的宽窄、字重的选择，每一处细微的调整都能改变整段文字的气质与节奏。

在数字时代，我们拥有了前所未有的字体资源库，从经典衬线体到现代无衬线体，从手写风格到几何设计，每一款字体都承载着独特的情感表达与设计哲学。掌握字体排印的艺术，便是掌握了与世界沟通的另一种语言——一种无声却有力的视觉语言。`
  },
  code: {
    label: '代码片段',
    code: true,
    content: `function renderTypography(text, options) {
  const { tracking, lineHeight, weight } = options;

  // Apply letter-spacing optimization
  const spacing = calculateTracking(tracking);
  const style = {
    letterSpacing: spacing + 'em',
    lineHeight: lineHeight,
    fontWeight: weight
  };

  return createElement('p', { style }, text);
}

// Usage example
const result = renderTypography("Hello World", {
  tracking: 0.05,
  lineHeight: 1.6,
  weight: 400
});

console.log(result);`
  }
}

const TEMPLATE_ORDER: TemplateType[] = ['title', 'paragraph', 'code']

export const PreviewPanel: React.FC = () => {
  const fontMetadata = useAppStore((s) => s.fontMetadata)
  const fontFamilyKey = useAppStore((s) => s.fontFamilyKey)
  const params = useAppStore((s) => s.params)
  const templateType = useAppStore((s) => s.templateType)
  const setTemplateType = useAppStore((s) => s.setTemplateType)
  const colorTheme = useAppStore((s) => s.colorTheme)
  const setColorTheme = useAppStore((s) => s.setColorTheme)

  const [animKey, setAnimKey] = useState(0)
  const [prevTemplate, setPrevTemplate] = useState<TemplateType>(templateType)
  const [fadingOut, setFadingOut] = useState(false)
  const pendingTemplateRef = useRef<TemplateType | null>(null)

  const effectiveFontFamily = useMemo(() => {
    return fontFamilyKey || fontMetadata?.familyName || '-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif'
  }, [fontFamilyKey, fontMetadata])

  const renderedStyle = useMemo(() => {
    return FontEngine.computeStyle(
      effectiveFontFamily,
      params,
      fontMetadata?.italic ? 'italic' : 'normal'
    )
  }, [effectiveFontFamily, params, fontMetadata])

  useEffect(() => {
    if (templateType === prevTemplate) return
    pendingTemplateRef.current = templateType
    setFadingOut(true)
    const timer = setTimeout(() => {
      setPrevTemplate(pendingTemplateRef.current as TemplateType)
      setAnimKey((k) => k + 1)
      setFadingOut(false)
      pendingTemplateRef.current = null
    }, 220)
    return () => clearTimeout(timer)
  }, [templateType, prevTemplate])

  const activeTemplate = TEMPLATES[prevTemplate]

  const textStyle: React.CSSProperties = {
    fontFamily: renderedStyle.fontFamily,
    letterSpacing: renderedStyle.letterSpacing,
    lineHeight: renderedStyle.lineHeight,
    fontWeight: renderedStyle.fontWeight,
    fontStyle: renderedStyle.fontStyle,
    color: colorTheme.foreground,
    margin: 0,
    whiteSpace: activeTemplate.code ? 'pre' : 'pre-wrap',
    wordBreak: activeTemplate.code ? 'normal' : 'break-word',
    fontSize: activeTemplate.code ? '15px' : prevTemplate === 'title' ? '34px' : '17px',
    textAlign: prevTemplate === 'title' ? 'center' : 'left',
    padding: prevTemplate === 'title' ? '20px 8px' : '4px 2px',
    transform: renderedStyle.transform === 'none' ? undefined : renderedStyle.transform,
    display: renderedStyle.display,
    transformOrigin: prevTemplate === 'title' ? 'center top' : 'left top',
    width: renderedStyle.transform === 'none' ? '100%' : undefined,
    boxSizing: 'border-box'
  }

  return (
    <div style={{
      ...panelStyle,
      background: colorTheme.background,
      transition: 'background-color 0.3s ease, color 0.3s ease'
    }}>
      <div style={toolbarStyle}>
        <div style={templateTabsStyle}>
          {TEMPLATE_ORDER.map((type) => {
            const t = TEMPLATES[type]
            const active = type === prevTemplate
            return (
              <button
                key={type}
                onClick={() => setTemplateType(type)}
                style={{
                  ...tabBtnStyle,
                  background: active ? 'rgba(91, 155, 255, 0.15)' : 'transparent',
                  borderColor: active ? 'rgba(91, 155, 255, 0.6)' : 'rgba(0,0,0,0.08)',
                  color: active ? '#3A6FD8' : 'rgba(0,0,0,0.55)',
                  fontWeight: active ? 600 : 500
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'rgba(91, 155, 255, 0.07)'
                    e.currentTarget.style.transform = 'scale(1.03)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.transform = 'scale(1)'
                  }
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = active ? 'scale(1)' : 'scale(1.03)'
                }}
              >
                {t.label}
              </button>
            )
          })}
        </div>

        <div style={swatchesStyle}>
          {COLOR_THEMES.map((theme: ColorTheme) => {
            const active = theme.id === colorTheme.id
            return (
              <button
                key={theme.id}
                onClick={() => setColorTheme(theme)}
                title={theme.name}
                style={{
                  ...swatchBtnStyle,
                  background: theme.background,
                  borderColor: active ? 'rgba(91, 155, 255, 0.9)' : 'rgba(0,0,0,0.12)',
                  boxShadow: active
                    ? '0 0 0 2px rgba(91, 155, 255, 0.25), 0 2px 6px rgba(0,0,0,0.12)'
                    : '0 1px 3px rgba(0,0,0,0.08)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.18)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.9)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1.18)'
                }}
              >
                <div style={{
                  width: '55%',
                  height: '55%',
                  borderRadius: '50%',
                  background: theme.foreground,
                  opacity: 0.7
                }} />
              </button>
            )
          })}
        </div>
      </div>

      <div style={previewAreaStyle}>
        <div style={{
          ...cardStyle,
          background: colorTheme.id === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.7)',
          boxShadow: colorTheme.id === 'dark'
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.08)',
          border: colorTheme.id === 'dark'
            ? '1px solid rgba(255,255,255,0.06)'
            : '1px solid rgba(0,0,0,0.04)',
          transition: 'background-color 0.3s ease, box-shadow 0.3s ease'
        }}>
          <div key={animKey} style={{
            width: '100%',
            opacity: fadingOut ? 0 : 1,
            transform: fadingOut ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.22s ease, transform 0.22s ease',
            willChange: 'opacity, transform'
          }}>
            {prevTemplate === 'title' ? (
              <h1 style={textStyle}>{activeTemplate.content}</h1>
            ) : prevTemplate === 'code' ? (
              <pre style={{
                margin: 0,
                display: 'block'
              }}>
                <code style={textStyle}>{activeTemplate.content}</code>
              </pre>
            ) : (
              <div style={textStyle}>{activeTemplate.content}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const panelStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}

const toolbarStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '16px 28px',
  gap: '20px',
  flexWrap: 'wrap',
  flexShrink: 0,
  zIndex: 2
}

const templateTabsStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px'
}

const tabBtnStyle: React.CSSProperties = {
  padding: '7px 18px',
  borderRadius: '20px',
  border: '1px solid',
  fontSize: '13px',
  fontFamily: '"Inter", "PingFang SC", system-ui, sans-serif',
  cursor: 'pointer',
  transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)'
}

const swatchesStyle: React.CSSProperties = {
  display: 'flex',
  gap: '8px',
  alignItems: 'center'
}

const swatchBtnStyle: React.CSSProperties = {
  width: '26px',
  height: '26px',
  borderRadius: '50%',
  border: '2px solid',
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease'
}

const previewAreaStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: '20px 28px 48px 28px',
  overflow: 'auto',
  boxSizing: 'border-box'
}

const cardStyle: React.CSSProperties = {
  maxWidth: '90%',
  minWidth: 'min(640px, 90%)',
  padding: '36px 44px',
  borderRadius: '16px',
  boxSizing: 'border-box',
  transition: 'box-shadow 0.3s ease'
}
