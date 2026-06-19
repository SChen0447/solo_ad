export interface Device {
  id: string
  name: string
  power: number
  dailyHours: number
  dailyKWh: number
  monthlyKWh: number
  history: number[]
}

export interface EnergyTip {
  id: string
  text: string
  read: boolean
}

const STORAGE_KEY = 'smart-home-devices'

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

export function calculateDailyKWh(power: number, hours: number): number {
  return Math.round((power * hours / 1000) * 100) / 100
}

export function calculateMonthlyKWh(dailyKWh: number): number {
  return Math.round(dailyKWh * 30 * 100) / 100
}

export function generateHistory(baseKWh: number): number[] {
  const history: number[] = []
  for (let i = 0; i < 7; i++) {
    const variance = (Math.random() - 0.5) * baseKWh * 0.4
    history.push(Math.max(0.01, Math.round((baseKWh + variance) * 100) / 100))
  }
  return history
}

const DEFAULT_DEVICES: Device[] = [
  {
    id: generateId(),
    name: '空调',
    power: 1500,
    dailyHours: 8,
    dailyKWh: 12,
    monthlyKWh: 360,
    history: generateHistory(12),
  },
  {
    id: generateId(),
    name: '冰箱',
    power: 150,
    dailyHours: 24,
    dailyKWh: 3.6,
    monthlyKWh: 108,
    history: generateHistory(3.6),
  },
  {
    id: generateId(),
    name: '电视',
    power: 120,
    dailyHours: 5,
    dailyKWh: 0.6,
    monthlyKWh: 18,
    history: generateHistory(0.6),
  },
  {
    id: generateId(),
    name: '洗衣机',
    power: 500,
    dailyHours: 1,
    dailyKWh: 0.5,
    monthlyKWh: 15,
    history: generateHistory(0.5),
  },
  {
    id: generateId(),
    name: '热水器',
    power: 2000,
    dailyHours: 2,
    dailyKWh: 4,
    monthlyKWh: 120,
    history: generateHistory(4),
  },
]

export function getDevices(): Device[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      return JSON.parse(stored) as Device[]
    }
  } catch {
    // ignore parse errors
  }
  saveDevices(DEFAULT_DEVICES)
  return DEFAULT_DEVICES
}

export function saveDevices(devices: Device[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(devices))
}

export function addDevice(name: string, power: number, dailyHours: number, devices: Device[]): Device[] {
  const dailyKWh = calculateDailyKWh(power, dailyHours)
  const monthlyKWh = calculateMonthlyKWh(dailyKWh)
  const newDevice: Device = {
    id: generateId(),
    name,
    power,
    dailyHours,
    dailyKWh,
    monthlyKWh,
    history: generateHistory(dailyKWh),
  }
  const updated = [...devices, newDevice]
  saveDevices(updated)
  return updated
}

export function updateDevice(id: string, data: Partial<Pick<Device, 'name' | 'power' | 'dailyHours'>>, devices: Device[]): Device[] {
  const updated = devices.map(d => {
    if (d.id !== id) return d
    const name = data.name ?? d.name
    const power = data.power ?? d.power
    const dailyHours = data.dailyHours ?? d.dailyHours
    const dailyKWh = calculateDailyKWh(power, dailyHours)
    const monthlyKWh = calculateMonthlyKWh(dailyKWh)
    return { ...d, name, power, dailyHours, dailyKWh, monthlyKWh, history: generateHistory(dailyKWh) }
  })
  saveDevices(updated)
  return updated
}

export function deleteDevice(id: string, devices: Device[]): Device[] {
  const updated = devices.filter(d => d.id !== id)
  saveDevices(updated)
  return updated
}

const ALL_TIPS: Omit<EnergyTip, 'id'>[] = [
  { text: '将空调温度设定在26°C，每升高1°C可节省约7%的电量', read: false },
  { text: '冰箱避免频繁开关门，开门时间每增加1秒，耗电约增加0.01度', read: false },
  { text: '使用LED灯泡替代白炽灯，可节省约75%的照明用电', read: false },
  { text: '电视关闭后拔掉电源，待机状态仍消耗约5-10W电力', read: false },
  { text: '洗衣机尽量满载运行，减少洗涤次数可有效降低用电', read: false },
  { text: '热水器设定温度不宜超过55°C，过高温增加能耗且容易结垢', read: false },
  { text: '利用自然光照明，白天尽量减少人工照明使用', read: false },
  { text: '电脑设置自动休眠，10分钟无操作后进入省电模式', read: false },
  { text: '电饭煲煮饭后及时断电，保温模式每小时耗电约0.04度', read: false },
  { text: '定期清洁空调滤网，脏堵的滤网会增加约15%的耗电量', read: false },
  { text: '使用微波炉替代烤箱加热小份食物，可节省约60%电量', read: false },
  { text: '选择能效等级为一级的家电，长期使用可节省大量电费', read: false },
  { text: '冬季取暖时使用保温窗帘，减少热量散失可降低供暖能耗', read: false },
  { text: '避免在用电高峰期(18:00-22:00)使用大功率电器', read: false },
  { text: '手机充电满后及时拔掉充电器，空载充电器仍消耗约0.5W电力', read: false },
]

export function getEnergyTips(): EnergyTip[] {
  const shuffled = [...ALL_TIPS].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, 5).map(tip => ({
    ...tip,
    id: generateId(),
    read: false,
  }))
}

export function getLast7DaysLabels(): string[] {
  const labels: string[] = []
  const now = new Date()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }
  return labels
}

export const CHART_COLORS = [
  '#e94560',
  '#0f3460',
  '#53d8fb',
  '#ffc107',
  '#4caf50',
  '#9c27b0',
  '#ff9800',
  '#00bcd4',
  '#e91e63',
  '#8bc34a',
]
