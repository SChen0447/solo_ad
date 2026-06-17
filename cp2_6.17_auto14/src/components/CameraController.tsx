import { useRef, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, VIEW_PRESETS, ViewPreset } from '@/store/useStore'

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export default function CameraController() {
  const controlsRef = useRef<any>(null)
  const currentView = useStore((s) => s.currentView)
  const setCurrentView = useStore((s) => s.setCurrentView)
  const { camera } = useThree()

  const isAnimating = useRef(false)
  const targetPos = useRef(new THREE.Vector3(0, 5, 20))
  const startPos = useRef(new THREE.Vector3())
  const animProgress = useRef(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const map: Record<string, ViewPreset> = {
        '1': 'top45',
        '2': 'side90',
        '3': 'bottom30',
      }
      const view = map[e.key]
      if (view) setCurrentView(view)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [setCurrentView])

  useEffect(() => {
    const preset = VIEW_PRESETS[currentView]
    targetPos.current.set(...preset.position)
    startPos.current.copy(camera.position)
    animProgress.current = 0
    isAnimating.current = true
    if (controlsRef.current) {
      controlsRef.current.enabled = false
    }
  }, [currentView, camera])

  useFrame((_, delta) => {
    if (isAnimating.current) {
      animProgress.current = Math.min(1, animProgress.current + delta / 0.8)
      const t = easeOutCubic(animProgress.current)
      camera.position.lerpVectors(startPos.current, targetPos.current, t)
      camera.lookAt(0, 0, 0)
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0)
        controlsRef.current.update()
      }
      if (animProgress.current >= 1) {
        isAnimating.current = false
        if (controlsRef.current) {
          controlsRef.current.enabled = true
        }
      }
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={5}
      maxDistance={40}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={(5 * Math.PI) / 6}
      enablePan
      panSpeed={0.5}
    />
  )
}
