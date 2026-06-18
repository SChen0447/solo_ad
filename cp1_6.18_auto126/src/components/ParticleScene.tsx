import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { ParticleSystem } from '../effects/ParticleSystem'
import { ParticleRenderer, SparkSystem } from '../effects/ParticleRenderer'
import { useParticleStore } from '../store'

interface ParticleSceneProps {
  particleSystemRef: React.MutableRefObject<ParticleSystem | null>
}

export function ParticleScene({ particleSystemRef }: ParticleSceneProps) {
  const particleRendererRef = useRef<ParticleRenderer | null>(null)
  const sparkSystemRef = useRef<SparkSystem | null>(null)
  const { scene } = useThree()

  const particleCount = useParticleStore((s) => s.particleCount)
  const particleSpeed = useParticleStore((s) => s.particleSpeed)
  const motionMode = useParticleStore((s) => s.motionMode)
  const previousMode = useParticleStore((s) => s.previousMode)
  const isTransitioning = useParticleStore((s) => s.isTransitioning)
  const transitionProgress = useParticleStore((s) => s.transitionProgress)
  const startColor = useParticleStore((s) => s.startColor)
  const endColor = useParticleStore((s) => s.endColor)
  const colorMode = useParticleStore((s) => s.colorMode)
  const sizeMode = useParticleStore((s) => s.sizeMode)
  const gravityPosition = useParticleStore((s) => s.gravityPosition)
  const isGravityActive = useParticleStore((s) => s.isGravityActive)
  const isExploding = useParticleStore((s) => s.isExploding)
  const explosionProgress = useParticleStore((s) => s.explosionProgress)
  const updateTransition = useParticleStore((s) => s.updateTransition)
  const updateExplosion = useParticleStore((s) => s.updateExplosion)

  useEffect(() => {
    const particleSystem = new ParticleSystem(particleCount)
    particleSystemRef.current = particleSystem

    const renderer = new ParticleRenderer(particleCount)
    particleRendererRef.current = renderer
    scene.add(renderer.getPoints())

    const sparkSystem = new SparkSystem()
    sparkSystemRef.current = sparkSystem
    scene.add(sparkSystem.getPoints())

    particleSystem.setSparkCallback((pos, color) => {
      sparkSystem.emit(pos, color, 20)
    })

    return () => {
      scene.remove(renderer.getPoints())
      scene.remove(sparkSystem.getPoints())
      renderer.dispose()
      sparkSystem.dispose()
    }
  }, [])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setParticleCount(particleCount)
    }
    if (particleRendererRef.current) {
      particleRendererRef.current.setCount(particleCount)
    }
  }, [particleCount])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setParticleSpeed(particleSpeed)
    }
  }, [particleSpeed])

  useEffect(() => {
    if (particleSystemRef.current && isTransitioning) {
      particleSystemRef.current.setMotionMode(motionMode, previousMode)
    }
  }, [motionMode])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setTransitionProgress(transitionProgress)
    }
  }, [transitionProgress])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setStartColor(startColor)
      particleSystemRef.current.setEndColor(endColor)
    }
  }, [startColor, endColor])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setColorMode(colorMode)
    }
  }, [colorMode])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setSizeMode(sizeMode)
    }
  }, [sizeMode])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setGravityPosition(gravityPosition)
    }
  }, [gravityPosition])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setIsGravityActive(isGravityActive)
    }
  }, [isGravityActive])

  useEffect(() => {
    if (particleSystemRef.current) {
      particleSystemRef.current.setIsExploding(isExploding)
      particleSystemRef.current.setExplosionProgress(explosionProgress)
    }
  }, [isExploding, explosionProgress])

  useFrame((_, dt) => {
    updateTransition(dt)
    updateExplosion(dt)

    if (particleSystemRef.current && particleRendererRef.current) {
      particleSystemRef.current.update(dt)
      particleRendererRef.current.updateGeometry(
        particleSystemRef.current.getData(),
        particleSystemRef.current.getCount()
      )
    }

    if (sparkSystemRef.current) {
      sparkSystemRef.current.update(dt)
    }
  })

  return null
}
