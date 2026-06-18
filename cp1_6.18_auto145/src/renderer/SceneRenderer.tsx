import { useRef, useMemo, useCallback, useEffect } from 'react'
import { useFrame, useThree, ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { useWaveStore, VisualizationMode } from '@/store/useWaveStore'
import {
  computeInterferenceGrid,
  computeEnergyGrid,
  computeSliceData,
  getMaxAmplitude,
  sphericalWaveAmplitude,
} from '@/physics/WaveEngine'
import {
  gridToWorld,
  getGridSize,
  interferenceColor,
  energyColor,
  waveAmplitudeColor,
} from '@/utils/dataUtils'

const GRID_SIZE = getGridSize()
const WAVE_SPEED = 5.0

const waveVertexShader = `
  uniform float uTime;
  uniform float uFrequency;
  uniform float uAmplitude;
  uniform float uPhase;
  uniform vec3 uSourcePos;
  uniform float uWaveSpeed;
  varying float vAmplitude;
  varying float vDistance;

  void main() {
    vec3 worldPos = (modelMatrix * vec4(position, 1.0)).xyz;
    float dist = distance(worldPos, uSourcePos);
    float k = (2.0 * 3.14159265 * uFrequency) / uWaveSpeed;
    float omega = 2.0 * 3.14159265 * uFrequency;
    float phaseRad = uPhase * 3.14159265 / 180.0;
    float amp = (uAmplitude / max(dist, 0.3)) * sin(k * dist - omega * uTime + phaseRad);
    vAmplitude = amp;
    vDistance = dist;

    vec3 dir = normalize(worldPos - uSourcePos);
    float displacement = amp * 0.1;
    vec3 newPos = worldPos + dir * displacement;

    gl_Position = projectionMatrix * viewMatrix * vec4(newPos, 1.0);
  }
`

const waveFragmentShader = `
  varying float vAmplitude;
  varying float vDistance;
  uniform float uAmplitude;

  void main() {
    float t = clamp((vAmplitude / uAmplitude + 1.0) * 0.5, 0.0, 1.0);
    vec3 trough = vec3(0.29, 0.0, 0.5);
    vec3 crest = vec3(1.0, 0.87, 0.0);
    vec3 col = mix(trough, crest, t);
    float fade = 1.0 - smoothstep(3.0, 10.0, vDistance);
    gl_FragColor = vec4(col, fade * 0.6);
  }
`

function WaveSourceMesh({
  position,
  frequency,
  amplitude,
  phase,
  time,
}: {
  position: [number, number, number]
  frequency: number
  amplitude: number
  phase: number
  time: number
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uFrequency: { value: frequency },
      uAmplitude: { value: amplitude },
      uPhase: { value: phase },
      uSourcePos: { value: new THREE.Vector3(...position) },
      uWaveSpeed: { value: WAVE_SPEED },
    }),
    []
  )

  useEffect(() => {
    uniforms.uFrequency.value = frequency
    uniforms.uAmplitude.value = amplitude
    uniforms.uPhase.value = phase
    uniforms.uSourcePos.value.set(...position)
  }, [frequency, amplitude, phase, position, uniforms])

  useFrame(() => {
    uniforms.uTime.value = time
  })

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[8, 48, 48]} />
      <shaderMaterial
        vertexShader={waveVertexShader}
        fragmentShader={waveFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function SourceMarker({
  position,
  index,
}: {
  position: [number, number, number]
  index: number
}) {
  const colors = ['#00d4ff', '#ff6b9d', '#50fa7b']
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.2, 16, 16]} />
      <meshStandardMaterial
        color={colors[index % 3]}
        emissive={colors[index % 3]}
        emissiveIntensity={2}
      />
    </mesh>
  )
}

