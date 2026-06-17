import { StarData } from './particleSystem'

export interface UIControls {
  particleCount: number
  lineThreshold: number
  rotationSpeed: number
  colorMode: 'temperature' | 'random'
  autoRotate: boolean
  bloomEnabled: boolean
}

export class UIPanel {
  container: HTMLElement
  controls: UIControls
  private appContainer: HTMLElement
  private panel: HTMLElement
  private mobileToggleBtn: HTMLElement
  private mobilePanel: HTMLElement
  private fpsDisplay: HTMLElement
  private starDetailPopup: HTMLElement
  private isMobilePanelOpen: boolean = false

  onParticleCountChange: ((count: number) => void) | null = null
  onThresholdChange: ((threshold: number) => void) | null = null
  onRotationSpeedChange: ((speed: number) => void) | null = null
  onColorModeChange: ((mode: 'temperature' | 'random') => void) | null = null
  onAutoRotateChange: ((enabled: boolean) => void) | null = null
  onBloomChange: ((enabled: boolean) => void) | null = null
  onReset: (() => void) | null = null

  constructor() {
    this.appContainer = document.getElementById('app')!
    
    this.controls = {
      particleCount: 2000,
      lineThreshold: 4.5,
      rotationSpeed: 0.15,
      colorMode: 'temperature',
      autoRotate: false,
      bloomEnabled: true
    }

    this.container = this.createElement('div', 'ui-container')
    this.panel = this.createDesktopPanel()
    this.mobileToggleBtn = this.createMobileToggle()
    this.mobilePanel = this.createMobilePanel()
    this.fpsDisplay = this.createFPSDisplay()
    this.starDetailPopup = this.createStarDetailPopup()

    this.container.appendChild(this.panel)
    this.container.appendChild(this.mobileToggleBtn)
    this.container.appendChild(this.fpsDisplay)
    this.container.appendChild(this.starDetailPopup)
    this.appContainer.appendChild(this.container)
    this.appContainer.appendChild(this.mobilePanel)

    this.setupStyle()
    this.handleResize()
    window.addEventListener('resize', () => this.handleResize())
  }

  private createElement(tag: string, className: string): HTMLElement {
    const el = document.createElement(tag)
    el.className = className
    return el
  }

