import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { wordCloudRenderer } from '../modules/wordcloud/WordCloudRenderer'
import type { WordCloudCanvasHandle, WordCloudCanvasProps } from '../types'

const WordCloudCanvas = forwardRef<WordCloudCanvasHandle, WordCloudCanvasProps>(({ theme }, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    triggerRocket: (fromX, fromY, toX, toY, color) => {
      wordCloudRenderer.triggerRocketAnimation(fromX, fromY, toX, toY, color)
    },
    triggerClear: () => wordCloudRenderer.triggerClearAnimation()
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    wordCloudRenderer.attach(canvas)

    const handleResize = () => {
      wordCloudRenderer.resize()
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        window.dispatchEvent(new CustomEvent('wordcloud-resize', {
          detail: { width: rect.width, height: rect.height - (containerRef.current?.querySelector('.student-input-bar')?.clientHeight || 0) }
        }))
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    return () => {
      window.removeEventListener('resize', handleResize)
      wordCloudRenderer.detach()
    }
  }, [])

  useEffect(() => {
    wordCloudRenderer.setTheme(theme)
  }, [theme])

  return (
    <div className="canvas-section" ref={containerRef}>
      <canvas ref={canvasRef} className="wordcloud-canvas" />
    </div>
  )
})

WordCloudCanvas.displayName = 'WordCloudCanvas'

export default WordCloudCanvas
