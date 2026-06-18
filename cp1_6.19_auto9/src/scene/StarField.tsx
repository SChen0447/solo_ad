import React, { useRef, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { useStarStore } from '../store'
import { StarSystem } from '../particles/StarSystem'
import * as THREE from 'three'

export const StarField: React.FC = () => {
  const starSystemRef = useRef<StarSystem | null>(null)
  const starsPointsRef = useRef<THREE.Points>(null)
  const trailPointsRef = useRef<THREE.Points>(null)
  const { size } = useThree()

  const starCount = useStarStore((state) => state.starCount)
  const speedMultiplier = useStarStore((state) => state.speedMultiplier)
  const orbitScale = useStarStore((state) => state.orbitScale)
  const trailLength = useStarStore((state) => state.trailLength)
  const colorGradientMode = useStarStore((state) => state.colorGradientMode)

  const starSystem = useMemo(() => {
    return new StarSystem(starCount)
  }, [])

  useEffect(() => {
    starSystemRef.current = starSystem
  }, [starSystem])

  useEffect(() => {
    starSystem.setStarCount(starCount)
  }, [starCount, starSystem])

  useEffect(() => {
    starSystem.setSpeedMultiplier(speedMultiplier)
  }, [speedMultiplier, starSystem])

  useEffect(() => {
    starSystem.setOrbitScale(orbitScale)
  }, [orbitScale, starSystem])

  useEffect(() => {
    starSystem.setTrailLength(trailLength)
  }, [trailLength, starSystem])

  useEffect(() => {
    starSystem.setColorGradientMode(colorGradientMode)
  }, [colorGradientMode, starSystem])

  useFrame((_, delta) => {
    if (starSystemRef.current) {
      starSystemRef.current.update(delta)
    }
  })

  return (
    <group>
      <points ref={trailPointsRef} geometry={starSystem.getTrailGeometry()} material={starSystem.getTrailMaterial()} />
      <points ref={starsPointsRef} geometry={starSystem.getStarGeometry()} material={starSystem.getStarMaterial()} />
    </group>
  )
}
