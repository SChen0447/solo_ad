import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import { useStore } from '../../store/useStore'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

export function SceneManager() {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const rotationSpeed = useStore(state => state.rotationSpeed)
  const setCameraPosition = useStore(state => state.setCameraPosition)
  const setCameraTarget = useStore(state => state.setCameraTarget)
  const cameraPosition = useStore(state => state.camera.position)
  const cameraTarget = useStore(state => state.camera.target)

  useEffect(() => {
    camera.position.set(...cameraPosition)
  }, [])

  useFrame((_, delta) => {
    if (controlsRef.current && rotationSpeed !== 0) {
      controlsRef.current.autoRotateSpeed = rotationSpeed
      controlsRef.current.autoRotate = rotationSpeed !== 0
      if (rotationSpeed !== 0) {
        controlsRef.current.update()
      }
    }
  })

  const handleChange = () => {
    if (controlsRef.current) {
      const pos = controlsRef.current.object.position
      const target = controlsRef.current.target
      setCameraPosition([pos.x, pos.y, pos.z])
      setCameraTarget([target.x, target.y, target.z])
    }
  }

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={0.8}
        castShadow
      />
      <directionalLight
        position={[-5, -3, -5]}
        intensity={0.4}
        color="#aaccff"
      />
      <OrbitControls
        ref={controlsRef}
        makeDefault
        enableDamping
        dampingFactor={0.05}
        minDistance={1}
        maxDistance={15}
        target={cameraTarget}
        onChange={handleChange}
        enablePan={true}
      />
    </>
  )
}
