import { RawDataPoint, ProcessedDataPoint, Dataset, TimeSeriesData } from '../types'
import * as d3 from 'd3'
import { v4 as uuidv4 } from 'uuid'

const SERIES_COLORS = [
  '#00d4ff',
  '#ffb703',
  '#fb8500',
  '#2ec4b6',
  '#e71d36',
  '#8338ec',
  '#3a86ff'
]

export class DataLoader {
  private seriesColors = new Map<string, string>()
  private colorIndex = 0

  private getColorForSeries(seriesName: string): string {
    if (!this.seriesColors.has(seriesName)) {
      this.seriesColors.set(
        seriesName,
        SERIES_COLORS[this.colorIndex % SERIES_COLORS.length]
      )
      this.colorIndex++
    }
    return this.seriesColors.get(seriesName)!
  }

  async loadFromCSV(file: File): Promise<Dataset> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const rawPoints = this.parseCSV(text)
          resolve(this.buildDataset(rawPoints, file.name))
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }

  async loadFromJSON(file: File): Promise<Dataset> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string
          const data = JSON.parse(text)
          const rawPoints = this.parseJSON(data)
          resolve(this.buildDataset(rawPoints, file.name))
        } catch (err) {
          reject(err)
        }
      }
      reader.onerror = () => reject(reader.error)
      reader.readAsText(file)
    })
  }

  async loadFromAPI(url: string): Promise<Dataset> {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    const rawPoints = this.parseJSON(data)
    return this.buildDataset(rawPoints, url.split('/').pop() || 'API Data')
  }

  loadMockData(): Dataset {
    const seriesNames = ['Stock Price', 'Temperature', 'Sensor Readout']
    const rawPoints: RawDataPoint[] = []
    const now = Date.now()
    const dayMs = 24 * 60 * 60 * 1000

    for (let day = 0; day < 30; day++) {
      const timestamp = now - (29 - day) * dayMs
      for (let hour = 0; hour < 24; hour += 4) {
        const t = timestamp + hour * 60 * 60 * 1000
        seriesNames.forEach((series, idx) => {
          const baseValue = [150, 22, 75][idx]
          const amplitude = [40, 8, 20][idx]
          const phase = day * 0.3 + hour * 0.1 + idx * 2
          const noise = (Math.random() - 0.5) * amplitude * 0.3
          const value = baseValue + Math.sin(phase) * amplitude + noise
          rawPoints.push({
            timestamp: t,
            value: Math.max(0, value),
            series
          })
        })
      }
    }
    return this.buildDataset(rawPoints, 'Mock Demo Data')
  }

  private parseCSV(text: string): RawDataPoint[] {
    const lines = text.trim().split('\n')
    if (lines.length < 2) return []

    const headerLine = lines[0]
    const headers = this.parseCSVLine(headerLine)

    const timestampIdx = headers.findIndex((h) =>
      /timestamp|time|date/i.test(h)
    )
    const valueIdx = headers.findIndex((h) => /value|num|count/i.test(h))
    const seriesIdx = headers.findIndex((h) => /series|name|group/i.test(h))

    if (timestampIdx === -1 || valueIdx === -1) {
      throw new Error('CSV must contain timestamp and value columns')
    }

    const points: RawDataPoint[] = []
    for (let i = 1; i < lines.length; i++) {
      const cols = this.parseCSVLine(lines[i])
      if (cols.length < 2) continue

      const point: RawDataPoint = {
        timestamp: cols[timestampIdx],
        value: parseFloat(cols[valueIdx]),
        series: seriesIdx >= 0 ? cols[seriesIdx] : 'default'
      }

      for (let j = 0; j < headers.length; j++) {
        if (j !== timestampIdx && j !== valueIdx && j !== seriesIdx) {
          point[headers[j]] = cols[j]
        }
      }

      if (!isNaN(point.value)) {
        points.push(point)
      }
    }
    return points
  }

  private parseCSVLine(line: string): string[] {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    result.push(current.trim())
    return result
  }

  private parseJSON(data: any): RawDataPoint[] {
    const points: RawDataPoint[] = []

    if (Array.isArray(data)) {
      for (const item of data) {
        points.push(this.normalizeJSONPoint(item))
      }
    } else if (data.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        points.push(this.normalizeJSONPoint(item))
      }
    } else if (data.series && typeof data.series === 'object') {
      for (const [seriesName, seriesData] of Object.entries(data.series)) {
        if (Array.isArray(seriesData)) {
          for (const item of seriesData) {
            const point = this.normalizeJSONPoint(item)
            point.series = seriesName
            points.push(point)
          }
        }
      }
    }

    return points.filter((p) => !isNaN(p.value) && p.timestamp != null)
  }

  private normalizeJSONPoint(item: any): RawDataPoint {
    const timestamp =
      item.timestamp ?? item.time ?? item.date ?? item.ts ?? item[0]
    const value =
      item.value ?? item.val ?? item.count ?? item.num ?? item.v ?? item[1]
    const series = item.series ?? item.name ?? item.group ?? 'default'

    return {
      timestamp,
      value: Number(value),
      series: String(series),
      ...item
    }
  }

  private buildDataset(rawPoints: RawDataPoint[], name: string): Dataset {
    const processed: ProcessedDataPoint[] = rawPoints.map((p, i) => ({
      timestamp: this.normalizeTimestamp(p.timestamp),
      value: p.value,
      series: p.series,
      originalIndex: i
    }))

    processed.sort((a, b) => a.timestamp - b.timestamp)

    const seriesMap = new Map<string, ProcessedDataPoint[]>()
    for (const point of processed) {
      if (!seriesMap.has(point.series)) {
        seriesMap.set(point.series, [])
      }
      seriesMap.get(point.series)!.push(point)
    }

    const seriesList: TimeSeriesData[] = []
    let allValues: number[] = []
    let minTime = Infinity
    let maxTime = -Infinity

    for (const [seriesName, points] of seriesMap) {
      const values = points.map((p) => p.value)
      allValues = allValues.concat(values)
      minTime = Math.min(minTime, ...points.map((p) => p.timestamp))
      maxTime = Math.max(maxTime, ...points.map((p) => p.timestamp))

      seriesList.push({
        series: seriesName,
        points,
        color: this.getColorForSeries(seriesName),
        minValue: Math.min(...values),
        maxValue: Math.max(...values)
      })
    }

    return {
      id: uuidv4(),
      name,
      series: seriesList,
      timeRange: [minTime, maxTime],
      valueRange: [Math.min(...allValues), Math.max(...allValues)]
    }
  }

  private normalizeTimestamp(ts: string | number | Date): number {
    if (ts instanceof Date) {
      return ts.getTime()
    }
    if (typeof ts === 'number') {
      if (ts < 1e12) return ts * 1000
      return ts
    }
    const parsed = Date.parse(ts)
    if (!isNaN(parsed)) return parsed
    throw new Error(`Invalid timestamp: ${ts}`)
  }
}

export default DataLoader
