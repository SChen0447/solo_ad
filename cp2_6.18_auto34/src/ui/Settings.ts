import type { MoleculeType } from '../chem/Molecule'

export interface RenderSettings {
  showLabels: boolean
  showAngles: boolean
  moleculeType: MoleculeType
  bloomIntensity: number
  bloomRadius: number
  bloomThreshold: number
}

export interface SettingsChangeEvent {
  type: 'molecule' | 'labels' | 'angles' | 'reset' | 'bloom'
  settings: RenderSettings
}

export type SettingsChangeListener = (event: SettingsChangeEvent) => void

export class Settings {
  private settings: RenderSettings
  private listeners: Set<SettingsChangeListener> = new Set()

  constructor() {
    this.settings = {
      showLabels: false,
      showAngles: false,
      moleculeType: 'water',
      bloomIntensity: 0.3,
      bloomRadius: 0.5,
      bloomThreshold: 0.1
    }
  }

  get(): RenderSettings {
    return { ...this.settings }
  }

  setMoleculeType(type: MoleculeType): void {
    this.settings.moleculeType = type
    this.notify({ type: 'molecule', settings: this.get() })
  }

  setShowLabels(show: boolean): void {
    this.settings.showLabels = show
    this.notify({ type: 'labels', settings: this.get() })
  }

  setShowAngles(show: boolean): void {
    this.settings.showAngles = show
    this.notify({ type: 'angles', settings: this.get() })
  }

  setBloomParams(intensity: number, radius: number, threshold: number): void {
    this.settings.bloomIntensity = intensity
    this.settings.bloomRadius = radius
    this.settings.bloomThreshold = threshold
    this.notify({ type: 'bloom', settings: this.get() })
  }

  resetView(): void {
    this.notify({ type: 'reset', settings: this.get() })
  }

  addChangeListener(listener: SettingsChangeListener): void {
    this.listeners.add(listener)
  }

  removeChangeListener(listener: SettingsChangeListener): void {
    this.listeners.delete(listener)
  }

  private notify(event: SettingsChangeEvent): void {
    for (const listener of this.listeners) {
      listener(event)
    }
  }
}
