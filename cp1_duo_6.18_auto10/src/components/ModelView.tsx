import { useRef, useEffect, useMemo, forwardRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { hexToThreeColor } from '../utils/colorUtils'

interface LampProps {
  shadeColor: string
  poleColor: string
  baseColor: string
}

interface AnimatableMeshProps {
  targetColor: string
  shininess?: number
  name?: string
  children: React.ReactNode
}

const easeOutCubic = (t: number): number => {
  return 1 - Math.pow(1 - t, 3)
}

const AnimatableMesh = forwardRef<THREE.Mesh, AnimatableMeshProps>((
  { targetColor, shininess = 30, name, children },
  ref
) => {
  const materialRef = useRef<THREE.MeshPhongMaterial>(null)
  const startColor = useRef(new THREE.Color(targetColor))
  const currentColor = useRef(new THREE.Color(targetColor))
  const targetColorObj = useMemo(() => hexToThreeColor(targetColor), [targetColor])
  const animationProgress = useRef(1)
  const prevTargetColor = useRef(targetColor)

  useEffect(() => {
    if (prevTargetColor.current !== targetColor) {
      startColor.current.copy(currentColor.current)
      animationProgress.current = 0
      prevTargetColor.current = targetColor
    }
  }, [targetColor])

  useFrame((_, delta) => {
    if (materialRef.current && animationProgress.current < 1) {
      animationProgress.current = Math.min(1, animationProgress.current + delta / 0.4)
      const easedProgress = easeOutCubic(animationProgress.current)
      currentColor.current.copy(startColor.current).lerp(targetColorObj, easedProgress)
      materialRef.current.color.copy(currentColor.current)
    }
  })

  return (
    <mesh ref={ref} name={name}>
      <meshPhongMaterial
        ref={materialRef}
        color={targetColor}
        shininess={shininess}
      />
      {children}
    </mesh>
  )
})

AnimatableMesh.displayName = 'AnimatableMesh'

const Lamp = ({ shadeColor, poleColor, baseColor }: LampProps) => {
  return (
    <group position={[0, 0, 0]}>
      <AnimatableMesh targetColor={baseColor} name="base">
        <cylinderGeometry args={[0.8, 1, 0.3, 32]} />
      </AnimatableMesh>

      <AnimatableMesh targetColor={poleColor} name="pole">
        <cylinderGeometry args={[0.08, 0.08, 2, 16]} />
      </AnimatableMesh>

      <group position={[0, 1.2, 0]}>
        <AnimatableMesh targetColor={poleColor} name="pole">
          <cylinderGeometry args={[0.06, 0.06, 0.8, 16]} />
        </AnimatableMesh>
      </group>

      <group position={[0, 1.8, 0]}>
        <AnimatableMesh targetColor={shadeColor} name="shade">
          <cylinderGeometry args={[0.3, 0.6, 0.5, 32, 1, true]} />
        </AnimatableMesh>
        <AnimatableMesh targetColor={shadeColor} name="shade">
          <circleGeometry args={[0.3, 32]} />
        </AnimatableMesh>
      </group>
    </group>
  )
}

interface SceneProps {
  shadeColor: string
  poleColor: string
  baseColor: string
  onThumbnailReady?: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => void
}

const Scene = ({ shadeColor, poleColor, baseColor, onThumbnailReady }: SceneProps) => {
  const { scene, camera, gl } = useThree()

  useEffect(() => {
    if (onThumbnailReady) {
      onThumbnailReady(gl, scene, camera)
    }
  }, [gl, scene, camera, onThumbnailReady])

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={1}
        castShadow
      />
      <directionalLight
        position={[-3, 3, -3]}
        intensity={0.4}
      />
      <pointLight position={[0, 2, 0]} intensity={0.3} />

      <Lamp shadeColor={shadeColor} poleColor={poleColor} baseColor={baseColor} />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={3.2}
        maxDistance={32}
        minPolarAngle={0}
        maxPolarAngle={Math.PI / 2.2}
        enableZoom={true}
      />
    </>
  )
}

interface ModelViewProps {
  shadeColor: string
  poleColor: string
  baseColor: string
  onRendererReady?: (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => void
}

const ModelView = ({ shadeColor, poleColor, baseColor, onRendererReady }: ModelViewProps) => {
  return (
    <Canvas
      shadows
      camera={{ position: [4, 3, 4], fov: 45 }}
      gl={{ antialias: true, preserveDrawingBuffer: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#16213e']} />
      <fog attach="fog" args={['#16213e', 10, 30]} />
      <Scene
        shadeColor={shadeColor}
        poleColor={poleColor}
        baseColor={baseColor}
        onThumbnailReady={onRendererReady}
      />
    </Canvas>
  )
}

export default ModelView

export const captureSnapshotThumbnail = (
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  colors: { shade: string; pole: string; base: string }
): string => {
  const originalColors: Record<string, string> = {}

  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.material && (mesh.name === 'shade' || mesh.name === 'pole' || mesh.name === 'base')) {
      const mat = mesh.material as THREE.MeshPhongMaterial
      originalColors[mesh.uuid] = mat.color.getStyle()
      if (mesh.name === 'shade') mat.color.set(colors.shade)
      else if (mesh.name === 'pole') mat.color.set(colors.pole)
      else if (mesh.name === 'base') mat.color.set(colors.base)
    }
  })

  const thumbnailCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000)
  thumbnailCamera.position.set(0, 5, 5)
  thumbnailCamera.lookAt(0, 1, 0)

  const size = 120
  const originalSize = new THREE.Vector2()
  renderer.getSize(originalSize)
  renderer.setSize(size, size)

  renderer.render(scene, thumbnailCamera)
  const dataUrl = renderer.domElement.toDataURL('image/png')

  renderer.setSize(originalSize.x, originalSize.y)

  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.material && originalColors[mesh.uuid]) {
      const mat = mesh.material as THREE.MeshPhongMaterial
      mat.color.set(originalColors[mesh.uuid])
    }
  })

  return dataUrl
}
