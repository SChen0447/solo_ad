import { PipelineType, PIPELINE_DEFAULTS, PIPELINE_COLOR_PRESETS } from './PipelineManager'

export interface UIPipelineState {
  type: PipelineType
  visible: boolean
  depth: number
  diameter: number
  xPosition: number
  colorIndex: number
}

export interface UIEvents {
  onPipelineChange: (type: PipelineType, changes: Partial<UIPipelineState>) => void
  onResetCamera: () => void
  onTogglePipeline: (type: PipelineType, visible: boolean) => void
}

const PIPELINE_NAMES: Record<PipelineType, string> = {
  water: '给水管',
  drainage: '排水管',
  electric: '电力管',
  gas: '燃气管'
}

const PIPELINE_ICONS: Record<PipelineType, string> = {
  water: '💧',
  drainage: '🟢',
  electric: '⚡',
  gas: '🔥'
}

export class UIPanel {
  private container: HTMLElement
  private events: UIEvents
  private states: Record<PipelineType, UIPipelineState>
  private isCollapsed: boolean = false
  private contentElement!: HTMLDivElement
  private conflictInfo!: HTMLDivElement

  constructor(containerId: string, events: UIEvents) {
    const container = document.getElementById(containerId)
    if (!container) {
      throw new Error(`Container with id "${containerId}" not found`)
    }
    this.container = container
    this.events = events

    this.states = {
      water: {
        type: 'water',
        visible: true,
        depth: PIPELINE_DEFAULTS.water.depth,
        diameter: PIPELINE_DEFAULTS.water.diameter,
        xPosition: PIPELINE_DEFAULTS.water.xPosition,
        colorIndex: 0
      },
      drainage: {
        type: 'drainage',
        visible: true,
        depth: PIPELINE_DEFAULTS.drainage.depth,
        diameter: PIPELINE_DEFAULTS.drainage.diameter,
        xPosition: PIPELINE_DEFAULTS.drainage.xPosition,
        colorIndex: 0
      },
      electric: {
        type: 'electric',
        visible: true,
        depth: PIPELINE_DEFAULTS.electric.depth,
        diameter: PIPELINE_DEFAULTS.electric.diameter,
        xPosition: PIPELINE_DEFAULTS.electric.xPosition,
        colorIndex: 0
      },
      gas: {
        type: 'gas',
        visible: true,
        depth: PIPELINE_DEFAULTS.gas.depth,
        diameter: PIPELINE_DEFAULTS.gas.diameter,
        xPosition: PIPELINE_DEFAULTS.gas.xPosition,
        colorIndex: 0
      }
    }

    this.build()
  }

  private build(): void {
    this.container.innerHTML = ''
    this.container.id = 'ui-panel'

    const header = this.createHeader()
    this.container.appendChild(header)

    this.contentElement = document.createElement('div')
    this.contentElement.className = 'panel-content'
    this.container.appendChild(this.contentElement)

    const pipelineCard = this.createPipelineCard()
    this.contentElement.appendChild(pipelineCard)

    const viewCard = this.createViewCard()
    this.contentElement.appendChild(viewCard)
  }

  private createHeader(): HTMLElement {
    const header = document.createElement('div')
    header.className = 'panel-header'

    const title = document.createElement('div')
    title.className = 'panel-title'
    title.textContent = '管线控制面板'

    const toggleBtn = document.createElement('button')
    toggleBtn.className = 'toggle-btn'
    toggleBtn.innerHTML = '◀'
    toggleBtn.onclick = () => this.togglePanel()

    header.appendChild(title)
    header.appendChild(toggleBtn)

    return header
  }

  private createPipelineCard(): HTMLElement {
    const card = document.createElement('div')
    card.className = 'card'

    const cardHeader = document.createElement('div')
    cardHeader.className = 'card-header'

    const icon = document.createElement('span')
    icon.className = 'card-icon'
    icon.textContent = '🔧'

    const title = document.createElement('span')
    title.className = 'card-title'
    title.textContent = '管线配置'

    cardHeader.appendChild(icon)
    cardHeader.appendChild(title)
    card.appendChild(cardHeader)

    const types: PipelineType[] = ['water', 'drainage', 'electric', 'gas']
    types.forEach(type => {
      const pipelineItem = this.createPipelineItem(type)
      card.appendChild(pipelineItem)
    })

    this.conflictInfo = document.createElement('div')
    this.conflictInfo.className = 'conflict-info hidden'

    const conflictTitle = document.createElement('div')
    conflictTitle.className = 'conflict-title'
    conflictTitle.innerHTML = '<span>⚠️</span> 管线冲突警告'

    const conflictText = document.createElement('div')
    conflictText.className = 'conflict-text'
    conflictText.textContent = '检测到管线间距不足0.3米，请调整位置避免冲突。'

    this.conflictInfo.appendChild(conflictTitle)
    this.conflictInfo.appendChild(conflictText)
    card.appendChild(this.conflictInfo)

    return card
  }

