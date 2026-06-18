import { Settings, type SettingsChangeEvent } from './Settings'
import type { MoleculeType } from '../chem/Molecule'

interface ControlPanelOptions {
  settings: Settings
}

export class ControlPanel {
  private settings: Settings
  private container: HTMLDivElement
  private panel: HTMLDivElement
  private moleculeSelect: HTMLSelectElement
  private labelsToggle: HTMLInputElement
  private anglesToggle: HTMLInputElement
  private resetButton: HTMLButtonElement
  private isAnimating: boolean = false

  constructor(options: ControlPanelOptions) {
    this.settings = options.settings

    this.container = document.createElement('div')
    this.container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `

    this.panel = document.createElement('div')
    this.panel.style.cssText = `
      background: rgba(16, 16, 32, 0.8);
      backdrop-filter: blur(10px);
      border-radius: 12px;
      padding: 16px;
      min-width: 240px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      border: 1px solid rgba(79, 195, 247, 0.2);
      transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      transform-origin: bottom right;
    `

    const title = document.createElement('div')
    title.textContent = '控制面板'
    title.style.cssText = `
      color: #ffffff;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      display: flex;
      align-items: center;
      gap: 8px;
    `
    title.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" stroke-width="2">
        <circle cx="12" cy="12" r="3"/>
        <circle cx="12" cy="5" r="1.5"/>
        <circle cx="12" cy="19" r="1.5"/>
        <circle cx="5" cy="12" r="1.5"/>
        <circle cx="19" cy="12" r="1.5"/>
        <line x1="12" y1="6.5" x2="12" y2="9"/>
        <line x1="12" y1="15" x2="12" y2="17.5"/>
        <line x1="6.5" y1="12" x2="9" y2="12"/>
        <line x1="15" y1="12" x2="17.5" y2="12"/>
      </svg>
      控制面板
    `
    this.panel.appendChild(title)

    this.moleculeSelect = this.createSelectControl()
    this.labelsToggle = this.createToggleControl('显示原子标签', false)
    this.anglesToggle = this.createToggleControl('显示键角标注', false)
    this.resetButton = this.createButtonControl('重置视角')

    this.panel.appendChild(this.createControlRow('分子模型', this.moleculeSelect))
    this.panel.appendChild(this.createToggleRow('原子标签', this.labelsToggle))
    this.panel.appendChild(this.createToggleRow('键角标注', this.anglesToggle))
    this.panel.appendChild(this.resetButton)

    this.container.appendChild(this.panel)
    document.body.appendChild(this.container)

    this.bindEvents()
    this.syncWithSettings()
  }

