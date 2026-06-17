import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import * as d3 from 'd3'
import {
  Dataset,
  ChartType,
  ProcessedDataPoint,
  MarkerRegistration,
  TimeSeriesData
} from '../../types'

export interface DataGraphHandle {
  registerMarker: (timestamp: number, series: string) => MarkerRegistration | null
  getSVGCoords: (timestamp: number, value: number) => { x: number; y: number }
  getScaleInfo: () => {
    xScale: d3.ScaleTime<number, number> | null
    yScale: d3.ScaleLinear<number, number> | null
    margin: { top: number; right: number; bottom: number; left: number }
  }
}

export interface DataGraphProps {
  dataset: Dataset | null
  chartType: ChartType
  highlightedTimestamp: number | null
  visibleSeries: Set<string>
  onPointDoubleClick: (info: {
    timestamp: number
    series: string
    value: number
    x: number
    y: number
  }) => void
  onHover: (info: { timestamp: number; values: Map<string, number> } | null) => void
}

const DataGraph = forwardRef<DataGraphHandle, DataGraphProps>(
  ({ dataset, chartType, highlightedTimestamp, visibleSeries, onPointDoubleClick, onHover }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const svgRef = useRef<SVGSVGElement>(null)
    const xScaleRef = useRef<d3.ScaleTime<number, number> | null>(null)
    const yScaleRef = useRef<d3.ScaleLinear<number, number> | null>(null)
    const stackOffset = useRef(0)
    const resizeObserverRef = useRef<ResizeObserver | null>(null)

    const MARGIN = { top: 30, right: 30, bottom: 50, left: 60 }

    useImperativeHandle(ref, () => ({
      registerMarker: (timestamp: number, series: string) => {
        const xScale = xScaleRef.current
        const yScale = yScaleRef.current
        if (!dataset || !xScale || !yScale) return null

        const seriesData = dataset.series.find((s) => s.series === series)
        if (!seriesData) return null

        const bisect = d3.bisector((p: ProcessedDataPoint) => p.timestamp)
        const idx = bisect.center(seriesData.points, timestamp)
        if (idx < 0 || idx >= seriesData.points.length) return null

        const point = seriesData.points[idx]
        let yValue = point.value
        if (chartType === 'stacked-bar') {
          const sIndex = dataset.series.findIndex((s) => s.series === series)
          for (let i = 0; i < sIndex; i++) {
            const s = dataset.series[i]
            if (visibleSeries.has(s.series)) {
              const bidx = bisect.center(s.points, timestamp)
              if (bidx >= 0 && bidx < s.points.length) {
                yValue += s.points[bidx].value
              }
            }
          }
        }

        return {
          timestamp: point.timestamp,
          series,
          x: xScale(point.timestamp),
          y: yScale(yValue),
          value: point.value
        }
      },
      getSVGCoords: (timestamp: number, value: number) => {
        const xScale = xScaleRef.current
        const yScale = yScaleRef.current
        return {
          x: xScale ? xScale(timestamp) : 0,
          y: yScale ? yScale(value) : 0
        }
      },
      getScaleInfo: () => ({
        xScale: xScaleRef.current,
        yScale: yScaleRef.current,
        margin: MARGIN
      })
    }))

    useEffect(() => {
      if (!containerRef.current) return
      const obs = new ResizeObserver(() => renderGraph())
      obs.observe(containerRef.current)
      resizeObserverRef.current = obs
      return () => {
        obs.disconnect()
      }
    }, [])

    useEffect(() => {
      renderGraph()
    }, [dataset, chartType, highlightedTimestamp, visibleSeries])

    function renderGraph() {
      if (!containerRef.current || !svgRef.current || !dataset) return

      const width = containerRef.current.clientWidth
      const height = containerRef.current.clientHeight
      const innerWidth = width - MARGIN.left - MARGIN.right
      const innerHeight = height - MARGIN.top - MARGIN.bottom

      if (innerWidth <= 0 || innerHeight <= 0) return

      const svg = d3.select(svgRef.current)
      svg.selectAll('*').remove()

      const defs = svg.append('defs')

      const [timeMin, timeMax] = dataset.timeRange
      const [valueMin, valueMax] = dataset.valueRange

      let yMin = valueMin
      let yMax = valueMax
      if (chartType === 'stacked-bar') {
        const visibleSeriesArr = dataset.series.filter((s) => visibleSeries.has(s.series))
        const stackedMax = d3.max(visibleSeriesArr[0]?.points || [], (_, i) =>
          d3.sum(visibleSeriesArr, (s) => s.points[i]?.value || 0)
        ) || valueMax
        yMax = stackedMax * 1.1
        yMin = 0
      } else if (chartType === 'area') {
        yMin = 0
        yMax = valueMax * 1.1
      } else {
        const pad = (valueMax - valueMin) * 0.1
        yMin = Math.max(0, valueMin - pad)
        yMax = valueMax + pad
      }

      const xScale = d3
        .scaleTime()
        .domain([new Date(timeMin), new Date(timeMax)])
        .range([0, innerWidth])
      xScaleRef.current = xScale

      const yScale = d3
        .scaleLinear()
        .domain([yMin, yMax])
        .nice()
        .range([innerHeight, 0])
      yScaleRef.current = yScale

      dataset.series.forEach((s, i) => {
        const grad = defs
          .append('linearGradient')
          .attr('id', `gradient-${i}`)
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '0%')
          .attr('y2', '100%')
        grad.append('stop').attr('offset', '0%').attr('stop-color', s.color).attr('stop-opacity', 0.6)
        grad.append('stop').attr('offset', '100%').attr('stop-color', s.color).attr('stop-opacity', 0.02)
      })

      const glow = defs.append('filter').attr('id', 'neon-glow').attr('x', '-50%').attr('y', '-50%').attr('width', '200%').attr('height', '200%')
      glow.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur')
      const feMerge = glow.append('feMerge')
      feMerge.append('feMergeNode').attr('in', 'coloredBlur')
      feMerge.append('feMergeNode').attr('in', 'SourceGraphic')

      const highlightFilter = defs.append('filter').attr('id', 'highlight-pulse')
      highlightFilter.append('feGaussianBlur').attr('stdDeviation', '5').attr('result', 'blur')
      highlightFilter.append('feMerge').append('feMergeNode').attr('in', 'blur')

      const root = svg
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

      const xAxis = d3.axisBottom<Date>(xScale)
        .ticks(Math.min(8, Math.floor(innerWidth / 100)))
        .tickFormat((d) => d3.timeFormat('%m/%d %H:%M')(d as Date))
      root
        .append('g')
        .attr('transform', `translate(0,${innerHeight})`)
        .attr('class', 'x-axis')
        .call(xAxis)
        .selectAll('text')
        .attr('fill', '#888')
        .style('font-size', '11px')
      root.select('.x-axis').selectAll('path,line').attr('stroke', '#3a3a5c')

      const yAxis = d3.axisLeft<number>(yScale).ticks(6)
      root
        .append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .selectAll('text')
        .attr('fill', '#888')
        .style('font-size', '11px')
      root.select('.y-axis').selectAll('path,line').attr('stroke', '#3a3a5c')

      root
        .append('g')
        .attr('class', 'grid')
        .attr('opacity', 0.3)
        .selectAll('line')
        .data(yScale.ticks(6))
        .enter()
        .append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', (d) => yScale(d))
        .attr('y2', (d) => yScale(d))
        .attr('stroke', '#3a3a5c')
        .attr('stroke-dasharray', '3,3')

      const visibleSeriesArr = dataset.series.filter((s) => visibleSeries.has(s.series))

      if (chartType === 'area') {
        renderAreaChart(root, visibleSeriesArr, xScale, yScale, innerHeight)
      } else if (chartType === 'stacked-bar') {
        renderStackedBarChart(root, visibleSeriesArr, xScale, yScale, innerHeight, dataset)
      } else {
        renderScatterChart(root, visibleSeriesArr, xScale, yScale)
      }

      if (highlightedTimestamp != null) {
        const cursorX = xScale(new Date(highlightedTimestamp))
        const cursorLine = root
          .append('line')
          .attr('class', 'playback-cursor')
          .attr('x1', cursorX)
          .attr('x2', cursorX)
          .attr('y1', -10)
          .attr('y2', innerHeight + 10)
          .attr('stroke', '#00d4ff')
          .attr('stroke-width', 2)
          .attr('filter', 'url(#neon-glow)')
          .attr('opacity', 0.9)
          .style('pointer-events', 'none')

        cursorLine
          .transition()
          .ease(d3.easeElasticOut.amplitude(0.3).period(0.5))
          .duration(300)
          .attr('x1', cursorX)
          .attr('x2', cursorX)

        visibleSeriesArr.forEach((s, si) => {
          const bisect = d3.bisector((p: ProcessedDataPoint) => p.timestamp)
          const idx = bisect.center(s.points, highlightedTimestamp)
          if (idx >= 0 && idx < s.points.length) {
            const pt = s.points[idx]
            let displayY = pt.value
            if (chartType === 'stacked-bar') {
              for (let j = 0; j < visibleSeriesArr.indexOf(s); j++) {
                const bs = visibleSeriesArr[j]
                const bidx = bisect.center(bs.points, highlightedTimestamp)
                if (bidx >= 0 && bidx < bs.points.length) {
                  displayY += bs.points[bidx].value
                }
              }
            }

            const cx = xScale(new Date(pt.timestamp))
            const cy = yScale(displayY)

            const pulse = root
              .append('circle')
              .attr('cx', cx)
              .attr('cy', cy)
              .attr('r', 6)
              .attr('fill', s.color)
              .attr('stroke', '#fff')
              .attr('stroke-width', 2)
              .attr('filter', 'url(#neon-glow)')
              .style('pointer-events', 'none')

            pulse
              .transition()
              .duration(500)
              .ease(d3.easeCubicOut)
              .attr('r', 12)
              .attr('opacity', 0)
              .transition()
              .duration(0)
              .attr('r', 6)
              .attr('opacity', 1)
              .transition()
              .duration(500)
              .attr('r', 10)
              .attr('opacity', 0.6)
          }
        })
      }

      const overlay = root
        .append('rect')
        .attr('class', 'interaction-overlay')
        .attr('width', innerWidth)
        .attr('height', innerHeight)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')

      let lastClickTime = 0
      let lastClickInfo: { timestamp: number } | null = null

      overlay
        .on('mousemove', function (event: MouseEvent) {
          const [mx, my] = d3.pointer(event)
          const timeVal = xScale.invert(mx).getTime()
          const values = new Map<string, number>()

          visibleSeriesArr.forEach((s) => {
            const bisect = d3.bisector((p: ProcessedDataPoint) => p.timestamp)
            const idx = bisect.center(s.points, timeVal)
            if (idx >= 0 && idx < s.points.length) {
              values.set(s.series, s.points[idx].value)
            }
          })

          onHover({ timestamp: timeVal, values })
        })
        .on('mouseleave', function () {
          onHover(null)
        })
        .on('click', function (event: MouseEvent) {
          const [mx, my] = d3.pointer(event)
          const timeVal = xScale.invert(mx).getTime()
          const now = Date.now()

          if (now - lastClickTime < 350 && lastClickInfo && Math.abs(timeVal - lastClickInfo.timestamp) < (timeMax - timeMin) / 50) {
            const target = findClosestPoint(visibleSeriesArr, timeVal, yScale)
            if (target) {
              let displayY = target.point.value
              if (chartType === 'stacked-bar') {
                const si = visibleSeriesArr.indexOf(target.series)
                for (let j = 0; j < si; j++) {
                  const bs = visibleSeriesArr[j]
                  const bidx = d3.bisector((p: ProcessedDataPoint) => p.timestamp).center(bs.points, target.point.timestamp)
                  if (bidx >= 0 && bidx < bs.points.length) {
                    displayY += bs.points[bidx].value
                  }
                }
              }
              onPointDoubleClick({
                timestamp: target.point.timestamp,
                series: target.series.series,
                value: target.point.value,
                x: xScale(new Date(target.point.timestamp)) + MARGIN.left,
                y: yScale(displayY) + MARGIN.top
              })
            }
            lastClickTime = 0
            lastClickInfo = null
          } else {
            lastClickTime = now
            lastClickInfo = { timestamp: timeVal }
          }
        })
    }

    function renderAreaChart(
      root: d3.Selection<SVGGElement, unknown, null, undefined>,
      seriesArr: TimeSeriesData[],
      xScale: d3.ScaleTime<number, number>,
      yScale: d3.ScaleLinear<number, number>,
      innerHeight: number
    ) {
      seriesArr.forEach((s, i) => {
        const area = d3
          .area<ProcessedDataPoint>()
          .x((d) => xScale(new Date(d.timestamp)))
          .y0(innerHeight)
          .y1((d) => yScale(d.value))
          .curve(d3.curveMonotoneX)

        const line = d3
          .line<ProcessedDataPoint>()
          .x((d) => xScale(new Date(d.timestamp)))
          .y((d) => yScale(d.value))
          .curve(d3.curveMonotoneX)

        root
          .append('path')
          .datum(s.points)
          .attr('class', 'area-path')
          .attr('d', area)
          .attr('fill', `url(#gradient-${dataset!.series.indexOf(s)})`)
          .attr('opacity', 0)
          .transition()
          .duration(800)
          .ease(d3.easeCubicInOut)
          .attr('opacity', 1)

        root
          .append('path')
          .datum(s.points)
          .attr('class', 'line-path')
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', s.color)
          .attr('stroke-width', 2)
          .attr('filter', 'url(#neon-glow)')
          .attr('stroke-dasharray', function () {
            const len = (this as SVGPathElement).getTotalLength()
            return `${len},${len}`
          })
          .attr('stroke-dashoffset', function () {
            return (this as SVGPathElement).getTotalLength()
          })
          .transition()
          .duration(1200)
          .ease(d3.easeCubicOut)
          .attr('stroke-dashoffset', 0)
      })
    }

    function renderStackedBarChart(
      root: d3.Selection<SVGGElement, unknown, null, undefined>,
      seriesArr: TimeSeriesData[],
      xScale: d3.ScaleTime<number, number>,
      yScale: d3.ScaleLinear<number, number>,
      innerHeight: number,
      ds: Dataset
    ) {
      if (seriesArr.length === 0) return

      const allTimestamps = Array.from(
        new Set(seriesArr.flatMap((s) => s.points.map((p) => p.timestamp))
      ).sort((a, b) => a - b)

      const stacked: { timestamp: number; values: number[]; series: string[] }[] = []
      for (const t of allTimestamps) {
        const vals: number[] = []
        const sNames: string[] = []
        for (const s of seriesArr) {
          const bisect = d3.bisector((p: ProcessedDataPoint) => p.timestamp)
          const idx = bisect.center(s.points, t)
          if (idx >= 0 && idx < s.points.length) {
            vals.push(s.points[idx].value)
            sNames.push(s.series)
          } else {
            vals.push(0)
            sNames.push(s.series)
          }
        }
        stacked.push({ timestamp: t, values: vals, series: sNames })
      }

      const timeRange = ds.timeRange[1] - ds.timeRange[0]
      const barWidth = Math.max(2, (timeRange / stacked.length) * 0.7)
      const barPxWidth = Math.max(3, xScale(new Date(ds.timeRange[0] + barWidth)) - xScale(new Date(ds.timeRange[0])))

      const groups = root
        .selectAll('.bar-group')
        .data(stacked)
        .enter()
        .append('g')
        .attr('class', 'bar-group')
        .attr('transform', (d) => `translate(${xScale(new Date(d.timestamp))},0)`)

      let cumulativeOffset = 0

      seriesArr.forEach((s, si) => {
        groups
          .append('rect')
          .attr('class', 'stacked-bar')
          .attr('x', -barPxWidth / 2)
          .attr('width', barPxWidth)
          .attr('y', innerHeight)
          .attr('height', 0)
          .attr('fill', s.color)
          .attr('opacity', 0.85)
          .attr('rx', 2)
          .transition()
          .delay((_, i) => i * 8)
          .duration(600)
          .ease(d3.easeCubicOut)
          .attr('y', (d) => {
            const v = d.values[si] || 0
            let offset = 0
            for (let j = 0; j < si; j++) offset += d.values[j] || 0
            return yScale(offset + v)
          })
          .attr('height', (d) => {
            const v = d.values[si] || 0
            let offset = 0
            for (let j = 0; j < si; j++) offset += d.values[j] || 0
            return yScale(offset) - yScale(offset + v)
          })
      })
    }

    function renderScatterChart(
      root: d3.Selection<SVGGElement, unknown, null, undefined>,
      seriesArr: TimeSeriesData[],
      xScale: d3.ScaleTime<number, number>,
      yScale: d3.ScaleLinear<number, number>
    ) {
      seriesArr.forEach((s, si) => {
        const colorScale = d3
          .scaleLinear<string>()
          .domain([d3.min(s.points, (d) => d.value) || 0, d3.max(s.points, (d) => d.value) || 1])
          .range([s.color + '40', s.color])

        const sizeScale = d3
          .scaleLinear()
          .domain([d3.min(s.points, (d) => d.value) || 0, d3.max(s.points, (d) => d.value) || 1])
          .range([4, 14])

        root
          .selectAll(`.bubble-${si}`)
          .data(s.points)
          .enter()
          .append('circle')
          .attr('class', `bubble bubble-${si}`)
          .attr('cx', (d) => xScale(new Date(d.timestamp)))
          .attr('cy', (d) => yScale(d.value))
          .attr('r', 0)
          .attr('fill', (d) => colorScale(d.value))
          .attr('stroke', s.color)
          .attr('stroke-width', 1.5)
          .attr('opacity', 0.8)
          .attr('filter', 'url(#neon-glow)')
          .transition()
          .delay((_, i) => i * 3)
          .duration(500)
          .ease(d3.easeBackOut.overshoot(1.2))
          .attr('r', (d) => sizeScale(d.value))
      })
    }

    function findClosestPoint(
      seriesArr: TimeSeriesData[],
      targetTime: number,
      yScale: d3.ScaleLinear<number, number>
    ): { point: ProcessedDataPoint; series: TimeSeriesData } | null {
      let best: { point: ProcessedDataPoint; series: TimeSeriesData } | null = null
      let minTime = Infinity

      for (const s of seriesArr) {
        const bisect = d3.bisector((p: ProcessedDataPoint) => p.timestamp)
        const idx = bisect.center(s.points, targetTime)
        if (idx >= 0 && idx < s.points.length) {
          const dt = Math.abs(s.points[idx].timestamp - targetTime)
          if (dt < minTime) {
            minTime = dt
            best = { point: s.points[idx], series: s }
          }
        }
      }

      return best
    }

    return (
      <div ref={containerRef} className="data-graph-container">
        <svg ref={svgRef} className="data-graph-svg"></svg>
      </div>
    )
  }
)

DataGraph.displayName = 'DataGraph'

export default DataGraph
