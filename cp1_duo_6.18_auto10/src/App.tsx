import { useRef, useCallback } from 'react'
import * as THREE from 'three'
import ModelView from './components/ModelView'
import ControlPanel from './components/ControlPanel'
import SnapshotGrid from './components/SnapshotGrid'
import { useStore } from './store/useStore'
import { ColorScheme } from './utils/colorUtils'

const App = () => {
  const { showToast, toastMessage, shadeColor, poleColor, baseColor } = useStore()
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)

  const handleRendererReady = useCallback((
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera
  ) => {
    rendererRef.current = renderer
    sceneRef.current = scene
    cameraRef.current = camera
  }, [])

  const generateThumbnail = useCallback((colors?: ColorScheme): string => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) {
      return generateSimpleThumbnail(colors || { shade: shadeColor, pole: poleColor, base: baseColor })
    }

    const targetColors = colors || { shade: shadeColor, pole: poleColor, base: baseColor }

    const originalColors: Record<string, string> = {}
    sceneRef.current.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.material && (mesh.name === 'shade' || mesh.name === 'pole' || mesh.name === 'base')) {
        const mat = mesh.material as THREE.MeshStandardMaterial
        originalColors[mesh.uuid] = mat.color.getStyle()
        if (mesh.name === 'shade') mat.color.set(targetColors.shade)
        else if (mesh.name === 'pole') mat.color.set(targetColors.pole)
        else if (mesh.name === 'base') mat.color.set(targetColors.base)
      }
    })

    const thumbnailCamera = cameraRef.current.clone() as THREE.PerspectiveCamera
    thumbnailCamera.position.set(0, 5, 5)
    thumbnailCamera.lookAt(0, 1, 0)

    const size = 120
    const originalSize = new THREE.Vector2()
    rendererRef.current.getSize(originalSize)
    rendererRef.current.setSize(size, size)

    rendererRef.current.render(sceneRef.current, thumbnailCamera)
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png')

    rendererRef.current.setSize(originalSize.x, originalSize.y)

    sceneRef.current.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (mesh.material && originalColors[mesh.uuid]) {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.color.set(originalColors[mesh.uuid])
      }
    })

    return dataUrl
  }, [shadeColor, poleColor, baseColor])

  const generateSimpleThumbnail = (colors: ColorScheme): string => {
    const canvas = document.createElement('canvas')
    canvas.width = 120
    canvas.height = 120
    const ctx = canvas.getContext('2d')!

    const gradient = ctx.createLinearGradient(0, 0, 0, 120)
    gradient.addColorStop(0, '#1a1a2e')
    gradient.addColorStop(1, '#16213e')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 120, 120)

    ctx.save()
    ctx.translate(60, 70)

    ctx.fillStyle = colors.base
    ctx.beginPath()
    ctx.ellipse(0, 35, 25, 8, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillRect(-25, 28, 50, 8)

    ctx.fillStyle = colors.pole
    ctx.fillRect(-3, -30, 6, 60)

    ctx.fillStyle = colors.shade
    ctx.beginPath()
    ctx.moveTo(-15, -40)
    ctx.lineTo(15, -40)
    ctx.lineTo(25, -25)
    ctx.lineTo(-25, -25)
    ctx.closePath()
    ctx.fill()

    ctx.beginPath()
    ctx.ellipse(0, -40, 15, 5, 0, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()

    return canvas.toDataURL('image/png')
  }

  return (
    <div style={styles.app}>
      <div style={styles.canvasContainer}>
        <ModelView
          shadeColor={shadeColor}
          poleColor={poleColor}
          baseColor={baseColor}
          onRendererReady={handleRendererReady}
        />
      </div>

      <ControlPanel onGenerateThumbnail={() => generateThumbnail()} />

      <SnapshotGrid />

      {showToast && (
        <div className="toast">
          {toastMessage}
        </div>
      )}
    </div>
  )
}

const styles = {
  app: {
    width: '100%',
    height: '100%',
    background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)',
    position: 'relative' as const,
    overflow: 'hidden'
  },
  canvasContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  }
}

export default App
