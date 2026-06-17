import * as THREE from 'three'
import type { SonarPoint } from '../../services/sonarApi'

export interface EchoRing {
  position: THREE.Vector3
  startTime: number
  duration: number
  mesh: THREE.Mesh
}

export interface PointCloudPoint {
  position: THREE.Vector3
  color: THREE.Color
  size: number
  createdAt: number
}

export class SonarPingSystem {
  private scanAngle: number = 0
  private scanSpeed: number = 60
  private lastPingTime: number = 0
  private pingInterval: number = 3000
  private maxPoints: number = 1500
  private cameraDistance: number = 25

  public getScanAngle(): number {
    return this.scanAngle
  }

  public update(deltaTime: number): void {
    this.scanAngle += this.scanSpeed * deltaTime
    if (this.scanAngle >= 360) {
      this.scanAngle -= 360
    }
  }

  public shouldPing(currentTime: number): boolean {
    if (currentTime - this.lastPingTime >= this.pingInterval) {
      this.lastPingTime = currentTime
      return true
    }
    return false
  }

  public getScanConeData(shipPosition: THREE.Vector3) {
    return {
      origin: new THREE.Vector3(shipPosition.x, shipPosition.y - 0.5, shipPosition.z),
      angle: this.scanAngle,
      coneAngle: 45,
      range: 20,
    }
  }

  public getDepthColor(depth: number): THREE.Color {
    if (depth < 10) {
      return new THREE.Color(0x40e0d0)
    } else if (depth < 25) {
      const t = (depth - 10) / 15
      const color = new THREE.Color()
      color.lerpColors(new THREE.Color(0x40e0d0), new THREE.Color(0x1e90ff), t)
      return color
    } else {
      const t = Math.min((depth - 25) / 15, 1)
      const color = new THREE.Color()
      color.lerpColors(new THREE.Color(0x1e90ff), new THREE.Color(0x8a2be2), t)
      return color
    }
  }

  public createEchoRing(position: THREE.Vector3, currentTime: number): EchoRing {
    const geometry = new THREE.RingGeometry(0.5, 0.55, 32)
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.copy(position)
    mesh.rotation.x = -Math.PI / 2

    return {
      position: position.clone(),
      startTime: currentTime,
      duration: 0.8,
      mesh,
    }
  }

  public updateEchoRing(ring: EchoRing, currentTime: number): boolean {
    const elapsed = currentTime - ring.startTime
    if (elapsed >= ring.duration) {
      return false
    }

    const t = elapsed / ring.duration
    const radius = 0.5 + t * 2.0
    const opacity = 1 - t

    const newGeometry = new THREE.RingGeometry(radius, radius + 0.05, 32)
    ring.mesh.geometry.dispose()
    ring.mesh.geometry = newGeometry
    ;(ring.mesh.material as THREE.MeshBasicMaterial).opacity = opacity

    return true
  }

  public setCameraDistance(distance: number): void {
    this.cameraDistance = distance
  }

  public getPointSize(distanceFromCamera: number): number {
    if (this.cameraDistance > 30 || distanceFromCamera > 35) {
      return 0.15
    }
    return 0.3
  }

  public processSonarPoints(
    points: SonarPoint[],
    existingPoints: PointCloudPoint[],
    cameraPosition: THREE.Vector3
  ): PointCloudPoint[] {
    const newPoints: PointCloudPoint[] = [...existingPoints]

    for (const p of points) {
      const position = new THREE.Vector3(p.x, p.y, p.z)
      const distance = position.distanceTo(cameraPosition)
      const point: PointCloudPoint = {
        position,
        color: this.getDepthColor(p.depth),
        size: this.getPointSize(distance),
        createdAt: Date.now(),
      }
      newPoints.push(point)
    }

    if (newPoints.length > this.maxPoints) {
      return newPoints.slice(newPoints.length - this.maxPoints)
    }

    return newPoints
  }
}
