import { useState, useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { AnimationEditor } from './modules/editor/AnimationEditor'
import { PreviewPanel } from './modules/preview/PreviewPanel'
import type { AnimationConfig, AnimationInstance, AnimationType } from './types/animation'
import { createDefaultConfig } from './types/animation'
import { generateCSS, generateHighlightedCSS, HIGHLIGHT_CSS_CLASSES } from './utils/cssExporter'
import type { HighlightedPart, HighlightType } from './utils/cssExporter'

const AppContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`

const Header = styled.header`
  height: 56px;
  background: #1E1B4B;
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  flex-shrink: 0;
  z-index: 10;
`

const HeaderTitle = styled.h1`
  font-size: 16px;
  font-weight: 600;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, #C4B5FD 0%, #93C5FD 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`

const MobileToggleBtn = styled.button`
  display: none;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.2);
  color: #FFFFFF;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 18px;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;

  &:hover {
    background: rgba(255,255,255,0.2);
  }

  @media (max-width: 900px) {
    display: flex;
  }
`

const MainContent = styled.div`
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
`

const EditorWrapper = styled.div<{ $isOpenMobile: boolean }>`
  width: 380px;
  flex-shrink: 0;
  background: #FFFFFF;
  border-right: 1px solid #E5E7EB;
  overflow-y: auto;
  z-index: 5;

  @media (max-width: 900px) {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    max-width: 100%;
    max-height: 60vh;
    border-right: none;
    border-bottom: 1px solid #E5E7EB;
    transform: translateY(${({ $isOpenMobile }) => $isOpenMobile ? '0' : '-100%'});
    transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
    box-shadow: ${({ $isOpenMobile }) => $isOpenMobile ? '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)' : 'none'};
    z-index: 10;
  }
`

const PreviewWrapper = styled.div`
  flex: 1;
  background: #F3F4F6;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  min-width: 0;
`

const ExportSection = styled.div`
  padding: 16px;
  background: #FFFFFF;
  border-top: 1px solid #E5E7EB;
  flex-shrink: 0;
`

const ExportHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
`

const ExportTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  color: #1F2937;
`

const CopyButton = styled.button`
  width: 140px;
  height: 44px;
  border-radius: 22px;
  background: #1F2937;
  color: #FFFFFF;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover {
    background: #374151;
  }

  &:active {
    transform: scale(0.98);
  }
`

const CodeBlock = styled.pre`
  background: #0F172A;
  color: #E2E8F0;
  padding: 16px;
  border-radius: 8px;
  font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  max-height: 200px;
  margin: 0;
`

const HL = styled.span<{ $type?: HighlightType }>`
  ${({ $type }) => {
    switch ($type) {
      case 'duration':
        return `
          color: #34D399;
          font-weight: 600;
          background: rgba(52, 211, 153, 0.15);
          padding: 0 4px;
          border-radius: 4px;
        `
      case 'delay':
        return `
          color: #F59E0B;
          font-weight: 600;
          background: rgba(245, 158, 11, 0.15);
          padding: 0 4px;
          border-radius: 4px;
        `
      case 'easing':
        return `
          color: #60A5FA;
          font-weight: 600;
          background: rgba(96, 165, 250, 0.15);
          padding: 0 4px;
          border-radius: 4px;
        `
      case 'bezier-number':
        return `
          color: #F472B6;
          font-weight: 600;
          background: rgba(244, 114, 182, 0.15);
          padding: 0 4px;
          border-radius: 4px;
        `
      default:
        return `
          color: #A78BFA;
          font-weight: 600;
          background: rgba(167, 139, 250, 0.15);
          padding: 0 4px;
          border-radius: 4px;
        `
    }
  }}
`

const MobileOverlay = styled.div<{ $visible: boolean }>`
  display: none;

  @media (max-width: 900px) {
    display: ${({ $visible }) => $visible ? 'block' : 'none'};
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 4;
    opacity: ${({ $visible }) => $visible ? 1 : 0};
    transition: opacity 0.3s ease;
    cursor: pointer;
  }
`

const Toast = styled.div<{ $visible: boolean }>`
  position: fixed;
  bottom: 32px;
  left: 50%;
  transform: translateX(-50%) translateY(${({ $visible }) => $visible ? '0' : '20px'});
  background: #1F2937;
  color: #FFFFFF;
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  opacity: ${({ $visible }) => $visible ? 1 : 0};
  pointer-events: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
`

export default function App() {
  const [instances, setInstances] = useState<AnimationInstance[]>(() => [
    { id: 'inst-1', config: createDefaultConfig('translate', 0) },
    { id: 'inst-2', config: createDefaultConfig('rotate', 1) }
  ])
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [playKey, setPlayKey] = useState(0)
  const [mobileEditorOpen, setMobileEditorOpen] = useState(false)
  const [toastVisible, setToastVisible] = useState(false)

  const maxDuration = useMemo(() => {
    return Math.max(...instances.map(inst => inst.config.duration + inst.config.delay), 1)
  }, [instances])

  const handleUpdateConfig = useCallback((instanceId: string, config: AnimationConfig) => {
    setInstances(prev => prev.map(inst =>
      inst.id === instanceId ? { ...inst, config } : inst
    ))
  }, [])

  const handleAddInstance = useCallback(() => {
    if (instances.length >= 4) return
    const types: AnimationType[] = ['translate', 'rotate', 'scale', 'color', 'bounce']
    const nextType = types[instances.length % types.length]
    const newConfig = createDefaultConfig(nextType, instances.length)
    setInstances(prev => [...prev, { id: `inst-${Date.now()}`, config: newConfig }])
  }, [instances.length])

  const handleRemoveInstance = useCallback((instanceId: string) => {
    setInstances(prev => prev.filter(inst => inst.id !== instanceId))
  }, [])

  const handlePlayToggle = useCallback(() => {
    setIsPlaying(prev => !prev)
    if (!isPlaying) {
      setPlayKey(prev => prev + 1)
      setCurrentTime(0)
    }
  }, [isPlaying])

  const handleTimeChange = useCallback((time: number) => {
    setCurrentTime(time)
  }, [])

  const activeConfig = instances[0]?.config
  const highlightedCSS = useMemo<HighlightedPart[]>(() =>
    activeConfig ? generateHighlightedCSS(activeConfig) : [],
    [activeConfig]
  )

  const handleCopy = useCallback(async () => {
    if (!activeConfig) return
    const css = generateCSS(activeConfig)
    try {
      await navigator.clipboard.writeText(css)
      setToastVisible(true)
      setTimeout(() => setToastVisible(false), 2000)
    } catch {
      setToastVisible(true)
      setTimeout(() => setToastVisible(false), 2000)
    }
  }, [activeConfig])

  const handleToggleMobileEditor = useCallback(() => {
    setMobileEditorOpen(prev => !prev)
  }, [])

  const handleCloseMobileEditor = useCallback(() => {
    setMobileEditorOpen(false)
  }, [])

  return (
    <AppContainer>
      <Header>
        <HeaderTitle>✨ CSS 动画沙盒</HeaderTitle>
        <MobileToggleBtn onClick={handleToggleMobileEditor} aria-label={mobileEditorOpen ? '关闭编辑面板' : '打开编辑面板'}>
          {mobileEditorOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          )}
        </MobileToggleBtn>
      </Header>
      <MainContent>
        <MobileOverlay $visible={mobileEditorOpen} onClick={handleCloseMobileEditor} />
        <EditorWrapper $isOpenMobile={mobileEditorOpen} className={mobileEditorOpen ? 'editor-drawer open' : 'editor-drawer'}>
          <AnimationEditor
            instances={instances}
            onUpdateConfig={handleUpdateConfig}
            onAddInstance={handleAddInstance}
            onRemoveInstance={handleRemoveInstance}
          />
        </EditorWrapper>
        <PreviewWrapper>
          <PreviewPanel
            instances={instances}
            isPlaying={isPlaying}
            currentTime={currentTime}
            playKey={playKey}
            maxDuration={maxDuration}
            onPlayToggle={handlePlayToggle}
            onTimeChange={handleTimeChange}
          />
          <ExportSection>
            <ExportHeader>
              <ExportTitle>导出 CSS 代码</ExportTitle>
              <CopyButton onClick={handleCopy}>复制代码</CopyButton>
            </ExportHeader>
            <CodeBlock>
              {highlightedCSS.map((part, idx) =>
                part.isHighlight
                  ? (
                    <HL
                      key={idx}
                      $type={part.type}
                      className={part.type ? HIGHLIGHT_CSS_CLASSES[part.type] : undefined}
                    >
                      {part.text}
                    </HL>
                  )
                  : <span key={idx}>{part.text}</span>
              )}
            </CodeBlock>
          </ExportSection>
        </PreviewWrapper>
      </MainContent>
      <Toast $visible={toastVisible}>已复制到剪贴板 ✓</Toast>
    </AppContainer>
  )
}
