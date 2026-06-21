import { useState, useEffect } from 'react'
import { useElementManager } from './hooks/useElementManager'
import CanvasArea from './components/CanvasArea'
import ToolPanel from './components/ToolPanel'
import Toolbar from './components/Toolbar'
import { exportToPNG, generateThumbnail } from './utils/exportUtils'

export default function App() {
  const [isMobile, setIsMobile] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const {
    elements,
    selectedIds,
    guideLines,
    paperSize,
    showGrid,
    templates,
    addElement,
    updateElement,
    deleteElements,
    selectElement,
    deselectAll,
    toggleElementLock,
    alignSelected,
    undo,
    redo,
    setPaperSize,
    toggleGrid,
    addGuideLine,
    removeGuideLine,
    saveTemplate,
    loadTemplate,
    deleteTemplate,
  } = useElementManager()

  useEffect(() => {
    const checkWidth = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  const handleExportPNG = async () => {
    setIsExporting(true)
    try {
      const blob = await exportToPNG(elements, paperSize)
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `journal-template-${paperSize}-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
    }
    setTimeout(() => setIsExporting(false), 1500)
  }

  const handleSaveTemplate = (name: string) => {
    const thumbnail = generateThumbnail(elements, paperSize)
    const id = crypto.randomUUID()
    const newTemplate = {
      id,
      name,
      paperSize,
      elements,
      thumbnail,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    saveTemplate(name)
    const updatedTemplates = [...templates, newTemplate]
    localStorage.setItem('journal-templates', JSON.stringify(updatedTemplates))
  }

  return (
    <div className="app-container">
      <Toolbar
        paperSize={paperSize}
        onPaperSizeChange={setPaperSize}
        onUndo={undo}
        onRedo={redo}
        onAlign={alignSelected}
        onToggleGrid={toggleGrid}
        showGrid={showGrid}
      />
      <div className="app-main">
        <div className="canvas-container">
          <CanvasArea
            paperSize={paperSize}
            elements={elements}
            selectedIds={selectedIds}
            guideLines={guideLines}
            showGrid={showGrid}
            onSelectElement={selectElement}
            onDeselectAll={deselectAll}
            onUpdateElement={updateElement}
            onAddGuideLine={addGuideLine}
            onRemoveGuideLine={removeGuideLine}
            onAddElement={addElement}
          />
        </div>
        <div className={`tool-panel-container ${isMobile ? 'mobile' : ''}`}>
          <ToolPanel
            {...{
              selectedIds,
              elements,
              templates,
              paperSize,
              updateElement,
              deleteElements,
              toggleElementLock,
              addElement,
              saveTemplate: handleSaveTemplate,
              loadTemplate,
              deleteTemplate,
              exportToPNG: handleExportPNG,
            } as any}
          />
        </div>
      </div>
      {isExporting && (
        <div className="export-overlay">
          <div className="circular-progress" />
        </div>
      )}
    </div>
  )
}