function InterferenceCloud({ time }: { time: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const sources = useWaveStore((s) => s.sources)
  const setInterferenceData = useWaveStore((s) => s.setInterferenceData)

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const totalCells = GRID_SIZE * GRID_SIZE * GRID_SIZE
  const colorArray = useMemo(
    () => new Float32Array(totalCells * 3),
    []
  )

  const lastComputeTime = useRef(-1)

  useFrame(() => {
    if (!meshRef.current) return
    if (Math.abs(time - lastComputeTime.current) < 0.05) return
    lastComputeTime.current = time

    const activeSources = sources.filter((s) => s.enabled)
    if (activeSources.length === 0) return

    const data = computeInterferenceGrid(activeSources, time)
    setInterferenceData(data)
    const maxAmp = getMaxAmplitude(data)
    if (maxAmp === 0) return

    let idx = 0
    let visibleCount = 0

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        for (let k = 0; k < GRID_SIZE; k++) {
          const amp = data[idx]
          const { color, opacity } = interferenceColor(amp, maxAmp)

          if (opacity > 0.08) {
            const worldPos = gridToWorld(i, j, k)
            dummy.position.set(worldPos[0], worldPos[1], worldPos[2])
            const scale = 0.2 + (opacity - 0.1) * 0.4
            dummy.scale.set(scale, scale, scale)
            dummy.updateMatrix()
            meshRef.current.setMatrixAt(visibleCount, dummy.matrix)

            colorArray[visibleCount * 3] = color.r
            colorArray[visibleCount * 3 + 1] = color.g
            colorArray[visibleCount * 3 + 2] = color.b
            visibleCount++
          }
          idx++
        }
      }
    }

    meshRef.current.count = visibleCount
    meshRef.current.instanceMatrix.needsUpdate = true

    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  })

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, totalCells]} frustumCulled={false}>
      <boxGeometry args={[0.35, 0.35, 0.35]}>
        <instancedBufferAttribute
          attach="attributes-instanceColor"
          args={[colorArray, 3]}
        />
      </boxGeometry>
      <meshBasicMaterial transparent opacity={0.6} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  )
}

function InterferenceSlice({ time }: { time: number }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const sources = useWaveStore((s) => s.sources)
  const sliceZ = useWaveStore((s) => s.sliceZ)

  const textureRef = useRef<THREE.DataTexture | null>(null)

  const canvasSize = GRID_SIZE

  useEffect(() => {
    const data = new Uint8Array(canvasSize * canvasSize * 4)
    const tex = new THREE.DataTexture(data, canvasSize, canvasSize, THREE.RGBAFormat)
    tex.needsUpdate = true
    textureRef.current = tex
  }, [canvasSize])

  useFrame(() => {
    if (!textureRef.current || !meshRef.current) return

    const activeSources = sources.filter((s) => s.enabled)
    if (activeSources.length === 0) return

    const sliceData = computeSliceData(activeSources, sliceZ, time)
    const maxAmp = getMaxAmplitude(sliceData)
    if (maxAmp === 0) return

    const data = textureRef.current.image.data as Uint8Array

    const breathe = 0.85 + 0.15 * Math.sin(time * (2 * Math.PI) / 1.5)

    for (let i = 0; i < canvasSize; i++) {
      for (let j = 0; j < canvasSize; j++) {
        const idx = i * canvasSize + j
        const amp = sliceData[idx]
        const t = (amp / maxAmp + 1) * 0.5
        const clamped = Math.max(0, Math.min(1, t))

        const cx = (i - canvasSize / 2) / (canvasSize / 2)
        const cy = (j - canvasSize / 2) / (canvasSize / 2)
        const edgeDist = Math.sqrt(cx * cx + cy * cy)
        const edgeFade = Math.max(0, 1 - edgeDist)

        const pixel = idx * 4
        data[pixel] = Math.floor(clamped * 255 * edgeFade * breathe)
        data[pixel + 1] = Math.floor((1 - Math.abs(clamped - 0.5) * 2) * 100 * edgeFade * breathe)
        data[pixel + 2] = Math.floor((1 - clamped) * 255 * edgeFade * breathe)
        data[pixel + 3] = Math.floor(edgeFade * 200 * breathe)
      }
    }

    textureRef.current.needsUpdate = true
    ;(meshRef.current.material as THREE.MeshBasicMaterial).map = textureRef.current
    ;(meshRef.current.material as THREE.MeshBasicMaterial).needsUpdate = true
  })

  return (
    <mesh ref={meshRef} position={[0, 0, sliceZ]} rotation={[0, 0, 0]}>
      <planeGeometry args={[20, 20]} />
      <meshBasicMaterial transparent side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

function EnergyParticles({ time }: { time: number }) {
  const pointsRef = useRef<THREE.Points>(null)
  const sources = useWaveStore((s) => s.sources)
  const setEnergyData = useWaveStore((s) => s.setEnergyData)

  const totalCells = GRID_SIZE * GRID_SIZE * GRID_SIZE
  const positions = useMemo(() => new Float32Array(totalCells * 3), [])
  const colors = useMemo(() => new Float32Array(totalCells * 3), [])
  const sizes = useMemo(() => new Float32Array(totalCells), [])

  const lastComputeTime = useRef(-1)

  useFrame(() => {
    if (!pointsRef.current) return
    if (Math.abs(time - lastComputeTime.current) < 0.1) return
    lastComputeTime.current = time

    const activeSources = sources.filter((s) => s.enabled)
    if (activeSources.length === 0) return

    const data = computeEnergyGrid(activeSources, time, 4)
    setEnergyData(data)

    let maxEnergy = 0
    for (let i = 0; i < data.length; i++) {
      if (data[i] > maxEnergy) maxEnergy = data[i]
    }
    if (maxEnergy === 0) return

    const geom = pointsRef.current.geometry
    const posAttr = geom.getAttribute('position') as THREE.BufferAttribute
    const colAttr = geom.getAttribute('color') as THREE.BufferAttribute
    const sizeAttr = geom.getAttribute('size') as THREE.BufferAttribute

    let visibleCount = 0
    const threshold = maxEnergy * 0.02

    for (let i = 0; i < GRID_SIZE; i++) {
      for (let j = 0; j < GRID_SIZE; j++) {
        for (let k = 0; k < GRID_SIZE; k++) {
          const idx = i * GRID_SIZE * GRID_SIZE + j * GRID_SIZE + k
          const energy = data[idx]

          if (energy > threshold) {
            const worldPos = gridToWorld(i, j, k)
            const jitter = (Math.random() - 0.5) * 0.1
            posAttr.setXYZ(
              visibleCount,
              worldPos[0] + jitter,
              worldPos[1] + jitter,
              worldPos[2] + jitter
            )

            const col = energyColor(energy, maxEnergy)
            colAttr.setXYZ(visibleCount, col.r, col.g, col.b)

            const normEnergy = energy / maxEnergy
            sizeAttr.setX(visibleCount, 0.15 + normEnergy * 0.6)

            visibleCount++
          }
        }
      }
    }

    geom.setDrawRange(0, visibleCount)
    posAttr.needsUpdate = true
    colAttr.needsUpdate = true
    sizeAttr.needsUpdate = true
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={totalCells}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colors, 3]}
          count={totalCells}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[sizes, 1]}
          count={totalCells}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.3}
        vertexColors
        transparent
        opacity={0.8}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function HoverTooltip() {
  const [hoverInfo, setHoverInfo] = useRef<{
    position: THREE.Vector3
    amplitude: number
  } | null>(null).current
  const sources = useWaveStore((s) => s.sources)
  const time = useWaveStore((s) => s.time)

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation()
      const point = event.point
      const pos: [number, number, number] = [point.x, point.y, point.z]
      const amp = sources
        .filter((s) => s.enabled)
        .reduce((sum, s) => sum + sphericalWaveAmplitude(s, pos, time), 0)
    },
    [sources, time]
  )

  void hoverInfo
  void handlePointerMove

  return null
}

