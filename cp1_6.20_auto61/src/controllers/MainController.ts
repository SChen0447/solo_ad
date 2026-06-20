import type { DataService, EnergyData } from '../services/DataService'
import type { BuildingModel } from '../models/BuildingModel'
import type { ParticleSystem } from '../effects/ParticleSystem'

export interface MainControllerCallbacks {
  onDataUpdate?: () => void
}

export class MainController {
  private readonly dataService: DataService
  private readonly buildingModel: BuildingModel
  private readonly particleSystem: ParticleSystem
  private readonly callbacks: MainControllerCallbacks

  private lastUpdateTime: number = 0
  private isRunning: boolean = false

  constructor(
    dataService: DataService,
    buildingModel: BuildingModel,
    particleSystem: ParticleSystem,
    callbacks: MainControllerCallbacks = {}
  ) {
    this.dataService = dataService
    this.buildingModel = buildingModel
    this.particleSystem = particleSystem
    this.callbacks = callbacks

    this.setupDataListener()
    console.log('[MainController] 主控制器初始化完成')
  }

  public start(): void {
    if (this.isRunning) {
      return
    }
    this.isRunning = true
    this.dataService.startPolling()
    console.log('[MainController] 主循环已启动')
  }

  public stop(): void {
    if (!this.isRunning) {
      return
    }
    this.isRunning = false
    this.dataService.stopPolling()
    console.log('[MainController] 主循环已停止')
  }

  public toggleRunning(): boolean {
    if (this.isRunning) {
      this.stop()
    } else {
      this.start()
    }
    return this.isRunning
  }

  public update(deltaTime: number): void {
    this.buildingModel.update(deltaTime)
    this.particleSystem.update(deltaTime)
  }

  public toggleDataPolling(): boolean {
    return this.dataService.togglePolling()
  }

  public isPolling(): boolean {
    return this.dataService.getIsPolling()
  }

  public toggleParticles(): boolean {
    return this.particleSystem.toggleEnabled()
  }

  public isParticlesEnabled(): boolean {
    return this.particleSystem.isEnabled()
  }

  public getBuildingModel(): BuildingModel {
    return this.buildingModel
  }

  public dispose(): void {
    this.stop()
  }

  private setupDataListener(): void {
    this.dataService.onUpdate((data: EnergyData[]) => {
      this.handleEnergyDataUpdate(data)
    })
  }

  private handleEnergyDataUpdate(data: EnergyData[]): void {
    this.lastUpdateTime = performance.now()

    this.buildingModel.updateAllConsumptions(data)

    this.particleSystem.updateFloorAbnormalState(
      data.map(d => ({ floor: d.floor, consumption: d.consumption }))
    )

    if (this.callbacks.onDataUpdate) {
      try {
        this.callbacks.onDataUpdate()
      } catch (err) {
        console.error('[MainController] onDataUpdate回调异常:', err)
      }
    }

    this.logDataSummary(data)
  }

  private logDataSummary(data: EnergyData[]): void {
    const abnormalFloors = data
      .filter(d => d.consumption > 0.7)
      .map(d => `${d.floor}F(${d.consumption.toFixed(2)})`)
    if (abnormalFloors.length > 0) {
      console.log(`[MainController] 能耗异常楼层: ${abnormalFloors.join(', ')}`)
    }
  }
}
