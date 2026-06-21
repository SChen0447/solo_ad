import { SunPositionData } from '@/types'

export function calculateSunPosition(
  dayOfYear: number,
  hourOfDay: number,
  latitude: number = 39.9
): SunPositionData {
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180)
  const hourAngle = 15 * (hourOfDay - 12)

  const latRad = latitude * Math.PI / 180
  const decRad = declination * Math.PI / 180
  const haRad = hourAngle * Math.PI / 180

  const sinAltitude =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad)
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAltitude)))

  let azimuth: number
  if (Math.abs(altitude - Math.PI / 2) < 0.001) {
    azimuth = 0
  } else {
    const cosAzimuth =
      (Math.sin(decRad) - Math.sin(altitude) * Math.sin(latRad)) /
      (Math.cos(altitude) * Math.cos(latRad))
    azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth)))
    if (hourOfDay > 12) {
      azimuth = 2 * Math.PI - azimuth
    }
  }

  const distance = 30
  const x = distance * Math.cos(altitude) * Math.sin(azimuth)
  const y = distance * Math.sin(altitude)
  const z = distance * Math.cos(altitude) * Math.cos(azimuth)

  return {
    azimuth: azimuth * 180 / Math.PI,
    altitude: altitude * 180 / Math.PI,
    x,
    y,
    z,
  }
}

export function formatDate(dayOfYear: number): string {
  const date = new Date(2025, 0, 1)
  date.setDate(date.getDate() + dayOfYear - 1)
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

export function formatTime(hours: number): string {
  const h = Math.floor(hours)
  const m = Math.round((hours - h) * 60)
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`
}

export function snapToGrid(value: number, gridSize: number = 2): number {
  return Math.round(value / gridSize) * gridSize
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
