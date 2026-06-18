import { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Billboard, Text } from '@react-three/drei'
import { Bubble, useBubbleStore } from '../stores/bubbleStore'

interface BubbleNodeProps {
  bubble: Bubble
}

const vertexShader = `
  uniform float uTime;
  uniform float uFrequency;
  uniform float uAmplitude;
  uniform float uScale;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vWave;
  
  void main() {
    vNormal = normal;
    vPosition = position;
    
    float wave = sin(position.x * 2.0 + uTime * uFrequency) * 
                 cos(position.y * 2.0 + uTime * uFrequency * 0.7) *
                 sin(position.z * 2.0 + uTime * uFrequency * 0.5);
    vWave = wave;
    
    vec3 pos = position + normal * wave * uAmplitude * uScale;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uGlowIntensity;
  uniform float uScale;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying float vWave;
  
  void main() {
    vec3 lightDir = normalize(vec3(0.5, 1.0, 0.8));
    float diff = max(dot(vNormal, lightDir), 0.0);
    
    vec3 viewDir = normalize(cameraPosition - vPosition);
    vec3 reflectDir = reflect(-lightDir, vNormal);
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
    
    float rim = 1.0 - max(dot(viewDir, vNormal), 0.0);
    rim = pow(rim, 2.0) * uGlowIntensity;
    
    vec3 baseColor = uColor * (0.6 + diff * 0.4);
    baseColor += vec3(1.0, 1.0, 1.0) * spec * 0.3;
    baseColor += uColor * rim * 0.8;
    baseColor += uColor * vWave * 0.2;
    
    float alpha = uOpacity * 0.7 + rim * 0.3;
    
    gl_FragColor = vec4(baseColor, alpha);
  }
`

const textVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const textFragmentShader = `
  uniform sampler2D uTexture;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  
  void main() {
    vec4 tex = texture2D(uTexture, vUv);
    if (tex.a < 0.1) discard;
    gl_FragColor = vec4(uColor, uOpacity * tex.a);
  }
`

