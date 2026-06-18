import * as THREE from 'three'
import type { Ornament, OrnamentType, BallColor } from '../store/useAppStore'

const BALL_COLORS: Record<BallColor, number> = {
  red: 0xff3b3b,
  gold: 0xffd700,
  blue: 0x4a9eff,
  silver: 0xc0c0c0
}

const GIFT_COLORS = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff, 0x44ffff]

export class OrnamentManager {
  private treeMeshes: THREE.Mesh[] = []
  private readonly snapDistance: number = 0.05

  setTreeMeshes(meshes: THREE.Mesh[]): void {
    this.treeMeshes = meshes
  }

  createBallGeometry(size: number): THREE.SphereGeometry {
    return new THREE.SphereGeometry(size, 32, 32)
  }

  createStarGeometry(size: number): THREE.BufferGeometry {
    const shape = new THREE.Shape()
    const outerRadius = size
    const innerRadius = size * 0.4
    const points = 5

    for (let i = 0; i < points * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius
      const angle = (i * Math.PI) / points - Math.PI / 2
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      if (i === 0) {
        shape.moveTo(x, y)
      } else {
        shape.lineTo(x, y)
      }
    }
    shape.closePath()

    const extrudeSettings = {
      depth: size * 0.3,
      bevelEnabled: true,
      bevelThickness: size * 0.05,
      bevelSize: size * 0.05,
      bevelSegments: 2
    }

    return new THREE.ExtrudeGeometry(shape, extrudeSettings)
  }

  createGiftGeometry(size: number): THREE.BufferGeometry {
    return new THREE.BoxGeometry(size, size, size)
  }

  createOrnamentMesh(
    type: OrnamentType,
    size: number,
    color?: BallColor
  ): THREE.Mesh {
    let geometry: THREE.BufferGeometry
    let material: THREE.MeshStandardMaterial

    switch (type) {
      case 'ball':
        geometry = this.createBallGeometry(size)
        material = new THREE.MeshStandardMaterial({
          color: color ? BALL_COLORS[color] : 0xff3b3b,
          metalness: 0.8,
          roughness: 0.2
        })
        break
      case 'star':
        geometry = this.createStarGeometry(size)
        geometry.center()
        material = new THREE.MeshStandardMaterial({
          color: 0xffd700,
          emissive: 0xffd700,
          emissiveIntensity: 0.3,
          metalness: 0.9,
          roughness: 0.1
        })
        break
      case 'gift':
        geometry = this.createGiftGeometry(size)
        const giftColor = GIFT_COLORS[Math.floor(Math.random() * GIFT_COLORS.length)]
        material = new THREE.MeshStandardMaterial({
          color: giftColor,
          metalness: 0.3,
          roughness: 0.7
        })
        break
      default:
        geometry = new THREE.SphereGeometry(size, 32, 32)
        material = new THREE.MeshStandardMaterial({ color: 0xffffff })
    }

    const mesh = new THREE.Mesh(geometry, material)
    mesh.castShadow = true
    mesh.receiveShadow = true
    return mesh
  }

  snapToTreeSurface(
    point: THREE.Vector3,
    normal: THREE.Vector3
  ): THREE.Vector3 {
    const snappedPoint = point.clone()
    const offset = normal.clone().normalize().multiplyScalar(this.snapDistance)
    snappedPoint.add(offset)
    return snappedPoint
  }

  raycastTree(
    raycaster: THREE.Raycaster,
    camera: THREE.Camera,
    mouse: THREE.Vector2,
    scene: THREE.Scene
  ): { point: THREE.Vector3; normal: THREE.Vector3 } | null {
    raycaster.setFromCamera(mouse, camera)
    const intersects = raycaster.intersectObjects(this.treeMeshes, true)

    if (intersects.length > 0) {
      const hit = intersects[0]
      const normal = hit.face?.normal.clone() || new THREE.Vector3(0, 1, 0)
      if (hit.face && hit.object.matrixWorld) {
        normal.transformDirection(hit.object.matrixWorld)
      }
      return {
        point: hit.point.clone(),
        normal: normal
      }
    }
    return null
  }

  serializeOrnaments(ornaments: Ornament[]): string {
    return JSON.stringify(ornaments)
  }

  deserializeOrnaments(data: string): Ornament[] {
    try {
      return JSON.parse(data)
    } catch (e) {
      console.error('Failed to deserialize ornaments', e)
      return []
    }
  }

  getOrnamentColor(type: OrnamentType, color?: BallColor): number {
    if (type === 'ball' && color) {
      return BALL_COLORS[color]
    }
    if (type === 'star') {
      return 0xffd700
    }
    return 0xffffff
  }

  dispose(): void {
    this.treeMeshes = []
  }
}
