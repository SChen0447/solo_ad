import { useRef, useMemo, useEffect, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text } from '@react-three/drei'
import * as THREE from 'three'
import type { FragmentInfo, Annotation, StageType } from '../App'
import { loadModels, getFragmentInfo } from '../utils/modelLoader'

interface Scene3DProps {
  currentStage: StageType
  selectedFragmentId: string | null
  onFragmentSelect: (fragment: FragmentInfo | null) => void
  overlayMode: boolean
  transparency: { fragments: number; restored: number; complete: number }
  annotations: Annotation[]
  onAddAnnotation: (annotation: Annotation) => void
}

function ModelGroup({
  stage,
  visible,
  opacity,
  color,
  onFragmentClick,
  selectedId,
}: {
  stage: 'fragments' | 'restored' | 'complete'
  visible: boolean
  opacity: number
  color?: string
  onFragmentClick: (fragmentId: string) => void
  selectedId: string | null
}) {
  const groupRef = useRef<THREE.Group>(null)
  const targetOpacity = useRef(opacity / 100)
  const [highlightedId, setHighlightedId] = useState<string | null>(null)

  const models = useMemo(() => loadModels(), [])

  useEffect(() => {
    if (!groupRef.current) return
    const model = models[stage]

    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0])
    }

    const cloned = model.clone(true)

    if (color) {
      cloned.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = new THREE.MeshStandardMaterial({
            color: color,
            transparent: true,
            opacity: 1,
          })
          child.material = mat
        }
      })
    }

    groupRef.current.add(cloned)
  }, [stage, models, color])

  useEffect(() => {
    targetOpacity.current = opacity / 100
  }, [opacity])

  useEffect(() => {
    if (selectedId && stage === 'fragments') {
      setHighlightedId(selectedId)
      const timer = setTimeout(() => setHighlightedId(null), 2000)
      return () => clearTimeout(timer)
    }
  }, [selectedId, stage])

  useFrame(() => {
    if (!groupRef.current) return

    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mat = child.material as THREE.MeshStandardMaterial
        const currentOpacity = mat.opacity
        const targetOp = visible ? targetOpacity.current : 0
        mat.opacity = currentOpacity + (targetOp - currentOpacity) * 0.1
        mat.transparent = true
      }
    })

    if (stage === 'fragments' && highlightedId) {
      groupRef.current.traverse((child) => {
        if (
          child instanceof THREE.Mesh &&
          child.userData.fragmentId === highlightedId
        ) {
          const mat = child.material as THREE.MeshStandardMaterial
          mat.emissive = new THREE.Color(0xffffff)
          mat.emissiveIntensity = 0.5
        } else if (child instanceof THREE.Mesh && child.userData.isFragment) {
          const mat = child.material as THREE.MeshStandardMaterial
          mat.emissiveIntensity = 0
        }
      })
    } else if (stage === 'fragments') {
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.userData.isFragment) {
          const mat = child.material as THREE.MeshStandardMaterial
          mat.emissiveIntensity = 0
        }
      })
    }
  })

  const handleClick = useCallback(
    (event: any) => {
      if (stage !== 'fragments') return
      event.stopPropagation()

      let target: THREE.Object3D | null = event.object
      while (target && !target.userData.fragmentId) {
        target = target.parent
      }

      if (target && target.userData.fragmentId) {
        onFragmentClick(target.userData.fragmentId)
      }
    },
    [stage, onFragmentClick]
  )

  return (
    <group ref={groupRef} onClick={handleClick}>
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[3, 64]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  )
}

function Annotations({ annotations }: { annotations: Annotation[] }) {
  return (
    <>
      {annotations.map((annotation) => (
        <group
          key={annotation.id}
          position={[
            annotation.position.x,
            annotation.position.y,
            annotation.position.z,
          ]}
        >
          <Text
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="middle"
          >
            {annotation.content}
          </Text>
          <mesh position={[0, -0.2, 0]}>
            <sphereGeometry args={[0.03, 16, 16]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
        </group>
      ))}
    </>
  )
}

function AutoRotate({ enabled }: { enabled: boolean }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)

  useEffect(() => {
    if (controlsRef.current && enabled) {
      controlsRef.current.autoRotate = true
      controlsRef.current.autoRotateSpeed = 0.2 * 60 / (2 * Math.PI)
    }
  }, [enabled])

  useFrame(() => {
    if (enabled && camera) {
      const radius = 5
      const angle = Date.now() * 0.0002
      camera.position.x = Math.cos(angle) * radius
      camera.position.z = Math.sin(angle) * radius
      camera.position.y = 3
      camera.lookAt(0, 0.5, 0)
    }
  })

  return null
}

