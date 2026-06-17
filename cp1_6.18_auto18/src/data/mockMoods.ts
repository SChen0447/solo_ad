import type { MoodEntry, MoodType } from '../types'

const CITIES = [
  { name: '东京·涩谷区', lat: 35.6586, lng: 139.7014 },
  { name: '纽约·曼哈顿', lat: 40.7831, lng: -73.9712 },
  { name: '伦敦·威斯敏斯特', lat: 51.5014, lng: -0.1419 },
  { name: '巴黎·香榭丽舍', lat: 48.8667, lng: 2.3167 },
  { name: '北京·朝阳区', lat: 39.9042, lng: 116.4074 },
  { name: '上海·浦东新区', lat: 31.2304, lng: 121.4737 },
  { name: '首尔·江南区', lat: 37.5172, lng: 127.0473 },
  { name: '悉尼·歌剧院', lat: -33.8568, lng: 151.2153 },
  { name: '柏林·勃兰登堡门', lat: 52.5163, lng: 13.3779 },
  { name: '罗马·斗兽场', lat: 41.8902, lng: 12.4922 },
  { name: '迪拜·哈利法塔', lat: 25.1972, lng: 55.2744 },
  { name: '新加坡·滨海湾', lat: 1.2834, lng: 103.8607 },
  { name: '洛杉矶·好莱坞', lat: 34.0928, lng: -118.3287 },
  { name: '芝加哥·千禧公园', lat: 41.8827, lng: -87.6233 },
  { name: '莫斯科·红场', lat: 55.7539, lng: 37.6208 },
  { name: '香港·维多利亚港', lat: 22.2943, lng: 114.1732 },
  { name: '曼谷·大皇宫', lat: 13.7515, lng: 100.4932 },
  { name: '开罗·金字塔', lat: 29.9792, lng: 31.1342 },
  { name: '里约·基督像', lat: -22.9519, lng: -43.2105 },
  { name: '多伦多·CN塔', lat: 43.6426, lng: -79.3871 }
]

const MOOD_TYPES: MoodType[] = ['happy', 'calm', 'sad', 'angry', 'surprised', 'loved']

function randomOffset(base: number, range: number): number {
  return base + (Math.random() - 0.5) * range
}

function randomTimestamp(daysBack: number): number {
  const now = Date.now()
  const offset = Math.random() * daysBack * 24 * 60 * 60 * 1000
  return now - offset
}

export function generateMockMoods(count: number = 150): MoodEntry[] {
  const moods: MoodEntry[] = []

  for (let i = 0; i < count; i++) {
    const city = CITIES[Math.floor(Math.random() * CITIES.length)]
    const mood = MOOD_TYPES[Math.floor(Math.random() * MOOD_TYPES.length)]

    moods.push({
      id: `mock-${i}`,
      mood,
      lat: randomOffset(city.lat, 0.1),
      lng: randomOffset(city.lng, 0.1),
      location: city.name,
      timestamp: randomTimestamp(30)
    })
  }

  return moods.sort((a, b) => b.timestamp - a.timestamp)
}

export function getRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return `${Math.floor(days / 7)}周前`
}

export function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c)
}

export function getAbstractLocation(lat: number, lng: number): string {
  let nearestCity = CITIES[0]
  let minDist = Infinity

  for (const city of CITIES) {
    const dist = calculateDistance(lat, lng, city.lat, city.lng)
    if (dist < minDist) {
      minDist = dist
      nearestCity = city
    }
  }

  if (minDist < 50) {
    return nearestCity.name
  } else {
    const parts = nearestCity.name.split('·')
    return parts[0] + '·附近'
  }
}