  private createPipelineItem(type: PipelineType): HTMLElement {
    const state = this.states[type]
    const colors = PIPELINE_COLOR_PRESETS[type]

    const item = document.createElement('div')
    item.className = 'pipeline-item'

    const header = document.createElement('div')
    header.className = 'pipeline-header'

    const nameContainer = document.createElement('div')
    nameContainer.className = 'pipeline-name'

    const dot = document.createElement('span')
    dot.className = 'pipeline-dot'
    dot.style.backgroundColor = '#' + colors[state.colorIndex].toString(16).padStart(6, '0')

    const name = document.createElement('span')
    name.textContent = `${PIPELINE_ICONS[type]} ${PIPELINE_NAMES[type]}`

    nameContainer.appendChild(dot)
    nameContainer.appendChild(name)

    const toggle = document.createElement('div')
    toggle.className = `toggle-switch ${state.visible ? 'active' : ''}`
    toggle.onclick = () => this.toggleVisibility(type)

    header.appendChild(nameContainer)
    header.appendChild(toggle)
    item.appendChild(header)

    const depthSlider = this.createSlider(
      '埋深',
      state.depth,
      -2.5,
      -0.5,
      0.05,
      'm',
      (value) => this.onDepthChange(type, value)
    )
    item.appendChild(depthSlider)

    const diameterSlider = this.createSlider(
      '管径',
      state.diameter,
      0.1,
      0.5,
      0.01,
      'm',
      (value) => this.onDiameterChange(type, value)
    )
    item.appendChild(diameterSlider)

    const xSlider = this.createSlider(
      '水平位置',
      state.xPosition,
      -5,
      5,
      0.1,
      'm',
      (value) => this.onXPositionChange(type, value)
    )
    item.appendChild(xSlider)

    const colorGroup = document.createElement('div')
    colorGroup.className = 'color-picker-group'

    const colorLabel = document.createElement('div')
    colorLabel.className = 'color-picker-label'
    colorLabel.textContent = '颜色预设'
    colorGroup.appendChild(colorLabel)

    const colorOptions = document.createElement('div')
    colorOptions.className = 'color-options'

    colors.forEach((color, index) => {
      const option = document.createElement('div')
      option.className = `color-option ${index === state.colorIndex ? 'selected' : ''}`
      option.style.backgroundColor = '#' + color.toString(16).padStart(6, '0')
      option.onclick = () => this.onColorChange(type, index)
      colorOptions.appendChild(option)
    })

    colorGroup.appendChild(colorOptions)
    item.appendChild(colorGroup)

    return item
  }

  private createSlider(
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
    unit: string,
    onChange: (value: number) => void
  ): HTMLElement {
    const group = document.createElement('div')
    group.className = 'slider-group'

    const labelContainer = document.createElement('div')
    labelContainer.className = 'slider-label'

    const labelText = document.createElement('span')
    labelText.textContent = label

    const valueText = document.createElement('span')
    valueText.className = 'slider-value'
    valueText.textContent = `${value.toFixed(2)}${unit}`

    labelContainer.appendChild(labelText)
    labelContainer.appendChild(valueText)
    group.appendChild(labelContainer)

    const slider = document.createElement('input')
    slider.type = 'range'
    slider.className = 'slider'
    slider.min = min.toString()
    slider.max = max.toString()
    slider.step = step.toString()
    slider.value = value.toString()

    slider.oninput = (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value)
      valueText.textContent = `${val.toFixed(2)}${unit}`
      onChange(val)
    }

