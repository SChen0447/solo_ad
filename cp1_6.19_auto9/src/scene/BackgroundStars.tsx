import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

interface BackgroundStarsProps {
  count?: number
}

export const BackgroundStars: React.FC<BackgroundStarsProps> = ({ count = 300 }) => {
  const pointsRef = useRef<THREE.Points>(null)
  const { size } = useThree()

  const [positions, sizes, phases, baseAlphas] = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const siz = new Float32Array(count)
    const pha = new Float32Array(count)
    const alp = new Float32Array(count)

    for (let i = 0; i < count; i++) {
      const radius = 60 + Math.random() * 40
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)

      pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = radius * Math.cos(phi)

      siz[i] = 1 + Math.random() * 2
      pha[i] = Math.random() * Math.PI * 2
      alp[i] = 0.3 + Math.random() * 0.5
    }

    return [pos, siz, pha, alp]
  }, [count])

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute float aSize;
        attribute float aPhase;
        attribute float aBaseAlpha;
        
        varying float vAlpha;
        varying float vPhase;
        
        uniform float uTime;
        uniform float uPixelRatio;
        
        void main() {
          vPhase = aPhase;
          
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          
          float twinkle = 0.5 + 0.5 * sin(uTime * 2.0 + aPhase);
          vAlpha = aBaseAlpha * (0.6 + 0.4 * twinkle);
          
          gl_PointSize = aSize * uPixelRatio * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          
          if (dist > 0.5) {
            discard;
          }
          
          float alpha = (1.0 - dist * 2.0) * vAlpha;
          gl_FragColor = vec4(1.0, 1.0, 1.0, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  }, [])

  useFrame((state) => {
    if (shaderMaterial.uniforms) {
      shaderMaterial.uniforms.uTime.value = state.clock.elapsedTime
    }
  })

  useEffect(() => {
    if (shaderMaterial.uniforms) {
      shaderMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2)
    }
  }, [size, shaderMaterial])

  return (
    <points ref={pointsRef} material={shaderMaterial}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-aSize"
          count={count}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aPhase"
          count={count}
          array={phases}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-aBaseAlpha"
          count={count}
          array={baseAlphas}
          itemSize={1}
        />
      </bufferGeometry>
    </points>
  )
}
