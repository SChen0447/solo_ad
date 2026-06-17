import { SubmersibleData, ViewMode } from './submersible'
import { ClickableObject, CreatureData, CreatureType } from './ecosystem'

const SPECIES_NAMES: Record<CreatureType, Partial<CreatureData> & { name: string; commonName: string; ecologicalRole: string; description: string; depthRange: string; temperatureTolerance: string }> = {
  riftia: {
    name: 'Riftia pachyptila',
    commonName: '巨型管虫',
    ecologicalRole: '初级消费者，化学合成共生',
    description: '巨型管虫栖息于热液喷口附近，体内共生的化能合成细菌将硫化氢转化为有机物质，为管虫提供能量。其血红素能同时结合氧气和硫化氢，运输给体内的细菌共生体。没有口腔和消化系统，完全依赖共生体生存。',
    depthRange: '2500-3500米',
    temperatureTolerance: '2-30°C'
  },
  shrimp: {
    name: 'Rimicaris exoculata',
    commonName: '盲虾',
    ecologicalRole: '杂食性清道夫，初级消费者',
    description: '盲虾栖息于热液喷口烟囱壁上，背部有感光器官可探测微弱的热辐射。它们以化能合成细菌为食，并与丝状细菌形成共生关系。成群活动，在喷口周围形成密集的生物群落。',
    depthRange: '2300-3800米',
    temperatureTolerance: '2-45°C'
  },
  mussel: {
    name: 'Bathymodiolus thermophilus',
    commonName: '深海贻贝',
    ecologicalRole: '过滤性摄食者，兼性共生',
    description: '深海贻贝密集分布在热液喷口周围的岩石缝隙中，鳃组织内含有共生的化能合成细菌。它们既可以通过过滤海水获取食物，也可以依赖共生细菌提供的营养。其足丝能牢固附着在岩石表面。',
    depthRange: '2000-3300米',
    temperatureTolerance: '3-25°C'
  },
  octopus: {
    name: 'Vulcanoctopus hydrothermalis',
    commonName: '热液章鱼',
    ecologicalRole: '顶级捕食者',
    description: '热液章鱼是深海热液生态系统中的顶级捕食者，主要以盲虾和小型甲壳类为食。身体半透明粉红色，适应完全黑暗的深海环境，拥有发达的触觉和化学感受器。是目前已知唯一栖息于热液喷口区域的章鱼种类。',
    depthRange: '2200-3600米',
    temperatureTolerance: '2-20°C'
  },
  vent: {
    name: '深海热液喷口',
    commonName: '黑烟囱 (Black Smoker)',
    ecologicalRole: '能量来源，栖息地构建者',
    description: '热液喷口是海底地壳裂缝，过热的富矿物流体从地球内部喷出。当高温（300-400°C）的还原性流体与冷海水相遇时，溶解的金属硫化物快速沉淀，形成高耸的烟囱状结构。整个热液生态系统的能量基础即来源于此。',
    depthRange: '1500-4200米',
    temperatureTolerance: '喷口中心可达380°C以上'
  },
  plume: {
    name: '热液羽流',
    commonName: 'Hydrothermal Plume',
    ecologicalRole: '化学物质扩散介质，营养载体',
    description: '热液羽流由高温还原性流体从喷口喷出后形成。富含硫化氢、甲烷、氢气、铁、锰、二氧化硅等化学物质。羽流向上扩散可达数百米，并随洋流长距离输送，为广大深海区域提供化能合成所需的能量基质。',
    depthRange: '取决于喷口深度 + 0~300米',
    temperatureTolerance: '30°C - 380°C (中心)'
  }
}

const PLUME_CHEMISTRY = {
  硫化氢: '6.5 mmol/kg',
  甲烷: '1.2 mmol/kg',
  氢气: '0.8 mmol/kg',
  铁: '2.3 mmol/kg',
  锰: '0.4 mmol/kg',
  二氧化硅: '18.5 mmol/kg'
}

