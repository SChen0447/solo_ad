import React, { useEffect, useRef, useState, useCallback } from 'react'
import { ParamPanel } from './ParamPanel'
import { PreviewPanel } from './PreviewPanel'
import { useAppStore } from './store'
import { FontParser } from './FontParser'

export const App: React.FC = () => {
  const fontMetadata = useAppStore((s) => s.fontMetadata)
  const fontLoading = useAppStore((s) => s.fontLoading)
  const fontLoadProgress = useAppStore((s) => s.fontLoadProgress)
  const fontLoadError = useAppStore((s) => s.fontLoadError)
  const setFontLoading = useAppStore((s) => s.setFontLoading)
  const setFontLoadProgress = useAppStore((s) => s.setFontLoadProgress)
  const setFontLoadError = useAppStore((s) => s.setFontLoadError)
  const setFont = useAppStore((s) => s.setFont)
  const drawerOpen = useAppStore((s) => s.drawerOpen)
  const toggleDrawer = useAppStore((s) => s.toggleDrawer)
  const setDrawerOpen = useAppStore((s) => s.setDrawerOpen)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 900
      setIsMobile(mobile)
      if (!mobile) setDrawerOpen(false)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setDrawerOpen])

  const loadFont = useCallback(async (file: File) => {
    const name = file.name.toLowerCase()
    if (!name.endsWith('.ttf') && !name.endsWith('.otf')) {
      setFontLoadError('仅支持 .ttf 和 .otf 格式的字体文件')
      return
    }

    setFontLoading(true)
    setFontLoadProgress(10)
    setFontLoadError(null)

    try {
      setFontLoadProgress(25)
      const buffer = await FontParser.parseFile(file)
      setFontLoadProgress(45)

      const metadata = FontParser.extractBasicMetadata(file, buffer)
      setFontLoadProgress(60)

      const familyKey = FontParser.generateFontFamilyKey(metadata.familyName)

      const fontFace = new FontFace(familyKey, buffer, {
        weight: metadata.weight.toString(),
        style: metadata.italic ? 'italic' : 'normal'
      })

      setFontLoadProgress(75)
      const loadedFace = await fontFace.load()
      setFontLoadProgress(90)

      if (document.fonts && 'add' in document.fonts) {
        ;(document.fonts as FontFaceSet).add(loadedFace)
      }

      setFont(metadata, familyKey)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '字体加载失败'
      setFontLoadError(`字体加载失败：${msg}`)
    }
  }, [setFontLoading, setFontLoadProgress, setFontLoadError, setFont])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) loadFont(file)
    e.target.value = ''
  }, [loadFont])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) loadFont(file)
  }, [loadFont])

  const handleTopBarClick = useCallback(() => {
    if (isMobile) {
      toggleDrawer()
    } else {
      fileInputRef.current?.click()
    }
  }, [isMobile, toggleDrawer])

  return (
    <div style={appStyle}>
      <div
        ref={dropZoneRef}
        style={{
          ...dropZoneOverlayStyle,
          opacity: isDragging ? 1 : 0,
          pointerEvents: isDragging ? 'auto' : 'none'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div style={dropZoneContentStyle}>
          <div style={dropZoneIconStyle}>↑</div>
          <div style={{ fontSize: '18px', fontWeight: 600 }}>释放以导入字体文件</div>
          <div style={{ fontSize: '13px', opacity: 0.7, marginTop: '6px' }}>支持 .ttf 和 .otf 格式</div>
        </div>
      </div>

      <div
        style={{
          ...dropZoneBaseStyle,
          pointerEvents: isDragging ? 'none' : 'auto'
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div
          style={topBarStyle}
          onClick={handleTopBarClick}
          onMouseEnter={(e) => {
            if (!fontLoading) {
              e.currentTarget.style.background = 'rgba(91, 155, 255, 0.06)'
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.95)'
          }}
        >
          <div style={topBarInnerStyle}>
            <div style={logoStyle}>
              <span style={logoIconStyle}>Aa</span>
              <span style={logoTextStyle}>Typography Tuner</span>
            </div>

            <div style={fontInfoContainerStyle}>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  fileInputRef.current?.click()
                }}
                style={importBtnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(91, 155, 255, 0.18)'
                  e.currentTarget.style.transform = 'scale(1.04)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(91, 155, 255, 0.12)'
                  e.currentTarget.style.transform = 'scale(1)'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1.04)'
                }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1 }}>＋</span>
                <span>导入字体</span>
              </button>

              {fontLoading && (
                <div style={loadingContainerStyle}>
                  <div style={loadingBarBgStyle}>
                    <div style={{
                      ...loadingBarFillStyle,
                      width: `${fontLoadProgress}%`
                    }} />
                  </div>
                  <span style={loadingTextStyle}>加载中 {fontLoadProgress}%</span>
                </div>
              )}

              {!fontLoading && fontMetadata && (
                <div style={fontNameStyle}>
                  <span style={fontNameLabelStyle}>当前字体：</span>
                  <span style={{
                    ...fontNameValueStyle,
                    fontFamily: `"${fontMetadata.familyName}", sans-serif`
                  }}>
                    {fontMetadata.fullName}
                  </span>
                </div>
              )}

              {!fontLoading && !fontMetadata && !fontLoadError && (
                <div style={hintStyle}>请导入 .ttf 或 .otf 字体文件，或将文件拖入页面</div>
              )}

              {fontLoadError && (
                <div style={errorStyle}>⚠ {fontLoadError}</div>
              )}
            </div>

            {isMobile && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  toggleDrawer()
                }}
                style={menuBtnStyle}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,0,0,0.05)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.9)'
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = 'scale(1)'
                }}
              >
                <div style={menuIconStyle}>
                  <div />
                  <div />
                  <div />
                </div>
              </button>
            )}
          </div>
        </div>

        <div style={mainContentStyle}>
          {!isMobile && (
            <div style={sidebarStyle}>
              <ParamPanel />
            </div>
          )}

          {isMobile && (
            <>
              <div
                style={{
                  ...drawerOverlayStyle,
                  opacity: drawerOpen ? 1 : 0,
                  pointerEvents: drawerOpen ? 'auto' : 'none'
                }}
                onClick={() => setDrawerOpen(false)}
              />
              <div
                style={{
                  ...drawerStyle,
                  transform: drawerOpen ? 'translateY(0)' : 'translateY(-100%)',
                  opacity: drawerOpen ? 1 : 0,
                  pointerEvents: drawerOpen ? 'auto' : 'none'
                }}
              >
                <div style={drawerHeaderStyle}>
                  <span style={drawerTitleStyle}>排版参数</span>
                  <button
                    onClick={() => setDrawerOpen(false)}
                    style={drawerCloseStyle}
                  >
                    ✕
                  </button>
                </div>
                <div style={{ height: 'calc(100% - 52px)', overflow: 'auto' }}>
                  <ParamPanel />
                </div>
              </div>
            </>
          )}

          <div style={previewWrapperStyle}>
            <PreviewPanel />
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".ttf,.otf"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
    </div>
  )
}

const appStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  margin: 0,
  padding: 0,
  fontFamily: '"Inter", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif',
  background: '#F7F8FA',
  overflow: 'hidden',
  color: '#1F2937'
}

const dropZoneBaseStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 1
}

const dropZoneOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 9999,
  background: 'rgba(91, 155, 255, 0.12)',
  backdropFilter: 'blur(6px)',
  border: '3px dashed rgba(91, 155, 255, 0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.2s ease',
  color: '#3A6FD8'
}

const dropZoneContentStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.9)',
  padding: '40px 60px',
  borderRadius: '16px',
  textAlign: 'center',
  boxShadow: '0 12px 40px rgba(91, 155, 255, 0.2)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '8px'
}

const dropZoneIconStyle: React.CSSProperties = {
  width: '60px',
  height: '60px',
  borderRadius: '50%',
  background: 'linear-gradient(135deg, #5B9BFF, #9B6DFF)',
  color: '#FFF',
  fontSize: '30px',
  fontWeight: 'bold',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginBottom: '12px'
}

const topBarStyle: React.CSSProperties = {
  height: '64px',
  background: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(12px)',
  borderBottom: '1px solid rgba(0,0,0,0.06)',
  padding: '0 28px',
  display: 'flex',
  alignItems: 'center',
  flexShrink: 0,
  zIndex: 10,
  cursor: 'pointer',
  transition: 'background-color 0.2s ease'
}

