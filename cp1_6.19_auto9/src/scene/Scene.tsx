import React, { useRef, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useStarStore } from '../store'
import { StarField } from './StarField'
import { BackgroundStars } from './BackgroundStars'
import * as THREE from 'three'

interface CameraControllerProps {
  controlsRef: React.RefObject<any>
}

const CameraController: React.FC<CameraControllerProps> = ({ controlsRef }) => {
  const viewResetTrigger = useStarStore((state) => state.viewResetTrigger)
  const { camera } = useThree()
  const animatingRef = useRef(false)
  const startPosRef = useRef(new THREE.Vector3())
  const startTargetRef = useRef(new THREE.Vector3())
  const targetPosRef = useRef(new THREE.Vector3(0, 0, 30))
  const targetLookAtRef = useRef(new THREE.Vector3(0, 0, 0))
  const animationTimeRef = useRef(0)
  const animationDuration = 1.0

  useEffect(() => {
    if (viewResetTrigger > 0) {
      startPosRef.current.copy(camera.position)
      if (controlsRef.current) {
        startTargetRef.current.copy(controlsRef.current.target)
      }
      animatingRef.current = true
      animationTimeRef.current = 0
    }
  }, [viewResetTrigger, camera, controlsRef])

  useFrame((_, delta) => {
    if (animatingRef.current) {
      animationTimeRef.current += delta
      const t = Math.min(animationTimeRef.current / animationDuration, 1)
      
      const easeOut = 1 - Math.pow(1 - t, 3)
      
      camera.position.lerpVectors(startPosRef.current, targetPosRef.current, easeOut)
      
      if (controlsRef.current) {
        controlsRef.current.target.lerpVectors(startTargetRef.current, targetLookAtRef.current, easeOut)
        controlsRef.current.update()
      }
      
      if (t >= 1) {
        animatingRef.current = false
      }
    }
  })

  return null
}

interface FPSMonitorProps {
  onFpsUpdate: (fps: number) => void
  onPerformanceLow: (low: boolean) => void
}

const FPSMonitor: React.FC<FPSMonitorProps> = ({ onFpsUpdate, onPerformanceLow }) => {
  const framesRef = useRef(0)
  const lastTimeRef = useRef(performance.now())
  const lowFpsFramesRef = useRef(0)

  useFrame(() => {
    framesRef.current++
    const now = performance.now()
    const elapsed = now - lastTimeRef.current

    if (elapsed >= 500) {
      const fps = (framesRef.current * 1000) / elapsed
      onFpsUpdate(fps)

      if (fps < 20) {
        lowFpsFramesRef.current++
        if (lowFpsFramesRef.current >= 3) {
          onPerformanceLow(true)
        }
      } else if (fps > 25) {
        lowFpsFramesRef.current = 0
        onPerformanceLow(false)
      }

      framesRef.current = 0
      lastTimeRef.current = now
    }
  })

  return null
}

interface SceneProps {
  blurIntensity: number
}

const SceneContent: React.FC<SceneProps> = ({ blurIntensity }) => {
  const controlsRef = useRef<any>(null)
  const setFps = useStarStore((state) => state.setFps)
  const setPerformanceLow = useStarStore((state) => state.setPerformanceLow)
  const { scene } = useThree()

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2
    canvas.height = 512
    const ctx = canvas.getContext('2d')
    if (ctx) {
      const gradient = ctx.createLinearGradient(0, 0, 0, 512)
      gradient.addColorStop(0, '#1a1a3e')
      gradient.addColorStop(1, '#050510')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 2, 512)
    }
    const texture = new THREE.CanvasTexture(canvas)
    texture.needsUpdate = true
    scene.background = texture
  }, [scene])

  return (
    <>
      <CameraController controlsRef={controlsRef} />
      <FPSMonitor onFpsUpdate={setFps} onPerformanceLow={setPerformanceLow} />
      
      <ambientLight intensity={0.1} />
      
      <BackgroundStars count={300} />
      <StarField />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping={true}
        dampingFactor={0.05}
        rotateSpeed={0.5}
        minDistance={5}
        maxDistance={50}
        autoRotate={false}
      />

      {blurIntensity > 0 && (
        <EffectComposer>
          <Bloom
            intensity={blurIntensity * 1.5}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur={true}
            radius={0.5}
          />
        </EffectComposer>
      )}
    </>
  )
}

export const Scene: React.FC = () => {
  const blurIntensity = useStarStore((state) => state.blurIntensity)

  return (
    <Canvas
      camera={{ position: [0, 0, 30], fov: 60, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      style={{ width: '100%', height: '100%' }}
      dpr={[1, 2]}
    >
      <SceneContent blurIntensity={blurIntensity} />
    </Canvas>
  )
}
