import { useEffect, useState, useCallback } from 'react'
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileTab, setMobileTab] = useState<'emotion' | 'sliders'>('emotion')

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) {
        setParticleCount(500)
      }
    }
    window.addEventListener('resize', handleResize)
    handleResize()
    return () => window.removeEventListener('resize', handleResize)
  }, [setIsMobile, setParticleCount])

  const toggleMobileMenu = useCallback(() => {
    setMobileMenuOpen((v) => !v)
  }, [])

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

      <EmotionPanel />
      <SliderPanel />
      <ViewIndicator />

      {isMobile && (
        <>
          <button
            className="mobile-menu-btn glass"
            onClick={toggleMobileMenu}
            style={{ color: EMOTION_CONFIGS[emotionMode].hex }}
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
          {mobileMenuOpen && (
            <div
              style={{
                position: 'fixed',
                bottom: '90px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px',
                zIndex: 25,
              }}
            >
              <button
                className="glass"
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  opacity: mobileTab === 'emotion' ? 1 : 0.5,
                  fontSize: '12px',
                }}
                onClick={() => setMobileTab('emotion')}
              >
                情绪
              </button>
              <button
                className="glass"
                style={{
                  padding: '6px 16px',
                  borderRadius: '20px',
                  border: 'none',
                  color: '#fff',
                  cursor: 'pointer',
                  opacity: mobileTab === 'sliders' ? 1 : 0.5,
                  fontSize: '12px',
                }}
                onClick={() => setMobileTab('sliders')}
              >
                调节
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
