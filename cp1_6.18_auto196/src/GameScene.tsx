import { useRef, useMemo, useEffect, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useGameStore, type Rune as RuneType, type Tentacle as TentacleType, type Particle as ParticleType } from './store'

function Floor() {
  const size = 32
  const tiles = 8
  const tileSize = size / tiles

  const tileGeometries = useMemo(() => {
    const geos: { x: number; z: number; geo: THREE.PlaneGeometry }[] = []
    for (let i = 0; i < tiles; i++) {
      for (let j = 0; j < tiles; j++) {
        geos.push({
          x: (i - tiles / 2 + 0.5) * tileSize,
          z: (j - tiles / 2 + 0.5) * tileSize,
          geo: new THREE.PlaneGeometry(tileSize * 0.96, tileSize * 0.96)
        })
      }
    }
    return geos
  }, [tileSize, tiles])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[size + 2, size + 2]} />
        <meshBasicMaterial color="#0a0a2e" transparent opacity={0.95} />
      </mesh>

      {tileGeometries.map((t, idx) => {
        const hue = 0.62 + (idx % 3) * 0.01
        const lightness = 0.18 + ((idx + Math.floor(idx / tiles)) % 2) * 0.04
        const color = new THREE.Color().setHSL(hue, 0.6, lightness)
        return (
          <mesh
            key={idx}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[t.x, 0.01, t.z]}
          >
            <primitive object={t.geo} attach="geometry" />
            <meshStandardMaterial
              color={color}
              transparent
              opacity={0.85}
              roughness={0.3}
              metalness={0.2}
              emissive={new THREE.Color().setHSL(hue, 0.4, 0.06)}
              emissiveIntensity={0.6}
            />
          </mesh>
        )
      })}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[size / 2 - 0.05, size / 2, 128]} />
        <meshBasicMaterial color="#3344aa" transparent opacity={0.8} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <ringGeometry args={[size / 2 + 0.05, size / 2 + 0.1, 128]} />
        <meshBasicMaterial color="#5566cc" transparent opacity={0.4} />
      </mesh>
    </group>
  )
}

