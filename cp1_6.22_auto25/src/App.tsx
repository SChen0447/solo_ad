import { useState, useEffect, useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import ParticleNebula from './ParticleNebula'
import ButterflySwarm from './ButterflySwarm'
import { GestureController } from './GestureController'

function StarsBackground() {
  const starsRef = useRef<THREE.Points>(null)
  const count = 500

  const { positions, baseSizes } = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const sizes = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const radius = 50 + Math.random() * 50
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      pos[i3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i3 + 2] = radius * Math.cos(phi)

      sizes[i] = 0.5 + Math.random() * 1.5
    }

    return { positions: pos, baseSizes: sizes }
  }, [])

  useFrame(({ clock }) => {
    if (!starsRef.current) return

    const time = clock.getElapsedTime()

    starsRef.current.rotation.y = time * 0.01
  })

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={count}
          array={baseSizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.5}
        color="#ffffff"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}

function CameraController() {
  const { camera } = useThree()

  useEffect(() => {
    camera.position.set(0, 2, 15)
    camera.lookAt(0, 0, 0)
  }, [camera])

  useFrame(({ clock }) => {
    const time = clock.getElapsedTime()
    camera.position.x = Math.sin(time * 0.1) * 0.5
    camera.position.y = 2 + Math.sin(time * 0.15) * 0.3
    camera.lookAt(0, 0, 0)
  })

  return null
}

function Scene({ gestureValue }: { gestureValue: number }) {
  return (
    <>
      <CameraController />
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#8a2be2" />
      <StarsBackground />
      <ParticleNebula gestureValue={gestureValue} />
      <ButterflySwarm gestureValue={gestureValue} />
      <EffectComposer>
        <Bloom
          intensity={0.3}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

function GestureArc({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0.5)
  const springVelocityRef = useRef(0)

  useEffect(() => {
    const target = value
    let current = displayValue
    let velocity = springVelocityRef.current
    let animationId: number

    const animate = () => {
      const stiffness = 0.08
      const damping = 0.85

      const force = (target - current) * stiffness
      velocity = (velocity + force) * damping
      current += velocity

      if (Math.abs(target - current) < 0.001 && Math.abs(velocity) < 0.001) {
        current = target
        velocity = 0
      }

      setDisplayValue(current)
      springVelocityRef.current = velocity

      if (current !== target || velocity !== 0) {
        animationId = requestAnimationFrame(animate)
      }
    }

    animationId = requestAnimationFrame(animate)

    return () => cancelAnimationFrame(animationId)
  }, [value, displayValue])

  const arcLength = displayValue * 0.75
  const strokeWidth = 8

  return (
    <svg className="gesture-arc" viewBox="0 0 200 200">
      <defs>
        <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="rgba(0, 150, 255, 0.6)" />
          <stop offset="50%" stopColor="rgba(138, 43, 226, 0.6)" />
          <stop offset="100%" stopColor="rgba(255, 105, 180, 0.6)" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      
      <circle
        cx="100"
        cy="100"
        r="90"
        fill="none"
        stroke="rgba(255, 255, 255, 0.05)"
        strokeWidth={strokeWidth}
      />
      
      <circle
        cx="100"
        cy="100"
        r="90"
        fill="none"
        stroke="url(#arcGradient)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={`${arcLength * Math.PI * 180} ${Math.PI * 180}`}
        transform="rotate(-90 100 100)"
        filter="url(#glow)"
      />
    </svg>
  )
}

export default function App() {
  const [gestureValue, setGestureValue] = useState(0.5)
  const [fps, setFps] = useState(0)
  const [isKeyboardMode, setIsKeyboardMode] = useState(false)
  const gestureControllerRef = useRef<GestureController | null>(null)
  const [renderFps, setRenderFps] = useState(0)

  useEffect(() => {
    const controller = new GestureController((value) => {
      setGestureValue(value)
    })

    gestureControllerRef.current = controller

    controller.init().then((cameraAvailable) => {
      setIsKeyboardMode(!cameraAvailable)
    })

    const fpsInterval = setInterval(() => {
      if (controller) {
        setFps(controller.getFps())
      }
    }, 500)

    return () => {
      clearInterval(fpsInterval)
      controller.destroy()
    }
  }, [])

  useEffect(() => {
    let lastTime = performance.now()
    let frames = 0
    let animationId: number

    const updateFps = () => {
      frames++
      const now = performance.now()
      if (now - lastTime >= 1000) {
        setRenderFps(frames)
        frames = 0
        lastTime = now
      }
      animationId = requestAnimationFrame(updateFps)
    }

    animationId = requestAnimationFrame(updateFps)
    return () => cancelAnimationFrame(animationId)
  }, [])

  const handleClick = () => {
    if (gestureControllerRef.current) {
      gestureControllerRef.current.setTargetValue(0.5)
    }
  }

  return (
    <div className="canvas-container" onClick={handleClick}>
      <Canvas
        camera={{ position: [0, 2, 15], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0)
        }}
      >
        <Scene gestureValue={gestureValue} />
      </Canvas>

      <div className="ui-overlay">
        <GestureArc value={gestureValue} />

        <div className="gesture-display">
          <div className="gesture-value">{gestureValue.toFixed(2)}</div>
          <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.7 }}>
            手势值 | {isKeyboardMode ? '键盘模式' : '摄像头模式'}
          </div>
        </div>

        <div className="fps-counter">
          <div>渲染 FPS: {renderFps}</div>
          {!isKeyboardMode && <div>手势 FPS: {fps}</div>}
        </div>

        <div className="instruction">
          {isKeyboardMode 
            ? '空格键增加 / Shift键减少 手势值 | 点击屏幕重置' 
            : '张开/握紧手掌控制 | 点击屏幕重置'}
        </div>
      </div>
    </div>
  )
}
