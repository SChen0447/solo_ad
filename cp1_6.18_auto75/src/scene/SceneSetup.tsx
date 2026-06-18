import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Grid, OrbitControls, Sky } from '@react-three/drei'
import * as THREE from 'three'
import { useSceneStore } from '../store/sceneStore'
import { useRecorderStore } from '../store/recorderStore'
import GeometryNode from './GeometryNode'

const MIN_DISTANCE = 1
const MAX_DISTANCE = 1.5

interface ConnectionData {
  id: string
  start: THREE.Vector3
  end: THREE.Vector3
  colorA: string
  colorB: string
  opacity: number
}

const SceneSetup = () => {
  const directionalLightRef = useRef<THREE.DirectionalLight>(null)
  const ambientLightRef = useRef<THREE.AmbientLight>(null)
  const pointLightRef = useRef<THREE.PointLight>(null)
  const pointLightHelperRef = useRef<THREE.PointLightHelper | null>(null)
  const connectionsRef = useRef<Map<string, THREE.Mesh>>(new Map())
  const sceneRef = useRef<THREE.Scene | null>(null)
  const { gl, scene } = useThree()

  const geometries = useSceneStore((s) => s.geometries)
  const lighting = useSceneStore((s) => s.lighting)
  const setCanvas = useRecorderStore((s) => s.setCanvas)

  useEffect(() => {
    sceneRef.current = scene
    setCanvas(gl.domElement)
  }, [gl, scene, setCanvas])

  const highQualitySampling = geometries.length <= 10

  useFrame(() => {
    const existingConnections = connectionsRef.current
    const currentKeys = new Set<string>()

    for (let i = 0; i < geometries.length; i++) {
      for (let j = i + 1; j < geometries.length; j++) {
        const a = geometries[i]
        const b = geometries[j]
        const posA = new THREE.Vector3(a.position.x, a.position.y, a.position.z)
        const posB = new THREE.Vector3(b.position.x, b.position.y, b.position.z)
        const distance = posA.distanceTo(posB)

        const key = `${a.id}_${b.id}`
        currentKeys.add(key)

        if (distance < MAX_DISTANCE) {
          const opacity = THREE.MathUtils.clamp(
            (MAX_DISTANCE - distance) / (MAX_DISTANCE - MIN_DISTANCE),
            0,
            1
          )

          let mesh = existingConnections.get(key)
          if (!mesh) {
            const geometry = new THREE.CylinderGeometry(0.03, 0.03, 1, 8, 1, true)
            geometry.rotateX(Math.PI / 2)
            geometry.translate(0, 0, -0.5)

            const material = new THREE.ShaderMaterial({
              uniforms: {
                uTime: { value: 0 },
                uOpacity: { value: 0 },
                uColorA: { value: new THREE.Color(a.material.color) },
                uColorB: { value: new THREE.Color(b.material.color) },
                uDistance: { value: distance },
              },
              vertexShader: `
                varying vec2 vUv;
                varying vec3 vPosition;
                uniform float uTime;
                uniform float uOpacity;
                void main() {
                  vUv = uv;
                  vPosition = position;
                  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
              `,
              fragmentShader: `
                varying vec2 vUv;
                uniform float uTime;
                uniform float uOpacity;
                uniform vec3 uColorA;
                uniform vec3 uColorB;
                void main() {
                  vec3 color = mix(uColorA, uColorB, vUv.x);
                  float flow = fract(vUv.x * 8.0 - uTime * 0.8);
                  float particle = smoothstep(0.0, 0.05, flow) * smoothstep(0.15, 0.1, flow);
                  particle += smoothstep(0.3, 0.35, flow) * smoothstep(0.45, 0.4, flow);
                  particle += smoothstep(0.6, 0.65, flow) * smoothstep(0.75, 0.7, flow);
                  float edge = 1.0 - abs(vUv.y - 0.5) * 2.0;
                  edge = pow(edge, 1.5);
                  float alpha = edge * uOpacity * (0.5 + particle);
                  gl_FragColor = vec4(color * (1.0 + particle * 0.5), alpha);
                }
              `,
              transparent: true,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide,
            })

            mesh = new THREE.Mesh(geometry, material)
            mesh.userData.uniforms = material.uniforms
            scene.add(mesh)
            existingConnections.set(key, mesh)
          }

          const material = mesh.material as THREE.ShaderMaterial
          material.uniforms.uTime.value += 0.016
          material.uniforms.uOpacity.value = opacity
          material.uniforms.uColorA.value.set(a.material.color)
          material.uniforms.uColorB.value.set(b.material.color)

          const midpoint = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5)
          mesh.position.copy(midpoint)

          const direction = new THREE.Vector3().subVectors(posB, posA)
          const length = direction.length()
          mesh.scale.set(1, 1, length)
          direction.normalize()

          const quaternion = new THREE.Quaternion()
          quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction)
          mesh.quaternion.copy(quaternion)
        } else {
          const mesh = existingConnections.get(key)
          if (mesh) {
            scene.remove(mesh)
            mesh.geometry.dispose()
            ;(mesh.material as THREE.Material).dispose()
            existingConnections.delete(key)
          }
        }
      }
    }

    existingConnections.forEach((mesh, key) => {
      if (!currentKeys.has(key)) {
        scene.remove(mesh)
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
        existingConnections.delete(key)
      }
    })
  })

  useEffect(() => {
    return () => {
      connectionsRef.current.forEach((mesh) => {
        mesh.geometry.dispose()
        ;(mesh.material as THREE.Material).dispose()
      })
      connectionsRef.current.clear()
    }
  }, [])

  const directionalLightPosition = useMemo(() => {
    const { azimuth, elevation } = lighting.directional
    const phi = THREE.MathUtils.degToRad(90 - elevation)
    const theta = THREE.MathUtils.degToRad(azimuth)
    const radius = 10
    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    )
  }, [lighting.directional.azimuth, lighting.directional.elevation])

  return (
    <>
      <color attach="background" args={['#1a1a2e']} />

      <Sky
        distance={450000}
        sunPosition={[
          directionalLightPosition.x * 100,
          Math.max(directionalLightPosition.y * 100, 100),
          directionalLightPosition.z * 100,
        ]}
        inclination={0.5}
        azimuth={0.25}
        turbidity={8}
        rayleigh={2}
      />

      <fog attach="fog" args={['#1a1a2e', 20, 50]} />

      <ambientLight ref={ambientLightRef} intensity={lighting.ambient.intensity} color="#ffffff" />

      <directionalLight
        ref={directionalLightRef}
        position={[directionalLightPosition.x, directionalLightPosition.y, directionalLightPosition.z]}
        intensity={lighting.directional.intensity}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
        shadow-bias={-0.0005}
      />

      <pointLight
        ref={pointLightRef}
        position={[lighting.point.position.x, lighting.point.position.y, lighting.point.position.z]}
        color={lighting.point.color}
        intensity={lighting.point.intensity}
        distance={15}
        decay={2}
        castShadow
      />

      <mesh
        position={[lighting.point.position.x, lighting.point.position.y, lighting.point.position.z]}
      >
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={lighting.point.color} />
      </mesh>

      <mesh position={[0, -0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial
          color="#2a2a3e"
          metalness={0.1}
          roughness={0.8}
        />
      </mesh>

      <Grid
        position={[0, 0, 0]}
        args={[100, 100]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#4a4a6e"
        sectionSize={10}
        sectionThickness={1}
        sectionColor="#5a5a7e"
        fadeDistance={50}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={true}
      />

      {geometries.map((geo) => (
        <GeometryNode
          key={geo.id}
          geometry={geo}
          highQuality={highQualitySampling}
        />
      ))}

      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        minDistance={3}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2 - 0.05}
        target={[0, 1, 0]}
      />
    </>
  )
}

export default SceneSetup
