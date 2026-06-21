import * as THREE from 'three'
import gsap from 'gsap'

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'thunderstorm'

export interface SceneParams {
  windSpeed: number
  timeOfDay: number
}

export interface WeatherColors {
  skyTop: number
  skyBottom: number
  ambient: number
  directional: number
  fog: number
  ground: number
  intensity: number
}

const weatherPresets: Record<WeatherType, WeatherColors> = {
  sunny: {
    skyTop: 0x87ceeb,
    skyBottom: 0xfff8dc,
    ambient: 0xffffff,
    directional: 0xfff5e6,
    fog: 0x87ceeb,
    ground: 0x7cb342,
    intensity: 1.0,
  },
  cloudy: {
    skyTop: 0x90a4ae,
    skyBottom: 0xcfd8dc,
    ambient: 0xeceff1,
    directional: 0xffffff,
    fog: 0xb0bec5,
    ground: 0x8d9e6d,
    intensity: 0.6,
  },
  rainy: {
    skyTop: 0x546e7a,
    skyBottom: 0x78909c,
    ambient: 0x90a4ae,
    directional: 0xb0bec5,
    fog: 0x607d8b,
    ground: 0x5d7c3a,
    intensity: 0.4,
  },
  snowy: {
    skyTop: 0xb0bec5,
    skyBottom: 0xeceff1,
    ambient: 0xffffff,
    directional: 0xe3f2fd,
    fog: 0xcfd8dc,
    ground: 0xfafafa,
    intensity: 0.7,
  },
  thunderstorm: {
    skyTop: 0x263238,
    skyBottom: 0x37474f,
    ambient: 0x455a64,
    directional: 0x607d8b,
    fog: 0x263238,
    ground: 0x4a5f2d,
    intensity: 0.2,
  },
}

export class SceneManager {
  public scene: THREE.Scene
  public camera: THREE.PerspectiveCamera
  public renderer: THREE.WebGLRenderer

  private ground!: THREE.Mesh
  private grassBlades: THREE.Mesh[] = []
  private treeTrunk!: THREE.Mesh
  private treeCrown!: THREE.Mesh
  private pathSegments: THREE.Mesh[] = []
  private streetLights: { pole: THREE.Mesh; bulb: THREE.Mesh; light: THREE.PointLight }[] = []
  private skyDome!: THREE.Mesh
  private ambientLight!: THREE.AmbientLight
  private directionalLight!: THREE.DirectionalLight
  private sunMesh!: THREE.Mesh
  private stars!: THREE.Points
  private snowGround!: THREE.Mesh

  private currentWeather: WeatherType = 'sunny'
  private currentColors: WeatherColors = { ...weatherPresets.sunny }
  private params: SceneParams = { windSpeed: 3, timeOfDay: 12 }

