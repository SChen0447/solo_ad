import { VoidSuture } from './entities'

export interface LevelData {
  levelNumber: number
  sutureCount: number
  sutures: VoidSuture[]
  targetSutures: number
  description: string
  riftSpawnInterval: number
  devourerSpawnInterval: number
  maxDevourers: number
}

export class LevelManager {
  static generateLevel(levelNumber: number, canvasWidth: number, canvasHeight: number): LevelData {
    const sutureCount = Math.min(3 + Math.floor((levelNumber - 1) / 2), 5)
    const sutures = this.generateSutures(sutureCount, canvasWidth, canvasHeight)

    const baseRiftInterval = Math.max(3, 6 - levelNumber * 0.5)
    const baseDevourerInterval = Math.max(8, 15 - levelNumber)
    const maxDevourers = Math.min(1 + Math.floor(levelNumber / 3), 3)

    const descriptions = [
      '缝合所有虚空裂隙点，开启传送门',
      '小心时空裂缝，它们会削弱你的气泡',
      '虚空吞噬者出现了！用气泡冻结它们',
      '收集时之沙，延长气泡持续时间',
      '更多的缝合点，更复杂的挑战',
    ]
    const description = descriptions[Math.min(levelNumber - 1, descriptions.length - 1)]

    return {
      levelNumber,
      sutureCount,
      sutures,
      targetSutures: sutureCount,
      description,
      riftSpawnInterval: baseRiftInterval,
      devourerSpawnInterval: baseDevourerInterval,
      maxDevourers,
    }
  }

  private static generateSutures(count: number, canvasWidth: number, canvasHeight: number): VoidSuture[] {
    const sutures: VoidSuture[] = []
    const margin = 150
    const centerX = canvasWidth / 2
    const centerY = canvasHeight / 2
    const radius = Math.min(canvasWidth, canvasHeight) * 0.3

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2
      const r = radius * (0.7 + Math.random() * 0.3)
      const x = centerX + Math.cos(angle) * r + (Math.random() - 0.5) * 50
      const y = centerY + Math.sin(angle) * r + (Math.random() - 0.5) * 50
      
      const clampedX = Math.max(margin, Math.min(canvasWidth - margin, x))
      const clampedY = Math.max(margin, Math.min(canvasHeight - margin, y))
      
      sutures.push(new VoidSuture(clampedX, clampedY))
    }

    return sutures
  }

  static checkLevelComplete(sutures: VoidSuture[]): boolean {
    return sutures.every(s => s.activated)
  }

  static getActivatedCount(sutures: VoidSuture[]): number {
    return sutures.filter(s => s.activated).length
  }
}
