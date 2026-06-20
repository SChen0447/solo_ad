import axios, { AxiosInstance } from 'axios'

export interface EnergyData {
  floor: number
  consumption: number
}

export type DataUpdateCallback = (data: EnergyData[]) => void

export class DataService {
  private readonly apiBaseUrl: string = 'http://localhost:5000/api/energy-data'
  private readonly pollIntervalMs: number = 3000
  private readonly httpClient: AxiosInstance
  private pollTimerId: ReturnType<typeof setInterval> | null = null
  private isPolling: boolean = false
  private updateCallbacks: DataUpdateCallback[] = []
  private cachedData: EnergyData[] = []

  constructor() {
    this.httpClient = axios.create({
      timeout: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  public async fetchData(): Promise<EnergyData[]> {
    try {
      const response = await this.httpClient.get<EnergyData[]>(this.apiBaseUrl)
      this.cachedData = response.data
      this.notifyCallbacks(this.cachedData)
      return this.cachedData
    } catch (error) {
      console.warn('[DataService] 获取能耗数据失败，使用模拟数据:', error)
      const mockData = this.generateMockData()
      this.cachedData = mockData
      this.notifyCallbacks(mockData)
      return mockData
    }
  }

  public startPolling(): void {
    if (this.isPolling) {
      return
    }
    this.isPolling = true
    this.fetchData()
    this.pollTimerId = setInterval(() => {
      this.fetchData()
    }, this.pollIntervalMs)
    console.log('[DataService] 数据轮询已启动')
  }

  public stopPolling(): void {
    if (!this.isPolling) {
      return
    }
    this.isPolling = false
    if (this.pollTimerId !== null) {
      clearInterval(this.pollTimerId)
      this.pollTimerId = null
    }
    console.log('[DataService] 数据轮询已暂停')
  }

  public togglePolling(): boolean {
    if (this.isPolling) {
      this.stopPolling()
    } else {
      this.startPolling()
    }
    return this.isPolling
  }

  public getIsPolling(): boolean {
    return this.isPolling
  }

  public getCachedData(): EnergyData[] {
    return this.cachedData
  }

  public onUpdate(callback: DataUpdateCallback): void {
    this.updateCallbacks.push(callback)
  }

  public offUpdate(callback: DataUpdateCallback): void {
    const index = this.updateCallbacks.indexOf(callback)
    if (index !== -1) {
      this.updateCallbacks.splice(index, 1)
    }
  }

  private notifyCallbacks(data: EnergyData[]): void {
    for (const cb of this.updateCallbacks) {
      try {
        cb(data)
      } catch (err) {
        console.error('[DataService] 回调执行异常:', err)
      }
    }
  }

  private generateMockData(): EnergyData[] {
    const data: EnergyData[] = []
    for (let i = 0; i < 6; i++) {
      let prev = this.cachedData[i]?.consumption ?? 0.5
      const delta = (Math.random() - 0.5) * 0.16
      prev = Math.max(0.2, Math.min(1.0, prev + delta))
      data.push({ floor: i, consumption: Number(prev.toFixed(2)) })
    }
    return data
  }
}
