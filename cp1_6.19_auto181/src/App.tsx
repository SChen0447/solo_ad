import { useState, useRef } from 'react'
import CanvasArea from './canvas/CanvasArea'
import CodePreview from './code/CodePreview'
import { recognizeShapes, type RecognizedElement } from './recognition/ShapeRecognizer'
import { generateHtmlCode } from './code/CodeGenerator'
import './App.css'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [recognizedElements, setRecognizedElements] = useState<RecognizedElement[]>([])
  const [generatedCode, setGeneratedCode] = useState<string>(generateHtmlCode([]))
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = () => {
    if (!canvasRef.current) return

    setIsGenerating(true)

    setTimeout(() => {
      try {
        const elements = recognizeShapes(canvasRef.current!)
        setRecognizedElements(elements)
        const code = generateHtmlCode(elements)
        setGeneratedCode(code)
      } catch (error) {
        console.error('识别失败:', error)
      } finally {
        setIsGenerating(false)
      }
    }, 100)
  }

  const handleCodeChange = (newCode: string) => {
    setGeneratedCode(newCode)
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="app-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 19l7-7 3 3-7 7-3-3z" />
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
            <path d="M2 2l7.586 7.586" />
            <circle cx="11" cy="11" r="2" />
          </svg>
          <h1 className="app-title">Sketch to HTML</h1>
        </div>
        <p className="app-subtitle">手绘草图一键转为可交互代码</p>
      </header>

      <main className="app-main">
        <div className="panel-left">
          <CanvasArea
            width={800}
            height={600}
            onGenerate={handleGenerate}
            canvasRef={canvasRef}
          />
        </div>

        <div className="panel-right">
          {isGenerating ? (
            <div className="loading-panel">
              <div className="loading-spinner"></div>
              <p>正在识别图形并生成代码...</p>
            </div>
          ) : (
            <CodePreview
              code={generatedCode}
              onCodeChange={handleCodeChange}
            />
          )}
        </div>
      </main>
    </div>
  )
}

export default App
