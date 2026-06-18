import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Canvas, useThree, ThreeEvent } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { Fragment } from './Fragment'
import { MatchHighlight } from './MatchHighlight'
import { MergedModel } from './MergedModel'
import { useAppStore, FragmentData, MatchResult } from '../store/appStore'
import { MatchingEngine } from '../engine/MatchingEngine'

interface ThreeSceneProps {
  sceneRef?: React.MutableRefObject<THREE.Scene | null>
}

function GroundAndLighting() {
  const ringPoints = useMemo(() => {
    const points: THREE.Vector3[] = []
    const ringRadius = 10
    const segments = 128
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2
      points.push(
        new THREE.Vector3(
          Math.cos(angle) * ringRadius,
          0,
          Math.sin(angle) * ringRadius
        )
      )
    }
    return points
  }, [])

  const ringGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(ringPoints)
  }, [ringPoints])

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight
        position={[10, 15, 10]}
        color="#ffaa66"
        intensity={0.8}
        distance={50}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight
        position={[-10, 12, -8]}
        color="#6699ff"
        intensity={0.6}
        distance={50}
      />
      <directionalLight position={[0, 20, 0]} intensity={0.3} />

      <gridHelper
        args={[40, 40, '#4a4a6e', '#2a2a4e']}
        position={[0, -0.01, 0]}
      />
      <lineLoop geometry={ringGeometry}>
        <lineBasicMaterial color="#4a4a6e" transparent opacity={0.6} />
      </lineLoop>
    </>
  )
}

