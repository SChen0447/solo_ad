import { useEffect, useRef, useState } from 'react'
import { SceneManager } from './renderer/SceneManager'
import { UIControlPanel } from './ui/UIControlPanel'
import { useAppStore } from './store/useAppStore'
import './App.css'

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneManagerRef = useRef<SceneManager | null>(null)
  const [isLoaded, setIsLoaded] = useState(false)

  const {
    ornaments,
    selectedOrnamentType,
    selectedBallColor,
    ornamentSize,
    blessingText,
    isDragging,
    draggingOrnamentId,
    showDeleteConfirm,
    showToast,
    toastMessage,
    resetCameraTrigger,
    addOrnament,
    removeOrnament,
    updateOrnamentPosition,
    clearAllOrnaments,
    setIsDragging,
    setDraggingOrnamentId,
    setShowDeleteConfirm,
    triggerResetCamera,
    loadFromLocalStorage,
    loadFromShareLink,
    showToastMessage
  } = useAppStore()

  const dragOffsetRef = useRef<{ x: number; y: number; z: number } | null>(null)
  const isRotatingRef = useRef(false)
  const lastMousePosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!canvasRef.current) return

    const sceneManager = new SceneManager()
    sceneManager.init(canvasRef.current)
    sceneManagerRef.current = sceneManager

    loadFromLocalStorage()
    loadFromShareLink()

    setIsLoaded(true)

    return () => {
      sceneManager.dispose()
      sceneManagerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!sceneManagerRef.current || !isLoaded) return
    sceneManagerRef.current.setBlessingText(blessingText)
  }, [blessingText, isLoaded])

  useEffect(() => {
    if (!sceneManagerRef.current || !isLoaded) return
    
    const manager = sceneManagerRef.current
    manager.setOrnaments(ornaments)
  }, [ornaments.length, isLoaded])

  useEffect(() => {
    if (!sceneManagerRef.current || resetCameraTrigger === 0) return
    sceneManagerRef.current.resetCamera()
  }, [resetCameraTrigger])

  useEffect(() => {
    if (!sceneManagerRef.current) return

    if (isDragging && draggingOrnamentId) {
      sceneManagerRef.current.setOrnamentsOpacity(0.3)
      sceneManagerRef.current.setOrnamentOpacity(draggingOrnamentId, 1)
    } else {
      sceneManagerRef.current.setOrnamentsOpacity(1)
    }
  }, [isDragging, draggingOrnamentId])

  const getCanvasCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { clientX: 0, clientY: 0 }

    if ('touches' in e) {
      return {
        clientX: e.touches[0].clientX,
        clientY: e.touches[0].clientY
      }
    }
    return {
      clientX: e.clientX,
      clientY: e.clientY
    }
  }

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sceneManagerRef.current || !canvasRef.current) return

    const { clientX, clientY } = getCanvasCoords(e)
    lastMousePosRef.current = { x: clientX, y: clientY }

    const ornamentId = sceneManagerRef.current.raycastOrnament(
      clientX,
      clientY,
      canvasRef.current
    )

    if (ornamentId) {
      if ('button' in e && e.button === 2) {
        removeOrnament(ornamentId)
        return
      }
      setIsDragging(true)
      setDraggingOrnamentId(ornamentId)
      dragOffsetRef.current = { x: 0, y: 0, z: 0 }
    } else {
      isRotatingRef.current = true
      sceneManagerRef.current.startRotationDrag(clientX)
    }
  }

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sceneManagerRef.current || !canvasRef.current) return

    const { clientX, clientY } = getCanvasCoords(e)

    if (isDragging && draggingOrnamentId) {
      const hitResult = sceneManagerRef.current.raycastTree(
        clientX,
        clientY,
        canvasRef.current
      )
      if (hitResult) {
        const snapped = hitResult.point
        updateOrnamentPosition(draggingOrnamentId, [snapped.x, snapped.y, snapped.z])
      }
    } else if (isRotatingRef.current) {
      sceneManagerRef.current.updateRotationDrag(clientX)
    }
  }

  const handlePointerUp = (e: React.MouseEvent | React.TouchEvent) => {
    if (!sceneManagerRef.current || !canvasRef.current) return

    const { clientX, clientY } = getCanvasCoords(e)

    if (isDragging && draggingOrnamentId) {
      setIsDragging(false)
      setDraggingOrnamentId(null)
      dragOffsetRef.current = null
    } else if (isRotatingRef.current) {
      sceneManagerRef.current.endRotationDrag()
      isRotatingRef.current = false

      const dx = Math.abs(clientX - lastMousePosRef.current.x)
      const dy = Math.abs(clientY - lastMousePosRef.current.y)

      if (dx < 5 && dy < 5 && selectedOrnamentType) {
        const hitResult = sceneManagerRef.current.raycastTree(
          clientX,
          clientY,
          canvasRef.current
        )
        if (hitResult) {
          const normal = hitResult.normal.clone().normalize()
          const offsetPos = hitResult.point.clone().add(
            normal.multiplyScalar(0.05)
          )

          addOrnament({
            type: selectedOrnamentType,
            position: [offsetPos.x, offsetPos.y, offsetPos.z],
            size: ornamentSize,
            color: selectedOrnamentType === 'ball' ? selectedBallColor : undefined
          })
        }
      }
    }
  }

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    if (!sceneManagerRef.current || !canvasRef.current) return

    const ornamentId = sceneManagerRef.current.raycastOrnament(
      e.clientX,
      e.clientY,
      canvasRef.current
    )
    if (ornamentId) {
      removeOrnament(ornamentId)
    }
  }

  const handleDeleteAll = () => {
    clearAllOrnaments()
    setShowDeleteConfirm(false)
    showToastMessage('已删除所有装饰品')
  }

  const handleScreenshot = () => {
    if (!sceneManagerRef.current) return

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `ChristmasTree_${timestamp}.png`
    sceneManagerRef.current.downloadScreenshot(filename)
    showToastMessage('截图已保存！')
  }

  return (
    <div className="app-container">
      <canvas
        ref={canvasRef}
        className="three-canvas"
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onTouchStart={handlePointerDown}
        onTouchMove={handlePointerMove}
        onTouchEnd={handlePointerUp}
        onContextMenu={handleContextMenu}
      />

      <div className="left-toolbar">
        <button
          className="toolbar-btn"
          onClick={triggerResetCamera}
          title="重置视角"
        >
          🔄
          <span className="tooltip">重置视角</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={() => setShowDeleteConfirm(true)}
          title="删除所有装饰品"
        >
          🗑️
          <span className="tooltip">删除所有</span>
        </button>
        <button
          className="toolbar-btn"
          onClick={handleScreenshot}
          title="截图下载"
        >
          📷
          <span className="tooltip">截图下载</span>
        </button>
      </div>

      <UIControlPanel />

      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>确认删除</h3>
            <p>确定要删除所有装饰品吗？此操作无法撤销。</p>
            <div className="modal-buttons">
              <button
                className="modal-btn cancel-btn"
                onClick={() => setShowDeleteConfirm(false)}
              >
                取消
              </button>
              <button
                className="modal-btn confirm-btn"
                onClick={handleDeleteAll}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showToast && (
        <div className="toast">
          {toastMessage}
        </div>
      )}
    </div>
  )
}

export default App
