import { useRef, useMemo, useEffect } from 'react'
import { useFrame, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { FragmentData } from '../store/appStore'

interface FragmentProps {
  fragment: FragmentData
  matchScores: { otherId: string; score: number }[]
  onPointerDown: (e: ThreeEvent<PointerEvent>, id: string) => void
  onMatchLabelClick: (otherId: string) => void
  isDragging: boolean
}

export function Fragment({
  fragment,
  matchScores,
  onPointerDown,
  onMatchLabelClick,
  isDragging
}: FragmentProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const outlineRef = useRef<THREE.LineSegments>(null)
  const axesRef = useRef<THREE.Group>(null)
  const shadowLineRef = useRef<THREE.Line>(null)

  const edgesGeometry = useMemo(() => {
    if (!fragment.geometry) return null
    return new THREE.EdgesGeometry(fragment.geometry, 20)
  }, [fragment.geometry])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.position.copy(fragment.position)
      meshRef.current.rotation.copy(fragment.rotation)
      meshRef.current.scale.copy(fragment.scale)
    }
    if (outlineRef.current) {
      outlineRef.current.position.copy(fragment.position)
      outlineRef.current.rotation.copy(fragment.rotation)
      outlineRef.current.scale.copy(fragment.scale)
    }
    if (axesRef.current) {
      axesRef.current.position.copy(fragment.position)
      axesRef.current.rotation.copy(fragment.rotation)
    }
    if (shadowLineRef.current && meshRef.current) {
      const positions = shadowLineRef.current.geometry.attributes.position as THREE.BufferAttribute
      positions.setXYZ(0, meshRef.current.position.x, meshRef.current.position.y, meshRef.current.position.z)
      positions.setXYZ(1, meshRef.current.position.x, 0, meshRef.current.position.z)
      positions.needsUpdate = true
      shadowLineRef.current.computeLineDistances()
    }
  })

  useEffect(() => {
    if (fragment.isAnimating && meshRef.current) {
      const startPos = meshRef.current.position.clone()
      const targetPos = fragment.position.clone()
      const startRot = meshRef.current.rotation.clone()
      const targetRot = fragment.rotation.clone()
      const startTime = Date.now()
      const duration = 300

      const animate = () => {
        const elapsed = Date.now() - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)

        if (meshRef.current) {
          meshRef.current.position.lerpVectors(startPos, targetPos, eased)
          meshRef.current.rotation.set(
            startRot.x + (targetRot.x - startRot.x) * eased,
            startRot.y + (targetRot.y - startRot.y) * eased,
            startRot.z + (targetRot.z - startRot.z) * eased
          )
        }

        if (progress < 1) {
          requestAnimationFrame(animate)
        }
      }
      animate()
    }
  }, [fragment.isAnimating])

  if (!fragment.geometry) return null

  const outlineColor = fragment.selected ? '#e94560' : '#ffffff'
  const outlineOpacity = fragment.selected ? 1 : 0.3

  const getScoreColor = (score: number) => {
    if (score > 80) return '#44ff88'
    if (score >= 50) return '#ffcc44'
    return '#ff4444'
  }

  return (
    <group>
      <mesh
        ref={meshRef}
        onPointerDown={(e) => onPointerDown(e, fragment.id)}
        castShadow
        receiveShadow
      >
        <primitive object={fragment.geometry} attach="geometry" />
        <meshStandardMaterial
          color="#d4a574"
          roughness={0.7}
          metalness={0.1}
          side={THREE.DoubleSide}
          emissive={fragment.selected ? '#221111' : '#000000'}
          emissiveIntensity={fragment.selected ? 0.3 : 0}
        />
      </mesh>

      {edgesGeometry && (
        <lineSegments ref={outlineRef} geometry={edgesGeometry}>
          <lineBasicMaterial
            color={outlineColor}
            transparent
            opacity={outlineOpacity}
          />
        </lineSegments>
      )}

      {fragment.selected && (
        <group ref={axesRef}>
          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([0, 0, 0, 2, 0, 0])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#ff4444" linewidth={2} />
          </line>
          <mesh position={[2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.08, 0.25, 8]} />
            <meshBasicMaterial color="#ff4444" />
          </mesh>

          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([0, 0, 0, 0, 2, 0])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#44ff44" linewidth={2} />
          </line>
          <mesh position={[0, 2, 0]}>
            <coneGeometry args={[0.08, 0.25, 8]} />
            <meshBasicMaterial color="#44ff44" />
          </mesh>

          <line>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={2}
                array={new Float32Array([0, 0, 0, 0, 0, 2])}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color="#4488ff" linewidth={2} />
          </line>
          <mesh position={[0, 0, 2]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.08, 0.25, 8]} />
            <meshBasicMaterial color="#4488ff" />
          </mesh>
        </group>
      )}

      {isDragging && (
        <line ref={shadowLineRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([
                fragment.position.x, fragment.position.y, fragment.position.z,
                fragment.position.x, 0, fragment.position.z
              ])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineDashedMaterial
            color="#8888aa"
            dashSize={0.2}
            gapSize={0.1}
            transparent
            opacity={0.6}
          />
        </line>
      )}

      {matchScores.map(({ otherId, score }) => (
        <Html
          key={otherId}
          position={[fragment.position.x, fragment.position.y + 2.5, fragment.position.z]}
          center
          style={{ pointerEvents: 'auto' }}
        >
          <div
            onClick={() => onMatchLabelClick(otherId)}
            style={{
              background: 'rgba(0,0,0,0.75)',
              color: getScoreColor(score),
              padding: '4px 12px',
              borderRadius: '8px',
              border: `2px solid ${getScoreColor(score)}`,
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: 'pointer',
              userSelect: 'none',
              whiteSpace: 'nowrap',
              transition: 'transform 0.15s ease',
              transform: 'scale(1)',
              boxShadow: `0 0 10px ${getScoreColor(score)}40`
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            {score}%
          </div>
        </Html>
      ))}
    </group>
  )
}