function RuneMesh({ rune }: { rune: RuneType }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const time = useRef(rune.pulsePhase)
  const [visible, setVisible] = useState(!rune.activated)

  useEffect(() => {
    if (rune.activated) {
      const timer = setTimeout(() => setVisible(false), 400)
      return () => clearTimeout(timer)
    }
  }, [rune.activated])

  const hexShape = useMemo(() => {
    const shape = new THREE.Shape()
    const r = 0.45
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r
      if (i === 0) shape.moveTo(x, y)
      else shape.lineTo(x, y)
    }
    shape.closePath()
    return shape
  }, [])

  const hexGeo = useMemo(() => {
    return new THREE.ExtrudeGeometry(hexShape, {
      depth: 0.06,
      bevelEnabled: true,
      bevelSize: 0.02,
      bevelThickness: 0.02,
      bevelSegments: 2
    })
  }, [hexShape])

  const innerSymbol = useMemo(() => {
    const shape = new THREE.Shape()
    const patterns = [
      (s: THREE.Shape) => {
        const r = 0.22
        s.moveTo(0, -r)
        s.lineTo(r * 0.866, r * 0.5)
        s.lineTo(-r * 0.866, r * 0.5)
        s.closePath()
      },
      (s: THREE.Shape) => {
        const r = 0.2
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2
          const x = Math.cos(a) * r
          const y = Math.sin(a) * r
          if (i === 0) s.moveTo(x, y)
          else s.lineTo(x, y)
        }
        s.closePath()
      },
      (s: THREE.Shape) => {
        const r = 0.2
        s.absarc(0, 0, r, 0, Math.PI * 2)
        const hole = new THREE.Path()
        hole.absarc(0, 0, r * 0.5, 0, Math.PI * 2, true)
        s.holes.push(hole)
      },
      (s: THREE.Shape) => {
        const r = 0.22
        for (let i = 0; i < 5; i++) {
          const a1 = (i / 5) * Math.PI * 2 - Math.PI / 2
          const a2 = ((i + 0.5) / 5) * Math.PI * 2 - Math.PI / 2
          s.lineTo(Math.cos(a1) * r, Math.sin(a1) * r)
          s.lineTo(Math.cos(a2) * r * 0.45, Math.sin(a2) * r * 0.45)
        }
        s.closePath()
      },
      (s: THREE.Shape) => {
        const w = 0.32
        const h = 0.06
        s.moveTo(-w / 2, -h / 2)
        s.lineTo(w / 2, -h / 2)
        s.lineTo(w / 2, h / 2)
        s.lineTo(-w / 2, h / 2)
        s.closePath()
        const hole = new THREE.Path()
        hole.moveTo(-h / 2, -w / 2)
        hole.lineTo(-h / 2, w / 2)
        hole.lineTo(h / 2, w / 2)
        hole.lineTo(h / 2, -w / 2)
        hole.closePath()
        s.holes.push(hole)
      }
    ]
    patterns[rune.id % patterns.length](shape)
    return shape
  }, [rune.id])

  const symbolGeo = useMemo(() => {
    return new THREE.ExtrudeGeometry(innerSymbol, {
      depth: 0.08,
      bevelEnabled: false
    })
  }, [innerSymbol])

  useFrame((_, delta) => {
    time.current += delta

    if (!visible) return

    const baseColor = new THREE.Color(rune.color)
    const activationBoost = rune.activated
      ? Math.max(0, 1 - (Date.now() - rune.activationTime) / 400) * 3
      : 0
    const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(time.current * Math.PI))
    const intensity = (pulse + activationBoost)

    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      mat.emissive = baseColor
      mat.emissiveIntensity = intensity * 1.2
      mat.opacity = rune.activated ? Math.max(0, 1 - (Date.now() - rune.activationTime) / 400) : 1
      mat.needsUpdate = true
    }

    if (glowRef.current) {
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.color = baseColor
      mat.opacity = intensity * 0.4
      mat.needsUpdate = true
      const s = 1 + 0.08 * Math.sin(time.current * Math.PI)
      glowRef.current.scale.set(s, s, 1)
    }
  })

  if (!visible) return null

  return (
    <group position={[rune.position.x, 0.05, rune.position.z]}>
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <circleGeometry args={[0.8, 32]} />
        <meshBasicMaterial
          color={rune.color}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} geometry={hexGeo}>
        <meshStandardMaterial
          color={rune.color}
          transparent
          opacity={1}
          roughness={0.2}
          metalness={0.6}
          emissive={rune.color}
          emissiveIntensity={0.8}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} geometry={symbolGeo}>
        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.95}
        />
      </mesh>
    </group>
  )
}

