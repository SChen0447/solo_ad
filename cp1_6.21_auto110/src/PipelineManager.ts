import * as THREE from 'three'

export type PipelineType = 'water' | 'drainage' | 'electric' | 'gas'

export interface PipelineConfig {
  type: PipelineType
  depth: number
  diameter: number
  xPosition: number
  color: number
  visible: boolean
}

export interface SceneConfig {
  roadLength: number
  roadWidth: number
  soilDepth: number
}

interface SoilLayer {
  name: string
  top: number
  bottom: number
  color: number
  roughness: number
}

export const PIPELINE_DEFAULTS: Record<PipelineType, Omit<PipelineConfig, 'visible'>> = {
  water: {
    type: 'water',
    depth: -0.8,
    diameter: 0.3,
    xPosition: -3.5,
    color: 0x4a9eff
  },
  drainage: {
    type: 'drainage',
    depth: -1.5,
    diameter: 0.4,
    xPosition: -1.0,
    color: 0x4ade80
  },
  electric: {
    type: 'electric',
    depth: -1.0,
    diameter: 0.2,
    xPosition: 1.5,
    color: 0xff6b6b
  },
  gas: {
    type: 'gas',
    depth: -1.8,
    diameter: 0.25,
    xPosition: 3.5,
    color: 0xffd93d
  }
}

export const PIPELINE_COLOR_PRESETS: Record<PipelineType, number[]> = {
  water: [0x4a9eff, 0x2d7dd2, 0x6ab0ff],
  drainage: [0x4ade80, 0x22c55e, 0x86efac],
  electric: [0xff6b6b, 0xef4444, 0xff8a8a],
  gas: [0xffd93d, 0xfbbf24, 0xffe66b]
}

export class PipelineManager {
  private config: SceneConfig

  constructor(config: SceneConfig) {
    this.config = config
  }

  public createPipeline(config: PipelineConfig): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = []
    const { roadLength } = this.config
    const { type, depth, diameter, xPosition, color } = config

    const pipeGeometry = new THREE.CylinderGeometry(
      diameter / 2,
      diameter / 2,
      roadLength,
      24,
      1
    )
    pipeGeometry.rotateX(Math.PI / 2)