  private setupStyle(): void {
    const style = document.createElement('style')
    style.textContent = `
      .ui-container {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 100;
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      }

      .ui-container > * {
        pointer-events: auto;
      }

      .glass-panel {
        background: rgba(15, 20, 50, 0.55);
        backdrop-filter: blur(24px) saturate(180%);
        -webkit-backdrop-filter: blur(24px) saturate(180%);
        border: 1px solid rgba(100, 150, 255, 0.15);
        border-radius: 16px;
        box-shadow: 
          0 8px 32px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
      }

      .control-panel {
        position: absolute;
        top: 20px;
        left: 20px;
        width: 320px;
        padding: 24px;
        max-height: calc(100vh - 40px);
        overflow-y: auto;
      }

      .control-panel::-webkit-scrollbar {
        width: 6px;
      }

      .control-panel::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 3px;
      }

      .control-panel::-webkit-scrollbar-thumb {
        background: rgba(100, 150, 255, 0.3);
        border-radius: 3px;
      }

      .panel-title {
        font-family: 'Orbitron', sans-serif;
        font-size: 20px;
        font-weight: 700;
        color: #a5c4ff;
        margin-bottom: 8px;
        letter-spacing: 1px;
        text-shadow: 0 0 20px rgba(100, 180, 255, 0.5);
      }

      .panel-subtitle {
        font-size: 12px;
        color: rgba(180, 200, 255, 0.5);
        margin-bottom: 24px;
        letter-spacing: 0.5px;
      }

      .control-group {
        margin-bottom: 20px;
      }

      .control-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 13px;
        font-weight: 500;
        color: #c5d6ff;
        margin-bottom: 10px;
        letter-spacing: 0.3px;
      }

      .control-value {
        font-family: 'Orbitron', monospace;
        font-size: 12px;
        color: #6ab7ff;
        background: rgba(100, 180, 255, 0.1);
        padding: 3px 8px;
        border-radius: 6px;
        border: 1px solid rgba(100, 180, 255, 0.2);
      }

      input[type="range"] {
        width: 100%;
        height: 6px;
        border-radius: 3px;
        background: rgba(60, 80, 140, 0.5);
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        cursor: pointer;
      }

      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6ab7ff 0%, #a56bff 100%);
        cursor: pointer;
        box-shadow: 0 0 12px rgba(106, 183, 255, 0.6);
        transition: all 0.2s ease;
      }

      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.2);
        box-shadow: 0 0 20px rgba(106, 183, 255, 0.9);
      }

      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #6ab7ff 0%, #a56bff 100%);
        cursor: pointer;
        border: none;
        box-shadow: 0 0 12px rgba(106, 183, 255, 0.6);
      }

      .toggle-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 12px 0;
        border-bottom: 1px solid rgba(100, 150, 255, 0.1);
      }

      .toggle-container:last-of-type {
        border-bottom: none;
      }

      .toggle-label {
        font-size: 13px;
        color: #c5d6ff;
        font-weight: 500;
      }

      .toggle-switch {
        position: relative;
        width: 48px;
        height: 24px;
        background: rgba(60, 80, 140, 0.5);
        border-radius: 12px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .toggle-switch.active {
        background: linear-gradient(135deg, #6ab7ff 0%, #a56bff 100%);
        box-shadow: 0 0 15px rgba(106, 183, 255, 0.4);
      }

      .toggle-switch::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 20px;
        height: 20px;
        background: #ffffff;
        border-radius: 50%;
        transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
      }

      .toggle-switch.active::after {
        left: 26px;
      }

      .btn-reset {
        width: 100%;
        padding: 14px;
        margin-top: 20px;
        background: linear-gradient(135deg, rgba(106, 183, 255, 0.15) 0%, rgba(165, 107, 255, 0.15) 100%);
        border: 1px solid rgba(106, 183, 255, 0.3);
        border-radius: 12px;
        color: #a5c4ff;
        font-family: 'Orbitron', sans-serif;
        font-size: 13px;
        font-weight: 600;
        letter-spacing: 1px;
        cursor: pointer;
        transition: all 0.3s ease;
      }

      .btn-reset:hover {
        background: linear-gradient(135deg, rgba(106, 183, 255, 0.3) 0%, rgba(165, 107, 255, 0.3) 100%);
        border-color: rgba(106, 183, 255, 0.6);
        transform: translateY(-2px);
        box-shadow: 
          0 8px 25px rgba(106, 183, 255, 0.3),
          0 0 30px rgba(106, 183, 255, 0.2);
        color: #ffffff;
      }

      .btn-reset:active {
        transform: translateY(0);
      }

      .stats-panel {
        position: absolute;
        top: 20px;
        right: 20px;
        padding: 12px 16px;
        font-size: 12px;
        min-width: 120px;
      }

      .stats-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 6px;
      }

      .stats-row:last-child {
        margin-bottom: 0;
      }

      .stats-label {
        color: rgba(180, 200, 255, 0.6);
      }

      .stats-value {
        font-family: 'Orbitron', monospace;
        color: #6ab7ff;
        font-weight: 600;
      }

      .stats-value.fps-good {
        color: #6effa5;
      }

      .stats-value.fps-warn {
        color: #ffd36b;
      }

      .stats-value.fps-bad {
        color: #ff6b6b;
      }

      .star-detail-popup {
        position: absolute;
        padding: 20px;
        min-width: 260px;
        opacity: 0;
        visibility: hidden;
        transform: translateY(10px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 200;
      }

      .star-detail-popup.visible {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
      }

      .star-detail-popup::before {
        content: '';
        position: absolute;
        top: -8px;
        left: 30px;
        width: 16px;
        height: 16px;
        background: rgba(15, 20, 50, 0.55);
        backdrop-filter: blur(24px) saturate(180%);
        border-left: 1px solid rgba(100, 150, 255, 0.15);
        border-top: 1px solid rgba(100, 150, 255, 0.15);
        transform: rotate(45deg);
      }

      .star-name {
        font-family: 'Orbitron', sans-serif;
        font-size: 18px;
        font-weight: 700;
        color: #ffffff;
        margin-bottom: 4px;
        text-shadow: 0 0 15px rgba(106, 183, 255, 0.5);
      }

      .star-spectral {
        display: inline-block;
        font-size: 11px;
        font-weight: 600;
        padding: 3px 10px;
        border-radius: 20px;
        background: rgba(106, 183, 255, 0.2);
        color: #6ab7ff;
        letter-spacing: 1px;
        margin-bottom: 16px;
      }

      .detail-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 0;
        border-bottom: 1px solid rgba(100, 150, 255, 0.1);
      }

      .detail-row:last-child {
        border-bottom: none;
      }

      .detail-icon {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(106, 183, 255, 0.1);
        border-radius: 8px;
        margin-right: 12px;
        font-size: 14px;
      }

      .detail-label-wrap {
        flex: 1;
        display: flex;
        align-items: center;
      }

      .detail-label {
        font-size: 12px;
        color: rgba(180, 200, 255, 0.7);
      }

      .detail-value {
        font-family: 'Orbitron', monospace;
        font-size: 13px;
        font-weight: 600;
        color: #ffffff;
      }

      .detail-value.unit {
        font-size: 11px;
        color: rgba(180, 200, 255, 0.5);
        margin-left: 3px;
        font-weight: 400;
      }

      .color-indicator {
        width: 12px;
        height: 12px;
        border-radius: 50%;
        display: inline-block;
        margin-left: 8px;
        box-shadow: 0 0 10px currentColor;
      }

      .mobile-toggle {
        display: none;
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: rgba(15, 20, 50, 0.8);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(100, 150, 255, 0.3);
        cursor: pointer;
        z-index: 150;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
        transition: all 0.3s ease;
      }

      .mobile-toggle:hover {
        transform: translateX(-50%) scale(1.1);
        box-shadow: 0 6px 25px rgba(106, 183, 255, 0.4);
      }

      .mobile-toggle-icon {
        width: 24px;
        height: 24px;
        position: relative;
      }

      .mobile-toggle-icon span {
        position: absolute;
        left: 0;
        width: 100%;
        height: 2px;
        background: #6ab7ff;
        border-radius: 2px;
        transition: all 0.3s ease;
      }

      .mobile-toggle-icon span:nth-child(1) { top: 5px; }
      .mobile-toggle-icon span:nth-child(2) { top: 11px; }
      .mobile-toggle-icon span:nth-child(3) { top: 17px; }

      .mobile-toggle.active .mobile-toggle-icon span:nth-child(1) {
        transform: rotate(45deg);
        top: 11px;
      }

      .mobile-toggle.active .mobile-toggle-icon span:nth-child(2) {
        opacity: 0;
      }

      .mobile-toggle.active .mobile-toggle-icon span:nth-child(3) {
        transform: rotate(-45deg);
        top: 11px;
      }

      .mobile-panel {
        position: fixed;
        bottom: 0;
        left: 0;
        width: 100%;
        padding: 24px;
        padding-bottom: 40px;
        background: rgba(15, 20, 50, 0.9);
        backdrop-filter: blur(30px) saturate(180%);
        border-top: 1px solid rgba(100, 150, 255, 0.2);
        border-radius: 24px 24px 0 0;
        transform: translateY(100%);
        transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 140;
        max-height: 80vh;
        overflow-y: auto;
      }

      .mobile-panel.open {
        transform: translateY(0);
      }

      .mobile-panel .panel-title {
        font-size: 18px;
        text-align: center;
      }

      .mobile-panel .panel-subtitle {
        text-align: center;
      }

      @media (max-width: 1024px) {
        .control-panel {
          width: 280px;
          padding: 20px;
        }
      }

      @media (max-width: 768px) {
        .control-panel {
          display: none;
        }

        .mobile-toggle {
          display: flex;
        }

        .stats-panel {
          top: 12px;
          right: 12px;
          padding: 10px 14px;
        }

        .star-detail-popup {
          position: fixed !important;
          top: auto !important;
          left: 16px !important;
          right: 16px !important;
          bottom: 90px !important;
          min-width: auto;
          transform: translateY(20px);
        }

        .star-detail-popup::before {
          display: none;
        }

        .star-detail-popup.visible {
          transform: translateY(0);
        }
      }
    `
    document.head.appendChild(style)
  }

