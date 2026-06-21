export interface ControlCallbacks {
  onRotationSpeedChange: (value: number) => void
  onSizeScaleChange: (value: number) => void
  onColorMixChange: (value: number) => void
}

export class ControlPanel {
  private container: HTMLElement
  private panel: HTMLElement
  private callbacks: ControlCallbacks

  private rotationSpeedSlider: HTMLInputElement
  private rotationSpeedValue: HTMLElement
  private sizeScaleSlider: HTMLInputElement
  private sizeScaleValue: HTMLElement
  private colorMixSlider: HTMLInputElement
  private colorMixValue: HTMLElement

  private fpsDisplay: HTMLElement
  private particleCountDisplay: HTMLElement
  private particleInfo: HTMLElement

  constructor(container: HTMLElement, callbacks: ControlCallbacks) {
    this.container = container
    this.callbacks = callbacks

    this.panel = this.createPanel()
    this.rotationSpeedSlider = this.createSlider('旋转速度', 0.2, 0, 1, 0.01, 'rad/s')
    this.rotationSpeedValue = this.rotationSpeedSlider.parentElement!.querySelector('.slider-value') as HTMLElement
    this.sizeScaleSlider = this.createSlider('粒子缩放', 1, 1, 3, 0.01, 'x')
    this.sizeScaleValue = this.sizeScaleSlider.parentElement!.querySelector('.slider-value') as HTMLElement
    this.colorMixSlider = this.createSlider('颜色混合', 0.5, 0, 1, 0.01, '')
    this.colorMixValue = this.colorMixSlider.parentElement!.querySelector('.slider-value') as HTMLElement

    this.fpsDisplay = this.createInfoItem('FPS', '60')
    this.particleCountDisplay = this.createInfoItem('粒子数', '0')
    this.particleInfo = this.createParticleInfo()

    this.bindEvents()
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div')
    panel.className = 'control-panel'
    panel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 280px;
      padding: 20px;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 0.5px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff;
      z-index: 100;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    `
    this.container.appendChild(panel)
    return panel
  }

  private createSlider(
    label: string,
    defaultValue: number,
    min: number,
    max: number,
    step: number,
    unit: string
  ): HTMLInputElement {
    const wrapper = document.createElement('div')
    wrapper.style.cssText = `
      margin-bottom: 20px;
    `

    const labelRow = document.createElement('div')
    labelRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      font-size: 13px;
    `

    const labelText = document.createElement('span')
    labelText.textContent = label
    labelText.style.opacity = '0.8'

    const valueText = document.createElement('span')
    valueText.className = 'slider-value'
    valueText.textContent = defaultValue.toFixed(2) + unit
    valueText.style.fontWeight = '600'
    valueText.style.color = '#34d399'

    labelRow.appendChild(labelText)
    labelRow.appendChild(valueText)

    const slider = document.createElement('input')
    slider.type = 'range'
    slider.min = min.toString()
    slider.max = max.toString()
    slider.step = step.toString()
    slider.value = defaultValue.toString()
    slider.style.cssText = `
      width: 100%;
      height: 4px;
      -webkit-appearance: none;
      appearance: none;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 2px;
      outline: none;
      cursor: pointer;
    `

    const style = document.createElement('style')
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #34d399;
        cursor: pointer;
        box-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
        transition: box-shadow 0.2s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        box-shadow: 0 0 15px rgba(52, 211, 153, 0.8);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: #34d399;
        cursor: pointer;
        border: none;
        box-shadow: 0 0 10px rgba(52, 211, 153, 0.5);
      }
      input[type="range"]::-webkit-slider-runnable-track {
        height: 4px;
        background: linear-gradient(to right, #34d399 0%, #34d399 var(--progress, 50%), rgba(255,255,255,0.1) var(--progress, 50%), rgba(255,255,255,0.1) 100%);
        border-radius: 2px;
      }
    `
    document.head.appendChild(style)

    wrapper.appendChild(labelRow)
    wrapper.appendChild(slider)
    this.panel.appendChild(wrapper)

    return slider
  }

  private createInfoItem(label: string, value: string): HTMLElement {
    const item = document.createElement('div')
    item.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
      margin-top: 4px;
    `

    const labelText = document.createElement('span')
    labelText.textContent = label
    labelText.style.opacity = '0.6'

    const valueText = document.createElement('span')
    valueText.className = 'info-value'
    valueText.textContent = value
    valueText.style.fontWeight = '600'

    item.appendChild(labelText)
    item.appendChild(valueText)

    return item
  }

