import React, { useState, useCallback } from 'react'
import { useStore, BREAKPOINT_WIDTHS, Breakpoint } from './store'
import { getComponentName } from './utils'

interface DropZoneProps {
  componentKey: string
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
}

const DropZone: React.FC<DropZoneProps> = ({ componentKey, children, style, className }) => {
  const applyColorToComponent = useStore(s => s.applyColorToComponent)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain'))
      if (data && data.hex) {
        applyColorToComponent(componentKey, data.hex)
      }
    } catch {
      const hex = e.dataTransfer.getData('text/plain')
      if (hex) applyColorToComponent(componentKey, hex)
    }
  }, [componentKey, applyColorToComponent])

  return (
    <div
      className={className}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      style={{
        ...style,
        position: 'relative',
        transition: 'all 0.3s ease-in-out',
        outline: isDragOver ? '3px dashed #007BFF' : 'none',
        outlineOffset: '-2px',
        backgroundColor: style?.backgroundColor,
        color: style?.color
      }}
      title={`拖拽颜色到此处: ${getComponentName(componentKey)}`}
    >
      {isDragOver && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0, 123, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 10,
            borderRadius: style?.borderRadius || 0
          }}
        >
          <span style={{
            background: '#007BFF',
            color: '#fff',
            padding: '4px 10px',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 500
          }}>
            应用到 {getComponentName(componentKey)}
          </span>
        </div>
      )}
      {children}
    </div>
  )
}

