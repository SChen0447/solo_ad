<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch, reactive } from 'vue'
import * as echarts from 'echarts/core'
import { BarChart, LineChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import { useTaskStore } from '@/data/taskStore'
import { useResizeObserver } from '@vueuse/core'

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent, CanvasRenderer])

const store = useTaskStore()
const chartRef = ref<HTMLDivElement | null>(null)
let chartInstance: echarts.ECharts | null = null

const legendState = reactive({
  completedCount: true,
  hoursDeviation: true,
})

function buildOption(): echarts.EChartsOption {
  const dates = store.dailyStats.map(s => s.date.slice(5))
  const completedData = store.dailyStats.map(s => s.completedCount)
  const deviationData = store.dailyStats.map(s => Number((s.hoursDeviation * 100).toFixed(0)))

  return {
    backgroundColor: 'transparent',
    title: {
      text: '效率仪表盘',
      left: 0,
      top: 0,
      textStyle: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 600,
      },
    },
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(22, 33, 62, 0.95)',
      borderColor: 'rgba(233, 69, 96, 0.3)',
      borderWidth: 1,
      textStyle: { color: '#fff' },
      axisPointer: {
        type: 'cross',
        crossStyle: { color: '#e94560' },
      },
    },
    grid: {
      left: 50,
      right: 50,
      top: 60,
      bottom: 10,
    },
    xAxis: {
      type: 'category',
      data: dates,
      axisPointer: { type: 'shadow' },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.15)' } },
      axisLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 11 },
      axisTick: { show: false },
    },
    yAxis: [
      {
        type: 'value',
        name: '任务数',
        nameTextStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)' } },
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
      },
      {
        type: 'value',
        name: '偏差率(%)',
        nameTextStyle: { color: 'rgba(255,255,255,0.5)', fontSize: 10 },
        min: 0,
        max: 200,
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 11, formatter: '{value}%' },
      },
    ],
    series: [
      {
        name: '完成任务数',
        type: 'bar',
        data: completedData,
        barWidth: 22,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#e94560' },
            { offset: 1, color: 'rgba(233, 69, 96, 0.3)' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      },
      {
        name: '工时偏差率',
        type: 'line',
        yAxisIndex: 1,
        data: deviationData,
        smooth: true,
        symbol: 'circle',
        symbolSize: 8,
        lineStyle: {
          color: '#a78bfa',
          width: 3,
        },
        itemStyle: {
          color: '#a78bfa',
          borderColor: '#1a1a2e',
          borderWidth: 2,
        },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(167, 139, 250, 0.25)' },
            { offset: 1, color: 'rgba(167, 139, 250, 0)' },
          ]),
        },
      },
    ],
    animationDuration: 300,
  }
}

function renderChart() {
  if (!chartInstance) return
  const option = buildOption()
  chartInstance.setOption(option, true)
  updateLegendVisibility()
}

function updateLegendVisibility() {
  if (!chartInstance) return
  chartInstance.dispatchAction({
    type: legendState.completedCount ? 'legendSelect' : 'legendUnSelect',
    name: '完成任务数',
  })
  chartInstance.dispatchAction({
    type: legendState.hoursDeviation ? 'legendSelect' : 'legendUnSelect',
    name: '工时偏差率',
  })
}

function toggleLegend(key: 'completedCount' | 'hoursDeviation') {
  legendState[key] = !legendState[key]
  updateLegendVisibility()
}

useResizeObserver(chartRef, () => {
  chartInstance?.resize({ animation: { duration: 200 } })
})

watch(
  () => store.dailyStats,
  () => renderChart(),
  { deep: true, flush: 'post' }
)

onMounted(() => {
  if (chartRef.value) {
    chartInstance = echarts.init(chartRef.value)
    renderChart()
  }
})

onUnmounted(() => {
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<template>
  <div class="chart-wrapper">
    <div ref="chartRef" class="chart-canvas"></div>
    <div class="custom-legend">
      <button
        class="legend-btn"
        :class="{ inactive: !legendState.completedCount }"
        @click="toggleLegend('completedCount')"
      >
        <span class="legend-dot bar"></span>
        <span>完成任务数</span>
      </button>
      <button
        class="legend-btn"
        :class="{ inactive: !legendState.hoursDeviation }"
        @click="toggleLegend('hoursDeviation')"
      >
        <span class="legend-dot line"></span>
        <span>工时偏差率</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.chart-wrapper {
  width: 100%;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.chart-canvas {
  width: 100%;
  height: 320px;
}

@media (max-width: 1024px) {
  .chart-canvas {
    height: auto;
    aspect-ratio: 16 / 9;
  }
}

.custom-legend {
  display: flex;
  gap: 16px;
  margin-top: 4px;
  flex-wrap: wrap;
}

.legend-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 12px;
  cursor: pointer;
  transition: opacity 300ms ease, background 200ms ease;
}

.legend-btn:hover {
  background: rgba(255, 255, 255, 0.08);
}

.legend-btn.inactive {
  opacity: 0.3;
}

.legend-dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.legend-dot.bar {
  background: linear-gradient(180deg, #e94560, rgba(233, 69, 96, 0.3));
}

.legend-dot.line {
  background: #a78bfa;
  border-radius: 50%;
}
</style>