    const pipeMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.3,
      metalness: 0.6,
      transparent: true,
      opacity: 0.95
    })

    const pipe = new THREE.Mesh(pipeGeometry, pipeMaterial)
    pipe.position.set(xPosition, depth, 0)
    pipe.userData.pipelineType = type
    pipe.userData.isPipe = true
    pipe.userData.depth = depth
    pipe.userData.diameter = diameter
    pipe.userData.baseDiameter = diameter
    pipe.castShadow = true
    pipe.receiveShadow = true
    meshes.push(pipe)

    const protectorDiameter = diameter * 1.25
    const protectorGeometry = new THREE.RingGeometry(
      diameter / 2,
      protectorDiameter / 2,
      24
    )

    const protectorColor = this.lightenColor(color, 0.3)
    const protectorMaterial = new THREE.MeshBasicMaterial({
      color: protectorColor,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide
    })

    const frontProtector = new THREE.Mesh(protectorGeometry, protectorMaterial)
    frontProtector.position.set(xPosition, depth, roadLength / 2 + 0.01)
    frontProtector.rotation.y = 0
    frontProtector.userData.pipelineType = type
    frontProtector.userData.isProtector = true
    frontProtector.userData.depth = depth
    frontProtector.userData.diameter = diameter
    meshes.push(frontProtector)

    const backProtector = new THREE.Mesh(protectorGeometry.clone(), protectorMaterial.clone())
    backProtector.position.set(xPosition, depth, -roadLength / 2 - 0.01)
    backProtector.rotation.y = Math.PI
    backProtector.userData.pipelineType = type
    backProtector.userData.isProtector = true
    backProtector.userData.depth = depth
    backProtector.userData.diameter = diameter
    meshes.push(backProtector)

    const tubeGeometry = new THREE.TorusGeometry(
      protectorDiameter / 2,
      0.008,
      8,
      32
    )
    const tubeMaterial = new THREE.MeshBasicMaterial({
      color: protectorColor,
      transparent: true,
      opacity: 0.4
    })

    const frontTube = new THREE.Mesh(tubeGeometry, tubeMaterial)
    frontTube.position.set(xPosition, depth, roadLength / 2)
    frontTube.rotation.x = Math.PI / 2
    frontTube.userData.pipelineType = type
    frontTube.userData.isProtector = true
    frontTube.userData.depth = depth
    frontTube.userData.diameter = diameter
    meshes.push(frontTube)

    const backTube = new THREE.Mesh(tubeGeometry.clone(), tubeMaterial.clone())
    backTube.position.set(xPosition, depth, -roadLength / 2)
    backTube.rotation.x = Math.PI / 2
    backTube.userData.pipelineType = type
    backTube.userData.isProtector = true
    backTube.userData.depth = depth
    backTube.userData.diameter = diameter
    meshes.push(backTube)

    const linePoints = [
      new THREE.Vector3(xPosition, depth, -roadLength / 2),
      new THREE.Vector3(xPosition, depth, roadLength / 2)
    ]
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(linePoints)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: color,
      transparent: true,
      opacity: 1,
      linewidth: 2
    })
    const line = new THREE.Line(lineGeometry, lineMaterial)
    line.userData.pipelineType = type
    line.userData.isSimplified = true
    line.userData.depth = depth
    line.userData.diameter = diameter
    line.userData.xPosition = xPosition
    line.visible = false
    meshes.push(line)

    return meshes
  }

  public createSoilLayers(): THREE.Mesh[] {
    const layers: THREE.Mesh[] = []
    const { roadWidth, roadLength } = this.config

    const soilLayers: SoilLayer[] = [
      { name: 'topsoil', top: 0, bottom: -0.3, color: 0x8b6914, roughness: 0.95 },
      { name: 'clay', top: -0.3, bottom: -1.5, color: 0x5c3d2e, roughness: 0.9 },
      { name: 'gravel', top: -1.5, bottom: -3.0, color: 0x9a8b6a, roughness: 0.85 }
    ]

    soilLayers.forEach((layer, index) => {
      const layerThickness = layer.top - layer.bottom
      const layerCenterY = (layer.top + layer.bottom) / 2

      const geometry = new THREE.BoxGeometry(
        roadWidth - 0.02,
        layerThickness - 0.02,
        roadLength - 0.02
      )

      const canvas = this.createNoiseTexture(
        layer.color,
        256,
        256,
        index
      )
      const texture = new THREE.CanvasTexture(canvas)
      texture.wrapS = THREE.RepeatWrapping
      texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(4, 4)

      const material = new THREE.MeshStandardMaterial({
        color: layer.color,
        roughness: layer.roughness,
        metalness: 0.0,
        map: texture,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide
      })

      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.y = layerCenterY
      mesh.position.z = 0
      mesh.receiveShadow = true
      mesh.userData.soilLayer = layer.name
      layers.push(mesh)

      const transitionGeometry = new THREE.PlaneGeometry(roadWidth - 0.04, 0.15)
      const transitionCanvas = this.createGradientTexture(
        this.blendColors(
          soilLayers[Math.max(0, index - 1)]?.color || layer.color,
          layer.color
        ),
        layer.color,
        128,
        32
      )
      const transitionTexture = new THREE.CanvasTexture(transitionCanvas)
      const transitionMaterial = new THREE.MeshBasicMaterial({
        map: transitionTexture,
        transparent: true,
        opacity: 0.6,
        side: THREE.DoubleSide
      })

      if (index > 0) {
        const transitionPlane = new THREE.Mesh(transitionGeometry, transitionMaterial)
        transitionPlane.position.y = layer.top
        transitionPlane.position.z = roadLength / 2 - 0.05
        transitionPlane.rotation.x = 0
        layers.push(transitionPlane)

        const transitionBack = new THREE.Mesh(transitionGeometry.clone(), transitionMaterial.clone())
        transitionBack.position.y = layer.top
        transitionBack.position.z = -roadLength / 2 + 0.05
        transitionBack.rotation.x = 0
        layers.push(transitionBack)
      }
    })

    return layers
  }

  private createNoiseTexture(baseColor: number, width: number, height: number, seed: number): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    const baseHex = '#' + baseColor.toString(16).padStart(6, '0')
    ctx.fillStyle = baseHex
    ctx.fillRect(0, 0, width, height)

    const imageData = ctx.getImageData(0, 0, width, height)
    const data = imageData.data

    for (let i = 0; i < data.length; i += 4) {
      const noise = (this.pseudoRandom(i + seed * 1000) - 0.5) * 30
      data[i] = Math.min(255, Math.max(0, data[i] + noise))
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise * 0.8))
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise * 0.6))
    }

    ctx.putImageData(imageData, 0, 0)
    return canvas
  }

  private pseudoRandom(seed: number): number {
    const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453
    return x - Math.floor(x)
  }

  private createGradientTexture(
    colorTop: number,
    colorBottom: number,
    width: number,
    height: number
  ): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')!

    const topHex = '#' + colorTop.toString(16).padStart(6, '0')
    const bottomHex = '#' + colorBottom.toString(16).padStart(6, '0')

    const gradient = ctx.createLinearGradient(0, 0, 0, height)
    gradient.addColorStop(0, topHex)
    gradient.addColorStop(1, bottomHex)

    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, width, height)

    return canvas
  }

  private lightenColor(color: number, amount: number): number {
    const r = (color >> 16) & 255
    const g = (color >> 8) & 255
    const b = color & 255

    const newR = Math.min(255, Math.floor(r + (255 - r) * amount))
    const newG = Math.min(255, Math.floor(g + (255 - g) * amount))
    const newB = Math.min(255, Math.floor(b + (255 - b) * amount))

    return (newR << 16) | (newG << 8) | newB
  }

  private blendColors(color1: number, color2: number): number {
    const r1 = (color1 >> 16) & 255
    const g1 = (color1 >> 8) & 255
    const b1 = color1 & 255

    const r2 = (color2 >> 16) & 255
    const g2 = (color2 >> 8) & 255
    const b2 = color2 & 255

    const r = Math.floor((r1 + r2) / 2)
    const g = Math.floor((g1 + g2) / 2)
    const b = Math.floor((b1 + b2) / 2)

    return (r << 16) | (g << 8) | b
  }
}
