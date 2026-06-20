import { sceneRenderer, SceneData, TerrainType, BuildingType, WeatherType } from './SceneRenderer'

const keywordMap: Record<string, Partial<SceneData>> = {
  山: { terrain: ['mountain'] },
  山脉: { terrain: ['mountain'] },
  山峰: { terrain: ['mountain'] },
  森林: { terrain: ['grass'], buildings: [] },
  草地: { terrain: ['grass'] },
  草原: { terrain: ['grass'] },
  河流: { terrain: ['river'] },
  河: { terrain: ['river'] },
  湖: { terrain: ['river'] },
  湖泊: { terrain: ['river'] },
  小屋: { buildings: ['cottage'] },
  房子: { buildings: ['cottage'] },
  木屋: { buildings: ['cottage'] },
  城堡: { buildings: ['castle'] },
  宫殿: { buildings: ['castle'] },
  塔: { buildings: ['tower'] },
  塔楼: { buildings: ['tower'] },
  魔法塔: { buildings: ['tower'] },
  雨: { weather: 'rain' },
  下雨: { weather: 'rain' },
  雨天: { weather: 'rain' },
  雪: { weather: 'snow' },
  下雪: { weather: 'snow' },
  雪天: { weather: 'snow' },
  晴: { weather: 'sunny' },
  晴天: { weather: 'sunny' },
  阳光: { weather: 'sunny' },
  云: { weather: 'cloudy' },
  多云: { weather: 'cloudy' },
  阴天: { weather: 'cloudy' }
}

const themeDefaults: Record<string, Partial<SceneData>> = {
  scifi: { terrain: ['grass', 'mountain'], buildings: ['tower'], weather: 'sunny' },
  fantasy: { terrain: ['grass', 'mountain'], buildings: ['castle', 'tower'], weather: 'cloudy' },
  adventure: { terrain: ['grass', 'river', 'mountain'], buildings: ['cottage'], weather: 'sunny' },
  campus: { terrain: ['grass'], buildings: ['cottage'], weather: 'sunny' },
  mystery: { terrain: ['mountain'], buildings: ['tower'], weather: 'rain' },
  ancient: { terrain: ['grass', 'river'], buildings: ['castle'], weather: 'cloudy' }
}

class CanvasModule {
  private transitionInProgress = false
  private currentSceneData: SceneData | null = null

  parseKeywords(text: string, themeId?: string): SceneData {
    const terrain: Set<TerrainType> = new Set()
    const buildings: Set<BuildingType> = new Set()
    let weather: WeatherType | null = null
    const keywords: string[] = []

    for (const [keyword, data] of Object.entries(keywordMap)) {
      if (text.includes(keyword)) {
        keywords.push(keyword)
        if (data.terrain) data.terrain.forEach(t => terrain.add(t))
        if (data.buildings) data.buildings.forEach(b => buildings.add(b))
        if (data.weather) weather = data.weather
      }
    }

    if (themeId && (terrain.size === 0 || buildings.size === 0 || !weather)) {
      const defaults = themeDefaults[themeId] || {}
      if (terrain.size === 0 && defaults.terrain) {
        defaults.terrain.forEach(t => terrain.add(t))
      }
      if (buildings.size === 0 && defaults.buildings) {
        defaults.buildings.forEach(b => buildings.add(b))
      }
      if (!weather && defaults.weather) {
        weather = defaults.weather
      }
    }

    if (terrain.size === 0) terrain.add('grass')
    if (!weather) weather = 'sunny'

    return {
      terrain: Array.from(terrain),
      buildings: Array.from(buildings),
      weather,
      keywords,
      seed: Date.now()
    }
  }

  async renderScene(
    canvas: HTMLCanvasElement | null,
    text: string,
    themeId?: string
  ): Promise<void> {
    if (!canvas) return
    if (this.transitionInProgress) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const width = canvas.width
    const height = canvas.height
    const newScene = this.parseKeywords(text, themeId)

    if (this.currentSceneData && this.scenesEqual(this.currentSceneData, newScene)) {
      return
    }

    this.transitionInProgress = true

    if (this.currentSceneData) {
      await this.fadeOut(ctx, width, height)
    }

    sceneRenderer.render(ctx, newScene, width, height)

    if (this.currentSceneData) {
      await this.fadeIn(ctx, newScene, width, height)
    }

    this.currentSceneData = newScene
    this.transitionInProgress = false
  }

  private scenesEqual(a: SceneData, b: SceneData): boolean {
    return (
      a.weather === b.weather &&
      a.terrain.length === b.terrain.length &&
      a.terrain.every(t => b.terrain.includes(t)) &&
      a.buildings.length === b.buildings.length &&
      a.buildings.every(building => b.buildings.includes(building))
    )
  }

  private fadeOut(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const duration = 500
      const startTime = performance.now()

      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)

        sceneRenderer.fadeTransition(ctx, w, h, 'out', progress)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }

  private fadeIn(
    ctx: CanvasRenderingContext2D,
    scene: SceneData,
    w: number,
    h: number
  ): Promise<void> {
    return new Promise((resolve) => {
      const duration = 500
      const startTime = performance.now()

      const animate = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)

        sceneRenderer.render(ctx, scene, w, h)
        sceneRenderer.fadeTransition(ctx, w, h, 'in', progress)

        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          resolve()
        }
      }

      requestAnimationFrame(animate)
    })
  }

  initialize(canvas: HTMLCanvasElement | null, themeId?: string): void {
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const defaultScene: SceneData = {
      terrain: ['grass'],
      buildings: [],
      weather: 'sunny',
      keywords: [],
      seed: Date.now()
    }

    if (themeId && themeDefaults[themeId]) {
      const defaults = themeDefaults[themeId]
      defaultScene.terrain = defaults.terrain || ['grass']
      defaultScene.buildings = defaults.buildings || []
      defaultScene.weather = defaults.weather || 'sunny'
    }

    this.currentSceneData = defaultScene
    sceneRenderer.render(ctx, defaultScene, canvas.width, canvas.height)
  }

  destroy(): void {
    sceneRenderer.stopWeatherAnimation()
    this.currentSceneData = null
    this.transitionInProgress = false
  }
}

export const canvasModule = new CanvasModule()
export default canvasModule
