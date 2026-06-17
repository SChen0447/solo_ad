import { sonarApi, type Target } from '../../services/sonarApi'

export type TargetType = 'shipwreck' | 'coral' | 'unidentified'

export interface TargetMarkerData {
  id: string
  name: string
  type: TargetType
  x: number
  y: number
  z: number
  createdAt: number
}

export const TARGET_COLORS: Record<TargetType, number> = {
  shipwreck: 0x8b4513,
  coral: 0xff6347,
  unidentified: 0x808080,
}

export const TARGET_LABELS: Record<TargetType, string> = {
  shipwreck: '沉船',
  coral: '珊瑚礁',
  unidentified: '不明物体',
}

export class TargetMarkerApi {
  static async getAll(): Promise<TargetMarkerData[]> {
    const targets = await sonarApi.getTargets()
    return targets as TargetMarkerData[]
  }

  static async create(data: {
    name: string
    type: TargetType
    x: number
    y: number
    z: number
  }): Promise<TargetMarkerData> {
    const target = await sonarApi.createTarget(data)
    return target as TargetMarkerData
  }

  static async remove(id: string): Promise<boolean> {
    return await sonarApi.deleteTarget(id)
  }

  static calculateDistance(target: TargetMarkerData, refX: number, refZ: number): number {
    return Math.sqrt(
      Math.pow(target.x - refX, 2) + Math.pow(target.z - refZ, 2)
    )
  }

  static toApiType(type: TargetType): Target['type'] {
    return type
  }
}