function SceneContent({
  currentStage,
  selectedFragmentId,
  onFragmentSelect,
  overlayMode,
  transparency,
  annotations,
  onAddAnnotation,
}: Scene3DProps) {
  const [addingAnnotation, setAddingAnnotation] = useState(false)

  const handleFragmentClick = useCallback(
    (fragmentId: string) => {
      const info = getFragmentInfo(fragmentId)
      if (info) {
        onFragmentSelect({
          id: info.id,
          name: info.name,
          material: info.material,
          position: info.excavatedPosition,
          region: info.region,
        })
      }
    },
    [onFragmentSelect]
  )

  const handleSceneClick = useCallback(
    (event: any) => {
      if (!addingAnnotation) return
      event.stopPropagation()

      const point = event.point
      const content = prompt('请输入标注内容（最多20字）：', '')
      if (content && content.length <= 20) {
        onAddAnnotation({
          id: `anno-${Date.now()}`,
          content,
          position: { x: point.x, y: point.y, z: point.z },
        })
      }
      setAddingAnnotation(false)
    },
    [addingAnnotation, onAddAnnotation]
  )

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'n' || e.key === 'N') {
        setAddingAnnotation(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight position={[-3, 2, -3]} intensity={0.3} />
      <directionalLight position={[0, 3, -5]} intensity={0.2} />

      {overlayMode ? (
        <>
          <ModelGroup
            stage="fragments"
            visible={true}
            opacity={transparency.fragments}
            color="#ef4444"
            onFragmentClick={handleFragmentClick}
            selectedId={selectedFragmentId}
          />
          <ModelGroup
            stage="restored"
            visible={true}
            opacity={transparency.restored}
            color="#3b82f6"
            onFragmentClick={handleFragmentClick}
            selectedId={selectedFragmentId}
          />
          <ModelGroup
            stage="complete"
            visible={true}
            opacity={transparency.complete}
            color="#22c55e"
            onFragmentClick={handleFragmentClick}
            selectedId={selectedFragmentId}
          />
          <AutoRotate enabled={overlayMode} />
        </>
      ) : (
        <>
          <ModelGroup
            stage="fragments"
            visible={currentStage === 'fragments'}
            opacity={100}
            onFragmentClick={handleFragmentClick}
            selectedId={selectedFragmentId}
          />
          <ModelGroup
            stage="restored"
            visible={currentStage === 'restored'}
            opacity={100}
            onFragmentClick={handleFragmentClick}
            selectedId={selectedFragmentId}
          />
          <ModelGroup
            stage="complete"
            visible={currentStage === 'complete'}
            opacity={100}
            onFragmentClick={handleFragmentClick}
            selectedId={selectedFragmentId}
          />
        </>
      )}

      <Annotations annotations={annotations} />

      {!overlayMode && (
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={1.5}
          maxDistance={9}
          minPolarAngle={0.2}
          maxPolarAngle={Math.PI / 1.5}
          enablePan={true}
          panSpeed={0.5}
        />
      )}

      <mesh onClick={handleSceneClick}>
        <planeGeometry args={[10, 10]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>
    </>
  )
}

function Scene3D(props: Scene3DProps) {
  return (
    <Canvas
      camera={{ position: [5, 3, 5], fov: 50 }}
      shadows
      gl={{ antialias: true, alpha: false }}
      style={{ background: '#0f172a' }}
    >
      <color attach="background" args={['#0f172a']} />
      <fog attach="fog" args={['#0f172a', 8, 20]} />
      <SceneContent {...props} />
    </Canvas>
  )
}

export default Scene3D