export class UI {
  container: HTMLElement

  dataPanel: HTMLDivElement
  depthEl: HTMLSpanElement
  tempEl: HTMLSpanElement
  phEl: HTMLSpanElement
  modeEl: HTMLSpanElement
  narrationEl: HTMLDivElement

  infoPanel: HTMLDivElement
  infoTitleEl: HTMLHeadingElement
  infoSubtitleEl: HTMLDivElement
  infoRoleEl: HTMLDivElement
  infoContentEl: HTMLDivElement
  infoExtraEl: HTMLDivElement
  infoCloseBtn: HTMLButtonElement

  controlHint: HTMLDivElement

  currentType: CreatureType | null
  animatingNarration: boolean

  speciesData: Record<CreatureType, Partial<CreatureData> & { name: string; commonName: string; ecologicalRole: string; description: string; depthRange: string; temperatureTolerance: string }>

  constructor(container: HTMLElement) {
    this.container = container
    this.currentType = null
    this.animatingNarration = false
    this.speciesData = SPECIES_NAMES

    this.dataPanel = this.createDataPanel()
    this.infoPanel = this.createInfoPanel()
    this.controlHint = this.createControlHint()

    this.depthEl = this.dataPanel.querySelector('[data-depth]')!
    this.tempEl = this.dataPanel.querySelector('[data-temp]')!
    this.phEl = this.dataPanel.querySelector('[data-ph]')!
    this.modeEl = this.dataPanel.querySelector('[data-mode]')!
    this.narrationEl = this.dataPanel.querySelector('[data-narration]') as HTMLDivElement

    this.infoTitleEl = this.infoPanel.querySelector('[data-info-title]') as HTMLHeadingElement
    this.infoSubtitleEl = this.infoPanel.querySelector('[data-info-subtitle]') as HTMLDivElement
    this.infoRoleEl = this.infoPanel.querySelector('[data-info-role]') as HTMLDivElement
    this.infoContentEl = this.infoPanel.querySelector('[data-info-content]') as HTMLDivElement
    this.infoExtraEl = this.infoPanel.querySelector('[data-info-extra]') as HTMLDivElement
    this.infoCloseBtn = this.infoPanel.querySelector('[data-info-close]') as HTMLButtonElement

    this.infoCloseBtn.addEventListener('click', () => {
      this.hideInfoPanel()
    })
  }

