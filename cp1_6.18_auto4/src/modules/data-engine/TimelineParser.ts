import * as d3 from 'd3'
import {
  Dataset,
  TimeSeriesData,
  ProcessedDataPoint,
  TimelineParseConfig,
  ResampleInterval
} from '../../types'

const INTERVAL_MS: Record<ResampleInterval, number> = {
  none: 0,
  '1min': 60 * 1000,
  '5min': 5 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  '1hour': 60 * 60 * 1000,
  '1day': 24 * 60 * 60 * 1000
}

export class TimelineParser {
  parse(dataset: Dataset, config: TimelineParseConfig): Dataset {
    const processedSeries: TimeSeriesData[] = dataset.series.map((s) =>
      this.processSeries(s, config, dataset.timeRange)
    )

    let allValues: number[] = []
    let minTime = Infinity
    let maxTime = -Infinity

    for (const s of processedSeries) {
      allValues = allValues.concat(s.points.map((p) => p.value))
      minTime = Math.min(minTime, ...s.points.map((p) => p.timestamp))
      maxTime = Math.max(maxTime, ...s.points.map((p) => p.timestamp))
    }

    return {
      ...dataset,
      series: processedSeries,
      timeRange:
        minTime !== Infinity && maxTime !== -Infinity
          ? [minTime, maxTime]
          : dataset.timeRange,
      valueRange:
        allValues.length > 0
          ? [Math.min(...allValues), Math.max(...allValues)]
          : dataset.valueRange
    }
  }

  private processSeries(
    series: TimeSeriesData,
    config: TimelineParseConfig,
    globalTimeRange: [number, number]
  ): TimeSeriesData {
    let points = [...series.points]

    if (config.interval !== 'none') {
      points = this.resample(points, config.interval, globalTimeRange)
    }

    if (config.smoothing > 0) {
      points = this.smooth(points, config.smoothing)
    }

    if (config.normalize) {
      points = this.normalize(points)
    }

    const values = points.map((p) => p.value)

    return {
      ...series,
      points,
      minValue: values.length > 0 ? Math.min(...values) : series.minValue,
      maxValue: values.length > 0 ? Math.max(...values) : series.maxValue
    }
  }

  private resample(
    points: ProcessedDataPoint[],
    interval: ResampleInterval,
    globalTimeRange: [number, number]
  ): ProcessedDataPoint[] {
    if (points.length === 0) return points

    const stepMs = INTERVAL_MS[interval]
    if (stepMs <= 0) return points

    const [startTime, endTime] = globalTimeRange
    const result: ProcessedDataPoint[] = []
    const buckets = new Map<number, number[]>()

    for (const point of points) {
      const bucket = Math.floor((point.timestamp - startTime) / stepMs) * stepMs + startTime
      if (!buckets.has(bucket)) {
        buckets.set(bucket, [])
      }
      buckets.get(bucket)!.push(point.value)
    }

    const sortedBuckets = [...buckets.entries()].sort((a, b) => a[0] - b[0])

    for (const [timestamp, values] of sortedBuckets) {
      if (timestamp < startTime || timestamp > endTime) continue
      const avg = values.reduce((a, b) => a + b, 0) / values.length
      result.push({
        timestamp,
        value: avg,
        series: points[0].series
      })
    }

    return result.length > 0 ? result : points
  }

  private smooth(points: ProcessedDataPoint[], smoothing: number): ProcessedDataPoint[] {
    if (points.length < 3 || smoothing <= 0) return points

    const windowSize = Math.max(3, Math.ceil(smoothing * 5))
    const halfWindow = Math.floor(windowSize / 2)
    const result: ProcessedDataPoint[] = []

    for (let i = 0; i < points.length; i++) {
      let sum = 0
      let count = 0
      let weightSum = 0

      for (let j = Math.max(0, i - halfWindow); j <= Math.min(points.length - 1, i + halfWindow); j++) {
        const distance = Math.abs(j - i)
        const weight = Math.exp(-(distance * distance) / (2 * halfWindow * halfWindow))
        sum += points[j].value * weight
        weightSum += weight
        count++
      }

      if (count > 0) {
        result.push({
          ...points[i],
          value: sum / weightSum
        })
      } else {
        result.push(points[i])
      }
    }

    return result
  }

  private normalize(points: ProcessedDataPoint[]): ProcessedDataPoint[] {
    if (points.length === 0) return points

    const values = points.map((p) => p.value)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const range = max - min

    if (range === 0) return points

    return points.map((p) => ({
      ...p,
      value: ((p.value - min) / range) * 100
    }))
  }

  findNearestPoint(
    dataset: Dataset,
    timestamp: number,
    series?: string
  ): { point: ProcessedDataPoint; distance: number; seriesIndex: number } | null {
    let nearest: ProcessedDataPoint | null = null
    let minDistance = Infinity
    let nearestSeriesIndex = -1

    const seriesToSearch = series
      ? dataset.series.filter((s) => s.series === series)
      : dataset.series

    for (let si = 0; si < seriesToSearch.length; si++) {
      const s = seriesToSearch[si]
      const idx = d3.bisector((p: ProcessedDataPoint) => p.timestamp).center(
        s.points,
        timestamp
      )
      if (idx >= 0 && idx < s.points.length) {
        const distance = Math.abs(s.points[idx].timestamp - timestamp)
        if (distance < minDistance) {
          minDistance = distance
          nearest = s.points[idx]
          nearestSeriesIndex = dataset.series.findIndex((ds) => ds.series === s.series)
        }
      }
    }

    return nearest
      ? { point: nearest, distance: minDistance, seriesIndex: nearestSeriesIndex }
      : null
  }

  getPointAtRatio(
    dataset: Dataset,
    ratio: number
  ): { timestamp: number; values: Map<string, number> } | null {
    if (ratio < 0 || ratio > 1 || dataset.series.length === 0) return null

    const [startTime, endTime] = dataset.timeRange
    const timestamp = startTime + ratio * (endTime - startTime)

    const values = new Map<string, number>()

    for (const s of dataset.series) {
      if (s.points.length === 0) continue

      const bisect = d3.bisector((p: ProcessedDataPoint) => p.timestamp)
      const idx = bisect.left(s.points, timestamp)

      if (idx === 0) {
        values.set(s.series, s.points[0].value)
      } else if (idx >= s.points.length) {
        values.set(s.series, s.points[s.points.length - 1].value)
      } else {
        const prev = s.points[idx - 1]
        const next = s.points[idx]
        const t = (timestamp - prev.timestamp) / (next.timestamp - prev.timestamp)
        const interpolated = prev.value + t * (next.value - prev.value)
        values.set(s.series, interpolated)
      }
    }

    return { timestamp, values }
  }
}

export default TimelineParser