function Sigil() {
  const groupRef = useRef<THREE.Group>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const sigil = useGameStore(state => state.sigil)
  const velocity = useGameStore(state => state.sigilVelocity)
  const isBoosting = useGameStore(state => state.isBoosting)

  const triangleGeo = useMemo(() => {
    const shape = new THREE.Shape()
    const r = 0.28
    shape.moveTo(0, r)
    shape.lineTo(r * 0.866, -r * 0.5)
    shape.lineTo(-r * 0.866, -r * 0.5)
    shape.closePath()
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSize: 0.03,
      bevelThickness: 0.03,
      bevelSegments: 3
    })
  }, [])

  useFrame((_, delta) => {
    time.current += delta

    if (groupRef.current) {
      groupRef.current.position.x = sigil.x
      groupRef.current.position.z = sigil.z

      const speed = Math.sqrt(velocity.x ** 2 + velocity.z ** 2)
      if (speed > 0.1) {
        const angle = Math.atan2(velocity.x, velocity.z)
        groupRef.current.rotation.y = -angle
      }

      const bobY = 0.18 + 0.03 * Math.sin(time.current * 4)
      groupRef.current.position.y = bobY

      const rotSpeed = isBoosting ? 8 : 3
      groupRef.current.rotation.x = -Math.PI / 2 + 0.08 * Math.sin(time.current * rotSpeed)
    }

    if (glowRef.current) {
      const scale = isBoosting ? 1.8 + 0.2 * Math.sin(time.current * 15) : 1.3 + 0.1 * Math.sin(time.current * 5)
      glowRef.current.scale.set(scale, scale, 1)
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.color = isBoosting ? new THREE.Color('#ffffff') : new THREE.Color('#ffd700')
      mat.opacity = isBoosting ? 0.7 : 0.5
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshBasicMaterial
          color="#ffd700"
          transparent
          opacity={0.5}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh geometry={triangleGeo}>
        <meshStandardMaterial
          color="#ffd700"
          emissive="#ffed4e"
          emissiveIntensity={isBoosting ? 3 : 1.5}
          metalness={0.9}
          roughness={0.1}
          transparent
          opacity={0.95}
        />
      </mesh>

      <pointLight
        color={isBoosting ? '#ffffff' : '#ffd700'}
        intensity={isBoosting ? 3 : 1.5}
        distance={4}
        position={[0, 0.3, 0]}
      />
    </group>
  )
}

function TrailParticles() {
  const particles = useGameStore(state => state.particles)
  const groupRef = useRef<THREE.Group>(null)
  const meshes = useRef<Map<number, THREE.Mesh>>(new Map())
  const geoRef = useRef<THREE.SphereGeometry>(new THREE.SphereGeometry(1, 8, 8))

  useFrame(() => {
    particles.forEach(p => {
      let mesh = meshes.current.get(p.id)
      if (!mesh) {
        mesh = new THREE.Mesh(
          geoRef.current,
          new THREE.MeshBasicMaterial({
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
          })
        )
        meshes.current.set(p.id, mesh)
        if (groupRef.current) groupRef.current.add(mesh)
      }

      const age = p.life / p.maxLife
      const opacity = Math.max(0, (1 - age))
      const mat = mesh.material as THREE.MeshBasicMaterial
      mat.color.set(p.color)
      mat.opacity = opacity * 0.9
      mat.needsUpdate = true

      const s = p.size * (1 + age * 1.2)
      mesh.position.set(p.position.x, 0.1, p.position.z)
      mesh.scale.set(s, s, s)
    })

    meshes.current.forEach((mesh, id) => {
      const exists = particles.some(p => p.id === id)
      if (!exists) {
        if (groupRef.current) groupRef.current.remove(mesh)
        mesh.geometry.dispose()
        const mat = mesh.material as THREE.Material
        mat.dispose()
        meshes.current.delete(id)
      }
    })
  })

  return <group ref={groupRef} />
}

function Tentacle({ tentacle }: { tentacle: TentacleType }) {
  const groupRef = useRef<THREE.Group>(null)
  const meshes = useRef<THREE.Mesh[]>([])

  const colors = useMemo(() => {
    const arr: THREE.Color[] = []
    for (let i = 0; i < tentacle.segments.length; i++) {
      const t = i / tentacle.segments.length
      const c = new THREE.Color().setHSL(0.78, 0.85, 0.2 + 0.25 * (1 - t))
      arr.push(c)
    }
    return arr
  }, [tentacle.id])

  useFrame((_, delta) => {
    while (meshes.current.length < tentacle.segments.length) {
      const idx = meshes.current.length
      const geo = new THREE.SphereGeometry(1, 12, 12)
      const mat = new THREE.MeshStandardMaterial({
        color: colors[idx] || new THREE.Color('#660088'),
        emissive: new THREE.Color('#330055'),
        emissiveIntensity: 0.8,
        transparent: true,
        opacity: 0.92,
        roughness: 0.3,
        metalness: 0.4
      })
      const mesh = new THREE.Mesh(geo, mat)
      meshes.current.push(mesh)
      if (groupRef.current) groupRef.current.add(mesh)
    }

    tentacle.segments.forEach((seg, i) => {
      const mesh = meshes.current[i]
      if (!mesh) return
      const t = i / tentacle.segments.length
      const radius = 0.08 + 0.15 * (1 - t)
      mesh.position.set(seg.x, 0.08 + 0.02 * Math.sin(Date.now() / 200 + i * 0.5), seg.z)
      mesh.scale.set(radius * 2, radius * 2, radius * 2)
    })

    for (let i = tentacle.segments.length; i < meshes.current.length; i++) {
      const mesh = meshes.current[i]
      if (mesh && groupRef.current) {
        groupRef.current.remove(mesh)
        mesh.geometry.dispose()
        const mat = mesh.material as THREE.Material
        mat.dispose()
      }
    }
    meshes.current = meshes.current.slice(0, tentacle.segments.length)
  })

  return <group ref={groupRef} />
}

function Tentacles() {
  const tentacles = useGameStore(state => state.tentacles)
  return (
    <>
      {tentacles.map(t => (
        <Tentacle key={t.id} tentacle={t} />
      ))}
    </>
  )
}

function Runes() {
  const runes = useGameStore(state => state.runes)
  return (
    <>
      {runes.map(r => (
        <RuneMesh key={r.id} rune={r} />
      ))}
    </>
  )
}

function Portal() {
  const active = useGameStore(state => state.portalActive)
  const ring1Ref = useRef<THREE.Mesh>(null)
  const ring2Ref = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const time = useRef(0)
  const [opacity, setOpacity] = useState(0)

  useEffect(() => {
    let raf: number
    const start = Date.now()
    const anim = () => {
      const elapsed = (Date.now() - start) / 1000
      if (active) {
        setOpacity(Math.min(1, elapsed * 1.5))
      } else {
        setOpacity(Math.max(0, opacity - 0.02))
      }
      raf = requestAnimationFrame(anim)
    }
    raf = requestAnimationFrame(anim)
    return () => cancelAnimationFrame(raf)
  }, [active])

  useFrame((_, delta) => {
    time.current += delta
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 1.2
      ring1Ref.current.rotation.x = Math.sin(time.current * 0.5) * 0.2
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * 1.5
      ring2Ref.current.rotation.y = Math.cos(time.current * 0.7) * 0.3
    }
    if (glowRef.current) {
      const s = 1 + 0.15 * Math.sin(time.current * 3)
      glowRef.current.scale.set(s, s, 1)
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = opacity * (0.4 + 0.1 * Math.sin(time.current * 5))
    }
  })

  if (!active && opacity < 0.01) return null

  return (
    <group position={[0, 0.5, 0]}>
      <mesh ref={glowRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
        <circleGeometry args={[2.2, 48]} />
        <meshBasicMaterial
          color="#2288ff"
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={ring1Ref}>
        <torusGeometry args={[1.1, 0.12, 24, 64]} />
        <meshStandardMaterial
          color="#44aaff"
          emissive="#2288ff"
          emissiveIntensity={2.5 * opacity}
          metalness={0.8}
          roughness={0.1}
          transparent
          opacity={opacity}
        />
      </mesh>

      <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[0.85, 0.08, 20, 48]} />
        <meshStandardMaterial
          color="#88ccff"
          emissive="#66aaff"
          emissiveIntensity={2 * opacity}
          metalness={0.7}
          roughness={0.15}
          transparent
          opacity={opacity * 0.9}
        />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.9, 32]} />
        <meshBasicMaterial
          color="#66bbff"
          transparent
          opacity={opacity * 0.35}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <pointLight
        color="#2288ff"
        intensity={3 * opacity}
        distance={8}
        position={[0, 0.5, 0]}
      />
    </group>
  )
}