export function BubbleNode({ bubble }: BubbleNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const groupRef = useRef<THREE.Group>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragPlane = useRef(new THREE.Plane())
  const dragOffset = useRef(new THREE.Vector3())
  const dragIntersection = useRef(new THREE.Vector3())

  const {
    updateBubblePosition,
    updateBubbleVelocity,
    setSelectedBubble,
    setHighlightedBubble,
    setSpawnProgress,
    clearIsNewFlag,
    bubbles,
    highlightedBubbleId,
    setEditingBubble
  } = useBubbleStore()

  const isHighlighted = highlightedBubbleId === bubble.id

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uFrequency: { value: 0.2 },
    uAmplitude: { value: 0.05 },
    uColor: { value: new THREE.Color(bubble.color) },
    uOpacity: { value: 0.85 },
    uGlowIntensity: { value: isHighlighted ? 1.5 : 0.6 },
    uScale: { value: isHovered ? 1.2 : 1.0 }
  }), [bubble.color, isHovered, isHighlighted])

  const textSprites = useMemo(() => {
    const chars = bubble.text.split('')
    const count = chars.length
    const radius = bubble.radius + 0.15
    const sprites = []
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      sprites.push({
        char: chars[i],
        position: new THREE.Vector3(x, y, 0),
        rotation: angle + Math.PI / 2
      })
    }
    return sprites
  }, [bubble.text, bubble.radius])

  const displayPosition = useMemo(() => {
    if (bubble.isNew && bubble.spawnPosition && bubble.spawnProgress < 1) {
      const t = bubble.spawnProgress
      const easeOut = 1 - Math.pow(1 - t, 3)
      const start = bubble.spawnPosition
      const end = bubble.position
      const midY = Math.max(start.y, end.y) + 2
      const mid = new THREE.Vector3(
        (start.x + end.x) / 2,
        midY,
        (start.z + end.z) / 2
      )
      const a = start.clone().multiplyScalar((1 - easeOut) * (1 - easeOut))
      const b = mid.clone().multiplyScalar(2 * (1 - easeOut) * easeOut)
      const c = end.clone().multiplyScalar(easeOut * easeOut)
      return a.add(b).add(c)
    }
    return bubble.position
  }, [bubble.isNew, bubble.spawnPosition, bubble.spawnProgress, bubble.position])

  useFrame((state, delta) => {
    if (meshRef.current) {
      const material = meshRef.current.material as THREE.ShaderMaterial
      material.uniforms.uTime.value += delta
      const targetScale = isHovered ? 1.2 : 1.0
      material.uniforms.uScale.value += (targetScale - material.uniforms.uScale.value) * 10 * delta
      material.uniforms.uGlowIntensity.value += ((isHighlighted ? 1.5 : 0.6) - material.uniforms.uGlowIntensity.value) * 5 * delta
    }

    if (groupRef.current) {
      groupRef.current.position.lerp(displayPosition, 1 - Math.pow(0.01, delta))
      if (!isDragging && !bubble.isNew) {
        const velocity = bubble.velocity
        if (velocity.length() > 0.001) {
          const damping = 0.6
          const spring = 0.5
          const newVel = velocity.clone().multiplyScalar(damping)
          const displacement = groupRef.current.position.clone().sub(bubble.position)
          const springForce = displacement.multiplyScalar(-spring)
          newVel.add(springForce.multiplyScalar(delta))
          updateBubbleVelocity(bubble.id, newVel)
          const newPos = groupRef.current.position.clone().add(newVel.clone().multiplyScalar(delta * 60))
          updateBubblePosition(bubble.id, newPos)
        }
      }
    }

    if (bubble.isNew && bubble.spawnProgress < 1) {
      const newProgress = Math.min(bubble.spawnProgress + delta / 0.6, 1)
      setSpawnProgress(bubble.id, newProgress)
      if (newProgress >= 1) {
        clearIsNewFlag(bubble.id)
      }
    }
  })

  const handlePointerDown = (e: any) => {
    e.stopPropagation()
    setIsDragging(true)
    setSelectedBubble(bubble.id)
    const camera = e.camera
    dragPlane.current.setFromNormalAndCoplanarPoint(
      camera.getWorldDirection(dragPlane.current.normal).negate(),
      bubble.position
    )
    if (e.raycaster.ray.intersectPlane(dragPlane.current, dragIntersection.current)) {
      dragOffset.current.copy(bubble.position).sub(dragIntersection.current)
    }
  }

  const handlePointerMove = (e: any) => {
    if (!isDragging) return
    e.stopPropagation()
    if (e.raycaster.ray.intersectPlane(dragPlane.current, dragIntersection.current)) {
      const newPos = dragIntersection.current.clone().add(dragOffset.current)
      updateBubblePosition(bubble.id, newPos)
      if (groupRef.current) {
        groupRef.current.position.copy(newPos)
      }
    }
  }

  const handlePointerUp = (e: any) => {
    if (!isDragging) return
    e.stopPropagation()
    setIsDragging(false)
    bubbles.forEach(other => {
      if (other.id === bubble.id) return
      const dist = bubble.position.distanceTo(other.position)
      const minDist = bubble.radius + other.radius + 0.2
      if (dist < minDist) {
        const pushDir = other.position.clone().sub(bubble.position).normalize()
        const pushForce = (minDist - dist) * 0.3
        const newVel = other.velocity.clone().add(pushDir.multiplyScalar(pushForce))
        updateBubbleVelocity(other.id, newVel)
      }
    })
  }

  const handleDoubleClick = (e: any) => {
    e.stopPropagation()
    setEditingBubble(bubble.id)
  }

  const textColor = isHovered ? '#ffffff' : '#ffffff'
  const textOpacity = isHovered ? 1.0 : 0.7

  return (
    <group ref={groupRef} position={displayPosition}>
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={() => setIsHovered(false)}
        onPointerOver={() => setIsHovered(true)}
        onDoubleClick={handleDoubleClick}
      >
        <sphereGeometry args={[bubble.radius, 32, 32]} />
        <shaderMaterial
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {isHighlighted && (
        <mesh>
          <ringGeometry args={[bubble.radius * 1.15, bubble.radius * 1.25, 64]} />
          <meshBasicMaterial
            color={bubble.color}
            transparent
            opacity={0.6 + Math.sin(Date.now() * 0.005) * 0.4}
            side={THREE.DoubleSide}
          />
        </mesh>
      )}

      {textSprites.map((sprite, i) => (
        <Billboard key={i} position={sprite.position}>
          <Text
            fontSize={0.05}
            color={textColor}
            anchorX="center"
            anchorY="middle"
            font="Microsoft YaHei"
            material-transparent
            material-opacity={textOpacity}
          >
            {sprite.char}
          </Text>
        </Billboard>
      ))}
    </group>
  )
}