  createDataPanel(): HTMLDivElement {
    const panel = document.createElement('div')
    panel.className = 'ui-panel fade-in'
    panel.style.cssText = `
      position: fixed;
      top: 16px;
      right: 16px;
      min-width: 260px;
      padding: 16px 20px;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 12px;
      color: #ffffff;
      font-family: 'Courier New', 'Consolas', monospace;
      z-index: 100;
      border: 1px solid rgba(100, 200, 255, 0.15);
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    `

    const title = document.createElement('div')
    title.style.cssText = `
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 2px;
      color: rgba(150, 220, 255, 0.7);
      margin-bottom: 12px;
      font-weight: 600;
    `
    title.textContent = '深海环境监测'
    panel.appendChild(title)

    const createRow = (label: string, dataKey: string, unit: string) => {
      const row = document.createElement('div')
      row.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      `
      const labelEl = document.createElement('span')
      labelEl.style.cssText = 'font-size: 12px; color: rgba(200, 220, 255, 0.6);'
      labelEl.textContent = label
      const valueWrap = document.createElement('span')
      valueWrap.style.cssText = 'display: flex; align-items: baseline; gap: 4px;'
      const valueEl = document.createElement('span')
      valueEl.setAttribute(dataKey, '')
      valueEl.style.cssText = 'font-size: 16px; font-weight: 700; transition: color 0.3s;'
      const unitEl = document.createElement('span')
      unitEl.style.cssText = 'font-size: 11px; color: rgba(200, 220, 255, 0.5);'
      unitEl.textContent = unit
      valueWrap.appendChild(valueEl)
      valueWrap.appendChild(unitEl)
      row.appendChild(labelEl)
      row.appendChild(valueWrap)
      return row
    }

    panel.appendChild(createRow('深度', 'data-depth', 'm'))
    panel.appendChild(createRow('温度', 'data-temp', '°C'))
    panel.appendChild(createRow('pH 值', 'data-ph', ''))

    const modeRow = document.createElement('div')
    modeRow.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-top: 12px;
      margin-top: 6px;
    `
    const modeLabel = document.createElement('span')
    modeLabel.style.cssText = 'font-size: 11px; color: rgba(150, 220, 255, 0.7); text-transform: uppercase; letter-spacing: 1px;'
    modeLabel.textContent = '航行模式'
    const modeVal = document.createElement('span')
    modeVal.setAttribute('data-mode', '')
    modeVal.style.cssText = 'font-size: 12px; font-weight: 700; color: #7fd8ff;'
    modeVal.textContent = '自由探索'
    modeRow.appendChild(modeLabel)
    modeRow.appendChild(modeVal)
    panel.appendChild(modeRow)

    const narration = document.createElement('div')
    narration.setAttribute('data-narration', '')
    narration.style.cssText = `
      margin-top: 14px;
      padding: 10px 12px;
      background: rgba(100, 180, 255, 0.08);
      border-left: 2px solid rgba(100, 200, 255, 0.4);
      border-radius: 4px;
      font-size: 12px;
      line-height: 1.6;
      color: rgba(220, 235, 255, 0.9);
      font-family: -apple-system, system-ui, sans-serif;
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transition: max-height 0.4s ease, opacity 0.3s ease, padding 0.3s ease;
    `
    panel.appendChild(narration)

    this.container.appendChild(panel)
    return panel
  }

  createInfoPanel(): HTMLDivElement {
    const panel = document.createElement('div')
    panel.className = 'ui-panel'
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(520px, 90vw);
      max-height: 80vh;
      overflow-y: auto;
      background: rgba(255, 255, 255, 0.06);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border-radius: 12px;
      padding: 28px 32px;
      color: #ffffff;
      z-index: 200;
      border: 1px solid rgba(255, 255, 255, 0.1);
      box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease, transform 0.3s ease;
    `

    const closeBtn = document.createElement('button')
    closeBtn.setAttribute('data-info-close', '')
    closeBtn.textContent = '×'
    closeBtn.style.cssText = `
      position: absolute;
      top: 12px;
      right: 16px;
      background: none;
      border: none;
      color: rgba(255, 255, 255, 0.6);
      font-size: 28px;
      line-height: 1;
      cursor: pointer;
      font-weight: 300;
      transition: color 0.2s;
    `
    closeBtn.onmouseenter = () => { closeBtn.style.color = '#ffffff' }
    closeBtn.onmouseleave = () => { closeBtn.style.color = 'rgba(255,255,255,0.6)' }
    panel.appendChild(closeBtn)

    const title = document.createElement('h2')
    title.setAttribute('data-info-title', '')
    title.style.cssText = `
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 4px;
      letter-spacing: -0.3px;
    `
    panel.appendChild(title)

    const subtitle = document.createElement('div')
    subtitle.setAttribute('data-info-subtitle', '')
    subtitle.style.cssText = `
      font-size: 13px;
      color: rgba(150, 200, 255, 0.8);
      margin-bottom: 18px;
      font-style: italic;
      font-family: Georgia, serif;
    `
    panel.appendChild(subtitle)

    const role = document.createElement('div')
    role.setAttribute('data-info-role', '')
    role.style.cssText = `
      display: inline-block;
      padding: 5px 14px;
      background: rgba(100, 180, 255, 0.15);
      border-radius: 20px;
      font-size: 12px;
      color: #9dd5ff;
      margin-bottom: 20px;
      border: 1px solid rgba(100, 180, 255, 0.25);
    `
    panel.appendChild(role)

    const content = document.createElement('div')
    content.setAttribute('data-info-content', '')
    content.style.cssText = `
      font-size: 14px;
      line-height: 1.75;
      color: rgba(240, 245, 255, 0.92);
      margin-bottom: 20px;
    `
    panel.appendChild(content)

    const extra = document.createElement('div')
    extra.setAttribute('data-info-extra', '')
    extra.style.cssText = `
      padding-top: 18px;
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    `
    panel.appendChild(extra)

    this.container.appendChild(panel)
    return panel
  }

  createControlHint(): HTMLDivElement {
    const hint = document.createElement('div')
    hint.className = 'ui-panel fade-in'
    hint.style.cssText = `
      position: fixed;
      left: 16px;
      bottom: 16px;
      padding: 12px 18px;
      background: rgba(60, 80, 100, 0.35);
      backdrop-filter: blur(8px);
      border-radius: 10px;
      color: rgba(220, 230, 245, 0.75);
      font-size: 12px;
      line-height: 1.8;
      z-index: 100;
      border: 1px solid rgba(255, 255, 255, 0.06);
    `
    const items = [
      { key: 'WASD', val: '移动' },
      { key: '鼠标拖拽', val: '旋转视角' },
      { key: '滚轮', val: '缩放前进/后退' },
      { key: 'C 键', val: '切换巡航模式' },
      { key: '空格/Shift', val: '上升/下降' },
      { key: '点击生物', val: '查看信息' }
    ]
    for (const item of items) {
      const line = document.createElement('div')
      line.style.cssText = 'display: flex; gap: 12px; align-items: center;'
      const kbd = document.createElement('span')
      kbd.style.cssText = `
        display: inline-block;
        min-width: 72px;
        padding: 2px 8px;
        background: rgba(0, 0, 0, 0.3);
        border-radius: 4px;
        font-family: 'Courier New', monospace;
        font-size: 11px;
        text-align: center;
        color: rgba(200, 220, 255, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.08);
      `
      kbd.textContent = item.key
      const span = document.createElement('span')
      span.textContent = item.val
      line.appendChild(kbd)
      line.appendChild(span)
      hint.appendChild(line)
    }
    this.container.appendChild(hint)
    return hint
  }

  setSpeciesData(data: Record<CreatureType, any>) {
    if (data) {
      this.speciesData = { ...this.speciesData }
      for (const key of Object.keys(data) as CreatureType[]) {
        if (data[key]) {
          this.speciesData[key] = {
            name: data[key].name || this.speciesData[key]?.name || '',
            commonName: data[key].common_name || this.speciesData[key]?.commonName || '',
            ecologicalRole: data[key].ecological_role || this.speciesData[key]?.ecologicalRole || '',
            description: data[key].description || this.speciesData[key]?.description || '',
            depthRange: data[key].depth_range || this.speciesData[key]?.depthRange || '',
            temperatureTolerance: data[key].temperature_tolerance || this.speciesData[key]?.temperatureTolerance || ''
          }
        }
      }
    }
  }

  updateData(data: SubmersibleData) {
    this.depthEl.textContent = data.depth.toFixed(0)
    this.depthEl.style.color = this.depthColor(data.depth)

    this.tempEl.textContent = data.temperature.toFixed(1)
    this.tempEl.style.color = this.tempColor(data.temperature)

    this.phEl.textContent = data.pH.toFixed(2)
    this.phEl.style.color = this.phColor(data.pH)

    this.modeEl.textContent = data.mode === 'free' ? '自由探索' : '自动巡航'
    this.modeEl.style.color = data.mode === 'free' ? '#7fd8ff' : '#ffd07f'

    if (data.narration) {
      if (this.narrationEl.textContent !== data.narration) {
        this.narrationEl.style.opacity = '0'
        setTimeout(() => {
          this.narrationEl.textContent = data.narration!
          this.narrationEl.style.maxHeight = '200px'
          this.narrationEl.style.padding = '10px 12px'
          this.narrationEl.style.opacity = '1'
        }, 200)
      }
    } else if (data.mode === 'free') {
      this.narrationEl.style.maxHeight = '0'
      this.narrationEl.style.padding = '0 12px'
      this.narrationEl.style.opacity = '0'
      setTimeout(() => {
        if (data.mode === 'free') {
          this.narrationEl.textContent = ''
        }
      }, 400)
    }
  }

  depthColor(d: number): string {
    if (d < 2300) return '#7fffaf'
    if (d < 2700) return '#a7fff0'
    if (d < 3200) return '#7fd8ff'
    if (d < 3600) return '#a0a7ff'
    return '#d0a0ff'
  }

  tempColor(t: number): string {
    if (t < 10) return '#7fc8ff'
    if (t < 50) return '#a7ffe0'
    if (t < 150) return '#fff07f'
    if (t < 250) return '#ffbf7f'
    return '#ff7f7f'
  }

  phColor(ph: number): string {
    if (ph < 3) return '#ff7f9f'
    if (ph < 4.5) return '#ffb07f'
    if (ph < 6) return '#fff07f'
    if (ph < 7) return '#a7ff7f'
    return '#7fffc0'
  }

  showInfoPanel(clickable: ClickableObject) {
    const type = clickable.type
    this.currentType = type
    const info = this.speciesData[type]
    if (!info) return

    this.infoTitleEl.textContent = info.commonName
    this.infoSubtitleEl.textContent = info.name
    this.infoRoleEl.textContent = `生态角色: ${info.ecologicalRole}`
    this.infoContentEl.textContent = info.description

    if (type === 'plume') {
      let chemHtml = '<div style="margin-bottom: 8px; color: rgba(150, 220, 255, 0.9); font-size: 13px; font-weight: 600; grid-column: 1 / -1;">化学组成</div>'
      for (const [name, val] of Object.entries(PLUME_CHEMISTRY)) {
        chemHtml += this.makeInfoRow(name, val)
      }
      chemHtml += this.makeInfoRow('温度范围', '30°C - 380°C')
      chemHtml += this.makeInfoRow('pH 范围', '2.0 - 5.5')
      this.infoExtraEl.innerHTML = chemHtml
    } else {
      let html = ''
      html += this.makeInfoRow('栖息深度', info.depthRange)
      html += this.makeInfoRow('温度耐受', info.temperatureTolerance)
      this.infoExtraEl.innerHTML = html
    }

    this.infoPanel.style.pointerEvents = 'auto'
    this.infoPanel.style.opacity = '1'
    this.infoPanel.style.transform = 'translate(-50%, -50%) scale(1)'
  }

  hideInfoPanel() {
    this.currentType = null
    this.infoPanel.style.opacity = '0'
    this.infoPanel.style.transform = 'translate(-50%, -48%) scale(0.98)'
    setTimeout(() => {
      if (!this.currentType) {
        this.infoPanel.style.pointerEvents = 'none'
      }
    }, 300)
  }

  makeInfoRow(label: string, value: string): string {
    return `
      <div style="padding: 6px 10px; background: rgba(255,255,255,0.04); border-radius: 6px;">
        <div style="font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: rgba(150, 200, 255, 0.6); margin-bottom: 2px;">${label}</div>
        <div style="font-size: 13px; font-weight: 600; color: rgba(240,250,255,0.95);">${value}</div>
      </div>
    `
  }

  setMode(mode: ViewMode) {
    if (mode === 'cruise') {
      this.controlHint.style.opacity = '0.35'
    } else {
      this.controlHint.style.opacity = '1'
    }
  }
}
