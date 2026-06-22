import { SceneManager } from './sceneManager'
import {
  getMaterialsByType,
  getMaterialById,
  getDefaultSelection,
  type Material,
  type MaterialType
} from './materialLibrary'

interface Scheme {
  id: string
  floorId: string
  wallId: string
  curtainId: string
  thumbnail: string
  createdAt: number
}

interface AppState {
  selectedFloor: string
  selectedWall: string
  selectedCurtain: string
  history: Scheme[]
  isAnimating: boolean
}

class App {
  private sceneManager: SceneManager
  private state: AppState
  private elements: {
    canvas: HTMLCanvasElement
    floorList: HTMLElement
    wallList: HTMLElement
    curtainList: HTMLElement
    saveBtn: HTMLButtonElement
    randomBtn: HTMLButtonElement
    historyBar: HTMLElement
    emptyHistory: HTMLElement
    fadeOverlay: HTMLElement
  }

  private resizeTimer: number | null = null

  constructor() {
    const canvas = document.getElementById('roomCanvas') as HTMLCanvasElement
    const floorList = document.getElementById('floorList') as HTMLElement
    const wallList = document.getElementById('wallList') as HTMLElement
    const curtainList = document.getElementById('curtainList') as HTMLElement
    const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement
    const randomBtn = document.getElementById('randomBtn') as HTMLButtonElement
    const historyBar = document.getElementById('historyBar') as HTMLElement
    const emptyHistory = document.getElementById('emptyHistory') as HTMLElement
    const fadeOverlay = document.getElementById('fadeOverlay') as HTMLElement

    if (!canvas || !floorList || !wallList || !curtainList || !saveBtn || !randomBtn || !historyBar || !emptyHistory || !fadeOverlay) {
      throw new Error('缺少必要的DOM元素')
    }

    this.elements = { canvas, floorList, wallList, curtainList, saveBtn, randomBtn, historyBar, emptyHistory, fadeOverlay }
    this.sceneManager = new SceneManager(canvas)

    const defaultSelection = getDefaultSelection()
    this.state = {
      selectedFloor: defaultSelection.floor,
      selectedWall: defaultSelection.wall,
      selectedCurtain: defaultSelection.curtain,
      history: [],
      isAnimating: false
    }

    this.init()
  }

  private init(): void {
    this.renderMaterialLists()
    this.initScene()
    this.bindEvents()
    this.updateSelectionUI()
  }

  private renderMaterialLists(): void {
    this.renderMaterialList('floor', this.elements.floorList)
    this.renderMaterialList('wall', this.elements.wallList)
    this.renderMaterialList('curtain', this.elements.curtainList)
  }

  private renderMaterialList(type: MaterialType, container: HTMLElement): void {
    const materials = getMaterialsByType(type)
    container.innerHTML = ''

    materials.forEach(material => {
      const thumb = document.createElement('div')
      thumb.className = 'material-thumb'
      thumb.dataset.id = material.id
      thumb.dataset.type = type
      thumb.title = material.name
      thumb.style.background = material.thumbnailColor

      if (material.pattern !== 'plain') {
        thumb.style.background = this.createThumbnailBackground(material)
      }

      thumb.addEventListener('click', () => {
        if (!this.state.isAnimating) {
          this.selectMaterial(type, material.id)
        }
      })

      container.appendChild(thumb)
    })
  }

