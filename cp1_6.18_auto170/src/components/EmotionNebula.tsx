import { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useEmotionStore } from '../store/emotionStore'
import { createParticleData, updateParticleData } from '../utils/particleEngine'

export default function EmotionNebula() {
  const particlesRef = useRef<THREE.Points>(null)
  const groupRef = useRef<THREE.Group>(null)
  const timeRef = useRef(0)
  const lastTimeRef = useRef(0)
  
  const { emotions, particleParams } = useEmotionStore()
  const { count, speedMultiplier, baseColor } = particleParams

  const particleData = useMemo(() => createParticleData(count), [count])

  const [positions, colors, sizes] = useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(particleData.positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(particleData.colors, 3))
    
    const sizeArray = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      sizeArray[i] = 0.05
    }
    geometry.setAttribute('size', new THREE.BufferAttribute(sizeArray, 1))
    
    return [particleData.positions, particleData.colors, sizeArray]
  }, [count, particleData])

  useFrame((state, delta) => {
    timeRef.current += delta
    
    const dt = timeRef.current - lastTimeRef.current
    lastTimeRef.current = timeRef.current
    
    updateParticleData(
      particleData,
      emotions,
      baseColor,
      timeRef.current,
      speedMultiplier,
      dt
    )

    if (particlesRef.current) {
      const positionAttr = particlesRef.current.geometry.getAttribute('position') as THREE.BufferAttribute
      const colorAttr = particlesRef.current.geometry.getAttribute('color') as THREE.BufferAttribute
      const sizeAttr = particlesRef.current.geometry.getAttribute('size') as THREE.BufferAttribute
      
      positionAttr.array.set(particleData.positions)
      colorAttr.array.set(particleData.colors)
      sizeAttr.array.set(particleData.sizes)
      
      positionAttr.needsUpdate = true
      colorAttr.needsUpdate = true
      sizeAttr.needsUpdate = true
    }
    
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (2 * Math.PI / 30) * speedMultiplier * 0.5
    }
  })

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      <group ref={groupRef}>
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={count}
              array={positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={count}
              array={colors}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-size"
              count={count}
              array={sizes}
              itemSize={1}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.08}
            vertexColors
            transparent
            opacity={0.9}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      </group>
      
      <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={0.5} />
      
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={15}
        enablePan={false}
      />
      
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}