function OrthoCamera() {
  const { camera, size } = useThree()
  const aspect = size.width / size.height
  const frustum = 18

  useEffect(() => {
    const orthoCam = camera as THREE.OrthographicCamera
    orthoCam.left = -frustum * aspect
    orthoCam.right = frustum * aspect
    orthoCam.top = frustum
    orthoCam.bottom = -frustum
    orthoCam.near = -100
    orthoCam.far = 200
    orthoCam.updateProjectionMatrix()
  }, [camera, aspect, frustum])

  useFrame(() => {
    const orthoCam = camera as THREE.OrthographicCamera
    orthoCam.position.set(0, 25, 0.01)
    orthoCam.lookAt(0, 0, 0)
    orthoCam.up.set(0, 0, -1)
  })

  return null
}

function SceneContent() {
  return (
    <>
      <OrthoCamera />
      <ambientLight intensity={0.35} color="#6677aa" />
      <directionalLight
        position={[8, 15, 6]}
        intensity={0.6}
        color="#aabbff"
        castShadow
      />
      <directionalLight
        position={[-6, 10, -8]}
        intensity={0.3}
        color="#aa88ff"
      />

      <fog attach="fog" args={['#0a0a2e', 18, 45]} />

      <Floor />
      <Runes />
      <Sigil />
      <Tentacles />
      <TrailParticles />
      <Portal />
    </>
  )
}

export default function GameScene() {
  return (
    <Canvas
      orthographic
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'linear-gradient(180deg, #0a0a2e 0%, #050518 100%)' }}
      dpr={[1, 2]}
    >
      <SceneContent />
    </Canvas>
  )
}
