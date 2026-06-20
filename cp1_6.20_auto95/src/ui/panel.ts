import { Chart, registerables } from 'chart.js'
import type { Layer, Drill, LithologyItem } from '../data/types'
import type { SceneObjects } from '../geology/model'
import { focusOnDrill, highlightDrillById } from '../geology/interaction'

Chart.register(...registerables)

let currentDrill: Drill | null = null
let detailChart: Chart | null = null
let modalChart: Chart | null = null

interface PanelOptions {
  sceneObjects: SceneObjects
  layers: Layer[]
  drills: Drill[]
}

export function initPanels(options: PanelOptions): void {
  const { sceneObjects, layers, drills } = options

  renderDrillList(drills, sceneObjects)
  renderLayerLegend(layers)

  const leftPanel = document.getElementById('left-panel')
  const rightPanel = document.getElementById('right-panel')

  setTimeout(() => {
    leftPanel?.classList.add('show')
    rightPanel?.classList.add('show')
  }, 100)

  setupModal()
}

function renderDrillList(drills: Drill[], sceneObjects: SceneObjects): void {
  const listElement = document.getElementById('drill-list')
  if (!listElement) return

  listElement.innerHTML = ''

  drills.forEach((drill) => {
    const li = document.createElement('li')
    li.className = 'drill-item'
    li.dataset.drillId = drill.id.toString()
    li.innerHTML = `
      <div style="font-weight: 600;">${drill.wellNo}</div>
      <div style="font-size: 12px; opacity: 0.7; margin-top: 2px;">
        深度: ${drill.depth.toFixed(1)}m
      </div>
    `

    li.addEventListener('click', () => {
      selectDrill(drill, sceneObjects)
    })

    listElement.appendChild(li)
  })
}

function renderLayerLegend(layers: Layer[]): void {
  const legendElement = document.getElementById('layer-legend')
  if (!legendElement) return

  legendElement.innerHTML = ''

  layers.slice().reverse().forEach((layer) => {
    const div = document.createElement('div')
    div.className = 'legend-item'
    div.innerHTML = `
      <span class="legend-color" style="background-color: ${layer.color};"></span>
      <span>${layer.name} (${layer.thickness.toFixed(1)}m)</span>
    `
    legendElement.appendChild(div)
  })
}

function selectDrill(drill: Drill, sceneObjects: SceneObjects): void {
  currentDrill = drill

  const items = document.querySelectorAll<HTMLElement>('.drill-item')
  items.forEach((item) => {
    item.classList.remove('active')
    if (item.dataset.drillId === drill.id.toString()) {
      item.classList.add('active')
    }
  })

  updateDrillDetail(drill)
  highlightDrillById(sceneObjects, drill.id)
  focusOnDrill(sceneObjects, drill, 800)
}

function updateDrillDetail(drill: Drill): void {
  const detailElement = document.getElementById('drill-detail')
  if (!detailElement) return

  const totalDepth = drill.lithology.reduce((sum, item) => sum + item.thickness, 0)

  detailElement.innerHTML = `
    <div class="detail-section">
      <div class="detail-label">井号</div>
      <div class="detail-value">${drill.wellNo}</div>
    </div>
    <div class="detail-section">
      <div class="detail-label">钻井深度</div>
      <div class="detail-value">${drill.depth.toFixed(2)} m</div>
    </div>
    <div class="detail-section">
      <div class="detail-label">采样时间</div>
      <div class="detail-value">${drill.sampleTime}</div>
    </div>
    <div class="detail-section">
      <div class="detail-label">坐标位置</div>
      <div class="detail-value" style="font-size: 13px;">
        X: ${drill.x.toFixed(2)}, Z: ${drill.z.toFixed(2)}
      </div>
    </div>
    <div class="detail-section">
      <div class="detail-label">穿透岩层</div>
      <div class="detail-value" style="font-size: 13px;">
        ${drill.lithology.map(l => l.layerName).join(' → ')}
      </div>
    </div>
    <div class="chart-container">
      <div class="chart-title">岩性柱状图</div>
      <canvas id="lithology-chart"></canvas>
    </div>
  `

  renderLithologyChart(drill.lithology, totalDepth)
}