  private createThumbnailBackground(material: Material): string {
    const canvas = document.createElement('canvas')
    canvas.width = 60
    canvas.height = 60
    const ctx = canvas.getContext('2d')
    if (!ctx) return material.thumbnailColor

    ctx.fillStyle = material.color
    ctx.fillRect(0, 0, 60, 60)

    if (material.pattern === 'wood' && material.secondaryColor) {
      ctx.strokeStyle = material.secondaryColor
      ctx.lineWidth = 1.5
      ctx.globalAlpha = 0.6
      for (let i = 0; i < 4; i++) {
        const y = 12 + i * 14
        ctx.beginPath()
        ctx.moveTo(0, y)
        for (let x = 0; x <= 60; x += 8) {
          ctx.lineTo(x, y + (Math.sin(x * 0.2 + i) * 2))
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    } else if (material.pattern === 'tile' && material.secondaryColor) {
      ctx.strokeStyle = material.secondaryColor
      ctx.lineWidth = 2
      ctx.strokeRect(2, 2, 26, 26)
      ctx.strokeRect(32, 2, 26, 26)
      ctx.strokeRect(2, 32, 26, 26)
      ctx.strokeRect(32, 32, 26, 26)
    } else if (material.pattern === 'marble' && material.secondaryColor) {
      ctx.strokeStyle = material.secondaryColor
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.5
      for (let i = 0; i < 5; i++) {
        const startX = Math.random() * 60
        ctx.beginPath()
        ctx.moveTo(startX, 0)
        let x = startX
        for (let y = 0; y <= 60; y += 6) {
          x += (Math.random() - 0.5) * 10
          ctx.lineTo(x, y)
        }
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    } else if (material.pattern === 'brick' && material.secondaryColor) {
      ctx.fillStyle = material.secondaryColor
      for (let row = 0; row < 4; row++) {
        const offset = row % 2 === 0 ? 0 : 15
        for (let col = 0; col < 4; col++) {
          const x = offset + col * 30
          const y = row * 15
          ctx.fillRect(x, y, 27, 13)
        }
      }
      ctx.globalAlpha = 0.3
      ctx.fillStyle = material.color
      ctx.fillRect(0, 0, 60, 60)
      ctx.globalAlpha = 1
    } else if ((material.pattern === 'fabric' || material.pattern === 'vertical') && material.secondaryColor) {
      ctx.strokeStyle = material.secondaryColor
      ctx.lineWidth = 1
      ctx.globalAlpha = 0.4
      for (let i = 0; i < 8; i++) {
        const x = i * 8
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, 60)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }

    return `url(${canvas.toDataURL()})`
  }

  private initScene(): void {
    const floor = getMaterialById(this.state.selectedFloor)
    const wall = getMaterialById(this.state.selectedWall)
    const curtain = getMaterialById(this.state.selectedCurtain)

    if (floor) this.sceneManager.setFloor(floor)
    if (wall) this.sceneManager.setWall(wall)
    if (curtain) this.sceneManager.setCurtain(curtain)

    this.sceneManager.render()
  }

  private selectMaterial(type: MaterialType, id: string): void {
    const material = getMaterialById(id)
    if (!material) return

    switch (type) {
      case 'floor':
        if (this.state.selectedFloor === id) return
        this.state.selectedFloor = id
        this.sceneManager.setFloor(material)
        break
      case 'wall':
        if (this.state.selectedWall === id) return
        this.state.selectedWall = id
        this.sceneManager.setWall(material)
        break
      case 'curtain':
        if (this.state.selectedCurtain === id) return
        this.state.selectedCurtain = id
        this.sceneManager.setCurtain(material)
        break
    }

    this.triggerFadeEffect()
    this.updateSelectionUI()
  }

  private triggerFadeEffect(): void {
    const overlay = this.elements.fadeOverlay
    overlay.classList.remove('active')
    void overlay.offsetWidth
    overlay.classList.add('active')
  }

  private updateSelectionUI(): void {
    this.updateSelectionForList(this.elements.floorList, this.state.selectedFloor)
    this.updateSelectionForList(this.elements.wallList, this.state.selectedWall)
    this.updateSelectionForList(this.elements.curtainList, this.state.selectedCurtain)
  }

  private updateSelectionForList(container: HTMLElement, selectedId: string): void {
    const thumbs = container.querySelectorAll('.material-thumb')
    thumbs.forEach(thumb => {
      const el = thumb as HTMLElement
      if (el.dataset.id === selectedId) {
        el.classList.add('selected')
      } else {
        el.classList.remove('selected')
      }
    })
  }

  private saveScheme(): void {
    const thumbnail = this.sceneManager.getScreenshot()
    
    if (thumbnail.length / 1024 > 200) {
      console.warn('截图大小超过200KB限制')
    }

    const scheme: Scheme = {
      id: `scheme-${Date.now()}`,
      floorId: this.state.selectedFloor,
      wallId: this.state.selectedWall,
      curtainId: this.state.selectedCurtain,
      thumbnail,
      createdAt: Date.now()
    }

    this.state.history.unshift(scheme)
    this.renderHistory()
  }

  private renderHistory(): void {
    const { historyBar, emptyHistory } = this.elements

    const existingCards = historyBar.querySelectorAll('.history-card')
    existingCards.forEach(card => card.remove())

    if (this.state.history.length === 0) {
      emptyHistory.style.display = 'block'
      return
    }

    emptyHistory.style.display = 'none'

    this.state.history.forEach(scheme => {
      const card = document.createElement('div')
      card.className = 'history-card'
      card.dataset.id = scheme.id
      card.title = '点击恢复此搭配方案'

      const img = document.createElement('img')
      img.src = scheme.thumbnail
      img.alt = '搭配方案缩略图'

      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'delete-btn'
      deleteBtn.textContent = '×'
      deleteBtn.title = '删除此方案'
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        this.deleteScheme(scheme.id)
      })

      card.appendChild(img)
      card.appendChild(deleteBtn)

      card.addEventListener('click', () => {
        this.restoreScheme(scheme)
      })

      historyBar.appendChild(card)
    })
  }

  private deleteScheme(id: string): void {
    this.state.history = this.state.history.filter(s => s.id !== id)
    this.renderHistory()
  }

  private restoreScheme(scheme: Scheme): void {
    if (this.state.isAnimating) return

    this.state.selectedFloor = scheme.floorId
    this.state.selectedWall = scheme.wallId
    this.state.selectedCurtain = scheme.curtainId

    const floor = getMaterialById(scheme.floorId)
    const wall = getMaterialById(scheme.wallId)
    const curtain = getMaterialById(scheme.curtainId)

    if (floor) this.sceneManager.setFloor(floor)
    if (wall) this.sceneManager.setWall(wall)
    if (curtain) this.sceneManager.setCurtain(curtain)

    this.triggerFadeEffect()
    this.updateSelectionUI()
  }

  private randomize(): void {
    if (this.state.isAnimating) return
    this.state.isAnimating = true

    const floorMaterials = getMaterialsByType('floor')
    const wallMaterials = getMaterialsByType('wall')
    const curtainMaterials = getMaterialsByType('curtain')

    let flashCount = 0
    const totalFlashes = 3
    const flashInterval = 150

    const flash = () => {
      const randomFloor = floorMaterials[Math.floor(Math.random() * floorMaterials.length)]
      const randomWall = wallMaterials[Math.floor(Math.random() * wallMaterials.length)]
      const randomCurtain = curtainMaterials[Math.floor(Math.random() * curtainMaterials.length)]

      this.state.selectedFloor = randomFloor.id
      this.state.selectedWall = randomWall.id
      this.state.selectedCurtain = randomCurtain.id

      this.sceneManager.setFloor(randomFloor)
      this.sceneManager.setWall(randomWall)
      this.sceneManager.setCurtain(randomCurtain)

      this.updateSelectionUI()

      flashCount++

      if (flashCount < totalFlashes) {
        setTimeout(flash, flashInterval)
      } else {
        setTimeout(() => {
          const finalFloor = floorMaterials[Math.floor(Math.random() * floorMaterials.length)]
          const finalWall = wallMaterials[Math.floor(Math.random() * wallMaterials.length)]
          const finalCurtain = curtainMaterials[Math.floor(Math.random() * curtainMaterials.length)]

          this.state.selectedFloor = finalFloor.id
          this.state.selectedWall = finalWall.id
          this.state.selectedCurtain = finalCurtain.id

          this.sceneManager.setFloor(finalFloor)
          this.sceneManager.setWall(finalWall)
          this.sceneManager.setCurtain(finalCurtain)

          this.triggerFadeEffect()
          this.updateSelectionUI()
          this.state.isAnimating = false
        }, flashInterval)
      }
    }

    flash()
  }

  private bindEvents(): void {
    this.elements.saveBtn.addEventListener('click', () => this.saveScheme())
    this.elements.randomBtn.addEventListener('click', () => this.randomize())

    window.addEventListener('resize', () => {
      if (this.resizeTimer !== null) {
        clearTimeout(this.resizeTimer)
      }
      this.resizeTimer = window.setTimeout(() => {
        this.sceneManager.resize()
        this.resizeTimer = null
      }, 300)
    })
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new App()
})