  private createParticleInfo(): HTMLElement {
    const info = document.createElement('div')
    info.className = 'particle-info'
    info.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 20px;
      padding: 12px 16px;
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border: 0.5px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #fff;
      font-size: 12px;
      z-index: 100;
      display: none;
    `
    this.container.appendChild(info)
    return info
  }

  private bindEvents(): void {
    this.rotationSpeedSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.rotationSpeedValue.textContent = value.toFixed(2) + 'rad/s'
      this.updateSliderProgress(this.rotationSpeedSlider)
      this.callbacks.onRotationSpeedChange(value)
    })

    this.sizeScaleSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.sizeScaleValue.textContent = value.toFixed(2) + 'x'
      this.updateSliderProgress(this.sizeScaleSlider)
      this.callbacks.onSizeScaleChange(value)
    })

    this.colorMixSlider.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      const percentage = Math.round(value * 100)
      this.colorMixValue.textContent = percentage + '%'
      this.updateSliderProgress(this.colorMixSlider)
      this.callbacks.onColorMixChange(value)
    })

    this.updateSliderProgress(this.rotationSpeedSlider)
    this.updateSliderProgress(this.sizeScaleSlider)
    this.updateSliderProgress(this.colorMixSlider)

    const infoContainer = document.createElement('div')
    infoContainer.style.cssText = `
      margin-top: 16px;
      padding-top: 16px;
      border-top: 0.5px solid rgba(255, 255, 255, 0.1);
    `
    infoContainer.appendChild(this.fpsDisplay)
    infoContainer.appendChild(this.particleCountDisplay)
    this.panel.appendChild(infoContainer)
  }

  private updateSliderProgress(slider: HTMLInputElement): void {
    const min = parseFloat(slider.min)
    const max = parseFloat(slider.max)
    const value = parseFloat(slider.value)
    const progress = ((value - min) / (max - min)) * 100
    slider.style.setProperty('--progress', progress + '%')
  }

  public updateFPS(fps: number): void {
    const valueEl = this.fpsDisplay.querySelector('.info-value') as HTMLElement
    valueEl.textContent = Math.round(fps).toString()
    if (fps >= 55) {
      valueEl.style.color = '#34d399'
    } else if (fps >= 28) {
      valueEl.style.color = '#fbbf24'
    } else {
      valueEl.style.color = '#f87171'
    }
  }

  public updateParticleCount(count: number): void {
    const valueEl = this.particleCountDisplay.querySelector('.info-value') as HTMLElement
    valueEl.textContent = count.toLocaleString()
  }

  public showParticleInfo(index: number, position: { x: number; y: number; z: number }): void {
    this.particleInfo.style.display = 'block'
    this.particleInfo.innerHTML = `
      <div style="font-weight: 600; margin-bottom: 6px; color: #34d399;">粒子 #${index}</div>
      <div style="opacity: 0.8;">X: ${position.x.toFixed(3)}</div>
      <div style="opacity: 0.8;">Y: ${position.y.toFixed(3)}</div>
      <div style="opacity: 0.8;">Z: ${position.z.toFixed(3)}</div>
    `
  }

  public hideParticleInfo(): void {
    this.particleInfo.style.display = 'none'
  }

  public dispose(): void {
    this.panel.remove()
    this.particleInfo.remove()
  }
}