    group.appendChild(slider)
    return group
  }

  private createViewCard(): HTMLElement {
    const card = document.createElement('div')
    card.className = 'card'

    const cardHeader = document.createElement('div')
    cardHeader.className = 'card-header'

    const icon = document.createElement('span')
    icon.className = 'card-icon'
    icon.textContent = '👁️'

    const title = document.createElement('span')
    title.className = 'card-title'
    title.textContent = '视图控制'

    cardHeader.appendChild(icon)
    cardHeader.appendChild(title)
    card.appendChild(cardHeader)

    const qualityGroup = document.createElement('div')
    qualityGroup.className = 'quality-group'
    qualityGroup.style.marginBottom = '12px'

    const qualityLabel = document.createElement('span')
    qualityLabel.className = 'quality-label'
    qualityLabel.textContent = '渲染质量'

    const qualityBadge = document.createElement('span')
    qualityBadge.className = 'quality-badge high'
    qualityBadge.id = 'quality-badge'
    qualityBadge.textContent = '高质量'

    qualityGroup.appendChild(qualityLabel)
    qualityGroup.appendChild(qualityBadge)
    card.appendChild(qualityGroup)

    const resetBtn = document.createElement('button')
    resetBtn.className = 'reset-btn'
    resetBtn.textContent = '🔄 重置视角'
    resetBtn.onclick = () => this.events.onResetCamera()
    card.appendChild(resetBtn)

    return card
  }

  private toggleVisibility(type: PipelineType): void {
    const state = this.states[type]
    state.visible = !state.visible

    const items = this.container.querySelectorAll('.pipeline-item')
    const types: PipelineType[] = ['water', 'drainage', 'electric', 'gas']
    const index = types.indexOf(type)

    if (items[index]) {
      const toggle = items[index].querySelector('.toggle-switch')
      if (toggle) {
        toggle.classList.toggle('active', state.visible)
      }
    }

    this.events.onTogglePipeline(type, state.visible)
  }

  private onDepthChange(type: PipelineType, value: number): void {
    this.states[type].depth = value
    this.events.onPipelineChange(type, { depth: value })
  }

  private onDiameterChange(type: PipelineType, value: number): void {
    this.states[type].diameter = value
    this.events.onPipelineChange(type, { diameter: value })
  }

  private onXPositionChange(type: PipelineType, value: number): void {
    this.states[type].xPosition = value
    this.events.onPipelineChange(type, { xPosition: value })
  }

  private onColorChange(type: PipelineType, colorIndex: number): void {
    this.states[type].colorIndex = colorIndex

    const colors = PIPELINE_COLOR_PRESETS[type]
    const items = this.container.querySelectorAll('.pipeline-item')
    const types: PipelineType[] = ['water', 'drainage', 'electric', 'gas']
    const itemIndex = types.indexOf(type)

    if (items[itemIndex]) {
      const dot = items[itemIndex].querySelector('.pipeline-dot')
      if (dot) {
        (dot as HTMLElement).style.backgroundColor = '#' + colors[colorIndex].toString(16).padStart(6, '0')
      }

      const colorOptions = items[itemIndex].querySelectorAll('.color-option')
      colorOptions.forEach((opt, i) => {
        opt.classList.toggle('selected', i === colorIndex)
      })
    }

    this.events.onPipelineChange(type, { colorIndex })
  }

  private togglePanel(): void {
    this.isCollapsed = !this.isCollapsed
    this.container.classList.toggle('collapsed', this.isCollapsed)

    const toggleBtn = this.container.querySelector('.toggle-btn')
    if (toggleBtn) {
      toggleBtn.innerHTML = this.isCollapsed ? '▶' : '◀'
    }
  }

  public setConflictVisible(visible: boolean): void {
    if (this.conflictInfo) {
      this.conflictInfo.classList.toggle('hidden', !visible)
    }
  }

  public setQualityBadge(isHigh: boolean): void {
    const badge = document.getElementById('quality-badge')
    if (badge) {
      badge.className = `quality-badge ${isHigh ? 'high' : 'low'}`
      badge.textContent = isHigh ? '高质量' : '简化模式'
    }
  }

  public getPipelineColor(type: PipelineType): number {
    const state = this.states[type]
    return PIPELINE_COLOR_PRESETS[type][state.colorIndex]
  }

  public getPipelineState(type: PipelineType): UIPipelineState {
    return { ...this.states[type] }
  }
}
