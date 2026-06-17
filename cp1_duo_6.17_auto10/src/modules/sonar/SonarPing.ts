import * as THREE from 'three'
import type { SonarPoint } from '../../services/sonarApi'
import type { TargetType } from '../dashboard/TargetMarker'

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

export interface HitParticle {
  position: THREE.Vector3
  velocity: THREE.Vector3
  startTime: number
  duration: number
  mesh: THREE.Mesh
  isTargetHit: boolean
}

export type HitKind = 'terrain' | TargetType

export class SonarPingSystem {
  private scanAngle: number = 0
  private scanSpeed: number = 60
  private lastPingTime: number = 0
  private pingInterval: number = 3000
  private maxPoints: number = 1500
  private cameraDistance: number = 25
  private lastPingTriggerTime: number = -1
  private waterPulseTime: number = -1

  public getScanAngle(): number {
    return this.scanAngle
  }

  public getLastPingTime(): number {
    return this.lastPingTime
  }

  public shouldTriggerWaterPulse(currentElapsed: number): boolean {
    if (this.lastPingTime !== this.waterPulseTime) {
      this.waterPulseTime = this.lastPingTime
      return true
    }
    return false
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

  private getHitColor(kind: HitKind): THREE.Color {
    if (kind === 'terrain') {
      return new THREE.Color(0x87cefa)
    }
    switch (kind) {
      case 'shipwreck':
        return new THREE.Color(0xff6347)
      case 'coral':
        return new THREE.Color(0xffa07a)
      case 'unidentified':
        return new THREE.Color(0xff8c00)
      default:
        return new THREE.Color(0xff6347)
    }
  }

  public createHitBurst(
    position: THREE.Vector3,
    currentTime: number,
    kind: HitKind = 'terrain',
    particleCount: number = 12
  ): HitParticle[] {
    const particles: HitParticle[] = []
    const baseColor = this.getHitColor(kind)
    const isTargetHit = kind !== 'terrain'

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.random() * Math.PI * 0.5
      const speed = 1.5 + Math.random() * 2.0
      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed * 0.8,
        Math.sin(phi) * Math.sin(theta) * speed
      )

      const size = 0.08 + Math.random() * 0.12
      const geometry = new THREE.SphereGeometry(size, 8, 8)
      const colorVariation = new THREE.Color(baseColor)
      colorVariation.offsetHSL((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.1)
      const material = new THREE.MeshBasicMaterial({
        color: colorVariation,
        transparent: true,
        opacity: 1.0,
      })
      const mesh = new THREE.Mesh(geometry, material)
      mesh.position.copy(position)

      particles.push({
        position: position.clone(),
        velocity,
        startTime: currentTime,
        duration: 1.5,
        mesh,
        isTargetHit,
      })
    }

    return particles
  }

  public updateHitParticle(particle: HitParticle, currentTime: number): boolean {
    const elapsed = currentTime - particle.startTime
    if (elapsed >= particle.duration) {
      return false
    }

    const t = elapsed / particle.duration
    particle.velocity.y -= 3.0 * 0.016
    particle.position.add(particle.velocity.clone().multiplyScalar(0.016))
    particle.mesh.position.copy(particle.position)

    const opacity = Math.max(0, 1 - t * 1.2)
    ;(particle.mesh.material as THREE.MeshBasicMaterial).opacity = opacity

    const scale = Math.max(0.3, 1 - t * 0.6)
    particle.mesh.scale.setScalar(scale)

    return true
  }
}
