import { useState, useEffect, useCallback } from 'react'
import { ColorEditor } from './components/ColorEditor'
import { ThemePreview } from './components/ThemePreview'
import { themeManager } from './theme/themeManager'
import type { ColorMap, ThemePreset } from './theme/themeManager'
import {
  copyToClipboard,
  downloadCss,
  downloadScss,
  formatToCss,
} from './utils/cssExport'

export default function App() {
  const [colors, setColors] = useState<ColorMap>(themeManager.getColors())
  const [canUndo, setCanUndo] = useState(themeManager.canUndo())
  const [canRedo, setCanRedo] = useState(themeManager.canRedo())
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    const unsubscribe = themeManager.subscribe((newColors) => {
      setColors(newColors)
      setCanUndo(themeManager.canUndo())
      setCanRedo(themeManager.canRedo())
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        themeManager.undo()
      } else if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key.toLowerCase() === 'z' || e.key.toLowerCase() === 'y')
      ) {
        e.preventDefault()
        themeManager.redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleChange = useCallback((name: string, value: string) => {
    themeManager.setVariable(name, value)
  }, [])

  const handleAddVariable = useCallback((name: string) => {
    return themeManager.addVariable(name)
  }, [])

  const handleRemoveVariable = useCallback((name: string) => {
    return themeManager.removeVariable(name)
  }, [])

  const handleApplyPreset = useCallback((preset: ThemePreset) => {
    themeManager.applyPreset(preset)
  }, [])

  const handleReset = useCallback(() => {
    themeManager.resetVariables()
  }, [])

  const handleUndo = useCallback(() => {
    themeManager.undo()
  }, [])

  const handleRedo = useCallback(() => {
    themeManager.redo()
  }, [])

  const handleExportCss = useCallback(() => {
    downloadCss(colors)
  }, [colors])

  const handleExportScss = useCallback(() => {
    downloadScss(colors)
  }, [colors])

  const handleCopyCss = useCallback(() => {
    copyToClipboard(formatToCss(colors))
  }, [colors])

  return (
    <div className="app-layout">
      <ColorEditor
        colors={colors}
        onChange={handleChange}
        onAddVariable={handleAddVariable}
        onRemoveVariable={handleRemoveVariable}
        onApplyPreset={handleApplyPreset}
        onReset={handleReset}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onExportCss={handleExportCss}
        onExportScss={handleExportScss}
        onCopyCss={handleCopyCss}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />
      <ThemePreview colors={colors} />
    </div>
  )
}
