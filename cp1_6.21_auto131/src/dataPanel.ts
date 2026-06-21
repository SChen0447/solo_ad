import { PipeData } from './pipeNetwork'

export interface SummaryStats {
  total: number
  highPressure: number
  averageFlow: number
  maxTemperature: number
}

export class DataPanel {
  private dataPanel: HTMLElement
  private statusDot: HTMLElement
  private idEl: HTMLElement
  private pressureEl: HTMLElement
  private flowEl: HTMLElement
  private tempEl: HTMLElement
  private diameterEl: HTMLElement
  private statTotal: HTMLElement
  private statHighPressure: HTMLElement
  private statAvgFlow: HTMLElement
  private statMaxTemp: HTMLElement
  private compassArrow: SVGPolygonElement

  constructor() {
    this.dataPanel = document.getElementById('data-panel')!
    this.statusDot = document.getElementById('status-dot')!
    this.idEl = document.getElementById('data-id')!
    this.pressureEl = document.getElementById('data-pressure')!
    this.flowEl = document.getElementById('data-flow')!
    this.tempEl = document.getElementById('data-temp')!
    this.diameterEl = document.getElementById('data-diameter')!
    this.statTotal = document.getElementById('stat-total')!
    this.statHighPressure = document.getElementById('stat-highpressure')!
    this.statAvgFlow = document.getElementById('stat-avgflow')!
    this.statMaxTemp = document.getElementById('stat-maxtemp')!
    this.compassArrow = document.getElementById('compass-arrow') as unknown as SVGPolygonElement
  }

  public showPipeData(pipe: PipeData) {
    this.idEl.textContent = pipe.id
    this.pressureEl.textContent = pipe.pressure.toFixed(1) + ' psi'
    this.flowEl.textContent = pipe.flowRate.toFixed(2) + ' m/s'
    this.tempEl.textContent = pipe.temperature.toFixed(1) + ' °C'
    this.diameterEl.textContent = (pipe.diameter * 100).toFixed(0) + ' mm'

    this.pressureEl.classList.remove('high')
    this.tempEl.classList.remove('high')
    this.flowEl.classList.remove('high')

    if (pipe.pressure > 80) {
      this.pressureEl.classList.add('high')
    }
    if (pipe.temperature > 80) {
      this.tempEl.classList.add('high')
    }
    if (pipe.flowRate > 5) {
      this.flowEl.classList.add('high')
    }

    this.statusDot.classList.remove('normal', 'warning', 'danger')
    if (pipe.pressure > 80 || pipe.temperature > 85) {
      this.statusDot.classList.add('danger')
    } else if (pipe.pressure > 60 || pipe.temperature > 70 || pipe.flowRate > 4.5) {
      this.statusDot.classList.add('warning')
    } else {
      this.statusDot.classList.add('normal')
    }

    this.dataPanel.classList.add('visible')
  }

  public hideDataPanel() {
    this.dataPanel.classList.remove('visible')
  }

  public updateSummary(stats: SummaryStats) {
    this.statTotal.textContent = String(stats.total)
    this.statHighPressure.textContent = String(stats.highPressure)
    this.statAvgFlow.textContent = stats.averageFlow.toFixed(2) + ' m/s'
    this.statMaxTemp.textContent = stats.maxTemperature.toFixed(1) + ' °C'

    if (stats.highPressure > 0) {
      this.statHighPressure.classList.add('warning')
    } else {
      this.statHighPressure.classList.remove('warning')
    }
    if (stats.maxTemperature > 85) {
      this.statMaxTemp.classList.add('warning')
    } else {
      this.statMaxTemp.classList.remove('warning')
    }
  }

  public updateCompass(cameraTheta: number) {
    const deg = (cameraTheta * 180) / Math.PI
    this.compassArrow.style.transformOrigin = '30px 30px'
    this.compassArrow.style.transform = `rotate(${deg}deg)`
  }
}
