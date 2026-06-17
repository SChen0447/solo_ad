import { useEffect, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import ParticleSystem from '@/components/ParticleSystem'
import CameraController from '@/components/CameraController'
import EmotionPanel from '@/components/EmotionPanel'
import SliderPanel from '@/components/SliderPanel'
import ViewIndicator from '@/components/ViewIndicator'
import { useStore, EMOTION_CONFIGS } from '@/store/useStore'

export default function App() {
  const isMobile = useStore((s) => s.isMobile)
  const setIsMobile = useStore((s) => s.setIsMobile)
  const setParticleCount = useStore((s) => s.setParticleCount)
  const emotionMode = useStore((s) => s.emotionMode)
  const mobileMenuOpen = useStore((s) => s.mobileMenuOpen)
  const toggleMobileMenu = useStore((s) => s.toggleMobileMenu)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const handleResize = () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
      debounceRef.current = setTimeout(() => {
        const mobile = window.innerWidth < 768
        setIsMobile(mobile)
        if (mobile) {
          setParticleCount(500)
        } else {
          setParticleCount(1000)
        }
      }, 200)
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => {
      window.removeEventListener('resize', handleResize)
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [setIsMobile, setParticleCount])

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#000', position: 'relative' }}>
      <Canvas
        camera={{ position: [0, 5, 20], fov: 60, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        style={{ position: 'absolute', top: 0, left: 0 }}
        onCreated={({ raycaster }) => {
          raycaster.params.Points = { threshold: 0.5 }
        }}
      >
        <ParticleSystem />
        <CameraController />
      </Canvas>

      <EmotionPanel mobileOpen={isMobile && mobileMenuOpen} />
      <SliderPanel mobileOpen={isMobile && mobileMenuOpen} />
      <ViewIndicator />

      {isMobile && (
        <button
          className="mobile-menu-btn glass"
          onClick={toggleMobileMenu}
          style={{ color: EMOTION_CONFIGS[emotionMode].hex }}
        >
          {mobileMenuOpen ? '✕' : '☰'}
        </button>
      )}
    </div>
  )
}
