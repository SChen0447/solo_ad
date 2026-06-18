import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import Stats from 'stats.js'
import { Molecule } from './chem/Molecule'
import { MoleculeRenderer } from './chem/MoleculeRenderer'
import { Settings } from './ui/Settings'
import { ControlPanel } from './ui/ControlPanel'
import type { SettingsChangeEvent } from './ui/Settings'

class MoleculeViewerApp {
  private container: HTMLElement
  private settings: Settings
  private renderer: MoleculeRenderer
  private controls: OrbitControls
  private stats: Stats
  private controlPanel: ControlPanel
  private clock: THREE.Clock
  private animationId: number | null = null

  constructor() {
    this.container = document.getElementById('app')!
    this.clock = new THREE.Clock()

    this.settings = new Settings()

    this.renderer = new MoleculeRenderer({
      container: this.container,
      settings: this.settings.get()
    })

    this.controls = new OrbitControls(
      this.renderer.getCamera(),
      this.renderer.getRenderer().domElement
    )
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.1
    this.controls.enableZoom = true
    this.controls.minDistance = 0.5
    this.controls.maxDistance = 5
    this.controls.enablePan = true
    this.controls.target.set(0, 0, 0)

    this.stats = new Stats()
    this.stats.showPanel(0)
    this.stats.dom.style.cssText = `
      position: fixed;
      top: 20px;
      left: 20px;
      z-index: 1000;
    `
    document.body.appendChild(this.stats.dom)

    this.controlPanel = new ControlPanel({
      settings: this.settings
    })

    this.bindEvents()
    this.init()
  }

  private async init(): Promise<void> {
    const initialMolecule = Molecule.create(this.settings.get().moleculeType)
    await this.renderer.setMolecule(initialMolecule)
    this.startAnimationLoop()
  }

  private bindEvents(): void {
    this.settings.addChangeListener(this.onSettingsChange.bind(this))

    const canvas = this.renderer.getRenderer().domElement

    canvas.addEventListener('mousemove', (e) => {
      this.renderer.updateMousePosition(e.clientX, e.clientY)
      const isHovering = this.renderer.checkHover()
      canvas.style.cursor = isHovering ? 'pointer' : 'grab'
    })

    canvas.addEventListener('mousedown', () => {
      canvas.style.cursor = 'grabbing'
    })

    canvas.addEventListener('mouseup', () => {
      const isHovering = this.renderer.checkHover()
      canvas.style.cursor = isHovering ? 'pointer' : 'grab'
    })

    canvas.addEventListener('mouseleave', () => {
      canvas.style.cursor = 'grab'
    })

    window.addEventListener('wheel', (e) => {
      if (e.target === canvas || canvas.contains(e.target as Node)) {
        e.preventDefault()
      }
    }, { passive: false })
  }

  private async onSettingsChange(event: SettingsChangeEvent): Promise<void> {
    this.controlPanel.updateFromSettings(event)
    this.renderer.updateSettings(event.settings)

    switch (event.type) {
      case 'molecule':
        const molecule = Molecule.create(event.settings.moleculeType)
        await this.renderer.setMolecule(molecule)
        this.controls.target.set(0, 0, 0)
        break
      case 'labels':
        this.renderer.updateLabelsVisibility(event.settings.showLabels)
        break
      case 'angles':
        this.renderer.updateAnglesVisibility(event.settings.showAngles)
        break
      case 'reset':
        this.renderer.resetCamera()
        this.controls.reset()
        break
      case 'bloom':
        break
    }
  }

  private startAnimationLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate)

      this.stats.begin()

      const delta = this.clock.getDelta()
      this.controls.update(delta)

      this.renderer.render()

      this.stats.end()
    }
    animate()
  }

  dispose(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId)
    }
    this.controls.dispose()
    this.renderer.dispose()
    this.controlPanel.dispose()
    document.body.removeChild(this.stats.dom)
  }
}

let app: MoleculeViewerApp | null = null

window.addEventListener('DOMContentLoaded', () => {
  app = new MoleculeViewerApp()
})

window.addEventListener('beforeunload', () => {
  if (app) {
    app.dispose()
    app = null
  }
})