const topBarInnerStyle: React.CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  gap: '20px',
  flexWrap: 'nowrap'
}

const logoStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '10px',
  flexShrink: 0
}

const logoIconStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  background: 'linear-gradient(135deg, #5B9BFF 0%, #9B6DFF 100%)',
  color: '#FFF',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '15px',
  boxShadow: '0 4px 12px rgba(91, 155, 255, 0.3)'
}

const logoTextStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 700,
  background: 'linear-gradient(135deg, #3A6FD8 0%, #7A4FD8 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
  letterSpacing: '0.02em',
  whiteSpace: 'nowrap'
}

const fontInfoContainerStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  minWidth: 0,
  justifyContent: 'center'
}

const importBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  borderRadius: '10px',
  border: 'none',
  background: 'rgba(91, 155, 255, 0.12)',
  color: '#3A6FD8',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
  flexShrink: 0
}

const loadingContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '6px 16px',
  background: 'rgba(91, 155, 255, 0.08)',
  borderRadius: '10px'
}

const loadingBarBgStyle: React.CSSProperties = {
  width: '140px',
  height: '6px',
  borderRadius: '3px',
  background: 'rgba(91, 155, 255, 0.15)',
  overflow: 'hidden'
}

const loadingBarFillStyle: React.CSSProperties = {
  height: '100%',
  background: 'linear-gradient(90deg, #5B9BFF, #9B6DFF)',
  borderRadius: '3px',
  transition: 'width 0.15s ease'
}

const loadingTextStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#3A6FD8',
  fontWeight: 500
}

const fontNameStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '6px',
  fontSize: '13px',
  padding: '6px 14px',
  background: 'rgba(0,0,0,0.03)',
  borderRadius: '8px',
  maxWidth: '60%',
  overflow: 'hidden',
  whiteSpace: 'nowrap'
}

const fontNameLabelStyle: React.CSSProperties = {
  color: 'rgba(0,0,0,0.45)',
  fontWeight: 500,
  flexShrink: 0
}

const fontNameValueStyle: React.CSSProperties = {
  color: '#1F2937',
  fontWeight: 600,
  textOverflow: 'ellipsis',
  overflow: 'hidden',
  whiteSpace: 'nowrap'
}

const hintStyle: React.CSSProperties = {
  fontSize: '12.5px',
  color: 'rgba(0,0,0,0.4)',
  fontWeight: 500,
  whiteSpace: 'nowrap'
}

const errorStyle: React.CSSProperties = {
  fontSize: '12.5px',
  color: '#D94848',
  fontWeight: 500,
  padding: '6px 14px',
  background: 'rgba(217, 72, 72, 0.08)',
  borderRadius: '8px'
}

const menuBtnStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  borderRadius: '10px',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  transition: 'all 0.15s ease'
}

const menuIconStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '4px'
}

const mainContentStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  minHeight: 0,
  position: 'relative'
}

const sidebarStyle: React.CSSProperties = {
  width: '300px',
  minWidth: '300px',
  flexShrink: 0,
  position: 'relative',
  height: '100%',
  zIndex: 5
}

const previewWrapperStyle: React.CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: '100%'
}

const drawerOverlayStyle: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  background: 'rgba(0,0,0,0.35)',
  zIndex: 20,
  transition: 'opacity 0.25s ease',
  backdropFilter: 'blur(2px)'
}

const drawerStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  maxHeight: '80vh',
  background: 'rgba(30,30,30,0.95)',
  backdropFilter: 'blur(20px)',
  borderBottomLeftRadius: '20px',
  borderBottomRightRadius: '20px',
  boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
  zIndex: 21,
  transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease'
}

const drawerHeaderStyle: React.CSSProperties = {
  height: '52px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 20px',
  borderBottom: '1px solid rgba(255,255,255,0.08)',
  flexShrink: 0
}

const drawerTitleStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: 600,
  color: '#FFF'
}

const drawerCloseStyle: React.CSSProperties = {
  width: '32px',
  height: '32px',
  borderRadius: '50%',
  border: 'none',
  background: 'rgba(255,255,255,0.1)',
  color: '#FFF',
  fontSize: '14px',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.15s ease'
}