function Stars() {
  const count = 500
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 100
      arr[i * 3 + 1] = (Math.random() - 0.5) * 100
      arr[i * 3 + 2] = (Math.random() - 0.5) * 100
    }
    return arr
  }, [])

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#ffffff" size={0.08} transparent opacity={0.6} sizeAttenuation />
    </points>
  )
}

export default function SceneRenderer() {
  const sources = useWaveStore((s) => s.sources)
  const mode = useWaveStore((s) => s.mode)
  const showInterference = useWaveStore((s) => s.showInterference)
  const setTime = useWaveStore((s) => s.setTime)
  const setFps = useWaveStore((s) => s.setFps)
  const timeRef = useRef(0)
  const fpsFrames = useRef(0)
  const fpsTime = useRef(0)

  useFrame((_, delta) => {
    timeRef.current += delta
    setTime(timeRef.current)

    fpsFrames.current++
    fpsTime.current += delta
    if (fpsTime.current >= 1.0) {
      setFps(Math.round(fpsFrames.current / fpsTime.current))
      fpsFrames.current = 0
      fpsTime.current = 0
    }
  })

  const activeSources = sources.filter((s) => s.enabled)

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.5} />

      <Stars />

      {mode === 'wave' && !showInterference && (
        <>
          {activeSources.map((source, idx) => (
            <WaveSourceMesh
              key={source.id}
              position={source.position}
              frequency={source.frequency}
              amplitude={source.amplitude}
              phase={source.phase}
              time={timeRef.current}
            />
          ))}
        </>
      )}

      {(showInterference || mode === 'interference-slice') && (
        <InterferenceCloud time={timeRef.current} />
      )}

      {mode === 'interference-slice' && (
        <InterferenceSlice time={timeRef.current} />
      )}

      {mode === 'energy' && <EnergyParticles time={timeRef.current} />}

      {activeSources.map((source, idx) => (
        <SourceMarker key={`marker-${source.id}`} position={source.position} index={idx} />
      ))}

      <HoverTooltip />
    </>
  )
}