const PreviewArea: React.FC = () => {
  const { componentColors, breakpoint, setBreakpoint } = useStore()

  const width = BREAKPOINT_WIDTHS[breakpoint]
  const scale = breakpoint === 'mobile' ? 0.75 : breakpoint === 'tablet' ? 0.9 : 1

  const fontSizeScale = breakpoint === 'mobile' ? 0.85 : breakpoint === 'tablet' ? 0.92 : 1
  const gapScale = breakpoint === 'mobile' ? 0.7 : breakpoint === 'tablet' ? 0.85 : 1

  const navHeight = Math.round(60 * scale)
  const heroMinHeight = Math.round(300 * scale)
  const cardPadding = Math.round(20 * scale)
  const sectionPadding = Math.round(48 * scale)

  return (
    <section style={styles.wrapper}>
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <span style={styles.toolbarLabel}>🖥 预览视图</span>
          <span style={styles.sizeBadge}>宽度: {width}px</span>
        </div>

        <div style={styles.toolbarRight}>
          <div style={styles.breakpointGroup}>
            {(['desktop', 'tablet', 'mobile'] as Breakpoint[]).map(bp => {
              const isActive = breakpoint === bp
              const icons = { desktop: '🖥', tablet: '📱', mobile: '📱' }
              const labels = { desktop: '桌面 1200px', tablet: '平板 768px', mobile: '手机 375px' }
              return (
                <button
                  key={bp}
                  onClick={() => setBreakpoint(bp)}
                  style={{
                    ...styles.breakpointBtn,
                    background: isActive ? '#007BFF' : '#F1F3F5',
                    color: isActive ? '#fff' : '#495057'
                  }}
                  title={labels[bp]}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.background = '#E9ECEF'
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.background = '#F1F3F5'
                  }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)' }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  <span style={{ marginRight: '4px' }}>{icons[bp]}</span>
                  <span style={{ fontSize: '11px' }}>
                    {bp === 'desktop' ? '桌面' : bp === 'tablet' ? '平板' : '手机'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div style={styles.canvasContainer}>
        <div
          style={{
            ...styles.canvas,
            width: width + 32,
            transition: 'width 0.4s ease-in-out, padding 0.3s ease-in-out'
          }}
        >
          <div
            style={{
              ...styles.previewFrame,
              width: width,
              transition: 'width 0.4s ease-in-out'
            }}
          >
            {/* Navbar */}
            <DropZone
              componentKey="navbar-bg"
              style={{
                height: navHeight,
                background: componentColors['navbar-bg'],
                display: 'flex',
                alignItems: 'center',
                padding: `0 ${Math.round(24 * scale)}px`,
                borderBottom: `1px solid ${componentColors['card-border']}`
              }}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: Math.round(8 * gapScale),
                fontSize: Math.round(20 * fontSizeScale) + 'px',
                fontWeight: 700,
                color: componentColors['navbar-text'],
                transition: 'all 0.3s ease-in-out'
              }}>
                <span>✨</span>
                <DropZone componentKey="navbar-text" style={{ color: componentColors['navbar-text'] }}>
                  Design Studio
                </DropZone>
              </div>

              <div style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: Math.round(24 * gapScale),
                fontSize: Math.round(14 * fontSizeScale) + 'px'
              }}>
                {['首页', '产品', '关于', '博客', '联系'].map(item => (
                  <DropZone key={item} componentKey="navbar-text">
                    <a style={{
                      color: componentColors['navbar-text'],
                      textDecoration: 'none',
                      transition: 'all 0.3s ease-in-out',
                      opacity: 0.9,
                      cursor: 'pointer'
                    }}>
                      {item}
                    </a>
                  </DropZone>
                ))}
              </div>

              <DropZone componentKey="button-bg">
                <button
                  style={{
                    marginLeft: Math.round(20 * gapScale),
                    background: componentColors['button-bg'],
                    color: componentColors['button-text'],
                    padding: `${Math.round(8 * scale)}px ${Math.round(18 * scale)}px`,
                    borderRadius: '6px',
                    fontSize: Math.round(13 * fontSizeScale) + 'px',
                    fontWeight: 500,
                    transition: 'all 0.3s ease-in-out',
                    cursor: 'pointer'
                  }}
                >
                  <DropZone componentKey="button-text" style={{ color: componentColors['button-text'] }}>
                    立即开始
                  </DropZone>
                </button>
              </DropZone>
            </DropZone>

            {/* Hero Section */}
            <DropZone
              componentKey="hero-bg"
              style={{
                minHeight: heroMinHeight,
                background: componentColors['hero-bg'],
                padding: `${sectionPadding}px ${Math.round(24 * scale)}px`,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                gap: Math.round(16 * gapScale)
              }}
            >
              <div style={{
                display: 'inline-block',
                background: componentColors['accent'] + '20',
                color: componentColors['accent'],
                padding: `${Math.round(6 * scale)}px ${Math.round(14 * scale)}px`,
                borderRadius: '999px',
                fontSize: Math.round(12 * fontSizeScale) + 'px',
                fontWeight: 500,
                transition: 'all 0.3s ease-in-out'
              }}>
                🚀 全新体验上线
              </div>

              <DropZone componentKey="hero-text">
                <h1 style={{
                  fontSize: Math.round(42 * fontSizeScale) + 'px',
                  fontWeight: 800,
                  color: componentColors['hero-text'],
                  maxWidth: Math.round(700 * scale),
                  lineHeight: 1.2,
                  margin: 0,
                  transition: 'all 0.3s ease-in-out'
                }}>
                  打造令人惊艳的
                  <span style={{ color: componentColors['accent'] }}> 配色方案</span>
                </h1>
              </DropZone>

              <DropZone componentKey="hero-subtext">
                <p style={{
                  fontSize: Math.round(16 * fontSizeScale) + 'px',
                  color: componentColors['hero-subtext'],
                  maxWidth: Math.round(560 * scale),
                  lineHeight: 1.6,
                  margin: 0,
                  transition: 'all 0.3s ease-in-out'
                }}>
                  通过直观的拖拽操作，实时预览配色方案对完整网页的视觉影响。
                  专业的对比度计算确保最佳可读性。
                </p>
              </DropZone>

              <div style={{
                display: 'flex',
                gap: Math.round(12 * gapScale),
                marginTop: Math.round(8 * scale)
              }}>
                <DropZone componentKey="button-bg">
                  <button style={{
                    background: componentColors['button-bg'],
                    color: componentColors['button-text'],
                    padding: `${Math.round(12 * scale)}px ${Math.round(28 * scale)}px`,
                    borderRadius: '8px',
                    fontSize: Math.round(14 * fontSizeScale) + 'px',
                    fontWeight: 600,
                    transition: 'all 0.3s ease-in-out',
                    cursor: 'pointer'
                  }}>
                    免费试用
                  </button>
                </DropZone>
                <button style={{
                  background: 'transparent',
                  color: componentColors['hero-text'],
                  padding: `${Math.round(12 * scale)}px ${Math.round(28 * scale)}px`,
                  borderRadius: '8px',
                  fontSize: Math.round(14 * fontSizeScale) + 'px',
                  fontWeight: 500,
                  border: `1.5px solid ${componentColors['card-border']}`,
                  transition: 'all 0.3s ease-in-out',
                  cursor: 'pointer'
                }}>
                  查看演示 →
                </button>
              </div>
            </DropZone>

            {/* Card Grid Section */}
            <DropZone
              componentKey="hero-bg"
              style={{
                background: componentColors['card-bg'],
                padding: `${sectionPadding}px ${Math.round(24 * scale)}px`
              }}
            >
              <div style={{
                maxWidth: Math.round(1100 * scale),
                margin: '0 auto'
              }}>
                <div style={{
                  textAlign: 'center',
                  marginBottom: Math.round(36 * scale)
                }}>
                  <DropZone componentKey="hero-text">
                    <h2 style={{
                      fontSize: Math.round(30 * fontSizeScale) + 'px',
                      fontWeight: 700,
                      color: componentColors['hero-text'],
                      margin: 0,
                      marginBottom: Math.round(10 * scale),
                      transition: 'all 0.3s ease-in-out'
                    }}>
                      核心功能特性
                    </h2>
                  </DropZone>
                  <DropZone componentKey="hero-subtext">
                    <p style={{
                      fontSize: Math.round(15 * fontSizeScale) + 'px',
                      color: componentColors['hero-subtext'],
                      margin: 0,
                      transition: 'all 0.3s ease-in-out'
                    }}>
                      一站式配色方案管理工具，让设计工作流更加高效
                    </p>
                  </DropZone>
                </div>

                <div style={{
                  display: breakpoint === 'mobile' ? 'grid' : 'grid',
                  gridTemplateColumns: breakpoint === 'mobile'
                    ? '1fr'
                    : breakpoint === 'tablet'
                    ? 'repeat(2, 1fr)'
                    : 'repeat(3, 1fr)',
                  gap: Math.round(20 * gapScale)
                }}>
                  {[
                    { icon: '🎨', title: '智能调色板', desc: '支持超过15种颜色管理，拖拽排序，快捷编辑' },
                    { icon: '📊', title: '对比度检测', desc: '遵循WCAG AA标准，自动计算颜色对比度' },
                    { icon: '📱', title: '响应式预览', desc: '桌面/平板/手机三端实时切换预览效果' },
                    { icon: '📜', title: '操作历史', desc: '最多保存50条历史记录，一键回滚任意状态' },
                    { icon: '💾', title: '导出功能', desc: 'JSON格式与CSS变量双格式，便于开发集成' },
                    { icon: '⚡', title: '流畅体验', desc: '60fps动画渲染，50ms内完成对比度计算' }
                  ].map((feature, i) => (
                    <DropZone
                      key={i}
                      componentKey="card-bg"
                      style={{
                        background: componentColors['card-bg'],
                        border: `1px solid ${componentColors['card-border']}`,
                        borderRadius: '12px',
                        padding: cardPadding,
                        transition: 'all 0.3s ease-in-out'
                      }}
                    >
                      <div style={{
                        width: Math.round(44 * scale),
                        height: Math.round(44 * scale),
                        borderRadius: '10px',
                        background: componentColors['accent'] + '15',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: Math.round(22 * scale) + 'px',
                        marginBottom: Math.round(14 * scale)
                      }}>
                        {feature.icon}
                      </div>
                      <DropZone componentKey="card-title">
                        <h3 style={{
                          fontSize: Math.round(17 * fontSizeScale) + 'px',
                          fontWeight: 600,
                          color: componentColors['card-title'],
                          margin: 0,
                          marginBottom: Math.round(6 * scale),
                          transition: 'all 0.3s ease-in-out'
                        }}>
                          {feature.title}
                        </h3>
                      </DropZone>
                      <DropZone componentKey="card-text">
                        <p style={{
                          fontSize: Math.round(13 * fontSizeScale) + 'px',
                          color: componentColors['card-text'],
                          lineHeight: 1.6,
                          margin: 0,
                          transition: 'all 0.3s ease-in-out'
                        }}>
                          {feature.desc}
                        </p>
                      </DropZone>
                    </DropZone>
                  ))}
                </div>
              </div>
            </DropZone>

            {/* CTA Section */}
            <DropZone
              componentKey="hero-bg"
              style={{
                background: componentColors['accent'],
                padding: `${sectionPadding}px ${Math.round(24 * scale)}px`,
                textAlign: 'center'
              }}
            >
              <h2 style={{
                fontSize: Math.round(28 * fontSizeScale) + 'px',
                fontWeight: 700,
                color: componentColors['button-text'],
                margin: 0,
                marginBottom: Math.round(12 * scale),
                transition: 'all 0.3s ease-in-out'
              }}>
                准备好开始了吗？
              </h2>
              <p style={{
                fontSize: Math.round(15 * fontSizeScale) + 'px',
                color: componentColors['button-text'],
                opacity: 0.9,
                margin: 0,
                marginBottom: Math.round(24 * scale),
                transition: 'all 0.3s ease-in-out'
              }}>
                立即创建你的第一个配色方案
              </p>
              <button style={{
                background: componentColors['button-text'],
                color: componentColors['accent'],
                padding: `${Math.round(12 * scale)}px ${Math.round(32 * scale)}px`,
                borderRadius: '8px',
                fontSize: Math.round(14 * fontSizeScale) + 'px',
                fontWeight: 600,
                transition: 'all 0.3s ease-in-out',
                cursor: 'pointer'
              }}>
                立即使用 →
              </button>
            </DropZone>

            {/* Footer */}
            <DropZone
              componentKey="footer-bg"
              style={{
                background: componentColors['footer-bg'],
                padding: `${Math.round(36 * scale)}px ${Math.round(24 * scale)}px ${Math.round(20 * scale)}px`,
                transition: 'all 0.3s ease-in-out'
              }}
            >
              <div style={{
                maxWidth: Math.round(1100 * scale),
                margin: '0 auto',
                display: 'grid',
                gridTemplateColumns: breakpoint === 'mobile' ? '1fr' : 'repeat(4, 1fr)',
                gap: Math.round(28 * gapScale)
              }}>
                <div>
                  <div style={{
                    fontSize: Math.round(18 * fontSizeScale) + 'px',
                    fontWeight: 700,
                    color: componentColors['footer-text'],
                    marginBottom: Math.round(10 * scale),
                    transition: 'all 0.3s ease-in-out'
                  }}>
                    ✨ Design Studio
                  </div>
                  <DropZone componentKey="footer-text">
                    <p style={{
                      fontSize: Math.round(12 * fontSizeScale) + 'px',
                      color: componentColors['footer-text'],
                      opacity: 0.7,
                      lineHeight: 1.6,
                      margin: 0,
                      transition: 'all 0.3s ease-in-out'
                    }}>
                      专业的配色方案设计工具
                    </p>
                  </DropZone>
                </div>

                {[
                  { title: '产品', items: ['功能介绍', '定价方案', '更新日志'] },
                  { title: '资源', items: ['使用文档', 'API 接口', '颜色理论'] },
                  { title: '公司', items: ['关于我们', '联系我们', '隐私政策'] }
                ].map((col, i) => (
                  <div key={i}>
                    <DropZone componentKey="footer-text">
                      <div style={{
                        fontSize: Math.round(13 * fontSizeScale) + 'px',
                        fontWeight: 600,
                        color: componentColors['footer-text'],
                        marginBottom: Math.round(10 * scale),
                        transition: 'all 0.3s ease-in-out'
                      }}>
                        {col.title}
                      </div>
                    </DropZone>
                    {col.items.map(item => (
                      <DropZone key={item} componentKey="footer-text">
                        <div style={{
                          fontSize: Math.round(12 * fontSizeScale) + 'px',
                          color: componentColors['footer-text'],
                          opacity: 0.7,
                          padding: `${Math.round(3 * scale)}px 0`,
                          cursor: 'pointer',
                          transition: 'all 0.3s ease-in-out'
                        }}>
                          {item}
                        </div>
                      </DropZone>
                    ))}
                  </div>
                ))}
              </div>

              <div style={{
                maxWidth: Math.round(1100 * scale),
                margin: `${Math.round(24 * scale)}px auto 0`,
                paddingTop: Math.round(16 * scale),
                borderTop: `1px solid rgba(255,255,255,0.1)`,
                textAlign: 'center'
              }}>
                <DropZone componentKey="footer-text">
                  <span style={{
                    fontSize: Math.round(11 * fontSizeScale) + 'px',
                    color: componentColors['footer-text'],
                    opacity: 0.5,
                    transition: 'all 0.3s ease-in-out'
                  }}>
                    © 2025 Design Studio · 配色方案预览工具
                  </span>
                </DropZone>
              </div>
            </DropZone>
          </div>
        </div>
      </div>
    </section>
  )
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0,
    background: '#E9ECEF'
  },
  toolbar: {
    height: '48px',
    minHeight: '48px',
    background: '#FFFFFF',
    borderBottom: '1px solid #DEE2E6',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 20px',
    zIndex: 5
  },
  toolbarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  toolbarLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#212529'
  },
  sizeBadge: {
    fontSize: '11px',
    color: '#6C757D',
    background: '#F1F3F5',
    padding: '3px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace'
  },
  toolbarRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  },
  breakpointGroup: {
    display: 'flex',
    gap: '0px',
    background: '#F1F3F5',
    borderRadius: '8px',
    padding: '2px',
    overflow: 'hidden'
  },
  breakpointBtn: {
    display: 'flex',
    alignItems: 'center',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  },
  canvasContainer: {
    flex: 1,
    overflow: 'auto',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    padding: '20px'
  },
  canvas: {
    background: '#F8F9FA',
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    transition: 'width 0.4s ease-in-out'
  },
  previewFrame: {
    background: '#fff',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    transition: 'width 0.4s ease-in-out'
  }
}

export default PreviewArea