  private createSelectControl(): HTMLSelectElement {
    const select = document.createElement('select')
    select.innerHTML = `
      <option value="water">💧 水分子 (H₂O)</option>
      <option value="methane">🔥 甲烷 (CH₄)</option>
      <option value="benzene">💍 苯环 (C₆H₆)</option>
    `
    select.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      background: rgba(79, 195, 247, 0.1);
      border: 1px solid rgba(79, 195, 247, 0.3);
      border-radius: 6px;
      color: #ffffff;
      font-size: 13px;
      cursor: pointer;
      outline: none;
      transition: all 0.2s;
    `
    select.onmouseenter = () => {
      select.style.background = 'rgba(79, 195, 247, 0.2)'
      select.style.borderColor = 'rgba(79, 195, 247, 0.5)'
    }
    select.onmouseleave = () => {
      select.style.background = 'rgba(79, 195, 247, 0.1)'
      select.style.borderColor = 'rgba(79, 195, 247, 0.3)'
    }

    const style = document.createElement('style')
    style.textContent = `
      select option {
        background: #1a1a2e;
        color: #ffffff;
      }
    `
    document.head.appendChild(style)

    return select
  }

  private createToggleControl(label: string, defaultValue: boolean): HTMLInputElement {
    const toggle = document.createElement('input')
    toggle.type = 'checkbox'
    toggle.checked = defaultValue
    toggle.style.cssText = `
      appearance: none;
      width: 40px;
      height: 20px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 10px;
      position: relative;
      cursor: pointer;
      outline: none;
      transition: all 0.2s;
    `
    const toggleStyle = document.createElement('style')
    toggleStyle.textContent = `
      input[type="checkbox"]::before {
        content: '';
        position: absolute;
        width: 16px;
        height: 16px;
        background: #ffffff;
        border-radius: 50%;
        top: 2px;
        left: 2px;
        transition: all 0.2s;
      }
      input[type="checkbox"]:checked {
        background: #4fc3f7;
      }
      input[type="checkbox"]:checked::before {
        left: 22px;
      }
    `
    document.head.appendChild(toggleStyle)

    return toggle
  }

  private createButtonControl(label: string): HTMLButtonElement {
    const button = document.createElement('button')
    button.textContent = label
    button.style.cssText = `
      width: 100%;
      padding: 10px 16px;
      background: linear-gradient(135deg, #4fc3f7 0%, #29b6f6 100%);
      border: none;
      border-radius: 6px;
      color: #ffffff;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      margin-top: 12px;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(79, 195, 247, 0.3);
    `
    button.onmouseenter = () => {
      button.style.transform = 'translateY(-1px)'
      button.style.boxShadow = '0 4px 12px rgba(79, 195, 247, 0.4)'
    }
    button.onmouseleave = () => {
      button.style.transform = 'translateY(0)'
      button.style.boxShadow = '0 2px 8px rgba(79, 195, 247, 0.3)'
    }
    button.onmousedown = () => {
      button.style.transform = 'translateY(0)'
    }
    return button
  }

  private createControlRow(label: string, control: HTMLElement): HTMLDivElement {
    const row = document.createElement('div')
    row.style.cssText = 'margin-bottom: 12px;'

    const labelEl = document.createElement('label')
    labelEl.textContent = label
    labelEl.style.cssText = `
      display: block;
      color: rgba(255, 255, 255, 0.9);
      font-size: 12px;
      margin-bottom: 6px;
    `
    row.appendChild(labelEl)
    row.appendChild(control)
    return row
  }

  private createToggleRow(label: string, toggle: HTMLInputElement): HTMLDivElement {
    const row = document.createElement('div')
    row.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 12px;
      cursor: pointer;
    `

    const labelEl = document.createElement('span')
    labelEl.textContent = label
    labelEl.style.cssText = `
      color: rgba(255, 255, 255, 0.9);
      font-size: 13px;
    `

    row.appendChild(labelEl)
    row.appendChild(toggle)

    row.onclick = (e) => {
      if (e.target !== toggle) {
        toggle.checked = !toggle.checked
        toggle.dispatchEvent(new Event('change'))
      }
    }

    return row
  }

  private bindEvents(): void {
    this.moleculeSelect.addEventListener('change', () => {
      const value = this.moleculeSelect.value as MoleculeType
      this.settings.setMoleculeType(value)
      this.triggerPanelAnimation()
    })

    this.labelsToggle.addEventListener('change', () => {
      this.settings.setShowLabels(this.labelsToggle.checked)
    })

    this.anglesToggle.addEventListener('change', () => {
      this.settings.setShowAngles(this.anglesToggle.checked)
    })

    this.resetButton.addEventListener('click', () => {
      this.settings.resetView()
    })
  }

  private syncWithSettings(): void {
    const settings = this.settings.get()
    this.moleculeSelect.value = settings.moleculeType
    this.labelsToggle.checked = settings.showLabels
    this.anglesToggle.checked = settings.showAngles
  }

  private triggerPanelAnimation(): void {
    if (this.isAnimating) return
    this.isAnimating = true

    this.panel.style.transform = 'scale(1.05)'

    setTimeout(() => {
      this.panel.style.transform = 'scale(1)'
      setTimeout(() => {
        this.isAnimating = false
      }, 200)
    }, 200)
  }

  updateFromSettings(event: SettingsChangeEvent): void {
    switch (event.type) {
      case 'molecule':
        if (this.moleculeSelect.value !== event.settings.moleculeType) {
          this.moleculeSelect.value = event.settings.moleculeType
        }
        break
      case 'labels':
        this.labelsToggle.checked = event.settings.showLabels
        break
      case 'angles':
        this.anglesToggle.checked = event.settings.showAngles
        break
    }
  }

  dispose(): void {
    document.body.removeChild(this.container)
  }
}