  private createDesktopPanel(): HTMLElement {
    const panel = this.createElement('div', 'control-panel glass-panel')
    
    const title = this.createElement('h1', 'panel-title')
    title.textContent = 'NEBULA CONTROL'
    
    const subtitle = this.createElement('p', 'panel-subtitle')
    subtitle.textContent = '星座连线可视化控制面板'
    
    panel.appendChild(title)
    panel.appendChild(subtitle)
    panel.appendChild(this.createSliderControl('粒子数量', 'particleCount', 100, 2500, 100, this.controls.particleCount))
    panel.appendChild(this.createSliderControl('连线阈值', 'lineThreshold', 1.0, 10.0, 0.1, this.controls.lineThreshold, (v) => v.toFixed(1)))
    panel.appendChild(this.createSliderControl('旋转速度', 'rotationSpeed', 0, 1.0, 0.01, this.controls.rotationSpeed, (v) => v.toFixed(2)))
    
    panel.appendChild(this.createToggleControl('按温度着色', 'colorMode', true))
    panel.appendChild(this.createToggleControl('自动旋转', 'autoRotate', this.controls.autoRotate))
    panel.appendChild(this.createToggleControl('辉光效果', 'bloomEnabled', this.controls.bloomEnabled))
    
    const resetBtn = this.createElement('button', 'btn-reset')
    resetBtn.textContent = '重置参数'
    resetBtn.addEventListener('click', () => {
      if (this.onReset) this.onReset()
    })
    panel.appendChild(resetBtn)

    return panel
  }

