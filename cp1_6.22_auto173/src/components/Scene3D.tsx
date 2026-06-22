import React, { useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { IStarParams } from '../data/starData'

export interface Scene3DHandle {
  updateStar: (params: IStarParams) => void
  startRotation: (speed: number) => void
  stopRotation: () => void
  toggleAutoOrbit: () => boolean
}

interface Scene3DProps {
  evolutionEnd?: { radius: number; temp: number }
}

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform float uTime;
  uniform float uTemperature;

  float noise(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.0;
      amplitude *= 0.5;
    }
    return value;
  }

  void main() {
    vUv = uv;
    vNormal = normal;
    vPosition = position;

    vec3 pos = position;
    float noiseScale = 0.05 + (uTemperature / 50000.0) * 0.1;
    float n = fbm(pos * 2.0 + uTime * 0.1);
    pos += normal * n * noiseScale;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`

const fragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  uniform vec3 uColor;
  uniform float uTime;
  uniform float uTemperature;

  float noise(vec3 p) {
    return fract(sin(dot(p, vec3(12.9898, 78.233, 45.543))) * 43758.5453);
  }

  void main() {
    vec3 lightDir = normalize(vec3(1.0, 1.0, 1.0));
    float diff = max(dot(vNormal, lightDir), 0.0);

    float n = noise(vPosition * 3.0 + uTime * 0.2);
    float turbulence = 0.5 + 0.5 * sin(vPosition.x * 10.0 + uTime) * sin(vPosition.y * 10.0 + uTime * 0.7);

    float tempFactor = uTemperature / 50000.0;
    vec3 baseColor = uColor;
    vec3 hotSpot = vec3(1.0, 0.9, 0.7) * tempFactor;

    vec3 finalColor = mix(baseColor, hotSpot, n * turbulence * 0.3);
    finalColor *= 0.3 + 0.7 * diff;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

const Scene3D = forwardRef<Scene3DHandle, Scene3DProps>(({ evolutionEnd }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const starMeshRef = useRef<THREE.Mesh | null>(null)
  const haloSpriteRef = useRef<THREE.Sprite | null>(null)
  const trailLineRef = useRef<THREE.Line | null>(null)
  const glowPointsRef = useRef<THREE.Points | null>(null)
  const autoOrbitRef = useRef(false)
  const rotationSpeedRef = useRef(0)
  const animationIdRef = useRef<number>(0)
  const timeRef = useRef(0)
  const starMaterialRef = useRef<THREE.ShaderMaterial | null>(null)

  useImperativeHandle(ref, () => ({
    updateStar: (params: IStarParams) => {
      updateStarMesh(params)
      updateHalo(params)
    },
    startRotation: (speed: number) => {
      rotationSpeedRef.current = speed
    },
    stopRotation: () => {
      rotationSpeedRef.current = 0
    },
    toggleAutoOrbit: () => {
      autoOrbitRef.current = !autoOrbitRef.current
      if (!autoOrbitRef.current && controlsRef.current) {
        controlsRef.current.reset()
      }
      return autoOrbitRef.current
    },
  }))

  const createStarField = useCallback((scene: THREE.Scene) => {
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(2000 * 3)
    const colors = new Float32Array(2000 * 3)

    for (let i = 0; i < 2000; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 500 + Math.random() * 500

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)

      const colorT = Math.random()
      colors[i * 3] = 0.8 + colorT * 0.2
      colors[i * 3 + 1] = 0.9 + colorT * 0.1
      colors[i * 3 + 2] = 1.0
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    })

    const points = new THREE.Points(geometry, material)
    scene.add(points)
  }, [])

  const createStarMesh = useCallback((scene: THREE.Scene) => {
    const geometry = new THREE.SphereGeometry(1, 64, 64)
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uColor: { value: new THREE.Color(1, 0.8, 0.6) },
        uTime: { value: 0 },
        uTemperature: { value: 5778 },
      },
    })

    starMaterialRef.current = material
    const mesh = new THREE.Mesh(geometry, material)
    scene.add(mesh)
    starMeshRef.current = mesh
  }, [])

  const createHalo = useCallback((scene: THREE.Scene) => {
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 256
    const ctx = canvas.getContext('2d')!

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128)
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)')
    gradient.addColorStop(0.3, 'rgba(255, 200, 100, 0.5)')
    gradient.addColorStop(0.6, 'rgba(255, 150, 50, 0.2)')
    gradient.addColorStop(1, 'rgba(255, 100, 0, 0)')

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 256, 256)

    const texture = new THREE.CanvasTexture(canvas)
    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    })

    const sprite = new THREE.Sprite(material)
    sprite.scale.set(4, 4, 1)
    scene.add(sprite)
    haloSpriteRef.current = sprite
  }, [])

  const createEvolutionTrail = useCallback((scene: THREE.Scene, endRadius?: number) => {
    if (trailLineRef.current) {
      scene.remove(trailLineRef.current)
    }
    if (glowPointsRef.current) {
      scene.remove(glowPointsRef.current)
    }

    const points: THREE.Vector3[] = []
    const startRadius = starMeshRef.current?.geometry.parameters?.radius || 1
    const endR = endRadius || startRadius * 0.5

    for (let i = 0; i <= 50; i++) {
      const t = i / 50
      const radius = startRadius + (endR - startRadius) * t
      const angle = t * Math.PI * 0.5
      const x = Math.sin(angle) * radius * 2
      const y = (t - 0.5) * 3
      const z = Math.cos(angle) * radius * 2
      points.push(new THREE.Vector3(x, y, z))
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const color = new THREE.Color()
    const colors = new Float32Array(points.length * 3)

    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1)
      color.setHSL(0.15 - t * 0.15, 1, 0.5 + t * 0.1)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))

    const material = new THREE.LineDashedMaterial({
      vertexColors: true,
      dashSize: 0.3,
      gapSize: 0.2,
      linewidth: 2,
      transparent: true,
      opacity: 0.8,
    })

    const line = new THREE.Line(geometry, material)
    line.computeLineDistances()
    scene.add(line)
    trailLineRef.current = line

    const glowGeometry = new THREE.BufferGeometry()
    const glowPositions = new Float32Array(10 * 3)
    glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositions, 3))

    const glowMaterial = new THREE.PointsMaterial({
      color: 0xffd700,
      size: 0.15,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
    })

    const glowPoints = new THREE.Points(glowGeometry, glowMaterial)
    scene.add(glowPoints)
    glowPointsRef.current = glowPoints
  }, [])

  const updateStarMesh = (params: IStarParams) => {
    if (!starMeshRef.current || !starMaterialRef.current) return

    starMeshRef.current.geometry.dispose()
    starMeshRef.current.geometry = new THREE.SphereGeometry(Math.min(params.radius * 0.5, 10), 64, 64)

    starMaterialRef.current.uniforms.uColor.value = new THREE.Color(
      params.color.r,
      params.color.g,
      params.color.b
    )
    starMaterialRef.current.uniforms.uTemperature.value = params.temperature

    rotationSpeedRef.current = params.rotationSpeed
  }

  const updateHalo = (params: IStarParams) => {
    if (!haloSpriteRef.current) return

    const scale = Math.min(params.radius * 2, 20)
    haloSpriteRef.current.scale.set(scale, scale, 1)

    const material = haloSpriteRef.current.material as THREE.SpriteMaterial
    material.opacity = 0.6 + (params.temperature / 50000) * 0.4
  }

  useEffect(() => {
    if (!containerRef.current) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a1a)
    sceneRef.current = scene

    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      2000
    )
    camera.position.set(0, 3, 8)
    cameraRef.current = camera

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    containerRef.current.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 3
    controls.maxDistance = 50
    controlsRef.current = controls

    const ambientLight = new THREE.AmbientLight(0x404040, 0.3)
    scene.add(ambientLight)

    const pointLight = new THREE.PointLight(0xffffff, 1, 100)
    pointLight.position.set(5, 5, 5)
    scene.add(pointLight)

    createStarField(scene)
    createStarMesh(scene)
    createHalo(scene)
    createEvolutionTrail(scene)

    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate)
      timeRef.current += 0.016

      if (starMaterialRef.current) {
        starMaterialRef.current.uniforms.uTime.value = timeRef.current
      }

      if (starMeshRef.current && rotationSpeedRef.current > 0) {
        starMeshRef.current.rotation.y += rotationSpeedRef.current * 0.01
      }

      if (autoOrbitRef.current && controlsRef.current) {
        const angle = timeRef.current * (Math.PI * 2 / 30)
        const radius = 8
        camera.position.x = Math.sin(angle) * radius
        camera.position.z = Math.cos(angle) * radius
        camera.position.y = 3
        camera.lookAt(0, 0, 0)
      } else {
        controls.update()
      }

      if (glowPointsRef.current && trailLineRef.current) {
        const positions = glowPointsRef.current.geometry.attributes.position.array as Float32Array
        const linePos = trailLineRef.current.geometry.attributes.position.array as Float32Array
        const lineLen = linePos.length / 3

        for (let i = 0; i < 10; i++) {
          const t = ((timeRef.current * 0.3 + i * 0.1) % 1)
          const idx = Math.floor(t * (lineLen - 1))
          const fract = t * (lineLen - 1) - idx

          if (idx < lineLen - 1) {
            positions[i * 3] = linePos[idx * 3] + (linePos[(idx + 1) * 3] - linePos[idx * 3]) * fract
            positions[i * 3 + 1] = linePos[idx * 3 + 1] + (linePos[(idx + 1) * 3 + 1] - linePos[idx * 3 + 1]) * fract
            positions[i * 3 + 2] = linePos[idx * 3 + 2] + (linePos[(idx + 1) * 3 + 2] - linePos[idx * 3 + 2]) * fract
          }
        }
        glowPointsRef.current.geometry.attributes.position.needsUpdate = true
      }

      renderer.render(scene, camera)
    }

    animate()

    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return

      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight
      cameraRef.current.updateProjectionMatrix()
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight)
    }

    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationIdRef.current)

      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement)
        rendererRef.current.dispose()
      }
    }
  }, [createStarField, createStarMesh, createHalo, createEvolutionTrail])

  useEffect(() => {
    if (evolutionEnd && sceneRef.current) {
      createEvolutionTrail(sceneRef.current, evolutionEnd.radius)
    }
  }, [evolutionEnd, createEvolutionTrail])

  return <div ref={containerRef} className="scene3d-container" />
})

Scene3D.displayName = 'Scene3D'

export default Scene3D
