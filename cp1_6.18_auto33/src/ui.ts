export interface UIState {
  levelNumber: number
  activatedSutures: number
  totalSutures: number
  energy: number
  maxEnergy: number
  description: string
  fps: number
  bubbleLifetimeBonus: number
}

export class UIRenderer {
  private ctx: CanvasRenderingContext2D
  private canvasWidth: number = 0
  private canvasHeight: number = 0
  private floatOffset: number = 0

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx
  }

  update(deltaTime: number): void {
    this.floatOffset += deltaTime * 2
  }

  render(state: UIState, canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth
    this.canvasHeight = canvasHeight

    this.drawLevelTitle(state.levelNumber)
    this.drawTaskPanel(state)
    this.drawEnergyBar(state)
    this.drawFPS(state.fps)
    this.drawBubbleBonus(state)
  }

  private drawLevelTitle(levelNumber: number): void {
    const { ctx, canvasWidth } = this
    const y = 50

    ctx.save()
    
    ctx.shadowColor = '#6366f1'
    ctx.shadowBlur = 20
    
    ctx.font = 'bold 28px "Segoe UI", "Microsoft YaHei", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    const gradient = ctx.createLinearGradient(canvasWidth / 2 - 100, y, canvasWidth / 2 + 100, y)
    gradient.addColorStop(0, '#a78bfa')
    gradient.addColorStop(0.5, '#818cf8')
    gradient.addColorStop(1, '#22d3ee')
    ctx.fillStyle = gradient
    
    ctx.fillText(`第 ${levelNumber} 关`, canvasWidth / 2, y)
    
    ctx.restore()
  }

  private drawTaskPanel(state: UIState): void {
    const { ctx } = this
    const x = 20
    const y = 20
    const width = 280
    const height = 120

    ctx.save()

    const panelGradient = ctx.createLinearGradient(x, y, x + width, y + height)
    panelGradient.addColorStop(0, 'rgba(30, 27, 75, 0.8)')
    panelGradient.addColorStop(1, 'rgba(49, 46, 129, 0.6)')

    ctx.fillStyle = panelGradient
    this.drawRoundedRect(x, y, width, height, 10)
    ctx.fill()

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)'
    ctx.lineWidth = 1
    this.drawRoundedRect(x, y, width, height, 10)
    ctx.stroke()

    ctx.font = 'bold 16px "Segoe UI", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#c7d2fe'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'top'
    ctx.fillText('任务目标', x + 15, y + 15)

    ctx.font = '14px "Segoe UI", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#94a3b8'
    ctx.fillText(state.description, x + 15, y + 42)

    const progress = state.activatedSutures / state.totalSutures
    const progressBarX = x + 15
    const progressBarY = y + 72
    const progressBarWidth = width - 30
    const progressBarHeight = 8

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'
    this.drawRoundedRect(progressBarX, progressBarY, progressBarWidth, progressBarHeight, 4)
    ctx.fill()

    const progressGradient = ctx.createLinearGradient(progressBarX, progressBarY, progressBarX + progressBarWidth, progressBarY)
    progressGradient.addColorStop(0, '#818cf8')
    progressGradient.addColorStop(1, '#22d3ee')
    ctx.fillStyle = progressGradient
    this.drawRoundedRect(progressBarX, progressBarY, progressBarWidth * progress, progressBarHeight, 4)
    ctx.fill()

    ctx.font = '13px "Segoe UI", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#a5b4fc'
    ctx.textAlign = 'right'
    ctx.fillText(
      `${state.activatedSutures} / ${state.totalSutures}`,
      x + width - 15,
      y + 90
    )

    ctx.restore()
  }

  private drawEnergyBar(state: UIState): void {
    const { ctx, canvasWidth, canvasHeight, floatOffset } = this
    const barWidth = 200
    const barHeight = 24
    const x = canvasWidth - barWidth - 30
    const y = canvasHeight - 50 + Math.sin(floatOffset) * 3

    ctx.save()

    ctx.font = '13px "Segoe UI", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#a5b4fc'
    ctx.textAlign = 'left'
    ctx.textBaseline = 'bottom'
    ctx.fillText('裂隙能量', x, y - 8)

    ctx.fillStyle = 'rgba(15, 23, 42, 0.8)'
    this.drawRoundedRect(x, y, barWidth, barHeight, 12)
    ctx.fill()

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)'
    ctx.lineWidth = 1
    this.drawRoundedRect(x, y, barWidth, barHeight, 12)
    ctx.stroke()

    const energyRatio = state.energy / state.maxEnergy
    const energyWidth = (barWidth - 4) * energyRatio

    if (energyWidth > 0) {
      const energyGradient = ctx.createLinearGradient(x + 2, y + 2, x + 2 + energyWidth, y + barHeight - 2)
      energyGradient.addColorStop(0, '#6366f1')
      energyGradient.addColorStop(0.5, '#8b5cf6')
      energyGradient.addColorStop(1, '#06b6d4')
      ctx.fillStyle = energyGradient
      this.drawRoundedRect(x + 2, y + 2, energyWidth, barHeight - 4, 10)
      ctx.fill()

      ctx.shadowColor = '#8b5cf6'
      ctx.shadowBlur = 10
      this.drawRoundedRect(x + 2, y + 2, energyWidth, barHeight - 4, 10)
      ctx.fill()
      ctx.shadowBlur = 0
    }

    ctx.font = 'bold 12px "Segoe UI", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#e0e7ff'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(
      `${Math.floor(state.energy)} / ${Math.floor(state.maxEnergy)}`,
      x + barWidth / 2,
      y + barHeight / 2
    )

    ctx.restore()
  }

  private drawFPS(fps: number): void {
    const { ctx, canvasWidth } = this
    const x = canvasWidth - 80
    const y = 30

    ctx.save()
    ctx.font = '12px "Segoe UI", monospace'
    ctx.fillStyle = fps >= 50 ? '#34d399' : fps >= 30 ? '#fbbf24' : '#f87171'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'top'
    ctx.fillText(`${fps} FPS`, x, y)
    ctx.restore()
  }

  private drawBubbleBonus(state: UIState): void {
    if (state.bubbleLifetimeBonus <= 1) return

    const { ctx, canvasWidth, canvasHeight } = this
    const x = canvasWidth - 30
    const y = canvasHeight - 90

    ctx.save()

    ctx.shadowColor = '#fbbf24'
    ctx.shadowBlur = 10

    ctx.font = 'bold 14px "Segoe UI", "Microsoft YaHei", sans-serif'
    ctx.fillStyle = '#fbbf24'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    ctx.fillText(`⏳ +${Math.round((state.bubbleLifetimeBonus - 1) * 100)}%`, x, y)

    ctx.restore()
  }

  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    const { ctx } = this
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + width - radius, y)
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
    ctx.lineTo(x + width, y + height - radius)
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
    ctx.lineTo(x + radius, y + height)
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
  }
}