function renderLithologyChart(lithology: LithologyItem[], totalDepth: number): void {
  const canvas = document.getElementById('lithology-chart') as HTMLCanvasElement
  if (!canvas) return

  if (detailChart) {
    detailChart.destroy()
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const labels = lithology.map((item, index) => `${index + 1}`)
  const data = lithology.map(item => item.thickness)
  const colors = lithology.map(item => item.color)

  detailChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '厚度 (m)',
        data: data,
        backgroundColor: colors,
        borderColor: colors.map(c => c),
        borderWidth: 1,
        barThickness: 40
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const index = context.dataIndex
              const item = lithology[index]
              return `${item.layerName}: ${item.thickness.toFixed(2)}m`
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: Math.max(totalDepth * 1.1, 5),
          grid: {
            color: 'rgba(168, 216, 234, 0.1)'
          },
          ticks: {
            color: '#a8d8ea',
            callback: function(value) {
              return value + 'm'
            }
          }
        },
        y: {
          grid: {
            display: false
          },
          ticks: {
            color: '#a8d8ea',
            font: {
              size: 11
            },
            callback: function(value, index) {
              const labelIndex = Number(value) - 1
              if (labelIndex >= 0 && labelIndex < lithology.length) {
                return lithology[labelIndex].layerName
              }
              return ''
            }
          }
        }
      }
    }
  })
}

function setupModal(): void {
  const modalOverlay = document.getElementById('modal-overlay')
  const modalClose = document.getElementById('modal-close')

  modalClose?.addEventListener('click', () => {
    closeModal()
  })

  modalOverlay?.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      closeModal()
    }
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeModal()
    }
  })
}

export function openDrillModal(drill: Drill): void {
  const modalOverlay = document.getElementById('modal-overlay')
  const modalTitle = document.getElementById('modal-title')

  if (!modalOverlay || !modalTitle) return

  modalTitle.textContent = `${drill.wellNo} - 岩性柱状图`
  modalOverlay.classList.add('show')

  setTimeout(() => {
    renderModalChart(drill)
  }, 50)
}

function renderModalChart(drill: Drill): void {
  const canvas = document.getElementById('modal-chart') as HTMLCanvasElement
  if (!canvas) return

  if (modalChart) {
    modalChart.destroy()
  }

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const lithology = drill.lithology
  const totalDepth = lithology.reduce((sum, item) => sum + item.thickness, 0)

  const labels = lithology.map((item, index) => `${index + 1}`)
  const data = lithology.map(item => item.thickness)
  const colors = lithology.map(item => item.color)

  modalChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: '厚度 (m)',
        data: data,
        backgroundColor: colors,
        borderColor: colors.map(c => c),
        borderWidth: 1,
        barThickness: 50
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const index = context.dataIndex
              const item = lithology[index]
              return `${item.layerName}: ${item.thickness.toFixed(2)}m`
            }
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true,
          max: Math.max(totalDepth * 1.1, 5),
          title: {
            display: true,
            text: '深度 (m)',
            color: '#a8d8ea'
          },
          grid: {
            color: 'rgba(168, 216, 234, 0.1)'
          },
          ticks: {
            color: '#a8d8ea',
            callback: function(value) {
              return value + 'm'
            }
          }
        },
        y: {
          grid: {
            display: false
          },
          ticks: {
            color: '#a8d8ea',
            font: {
              size: 12
            },
            callback: function(value, index) {
              const labelIndex = Number(value) - 1
              if (labelIndex >= 0 && labelIndex < lithology.length) {
                const item = lithology[labelIndex]
                return `${item.layerName} (${item.thickness.toFixed(1)}m)`
              }
              return ''
            }
          }
        }
      }
    }
  })
}

function closeModal(): void {
  const modalOverlay = document.getElementById('modal-overlay')
  modalOverlay?.classList.remove('show')

  setTimeout(() => {
    if (modalChart) {
      modalChart.destroy()
      modalChart = null
    }
  }, 200)
}

export function getCurrentDrill(): Drill | null {
  return currentDrill
}

export function setCurrentDrill(drill: Drill | null): void {
  currentDrill = drill
}
