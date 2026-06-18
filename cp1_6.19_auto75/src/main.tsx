import React, { useState, useCallback } from 'react'
import ReactDOM from 'react-dom/client'
import * as THREE from 'three'
import { BubbleScene } from './components/BubbleScene'
import { ControlPanel } from './components/ControlPanel'
import { useBubbleStore } from './stores/bubbleStore'

function App() {
  const [showInput, setShowInput] = useState(false)
  const [inputPosition, setInputPosition] = useState<THREE.Vector3 | null>(null)
  const { addBubble } = useBubbleStore()

  const handleBackgroundClick = useCallback((position: THREE.Vector3) => {
    setInputPosition(position)
    setShowInput(true)
  }, [])

  const handleCloseInput = useCallback(() => {
    setShowInput(false)
    setInputPosition(null)
  }, [])

  const handleSubmitInput = useCallback((text: string) => {
    if (inputPosition) {
      addBubble(text, inputPosition)
    }
    handleCloseInput()
  }, [inputPosition, addBubble, handleCloseInput])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <BubbleScene onBackgroundClick={handleBackgroundClick} />
      <ControlPanel
        showInput={showInput}
        inputPosition={inputPosition}
        onCloseInput={handleCloseInput}
        onSubmitInput={handleSubmitInput}
      />
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