  private crownBaseRotation = { x: 0, z: 0 }
  private time = 0

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene()
    this.scene.fog = new THREE.Fog(weatherPresets.sunny.fog, 20, 80)

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    )
    this.camera.position.set(0, 8, 20)
    this.camera.lookAt(0, 3, 0)

    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0

    container.appendChild(this.renderer.domElement)

    this.createGround()
    this.createGrass()
    this.createTree()
    this.createPath()
    this.createStreetLights()
    this.createSkyDome()
    this.createLights()
    this.createSun()
    this.createStars()
    this.createSnowGround()

    window.addEventListener('resize', () => this.onResize(container))
  }

  private createGround() {
    const geometry = new THREE.PlaneGeometry(100, 100, 50, 50)
    const material = new THREE.MeshStandardMaterial({
      color: 0x7cb342,
      roughness: 0.9,
      metalness: 0.1,
    })
    this.ground = new THREE.Mesh(geometry, material)
    this.ground.rotation.x = -Math.PI / 2
    this.ground.receiveShadow = true
    this.scene.add(this.ground)
  }

  private createGrass() {
    const grassGeometry = new THREE.ConeGeometry(0.1, 0.5, 4)
    const grassColors = [0x558b2f, 0x689f38, 0x7cb342, 0x8bc34a, 0x9ccc65]

    for (let i = 0; i < 500; i++) {
      const color = grassColors[Math.floor(Math.random() * grassColors.length)]
      const material = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.8,
      })
      const blade = new THREE.Mesh(grassGeometry, material)

      const angle = Math.random() * Math.PI * 2
      const radius = 3 + Math.random() * 25
      blade.position.set(
        Math.cos(angle) * radius,
        0.25,
        Math.sin(angle) * radius
      )
      blade.rotation.y = Math.random() * Math.PI
      blade.scale.setScalar(0.5 + Math.random() * 1)
      blade.castShadow = true
      this.grassBlades.push(blade)
      this.scene.add(blade)
    }
  }

  private createTree() {
    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.5, 3, 8)
    const trunkMaterial = new THREE.MeshStandardMaterial({
      color: 0x6d4c41,
      roughness: 0.9,
    })
    this.treeTrunk = new THREE.Mesh(trunkGeometry, trunkMaterial)
    this.treeTrunk.position.set(0, 1.5, 0)
    this.treeTrunk.castShadow = true
    this.scene.add(this.treeTrunk)

    const crownGeometry = new THREE.SphereGeometry(2.5, 16, 16)
    const crownMaterial = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.8,
    })
    this.treeCrown = new THREE.Mesh(crownGeometry, crownMaterial)
    this.treeCrown.position.set(0, 4.5, 0)
    this.treeCrown.castShadow = true
    this.scene.add(this.treeCrown)
  }

  private createPath() {
    const pathMaterial = new THREE.MeshStandardMaterial({
      color: 0xbcaaa4,
      roughness: 0.95,
    })

    const pathPoints: THREE.Vector3[] = []
    for (let i = 0; i < 20; i++) {
      const x = Math.sin(i * 0.5) * 2
      const z = -15 + i * 1.5
      pathPoints.push(new THREE.Vector3(x, 0.02, z))
    }

    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i]
      const p2 = pathPoints[i + 1]
      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5)
      const dist = p1.distanceTo(p2)
      const angle = Math.atan2(p2.x - p1.x, p2.z - p1.z)

      const geometry = new THREE.BoxGeometry(1.5, 0.05, dist + 0.2)
      const segment = new THREE.Mesh(geometry, pathMaterial)
      segment.position.copy(mid)
      segment.position.y = 0.02
      segment.rotation.y = angle
      segment.receiveShadow = true
      this.pathSegments.push(segment)
      this.scene.add(segment)
    }
  }

  private createStreetLights() {
    const lightPositions = [
      { x: -3, z: -10 },
      { x: 3, z: -5 },
      { x: -2, z: 0 },
      { x: 2.5, z: 5 },
      { x: -2.5, z: 10 },
    ]

    lightPositions.forEach((pos) => {
      const poleGeometry = new THREE.CylinderGeometry(0.05, 0.08, 2, 8)
      const poleMaterial = new THREE.MeshStandardMaterial({
        color: 0x37474f,
        metalness: 0.5,
        roughness: 0.5,
      })
      const pole = new THREE.Mesh(poleGeometry, poleMaterial)
      pole.position.set(pos.x, 1, pos.z)
      pole.castShadow = true
      this.scene.add(pole)

      const bulbGeometry = new THREE.SphereGeometry(0.15, 8, 8)
      const bulbMaterial = new THREE.MeshBasicMaterial({
        color: 0xfff8e1,
      })
      const bulb = new THREE.Mesh(bulbGeometry, bulbMaterial)
      bulb.position.set(pos.x, 2.1, pos.z)
      this.scene.add(bulb)

      const pointLight = new THREE.PointLight(0xfff8e1, 0, 8, 2)
      pointLight.position.set(pos.x, 2, pos.z)
      pointLight.castShadow = true
      this.scene.add(pointLight)

      this.streetLights.push({ pole, bulb, light: pointLight })
    })
  }

  private createSkyDome() {
    const skyGeometry = new THREE.SphereGeometry(80, 32, 32)
    const skyMaterial = new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x87ceeb) },
        bottomColor: { value: new THREE.Color(0xfff8dc) },
        offset: { value: 20 },
        exponent: { value: 0.6 },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition + offset).y;
          gl_FragColor = vec4(mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0)), 1.0);
        }
      `,
      side: THREE.BackSide,
    })
    this.skyDome = new THREE.Mesh(skyGeometry, skyMaterial)
    this.scene.add(this.skyDome)
  }

  private createLights() {
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
    this.scene.add(this.ambientLight)

    this.directionalLight = new THREE.DirectionalLight(0xfff5e6, 1)
    this.directionalLight.position.set(10, 20, 10)
    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.width = 2048
    this.directionalLight.shadow.mapSize.height = 2048
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 100
    this.directionalLight.shadow.camera.left = -30
    this.directionalLight.shadow.camera.right = 30
    this.directionalLight.shadow.camera.top = 30
    this.directionalLight.shadow.camera.bottom = -30
    this.scene.add(this.directionalLight)
  }

  private createSun() {
    const sunGeometry = new THREE.SphereGeometry(2, 32, 32)
    const sunMaterial = new THREE.MeshBasicMaterial({
      color: 0xfff8e1,
    })
    this.sunMesh = new THREE.Mesh(sunGeometry, sunMaterial)
    this.sunMesh.position.set(20, 30, -30)
    this.scene.add(this.sunMesh)
  }

  private createStars() {
    const starsGeometry = new THREE.BufferGeometry()
    const starPositions: number[] = []
    const starSizes: number[] = []

    for (let i = 0; i < 1000; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.4
      const r = 75

      starPositions.push(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.cos(phi) + 10,
        r * Math.sin(phi) * Math.sin(theta)
      )
      starSizes.push(Math.random() * 0.3 + 0.1)
    }

    starsGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(starPositions, 3)
    )
    starsGeometry.setAttribute(
      'size',
      new THREE.Float32BufferAttribute(starSizes, 1)
    )

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.2,
      transparent: true,
      opacity: 0,
      sizeAttenuation: true,
    })
    this.stars = new THREE.Points(starsGeometry, starsMaterial)
    this.scene.add(this.stars)
  }

  private createSnowGround() {
    const geometry = new THREE.PlaneGeometry(100, 100)
    const material = new THREE.MeshStandardMaterial({
      color: 0xfafafa,
      transparent: true,
      opacity: 0,
      roughness: 0.9,
      metalness: 0.1,
    })
    this.snowGround = new THREE.Mesh(geometry, material)
    this.snowGround.rotation.x = -Math.PI / 2
    this.snowGround.position.y = 0.03
    this.snowGround.receiveShadow = true
    this.scene.add(this.snowGround)
  }

  private onResize(container: HTMLElement) {
    this.camera.aspect = container.clientWidth / container.clientHeight
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(container.clientWidth, container.clientHeight)
  }

  public setWeather(weather: WeatherType) {
    const targetColors = weatherPresets[weather]
    this.currentWeather = weather

    const skyMaterial = this.skyDome.material as THREE.ShaderMaterial

    gsap.to(this.currentColors, {
      topColor: targetColors.skyTop,
      bottomColor: targetColors.skyBottom,
      ambient: targetColors.ambient,
      directional: targetColors.directional,
      fog: targetColors.fog,
      ground: targetColors.ground,
      intensity: targetColors.intensity,
      duration: 1.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        skyMaterial.uniforms.topColor.value.setHex(this.currentColors.skyTop)
        skyMaterial.uniforms.bottomColor.value.setHex(this.currentColors.skyBottom)
        this.ambientLight.color.setHex(this.currentColors.ambient)
        this.ambientLight.intensity = 0.3 + this.currentColors.intensity * 0.3
        this.directionalLight.color.setHex(this.currentColors.directional)
        this.directionalLight.intensity = this.currentColors.intensity
        ;(this.scene.fog as THREE.Fog).color.setHex(this.currentColors.fog)
        ;(this.ground.material as THREE.MeshStandardMaterial).color.setHex(this.currentColors.ground)
      },
    })

    const isSnowy = weather === 'snowy'
    gsap.to(this.snowGround.material, {
      opacity: isSnowy ? 0.9 : 0,
      duration: 1.5,
      ease: 'power2.inOut',
    })

    const isNight = this.params.timeOfDay < 6 || this.params.timeOfDay > 19
    const streetLightIntensity = isNight ? 1.5 : weather === 'thunderstorm' ? 1 : 0.3
    this.streetLights.forEach(({ light }) => {
      gsap.to(light, {
        intensity: streetLightIntensity,
        duration: 1.5,
      })
    })
  }

  public setParams(params: Partial<SceneParams>) {
    this.params = { ...this.params, ...params }
    this.updateTimeOfDay()
  }

  private updateTimeOfDay() {
    const time = this.params.timeOfDay
    let sunAngle: number
    let sunHeight: number
    let skyTop: number
    let skyBottom: number
    let ambientIntensity: number
    let starOpacity: number

    if (time >= 6 && time <= 8) {
      const t = (time - 6) / 2
      sunAngle = -Math.PI * 0.4 + t * Math.PI * 0.4
      sunHeight = 2 + t * 25
      skyTop = this.lerpColor(0x1a237e, 0x87ceeb, t)
      skyBottom = this.lerpColor(0xff7043, 0xfff8dc, t)
      ambientIntensity = 0.2 + t * 0.3
      starOpacity = 1 - t
    } else if (time > 8 && time <= 17) {
      const t = (time - 8) / 9
      sunAngle = (t - 0.5) * Math.PI * 0.6
      sunHeight = 25 + Math.sin(t * Math.PI) * 10
      skyTop = 0x87ceeb
      skyBottom = 0xfff8dc
      ambientIntensity = 0.5
      starOpacity = 0
    } else if (time > 17 && time <= 20) {
      const t = (time - 17) / 3
      sunAngle = Math.PI * 0.3 - t * Math.PI * 0.5
      sunHeight = 25 - t * 20
      skyTop = this.lerpColor(0x87ceeb, 0x4a148c, t)
      skyBottom = this.lerpColor(0xfff8dc, 0xff5722, t * 0.7)
      ambientIntensity = 0.5 - t * 0.3
      starOpacity = t * 0.8
    } else {
      let t = time > 20 ? (time - 20) / 10 : (time + 4) / 10
      if (t > 1) t = 1
      sunAngle = -Math.PI * 0.4
      sunHeight = -5
      skyTop = 0x0d1b2a
      skyBottom = 0x1a237e
      ambientIntensity = 0.15
      starOpacity = 1
    }

    const sunRadius = 35
    this.sunMesh.position.set(
      Math.sin(sunAngle) * sunRadius,
      sunHeight,
      -Math.cos(sunAngle) * sunRadius
    )

    this.directionalLight.position.set(
      Math.sin(sunAngle) * 20,
      sunHeight > 0 ? sunHeight : 5,
      -Math.cos(sunAngle) * 20
    )

    const baseColors = weatherPresets[this.currentWeather]
    const skyMat = this.skyDome.material as THREE.ShaderMaterial
    skyMat.uniforms.topColor.value.setHex(
      this.lerpColor(skyTop, baseColors.skyTop, 0.3)
    )
    skyMat.uniforms.bottomColor.value.setHex(
      this.lerpColor(skyBottom, baseColors.skyBottom, 0.3)
    )

    this.ambientLight.intensity = ambientIntensity * (0.5 + baseColors.intensity * 0.5)
    ;(this.stars.material as THREE.PointsMaterial).opacity = starOpacity

    const isNight = time < 6 || time > 19
    const baseLight = this.currentWeather === 'thunderstorm' ? 1 : 0.3
    this.streetLights.forEach(({ light }) => {
      light.intensity = isNight ? 1.5 : baseLight
    })

    this.sunMesh.visible = sunHeight > 0
  }

  private lerpColor(color1: number, color2: number, t: number): number {
    const r1 = (color1 >> 16) & 255
    const g1 = (color1 >> 8) & 255
    const b1 = color1 & 255
    const r2 = (color2 >> 16) & 255
    const g2 = (color2 >> 8) & 255
    const b2 = color2 & 255

    const r = Math.round(r1 + (r2 - r1) * t)
    const g = Math.round(g1 + (g2 - g1) * t)
    const b = Math.round(b1 + (b2 - b1) * t)

    return (r << 16) | (g << 8) | b
  }

  public getWindSpeed(): number {
    return this.params.windSpeed
  }

  public getCurrentWeather(): WeatherType {
    return this.currentWeather
  }

  public animate(delta: number) {
    this.time += delta

    const windStrength = this.params.windSpeed / 10
    const swayIntensity = this.currentWeather === 'thunderstorm' ? 2 : 
                          this.currentWeather === 'cloudy' ? 1 : 0.5

    this.treeCrown.rotation.z = Math.sin(this.time * 2) * 0.05 * windStrength * swayIntensity
    this.treeCrown.rotation.x = Math.cos(this.time * 1.5) * 0.03 * windStrength * swayIntensity
    this.treeCrown.position.y = 4.5 + Math.sin(this.time * 3) * 0.05 * windStrength * swayIntensity

    this.grassBlades.forEach((blade, i) => {
      const phase = i * 0.1
      blade.rotation.z = Math.sin(this.time * 3 + phase) * 0.1 * windStrength
    })

    this.renderer.render(this.scene, this.camera)
  }

  public getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement
  }

  public dispose() {
    this.renderer.dispose()
  }
}