function SceneContent({ sceneRef }: ThreeSceneProps) {
  const { scene } = useThree()
  const fragments = useAppStore((s) => s.fragments)
  const selectedFragmentId = useAppStore((s) => s.selectedFragmentId)
  const selectFragment = useAppStore((s) => s.selectFragment)
  const updateFragmentTransform = useAppStore((s) => s.updateFragmentTransform)
  const addMatchResult = useAppStore((s) => s.addMatchResult)
  const getMatchResult = useAppStore((s) => s.getMatchResult)
  const matchResults = useAppStore((s) => s.matchResults)
  const isPreviewMode = useAppStore((s) => s.isPreviewMode)
  const mergedGeometry = useAppStore((s) => s.mergedGeometry)
  const config = useAppStore((s) => s.config)
  const addMatchHistory = useAppStore((s) => s.addMatchHistory)

  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [isShiftPressed, setIsShiftPressed] = useState(false)
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0))
  const raycaster = useRef<THREE.Raycaster>(new THREE.Raycaster())
  const pointerStart = useRef<THREE.Vector2>(new THREE.Vector2())
  const fragmentStartPos = useRef<THREE.Vector3>(new THREE.Vector3())
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const { camera, gl } = useThree()

  const matchesForFragment = useCallback(
    (fragmentId: string): { otherId: string; score: number }[] => {
      const result: { otherId: string; score: number }[] = []
      matchResults.forEach((match, key) => {
        if (key.includes(fragmentId)) {
          const [a, b] = key.split('|')
          const otherId = a === fragmentId ? b : a
          if (match.edgeDistance < config.matchThreshold + 2) {
            result.push({ otherId, score: match.score })
          }
        }
      })
      return result
    },
    [matchResults, config.matchThreshold]
  )

  useEffect(() => {
    cameraRef.current = camera as THREE.PerspectiveCamera
    if (sceneRef) {
      sceneRef.current = scene
    }
  }, [camera, scene, sceneRef])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setIsShiftPressed(e.shiftKey)

      if (!selectedFragmentId) return
      const fragment = fragments.find((f) => f.id === selectedFragmentId)
      if (!fragment) return

      const rotStep =
        (config.fineRotationStep * Math.PI) / 180

      if (e.key === 'ArrowLeft') {
        const newRot = fragment.rotation.clone()
        newRot.y -= rotStep
        updateFragmentTransform(selectedFragmentId, undefined, newRot)
      } else if (e.key === 'ArrowRight') {
        const newRot = fragment.rotation.clone()
        newRot.y += rotStep
        updateFragmentTransform(selectedFragmentId, undefined, newRot)
      } else if (e.key === 'ArrowUp') {
        const newRot = fragment.rotation.clone()
        newRot.x -= rotStep
        updateFragmentTransform(selectedFragmentId, undefined, newRot)
      } else if (e.key === 'ArrowDown') {
        const newRot = fragment.rotation.clone()
        newRot.x += rotStep
        updateFragmentTransform(selectedFragmentId, undefined, newRot)
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      setIsShiftPressed(e.shiftKey)
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [selectedFragmentId, fragments, updateFragmentTransform, config.fineRotationStep])

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!selectedFragmentId) return
      const fragment = fragments.find((f) => f.id === selectedFragmentId)
      if (!fragment) return

      e.preventDefault()
      const delta = e.deltaY > 0 ? 1 : -1
      const rotStep = (config.rotationStep * Math.PI) / 180
      const newRot = fragment.rotation.clone()
      newRot.y += delta * rotStep
      updateFragmentTransform(selectedFragmentId, undefined, newRot)
    },
    [selectedFragmentId, fragments, updateFragmentTransform, config.rotationStep]
  )

  useEffect(() => {
    const canvas = gl.domElement
    canvas.addEventListener('wheel', handleWheel, { passive: false })
    return () => canvas.removeEventListener('wheel', handleWheel)
  }, [gl, handleWheel])

  const handlePointerDown = useCallback(
    (e: ThreeEvent<PointerEvent>, id: string) => {
      e.stopPropagation()
      selectFragment(id)
      setDraggingId(id)

      const fragment = fragments.find((f) => f.id === id)
      if (!fragment || !cameraRef.current) return

      pointerStart.current.set(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      )
      fragmentStartPos.copy(fragment.position)

      if (isShiftPressed) {
        planeRef.current.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 0, 1),
          fragment.position
        )
      } else {
        planeRef.current.setFromNormalAndCoplanarPoint(
          new THREE.Vector3(0, 1, 0),
          fragment.position
        )
      }
    },
    [selectFragment, fragments, isShiftPressed]
  )

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      if (!draggingId || !cameraRef.current) return

      const pointer = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      )

      raycaster.current.setFromCamera(pointer, cameraRef.current)

      const intersection = new THREE.Vector3()
      raycaster.current.ray.intersectPlane(planeRef.current, intersection)

      if (intersection) {
        const fragment = fragments.find((f) => f.id === draggingId)
        if (!fragment) return

        const newPos = intersection.clone()
        updateFragmentTransform(draggingId, newPos)
      }
    },
    [draggingId, fragments, updateFragmentTransform]
  )

  const handlePointerUp = useCallback(() => {
    if (draggingId) {
      setDraggingId(null)
    }
  }, [draggingId])

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  useEffect(() => {
    if (fragments.length < 2 || isPreviewMode) return

    const threshold = config.matchThreshold
    for (let i = 0; i < fragments.length; i++) {
      for (let j = i + 1; j < fragments.length; j++) {
        const fragA = fragments[i]
        const fragB = fragments[j]

        const distance = fragA.position.distanceTo(fragB.position)
        if (distance < threshold + 3) {
          const result = MatchingEngine.calculateMatchScore(
            fragA.position,
            fragA.rotation,
            fragB.position,
            fragB.rotation,
            fragA.edgePoints,
            fragB.edgePoints,
            fragA.curvatures,
            fragB.curvatures
          )

          if (result) {
            const fullResult: MatchResult = {
              ...result,
              fragmentAId: fragA.id,
              fragmentBId: fragB.id
            }
            addMatchResult(fullResult)
          }
        }
      }
    }
  }, [fragments, config.matchThreshold, addMatchResult, isPreviewMode])

  const handleAutoAlign = useCallback(
    (otherId: string) => {
      if (!selectedFragmentId) return
      const match = getMatchResult(selectedFragmentId, otherId)
      if (!match) return

      const fragment = fragments.find((f) => f.id === selectedFragmentId)
      if (!fragment) return

      const targetPos = new THREE.Vector3()
      const targetQuat = new THREE.Quaternion()
      const targetScale = new THREE.Vector3()
      match.bestAlignMatrix.decompose(targetPos, targetQuat, targetScale)

      const targetRot = new THREE.Euler().setFromQuaternion(targetQuat)

      addMatchHistory({
        fragmentAId: selectedFragmentId,
        fragmentBId: otherId,
        score: match.score
      })

      updateFragmentTransform(selectedFragmentId, targetPos, targetRot)
    },
    [selectedFragmentId, getMatchResult, fragments, addMatchHistory, updateFragmentTransform]
  )

  const bestMatchHighlights = useMemo(() => {
    const highlights: {
      key: string
      fragA: FragmentData
      fragB: FragmentData
      score: number
    }[] = []

    matchResults.forEach((match, key) => {
      if (match.score > 50) {
        const fragA = fragments.find((f) => f.id === match.fragmentAId)
        const fragB = fragments.find((f) => f.id === match.fragmentBId)
        if (fragA && fragB) {
          highlights.push({ key, fragA, fragB, score: match.score })
        }
      }
    })

    return highlights.sort((a, b) => b.score - a.score).slice(0, 3)
  }, [matchResults, fragments])

  return (
    <>
      <GroundAndLighting />

      {!isPreviewMode &&
        fragments.map((fragment) => (
          <Fragment
            key={fragment.id}
            fragment={fragment}
            matchScores={matchesForFragment(fragment.id)}
            onPointerDown={handlePointerDown}
            onMatchLabelClick={handleAutoAlign}
            isDragging={draggingId === fragment.id}
          />
        ))}

      {!isPreviewMode &&
        bestMatchHighlights.map(({ key, fragA, fragB }) => (
          <MatchHighlight
            key={key}
            edgePointsA={fragA.edgePoints}
            edgePointsB={fragB.edgePoints}
            posA={fragA.position}
            posB={fragB.position}
            rotA={fragA.rotation}
            rotB={fragB.rotation}
            visible={true}
          />
        ))}

      <MergedModel geometry={mergedGeometry} visible={isPreviewMode} />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
        maxPolarAngle={Math.PI / 2 + 0.1}
        enabled={!draggingId}
      />
    </>
  )
}

export function ThreeScene({ sceneRef }: ThreeSceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [15, 12, 15], fov: 60, near: 0.1, far: 1000 }}
      gl={{
        antialias: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.2,
        outputColorSpace: THREE.SRGBColorSpace
      }}
      style={{ background: '#1a1a2e', width: '100%', height: '100%' }}
    >
      <SceneContent sceneRef={sceneRef} />
    </Canvas>
  )
}