  private createSliderControl(
    label: string, 
    key: keyof UIControls, 
    min: number, 
    max: number, 
    step: number, 
    value: number,
    formatFn?: (v: number) => string
  ): HTMLElement {
    const group = this.createElement('div', 'control-group')
    
    const labelRow = this.createElement('div', 'control-label')
    const labelText = this.createElement('span', '')
    labelText.textContent = label
    const valueDisplay = this.createElement('span', 'control-value')
    valueDisplay.textContent = formatFn ? formatFn(value) : String(value)
    
    labelRow.appendChild(labelText)
    labelRow.appendChild(valueDisplay)
    
    const slider = document.createElement('input')
    slider.type = 'range'
    slider.min = String(min)
    slider.max = String(max)
    slider.step = String(step)
    slider.value = String(value)
    
    slider.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value)
      valueDisplay.textContent = formatFn ? formatFn(val) : String(val)
      ;(this.controls[key] as number) = val
      
      if (key === 'particleCount' && this.onParticleCountChange) {
        this.onParticleCountChange(val)
      } else if (key === 'lineThreshold' && this.onThresholdChange) {
        this.onThresholdChange(val)
      } else if (key === 'rotationSpeed' && this.onRotationSpeedChange) {
        this.onRotationSpeedChange(val)
      }
    })
    
    group.appendChild(labelRow)
    group.appendChild(slider)
    return group
  }

  private createToggleControl(label: string, key: keyof UIControls, defaultValue: boolean): HTMLElement {
    const container = this.createElement('div', 'toggle-container')
    
    const labelEl = this.createElement('span', 'toggle-label')
    labelEl.textContent = label
    
    const toggle = this.createElement('div', 'toggle-switch')
    const isActive = key === 'colorMode' 
      ? this.controls.colorMode === 'temperature' 
      : defaultValue
    
    if (isActive) toggle.classList.add('active')
    
    toggle.addEventListener('click', () => {
      toggle.classList.toggle('active')
      
      if (key === 'colorMode') {
        const mode = toggle.classList.contains('active') ? 'temperature' : 'random'
        this.controls.colorMode = mode
        if (this.onColorModeChange) this.onColorModeChange(mode)
      } else if (key === 'autoRotate') {
        const enabled = toggle.classList.contains('active')
        this.controls.autoRotate = enabled
        if (this.onAutoRotateChange) this.onAutoRotateChange(enabled)
      } else if (key === 'bloomEnabled') {
        const enabled = toggle.classList.contains('active')
        this.controls.bloomEnabled = enabled
        if (this.onBloomChange) this.onBloomChange(enabled)
      }
    })
    
    container.appendChild(labelEl)
    container.appendChild(toggle)
    return container
  }

  private createMobileToggle(): HTMLElement {
    const btn = this.createElement('button', 'mobile-toggle')
    const icon = this.createElement('div', 'mobile-toggle-icon')
    icon.innerHTML = '<span></span><span></span><span></span>'
    btn.appendChild(icon)
    
    btn.addEventListener('click', () => {
      this.isMobilePanelOpen = !this.isMobilePanelOpen
      btn.classList.toggle('active', this.isMobilePanelOpen)
      this.mobilePanel.classList.toggle('open', this.isMobilePanelOpen)
    })
    
    return btn
  }

  private createMobilePanel(): HTMLElement {
    const panel = this.createElement('div', 'mobile-panel')
    
    const title = this.createElement('h1', 'panel-title')
    title.textContent = '控制面板'
    
    const subtitle = this.createElement('p', 'panel-subtitle')
    subtitle.textContent = '调节星云参数与显示效果'
    
    panel.appendChild(title)
    panel.appendChild(subtitle)
    panel.appendChild(this.createSliderControl('粒子数量', 'particleCount', 100, 2500, 100, this.controls.particleCount))
    panel.appendChild(this.createSliderControl('连线阈值', 'lineThreshold', 1.0, 10.0, 0.1, this.controls.lineThreshold, (v) => v.toFixed(1)))
    panel.appendChild(this.createSliderControl('旋转速度', 'rotationSpeed', 0, 1.0, 0.01, this.controls.rotationSpeed, (v) => v.toFixed(2)))
    
    panel.appendChild(this.createToggleControl('按温度着色', 'colorMode', true))
    panel.appendChild(this.createToggleControl('自动旋转', 'autoRotate', this.controls.autoRotate))
    panel.appendChild(this.createToggleControl('辉光效果', 'bloomEnabled', this.controls.bloomEnabled))
    
    const resetBtn = this.createElement('button', 'btn-reset')
    resetBtn.textContent = '重置参数'
    resetBtn.addEventListener('click', () => {
      if (this.onReset) this.onReset()
    })
    panel.appendChild(resetBtn)

    return panel
  }

  private createFPSDisplay(): HTMLElement {
    const panel = this.createElement('div', 'stats-panel glass-panel')
    
    const fpsRow = this.createElement('div', 'stats-row')
    fpsRow.innerHTML = '<span class="stats-label">FPS</span><span class="stats-value fps-good" id="fps-value">--</span>'
    
    const particlesRow = this.createElement('div', 'stats-row')
    particlesRow.innerHTML = '<span class="stats-label">粒子数</span><span class="stats-value" id="particle-count">--</span>'
    
    const linesRow = this.createElement('div', 'stats-row')
    linesRow.innerHTML = '<span class="stats-label">连线数</span><span class="stats-value" id="line-count">--</span>'
    
    panel.appendChild(fpsRow)
    panel.appendChild(particlesRow)
    panel.appendChild(linesRow)
    
    return panel
  }

  private createStarDetailPopup(): HTMLElement {
    const popup = this.createElement('div', 'star-detail-popup glass-panel')
    popup.id = 'star-detail-popup'
    return popup
  }

  showStarDetail(star: StarData, screenX: number, screenY: number): void {
    const popup = this.starDetailPopup
    const tempColor = star.baseColor.getStyle()
    
    popup.innerHTML = `
      <div class="star-name">${star.name}</div>
      <span class="star-spectral">光谱类型 ${star.spectralType}</span>
      
      <div class="detail-row">
        <div class="detail-label-wrap">
          <span class="detail-icon">🌡️</span>
          <span class="detail-label">表面温度</span>
        </div>
        <div>
          <span class="detail-value">${star.temperature.toLocaleString()}</span>
          <span class="detail-value unit">K</span>
        </div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label-wrap">
          <span class="detail-icon">📏</span>
          <span class="detail-label">距离</span>
        </div>
        <div>
          <span class="detail-value">${star.distance.toLocaleString()}</span>
          <span class="detail-value unit">光年</span>
        </div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label-wrap">
          <span class="detail-icon">⭐</span>
          <span class="detail-label">亮度</span>
        </div>
        <div>
          <span class="detail-value">${(star.brightness * 100).toFixed(0)}</span>
          <span class="detail-value unit">%</span>
        </div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label-wrap">
          <span class="detail-icon">🔵</span>
          <span class="detail-label">恒星颜色</span>
        </div>
        <div>
          <span class="detail-value">${this.getColorName(star.temperature)}</span>
          <span class="color-indicator" style="background: ${tempColor}; color: ${tempColor};"></span>
        </div>
      </div>
      
      <div class="detail-row">
        <div class="detail-label-wrap">
          <span class="detail-icon">🆔</span>
          <span class="detail-label">编号</span>
        </div>
        <span class="detail-value">#${star.id.toString().padStart(4, '0')}</span>
      </div>
    `
    
    const rect = this.appContainer.getBoundingClientRect()
    const popupWidth = 280
    const popupHeight = 380
    
    let left = screenX + 20
    let top = screenY - 20
    
    if (left + popupWidth > rect.width - 20) {
      left = screenX - popupWidth - 20
    }
    if (top + popupHeight > rect.height - 20) {
      top = rect.height - popupHeight - 20
    }
    if (top < 20) top = 20
    
    popup.style.left = `${left}px`
    popup.style.top = `${top}px`
    popup.classList.add('visible')
  }

  hideStarDetail(): void {
    this.starDetailPopup.classList.remove('visible')
  }

  updateFPS(fps: number, particleCount: number, lineCount: number): void {
    const fpsEl = document.getElementById('fps-value')
    const particleEl = document.getElementById('particle-count')
    const lineEl = document.getElementById('line-count')
    
    if (fpsEl) {
      fpsEl.textContent = fps.toFixed(0)
      fpsEl.className = 'stats-value ' + (fps >= 55 ? 'fps-good' : fps >= 30 ? 'fps-warn' : 'fps-bad')
    }
    if (particleEl) particleEl.textContent = particleCount.toString()
    if (lineEl) lineEl.textContent = lineCount.toString()
  }

  private getColorName(temperature: number): string {
    if (temperature >= 30000) return '深蓝'
    if (temperature >= 10000) return '蓝白'
    if (temperature >= 7500) return '白色'
    if (temperature >= 6000) return '黄白'
    if (temperature >= 5200) return '黄色'
    if (temperature >= 3700) return '橙色'
    return '红色'
  }

  private handleResize(): void {
    if (window.innerWidth <= 768 && this.isMobilePanelOpen) {
      this.mobilePanel.classList.add('open')
    }
  }

  resetControls(): void {
    this.controls = {
      particleCount: 2000,
      lineThreshold: 4.5,
      rotationSpeed: 0.15,
      colorMode: 'temperature',
      autoRotate: false,
      bloomEnabled: true
    }
    
    const sliders = this.container.querySelectorAll('input[type="range"]')
    const toggles = this.container.querySelectorAll('.toggle-switch')
    const mobileSliders = this.mobilePanel.querySelectorAll('input[type="range"]')
    const mobileToggles = this.mobilePanel.querySelectorAll('.toggle-switch')
    
    const resetSliderGroup = (group: NodeListOf<HTMLInputElement>) => {
      group.forEach(slider => {
        const parent = slider.closest('.control-group')
        const valueDisplay = parent?.querySelector('.control-value')
        if (slider.min === '100') {
          slider.value = '2000'
          if (valueDisplay) valueDisplay.textContent = '2000'
        } else if (slider.min === '1.0') {
          slider.value = '4.5'
          if (valueDisplay) valueDisplay.textContent = '4.5'
        } else if (slider.min === '0') {
          slider.value = '0.15'
          if (valueDisplay) valueDisplay.textContent = '0.15'
        }
      })
    }
    
    const resetToggleGroup = (group: NodeListOf<Element>) => {
      group.forEach((toggle, index) => {
        if (index === 0 || index === 3) {
          toggle.classList.add('active')
        } else {
          toggle.classList.remove('active')
        }
      })
    }
    
    resetSliderGroup(sliders)
    resetSliderGroup(mobileSliders)
    resetToggleGroup(toggles)
    resetToggleGroup(mobileToggles)
  }
}
