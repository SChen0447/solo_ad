import React, { useRef, useState, useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { OrbitControls } from '@react-three/drei'
import type {
  Metrics,
  MaterialType,
  ModelType,
  MaterialParams,
  LightParams,
} from './SceneManager'
import { SceneManager } from './SceneManager'

export interface CameraSyncState {
  position: THREE.Vector3
  target: THREE.Vector3
}

export type CameraSyncMode = 'source' | 'follower' | 'none'

export interface SceneMeshData {
  meshes: Array<{
    geometry: THREE.BufferGeometry
    transform: THREE.Matrix4
  }>
  scale: number
  positionY: number
}

interface SceneViewProps {
  sceneManager: SceneManager
  modelType: ModelType
  materialType: MaterialType
  materialParams: MaterialParams
  lightParams: LightParams
  orbitRef: React.MutableRefObject<any>
  frozen?: boolean
  autoRotateSpeed?: number
  cameraMode?: CameraSyncMode
  cameraStateRef?: React.MutableRefObject<CameraSyncState | null>
  enableMetrics?: boolean
  onMetricsUpdate?: (metrics: Metrics) => void
  metricsSamplingInterval?: number
  cameraInterpolationFactor?: number
}

const SubMeshGroup: React.FC<{
  meshData: SceneMeshData | null
  materialRef: React.MutableRefObject<THREE.MeshStandardMaterial | null>
  frozen?: boolean
}> = ({ meshData, materialRef, frozen }) => {
  const groupRef = useRef<THREE.Group>(null)
  const meshesRef = useRef<THREE.Mesh[]>([])
  const rotationSpeedRef = useRef((15 * Math.PI) / 180)

  useFrame((_, delta) => {
    if (!frozen && groupRef.current) {
      groupRef.current.rotation.y += rotationSpeedRef.current * delta
    }
  })

  useEffect(() => {
    if (!meshData || !groupRef.current) return
    meshesRef.current.forEach((m) => {
      groupRef.current?.remove(m)
      m.geometry.dispose()
    })
    meshesRef.current = []

    meshData.meshes.forEach((entry, i) => {
      const m = new THREE.Mesh(entry.geometry)
      m.applyMatrix4(entry.transform)
      m.castShadow = true
      m.receiveShadow = true
      if (materialRef.current) {
        m.material = materialRef.current
      }
      meshesRef.current.push(m)
      groupRef.current?.add(m)
    })
  }, [meshData, materialRef])

  useFrame(() => {
    if (!materialRef.current || !groupRef.current) return
    const mat = materialRef.current
    meshesRef.current.forEach((m) => {
      if (m.material !== mat) {
        m.material = mat
      }
    })
  })

  if (!meshData) return null
  return (
    <group
      ref={groupRef}
      scale={meshData.scale}
      position={[0, meshData.positionY, 0]}
    />
  )
}

const SceneView: React.FC<SceneViewProps> = ({
  sceneManager,
  modelType,
  materialType,
  materialParams,
  lightParams,
  orbitRef,
  frozen = false,
  autoRotateSpeed = 15,
  cameraMode = 'none',
  cameraStateRef,
  enableMetrics = false,
  onMetricsUpdate,
  metricsSamplingInterval = 30,
  cameraInterpolationFactor = 0.25,
}) => {
  const { gl, scene, camera } = useThree()
  const [meshData, setMeshData] = useState<SceneMeshData | null>(null)
  const mountedRef = useRef(true)
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null)
  const frameCounterRef = useRef(0)
  const smoothedCamPos = useRef(new THREE.Vector3(3, 2.5, 4))
  const smoothedCamTarget = useRef(new THREE.Vector3(0, 0, 0))
  const fpsRef = useRef({ lastTime: performance.now(), frames: 0, value: 60 })

  useEffect(() => {
    mountedRef.current = true
    let cancelled = false

    const load = async () => {
      const data = await sceneManager.loadMeshes(modelType)
      if (cancelled || !mountedRef.current) return
      setMeshData(data)
    }
    load()

    return () => {
      cancelled = true
      mountedRef.current = false
    }
  }, [modelType, sceneManager])

  useEffect(() => {
    const mat = sceneManager.getMaterial(materialType)
    mat.metalness = materialParams.metalness
    mat.roughness = materialParams.roughness
    mat.needsUpdate = true
    materialRef.current = mat
  }, [materialType, sceneManager])

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.metalness = materialParams.metalness
      materialRef.current.roughness = materialParams.roughness
      materialRef.current.needsUpdate = true
    }
  }, [materialParams])

  const lightPos = useMemo(
    () => SceneManager.getLightPosition(lightParams.angleY),
    [lightParams.angleY]
  )

  useFrame((_, delta) => {
    frameCounterRef.current++

    const now = performance.now()
    fpsRef.current.frames++
    if (now - fpsRef.current.lastTime >= 1000) {
      fpsRef.current.value = fpsRef.current.frames
      fpsRef.current.frames = 0
      fpsRef.current.lastTime = now
    }

    if (cameraMode === 'source' && cameraStateRef && orbitRef.current) {
      const ctrl = orbitRef.current
      if (ctrl.object && ctrl.target) {
        if (!cameraStateRef.current) {
          cameraStateRef.current = {
            position: new THREE.Vector3(),
            target: new THREE.Vector3(),
          }
        }
        cameraStateRef.current.position.copy(ctrl.object.position)
        cameraStateRef.current.target.copy(ctrl.target)
        smoothedCamPos.current.copy(ctrl.object.position)
        smoothedCamTarget.current.copy(ctrl.target)
      }
    }

    if (cameraMode === 'follower' && cameraStateRef && cameraStateRef.current && orbitRef.current) {
      const ctrl = orbitRef.current
      if (ctrl.object && ctrl.target) {
        const factor = Math.min(1, cameraInterpolationFactor + delta * 2)
        smoothedCamPos.current.lerp(cameraStateRef.current.position, factor)
        smoothedCamTarget.current.lerp(cameraStateRef.current.target, factor)
        ctrl.object.position.copy(smoothedCamPos.current)
        ctrl.target.copy(smoothedCamTarget.current)
        ctrl.update()
      }
    }

    if (enableMetrics && onMetricsUpdate && !frozen) {
      if (frameCounterRef.current % metricsSamplingInterval === 0) {
        try {
          const metrics = sceneManager.computeMetricsPerFrame(
            gl,
            scene,
            camera,
            materialParams
          )
          onMetricsUpdate(metrics)
        } catch {
          // silent
        }
      }
    }
  })

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[lightPos.x, lightPos.y, lightPos.z]}
        intensity={0.8}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0001}
      />

      <SubMeshGroup meshData={meshData} materialRef={materialRef} frozen={frozen} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.3, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <shadowMaterial attach="material" opacity={0.35} />
      </mesh>

      <OrbitControls
        ref={orbitRef}
        enableDamping
        dampingFactor={0.08}
        minDistance={1}
        maxDistance={8}
        enablePan={false}
        enableRotate={!frozen || cameraMode === 'source'}
        enableZoom={!frozen || cameraMode === 'source'}
      />
    </>
  )
}

export default SceneView
