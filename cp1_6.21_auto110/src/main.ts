import { SceneManager } from './SceneManager'
import { UIPanel, UIPipelineState } from './UIPanel'
import { PipelineType, PIPELINE_COLOR_PRESETS } from './PipelineManager'

class App {
  private sceneManager!: SceneManager
  private uiPanel!: UIPanel

  constructor() {
    this.init()
  }

  private init(): void {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement
    if (!canvas) {
      console.error('Canvas element not found')
      return
    }

    this.sceneManager = new SceneManager(canvas)

    this.uiPanel = new UIPanel('ui-panel', {
      onPipelineChange: this.handlePipelineChange.bind(this),
      onResetCamera: this.handleResetCamera.bind(this),
      onTogglePipeline: this.handleTogglePipeline.bind(this)
    })

    this.sceneManager.setOnQualityChange((isHigh: boolean) => {
      this.uiPanel.setQualityBadge(isHigh)
    })

    this.sceneManager.setOnConflictChange((hasConflict: boolean) => {
      this.uiPanel.setConflictVisible(hasConflict)
    })

    this.initPipelines()
    this.sceneManager.start()
  }

  private initPipelines(): void {
    const types: PipelineType[] = ['water', 'drainage', 'electric', 'gas']

    types.forEach(type => {
      const state = this.uiPanel.getPipelineState(type)
      const color = this.uiPanel.getPipelineColor(type)

      this.sceneManager.addPipeline({
        type,
        depth: state.depth,
        diameter: state.diameter,
        xPosition: state.xPosition,
        color: color,
        visible: state.visible
      })
    })
  }

  private handlePipelineChange(type: PipelineType, changes: Partial<UIPipelineState>): void {
    const sceneChanges: { depth?: number; diameter?: number; xPosition?: number; color?: number } = {}

    if (changes.depth !== undefined) {
      sceneChanges.depth = changes.depth
    }
    if (changes.diameter !== undefined) {
      sceneChanges.diameter = changes.diameter
    }
    if (changes.xPosition !== undefined) {
      sceneChanges.xPosition = changes.xPosition
    }
    if (changes.colorIndex !== undefined) {
      const colors = PIPELINE_COLOR_PRESETS[type]
      const color = colors[changes.colorIndex]
      sceneChanges.color = color
    }

    if (Object.keys(sceneChanges).length > 0) {
      if (changes.colorIndex !== undefined) {
        this.sceneManager.removePipeline(type)
        const state = this.uiPanel.getPipelineState(type)
        const color = this.uiPanel.getPipelineColor(type)
        this.sceneManager.addPipeline({
          type,
          depth: state.depth,
          diameter: state.diameter,
          xPosition: state.xPosition,
          color,
          visible: state.visible
        })
      } else {
        this.sceneManager.updatePipeline(type, sceneChanges)
      }
    }
  }

  private handleTogglePipeline(type: PipelineType, visible: boolean): void {
    this.sceneManager.setPipelineVisibility(type, visible)
  }

  private handleResetCamera(): void {
    this.sceneManager.resetCamera()
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App()
})
