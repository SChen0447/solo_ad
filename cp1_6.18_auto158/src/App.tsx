import { useState, useCallback, useRef } from 'react'
import * as THREE from 'three'
import { ThreeScene } from './scene/ThreeScene'
import { FragmentList } from './components/FragmentList'
import { MatchPanel } from './components/MatchPanel'
import { ExportPanel } from './components/ExportPanel'
import { useAppStore } from './store/appStore'
import { loadOBJFile, validateOBJFile } from './utils/objLoader'
import './App.css'

function App() {
  const addFragment = useAppStore((s) => s.addFragment)
  const setFragmentGeometry = useAppStore((s) => s.setFragmentGeometry)
  const setFragmentEdgeData = useAppStore((s) => s.setFragmentEdgeData)
  const setFragmentThumbnail = useAppStore((s) => s.setFragmentThumbnail)
  const setFragmentAnimating = useAppStore((s) => s.setFragmentAnimating)
  const fragments = useAppStore((s) => s.fragments)
  const isPreviewMode = useAppStore((s) => s.isPreviewMode)

  const [loadingStatus, setLoadingStatus] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)

  const getSceneScreenshot = useCallback((): string | null => {
    if (!sceneRef.current) return null
    const renderer = (sceneRef.current as any)?.renderer
    if (renderer && renderer.domElement) {
      return renderer.domElement.toDataURL('image/png')
    }
    return null
  }, [])

  const handleFilesSelected = useCallback(
    async (files: FileList) => {
      const validFiles: File[] = []
      const errors: string[] = []

      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const validation = validateOBJFile(file)
        if (validation.valid) {
          validFiles.push(file)
        } else {
          errors.push(`${file.name}: ${validation.error}`)
        }
      }

      if (errors.length > 0) {
        setErrorMessage(errors.join('\n'))
        setTimeout(() => setErrorMessage(null), 5000)
      }

      if (validFiles.length === 0) return

      const remainingSlots = 8 - fragments.length
      if (remainingSlots <= 0) {
        setErrorMessage('最多只能上传8个碎片')
        setTimeout(() => setErrorMessage(null), 3000)
        return
      }

      if (validFiles.length > remainingSlots) {
        setErrorMessage(
          `只能再上传 ${remainingSlots} 个碎片，已自动截取前 ${remainingSlots} 个文件`
        )
        setTimeout(() => setErrorMessage(null), 4000)
      }

      const filesToLoad = validFiles.slice(0, remainingSlots)

      for (let i = 0; i < filesToLoad.length; i++) {
        const file = filesToLoad[i]
        const tempId = `loading_${Date.now()}_${i}`

        const ringRadius = 10
        const angle = Math.random() * Math.PI * 2
        const r = ringRadius * (0.7 + Math.random() * 0.3)
        const randomPos = new THREE.Vector3(
          Math.cos(angle) * r,
          Math.random() * 2 - 1,
          Math.sin(angle) * r
        )

        addFragment({
          id: tempId,
          name: file.name,
          size: file.size,
          file,
          geometry: null,
          position: randomPos,
          rotation: new THREE.Euler(
            (Math.random() - 0.5) * Math.PI * 0.3,
            Math.random() * Math.PI * 2,
            (Math.random() - 0.5) * Math.PI * 0.3
          ),
          scale: new THREE.Vector3(1, 1, 1),
          thumbnail: null,
          edgePoints: [],
          curvatures: []
        })

        try {
          setLoadingStatus(`正在加载: ${file.name}`)
          const result = await loadOBJFile(file)

          setFragmentGeometry(tempId, result.geometry)
          setFragmentEdgeData(tempId, result.edgePoints, result.curvatures)
          setFragmentThumbnail(tempId, result.thumbnail)
          setFragmentAnimating(tempId, true)

          setTimeout(() => {
            setFragmentAnimating(tempId, false)
          }, 400)
        } catch (err) {
          setErrorMessage(`加载 ${file.name} 失败: ${(err as Error).message}`)
          setTimeout(() => setErrorMessage(null), 5000)
        }
      }

      setLoadingStatus(null)
    },
    [
      fragments.length,
      addFragment,
      setFragmentGeometry,
      setFragmentEdgeData,
      setFragmentThumbnail,
      setFragmentAnimating
    ]
  )

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-title">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="#e94560"
            style={{ marginRight: '10px' }}
          >
            <path d="M12 2C9.5 2 7.5 4 7.5 6.5c0 .9.3 1.7.8 2.4C6.5 9.7 5 11.6 5 14c0 3.3 3.1 6 7 6s7-2.7 7-6c0-2.4-1.5-4.3-3.3-5.1.5-.7.8-1.5.8-2.4C16.5 4 14.5 2 12 2zm0 18c-2.8 0-5-1.8-5-4 0-1.7 1.2-3.1 2.8-3.7l.5-.2.2-.5c.3-.6.5-1.3.5-2.1 0-1.4 1.1-2.5 2.5-2.5s2.5 1.1 2.5 2.5c0 .8.2 1.5.5 2.1l.2.5.5.2C15.8 12.9 17 14.3 17 16c0 2.2-2.2 4-5 4z" />
          </svg>
          <h1>陶器碎片虚拟拼接系统</h1>
        </div>
        <div className="header-info">
          {isPreviewMode && (
            <span className="preview-badge">预览模式</span>
          )}
          <span className="fragment-total">
            碎片: {fragments.length}/8
          </span>
        </div>
      </header>

      <main className="app-main">
        <div className="scene-container">
          <ThreeScene sceneRef={sceneRef} />

          <div className="scene-overlay">
            <div className="scene-hints">
              <div className="hint-item">
                <span className="key">鼠标拖拽</span>
                <span>移动选中碎片</span>
              </div>
              <div className="hint-item">
                <span className="key">Shift+拖拽</span>
                <span>调整高度</span>
              </div>
              <div className="hint-item">
                <span className="key">滚轮</span>
                <span>旋转碎片 (15°)</span>
              </div>
              <div className="hint-item">
                <span className="key">←→↑↓</span>
                <span>微调旋转 (1°)</span>
              </div>
              <div className="hint-item">
                <span className="key">右键拖拽</span>
                <span>旋转视角</span>
              </div>
            </div>
          </div>

          {loadingStatus && (
            <div className="loading-overlay">
              <div className="loading-spinner" />
              <p>{loadingStatus}</p>
            </div>
          )}
        </div>

        <aside className="sidebar">
          <FragmentList onFilesSelected={handleFilesSelected} />
          <MatchPanel />
          <ExportPanel getSceneScreenshot={getSceneScreenshot} />
        </aside>
      </main>

      {errorMessage && (
        <div className="error-toast" onClick={() => setErrorMessage(null)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
          </svg>
          <span style={{ whiteSpace: 'pre-line' }}>{errorMessage}</span>
        </div>
      )}
    </div>
  )
}

export default App
