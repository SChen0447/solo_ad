import axios, { type AxiosResponse } from 'axios'
import { formatTime } from './gameLoop'

const API_BASE_URL = 'http://localhost:5000/api'

export interface LeaderboardRecord {
  time: number
  date: string
  timestamp: number
}

export interface TrackConfig {
  islands: Array<{
    id: number
    x: number
    y: number
    z: number
    size: number
    texture: 'grass' | 'rock' | 'desert'
    isFinish: boolean
  }>
  ringCounts: number[]
  startPosition: { x: number; y: number; z: number }
}

export async function fetchTrackConfig(): Promise<TrackConfig | null> {
  try {
    const response: AxiosResponse<TrackConfig> = await axios.get(
      `${API_BASE_URL}/tracks`,
      { timeout: 2000 }
    )
    return response.data
  } catch (error) {
    console.warn('无法连接到后端服务器，使用默认赛道配置')
    return null
  }
}

export async function submitRecord(timeMs: number): Promise<{
  success: boolean
  rank?: number
} | null> {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/records`,
      { time: timeMs },
      { timeout: 3000 }
    )
    return response.data
  } catch (error) {
    console.warn('提交记录失败')
    return null
  }
}

export async function fetchLeaderboard(): Promise<LeaderboardRecord[]> {
  try {
    const response = await axios.get(`${API_BASE_URL}/leaderboard`, {
      timeout: 2000
    })
    return response.data.leaderboard || []
  } catch (error) {
    console.warn('获取排行榜失败，使用本地数据')
    return getLocalLeaderboard()
  }
}

const LOCAL_STORAGE_KEY = 'cloud_island_racing_records'

function getLocalLeaderboard(): LeaderboardRecord[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (data) {
      return JSON.parse(data)
    }
  } catch (e) {
    console.error('读取本地排行榜失败')
  }
  return []
}

export function saveLocalRecord(timeMs: number): LeaderboardRecord[] {
  const records = getLocalLeaderboard()
  const newRecord: LeaderboardRecord = {
    time: timeMs,
    date: new Date().toLocaleString('zh-CN'),
    timestamp: Date.now()
  }
  records.push(newRecord)
  records.sort((a, b) => a.time - b.time)
  const topRecords = records.slice(0, 100)

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(topRecords))
  } catch (e) {
    console.error('保存本地记录失败')
  }

  return topRecords
}

export interface UIControls {
  startScreen: HTMLElement
  finishScreen: HTMLElement
  startBtn: HTMLButtonElement
  restartBtn: HTMLButtonElement
  finishTimeElement: HTMLElement
  leaderboardElement: HTMLElement
}

export function createUIControls(): UIControls {
  return {
    startScreen: document.getElementById('start-screen')!,
    finishScreen: document.getElementById('finish-screen')!,
    startBtn: document.getElementById('start-btn') as HTMLButtonElement,
    restartBtn: document.getElementById('restart-btn') as HTMLButtonElement,
    finishTimeElement: document.getElementById('finish-time')!,
    leaderboardElement: document.getElementById('leaderboard')!
  }
}

export function hideStartScreen(controls: UIControls): void {
  controls.startScreen.classList.add('hidden')
}

export function showStartScreen(controls: UIControls): void {
  controls.startScreen.classList.remove('hidden')
}

export function showFinishScreen(
  controls: UIControls,
  timeMs: number,
  leaderboard: LeaderboardRecord[]
): void {
  controls.finishTimeElement.textContent = formatTime(timeMs)
  renderLeaderboard(controls.leaderboardElement, leaderboard)
  controls.finishScreen.classList.add('visible')
}

export function hideFinishScreen(controls: UIControls): void {
  controls.finishScreen.classList.remove('visible')
}

function renderLeaderboard(
  container: HTMLElement,
  records: LeaderboardRecord[]
): void {
  container.innerHTML = ''

  const displayRecords: (LeaderboardRecord | null)[] = [
    records[1] || null,
    records[0] || null,
    records[2] || null
  ]
  const ranks = [2, 1, 3]
  const classes = ['silver', 'gold', 'bronze']
  const medals = ['🥈', '🥇', '🥉']

  displayRecords.forEach((record, index) => {
    const card = document.createElement('div')
    card.className = `leaderboard-card ${classes[index]}`

    if (record) {
      card.innerHTML = `
        <div class="card-rank">${medals[index]} #${ranks[index]}</div>
        <div class="card-time">${formatTime(record.time)}</div>
        <div class="card-date">${record.date.substring(5, 16)}</div>
      `
    } else {
      card.innerHTML = `
        <div class="card-rank">${medals[index]} #${ranks[index]}</div>
        <div class="card-time" style="opacity: 0.5;">--:--.--</div>
        <div class="card-date">暂无记录</div>
      `
    }

    container.appendChild(card)
  })
}
