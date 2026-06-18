import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'
import { useMathStore } from './store'
import {
  generateMandelbrotHeightmap,
  generateJuliaSet_3D,
  generateMinimalSurface,
  type GeometryResult,
} from './math_engine'

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function lerpGeometry(
  from: GeometryResult,
  to: GeometryResult,
  t: number,
): GeometryResult {
  const easedT = easeInOutCubic(t)

  const vertices = new Float32Array(from.vertices.length)
  const colors = new Float32Array(from.colors.length)
  const normals = new Float32Array(from.normals.length)

  for (let i = 0; i < from.vertices.length; i++) {
    vertices[i] = from.vertices[i]! + (to.vertices[i]! - from.vertices[i]!) * easedT
  }

  for (let i = 0; i < from.colors.length; i++) {
    colors[i] = from.colors[i]! + (to.colors[i]! - from.colors[i]!) * easedT
  }

  for (let i = 0; i < from.normals.length; i++) {
    normals[i] = from.normals[i]! + (to.normals[i]! - from.normals[i]!) * easedT
  }

  return {
    vertices,
    indices: to.indices,
    colors,
    normals,
    heightMin: from.heightMin + (to.heightMin - from.heightMin) * easedT,
    heightMax: from.heightMax + (to.heightMax - from.heightMax) * easedT,
  }
}

function MathMesh() {
  const meshRef = useRef<THREE.Mesh>(null)
  const geometryRef = useRef<THREE.BufferGeometry | null>(null)

  const modelType = useMathStore((state) => state.modelType)
  const mandelbrotParams = useMathStore((state) => state.mandelbrotParams)
  const juliaParams = useMathStore((state) => state.juliaParams)
  const minimalParams = useMathStore((state) => state.minimalParams)

  const [targetGeometry, setTargetGeometry] = useState<GeometryResult | null>(null)
  const [currentGeometry, setCurrentGeometry] = useState<GeometryResult | null>(null)
  const transitionRef = useRef({ active: false, progress: 1.0, duration: 0.4 })

  const lightRef = useRef<THREE.DirectionalLight>(null)
  const lightAngleRef = useRef(0)

  const initialGeometry = useMemo(() => {
    return generateMandelbrotHeightmap({
      resolution: mandelbrotParams.resolution,
      iterations: mandelbrotParams.iterations,
    })
  }, [])

  useEffect(() => {
    let newGeometry: GeometryResult

    switch (modelType) {
      case 'mandelbrot':
        newGeometry = generateMandelbrotHeightmap({
          resolution: mandelbrotParams.resolution,
          iterations: mandelbrotParams.iterations,
        })
        break
      case 'julia':
        newGeometry = generateJuliaSet_3D({
          cx: juliaParams.cx,
          cy: juliaParams.cy,
          resolution: juliaParams.resolution,
          iterations: juliaParams.iterations,
        })
        break
      case 'minimal':
        newGeometry = generateMinimalSurface({
          t: minimalParams.t,
          resolution: minimalParams.resolution,
        })
        break
      default:
        newGeometry = initialGeometry
    }

    if (currentGeometry) {
      transitionRef.current = { active: true, progress: 0, duration: 0.4 }
    } else {
      setCurrentGeometry(newGeometry)
    }

    setTargetGeometry(newGeometry)
  }, [modelType, mandelbrotParams, juliaParams, minimalParams])

  useFrame((_state, delta) => {
    if (lightRef.current) {
      lightAngleRef.current += delta * 0.5
      const radius = 5
      lightRef.current.position.x = Math.cos(lightAngleRef.current) * radius
      lightRef.current.position.z = Math.sin(lightAngleRef.current) * radius
      lightRef.current.position.y = 3
    }

    if (
      transitionRef.current.active &&
      targetGeometry &&
      currentGeometry &&
      meshRef.current
    ) {
      transitionRef.current.progress += delta / transitionRef.current.duration

      if (transitionRef.current.progress >= 1) {
        transitionRef.current.progress = 1
        transitionRef.current.active = false
        setCurrentGeometry(targetGeometry)
      }

      const t = Math.min(transitionRef.current.progress, 1)
      const interpolated = lerpGeometry(currentGeometry, targetGeometry, t)

      const geo = meshRef.current.geometry
      const posAttr = geo.getAttribute('position') as THREE.BufferAttribute
      const colorAttr = geo.getAttribute('color') as THREE.BufferAttribute
      const normalAttr = geo.getAttribute('normal') as THREE.BufferAttribute

      ;(posAttr.array as Float32Array).set(interpolated.vertices)
      ;(colorAttr.array as Float32Array).set(interpolated.colors)
      ;(normalAttr.array as Float32Array).set(interpolated.normals)

      posAttr.needsUpdate = true
      colorAttr.needsUpdate = true
      normalAttr.needsUpdate = true

      geo.computeVertexNormals()
    }
  })

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()

    const verts = initialGeometry.vertices
    const indices = initialGeometry.indices
    const colors = initialGeometry.colors
    const normals = initialGeometry.normals

    geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    geo.setIndex(new THREE.BufferAttribute(indices, 1))

    geometryRef.current = geo
    return geo
  }, [initialGeometry])

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        ref={lightRef}
        position={[5, 3, 5]}
        intensity={1.2}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.5}
        shadow-camera-far={50}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={5}
        shadow-camera-bottom={-5}
        shadow-bias={-0.0001}
      />

      <mesh ref={meshRef} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial
          vertexColors
          side={THREE.DoubleSide}
          roughness={0.7}
          metalness={0.1}
          flatShading={false}
        />
      </mesh>

      <ContactShadows
        position={[0, -0.5, 0]}
        opacity={0.3}
        scale={10}
        blur={2.4}
        far={4}
        color="#000000"
      />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={1}
        maxDistance={20}
        enableDamping
        dampingFactor={0.05}
        makeDefault
      />
    </>
  )
}

export default function SceneRenderer() {
  return (
    <>
      <color attach="background" args={['#0d0d1a']} />
      <fog attach="fog" args={['#0d0d1a', 5, 15]} />
      <MathMesh />
    </>
  )
}
