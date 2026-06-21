import * as THREE from 'three'
import type { SeasonName } from './leafDensityManager'

export interface SunPosition {
  azimuth: number
  elevation: number
  hour: number
}

export interface SunLightState {
  sunPosition: SunPosition
  lightIntensity: number
  ambientIntensity: number
  lightColor: THREE.Color
  sunWorldPosition: THREE.Vector3
}

const SUN_DISTANCE = 50

export class SunLightController {
  private directionalLight: THREE.DirectionalLight
  private ambientLight: THREE.AmbientLight
  private hemisphereLight: THREE.HemisphereLight
  private currentHour: number = 12
  private shadowCameraSize: number = 30

  constructor(
    directionalLight: THREE.DirectionalLight,
    ambientLight: THREE.AmbientLight,
    hemisphereLight: THREE.HemisphereLight
  ) {
    this.directionalLight = directionalLight
    this.ambientLight = ambientLight
    this.hemisphereLight = hemisphereLight

    this.directionalLight.castShadow = true
    this.directionalLight.shadow.mapSize.set(2048, 2048)
    this.directionalLight.shadow.camera.near = 0.5
    this.directionalLight.shadow.camera.far = 150
    this.directionalLight.shadow.bias = -0.0005
    this.directionalLight.shadow.normalBias = 0.02

    this.updateShadowCamera()
  }

  setTime(hour: number): SunLightState {
    this.currentHour = ((hour % 24) + 24) % 24

    const { azimuth, elevation } = this.calculateSunPosition(this.currentHour)
    const lightIntensity = this.calculateLightIntensity(elevation)
    const ambientIntensity = this.calculateAmbientIntensity(elevation)
    const lightColor = this.calculateLightColor(elevation, this.currentHour)

    const sunX = Math.cos(elevation) * Math.sin(azimuth) * SUN_DISTANCE
    const sunY = Math.sin(elevation) * SUN_DISTANCE
    const sunZ = Math.cos(elevation) * Math.cos(azimuth) * SUN_DISTANCE

    this.directionalLight.position.set(sunX, sunY, sunZ)
    this.directionalLight.target.position.set(0, 3, 0)
    this.directionalLight.intensity = lightIntensity
    this.directionalLight.color.copy(lightColor)

    this.ambientLight.intensity = ambientIntensity
    this.ambientLight.color.copy(lightColor).multiplyScalar(0.3)

    this.hemisphereLight.intensity = ambientIntensity * 0.5

    this.updateShadowCamera(elevation)

    return {
      sunPosition: { azimuth, elevation, hour: this.currentHour },
      lightIntensity,
      ambientIntensity,
      lightColor: lightColor.clone(),
      sunWorldPosition: new THREE.Vector3(sunX, sunY, sunZ)
    }
  }

  updateForSeason(season: SeasonName): void {
    const skyColors: Record<SeasonName, number> = {
      spring: 0x87ceeb,
      summer: 0x4a90d9,
      autumn: 0xc4a574,
      winter: 0x8899aa
    }

    const groundColors: Record<SeasonName, number> = {
      spring: 0x6bbf59,
      summer: 0x2d7f2d,
      autumn: 0x8b6914,
      winter: 0xcccccc
    }

    this.hemisphereLight.color.setHex(skyColors[season])
    this.hemisphereLight.groundColor.setHex(groundColors[season])
  }

  getCurrentHour(): number {
    return this.currentHour
  }

  getSunPosition(): SunPosition {
    const pos = this.calculateSunPosition(this.currentHour)
    return { ...pos, hour: this.currentHour }
  }

  private calculateSunPosition(hour: number): { azimuth: number; elevation: number } {
    const t = (hour - 6) / 12
    const elevation = Math.sin(t * Math.PI) * (Math.PI / 2.2)
    const azimuth = ((hour - 6) / 12) * Math.PI

    return { azimuth, elevation }
  }

  private calculateLightIntensity(elevation: number): number {
    const e = Math.max(0, elevation)
    const normalizedElevation = e / (Math.PI / 2)
    return 0.1 + Math.pow(normalizedElevation, 0.7) * 1.4
  }

  private calculateAmbientIntensity(elevation: number): number {
    const e = Math.max(0, elevation)
    const normalizedElevation = e / (Math.PI / 2)
    return 0.1 + normalizedElevation * 0.9
  }

  private calculateLightColor(elevation: number, hour: number): THREE.Color {
    const e = Math.max(0, elevation)
    const normalizedElevation = e / (Math.PI / 2)

    const noonColor = new THREE.Color(0xfff5e6)
    const sunriseColor = new THREE.Color(0xff8844)
    const nightColor = new THREE.Color(0x223355)

    if (normalizedElevation <= 0.15) {
      const t = normalizedElevation / 0.15
      return nightColor.clone().lerp(sunriseColor, t)
    } else if (normalizedElevation <= 0.5) {
      const t = (normalizedElevation - 0.15) / 0.35
      return sunriseColor.clone().lerp(noonColor, t)
    } else {
      return noonColor.clone()
    }
  }

  private updateShadowCamera(elevation: number = Math.PI / 3): void {
    const size = this.shadowCameraSize
    const camera = this.directionalLight.shadow.camera
    camera.left = -size
    camera.right = size
    camera.top = size
    camera.bottom = -size
    camera.updateProjectionMatrix()
  }
}
