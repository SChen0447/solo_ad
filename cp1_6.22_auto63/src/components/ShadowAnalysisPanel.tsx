import { ShadowDataPoint } from '@/types'

interface ShadowAnalysisPanelProps {
  currentCoverage: {
    coveragePercent: number
    coverageArea: number
  }
  hourlyData: ShadowDataPoint[]
  averageCoverage: number
  totalArea: number
}

function interpolateColor(value: number): string {
  const startColor = { r: 99, g: 179, b: 237 }
  const endColor = { r: 43, g: 108, b: 176 }
  const t = Math.min(1, Math.max(0, value / 100))
  const r = Math.round(startColor.r + (endColor.r - startColor.r) * t)
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * t)
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * t)
  return `rgb(${r}, ${g}, ${b})`
}

export function ShadowAnalysisPanel({
  currentCoverage,
  hourlyData,
  averageCoverage,
  totalArea,
}: ShadowAnalysisPanelProps) {
  const maxCoverage = Math.max(...hourlyData.map(d => d.coveragePercent), 100)

  return (
    <div className="analysis-panel">
      <div className="panel-header">
        <h2 className="panel-title">阴影分析</h2>
        <p className="panel-subtitle">实时日照覆盖数据</p>
      </div>

      <div className="panel-section">
        <div className="section-label">当前时刻</div>
        <div className="coverage-display">
          <div
            className="coverage-value"
            style={{ color: currentCoverage.coveragePercent > 50 ? '#E53E3E' : '#E2E8F0' }}
          >
            {currentCoverage.coveragePercent.toFixed(2)}%
          </div>
          <div className="coverage-label">阴影覆盖率</div>
        </div>
        <div className="stat-row">
          <div className="stat-item">
            <div className="stat-value">{currentCoverage.coverageArea.toFixed(2)}</div>
            <div className="stat-label">阴影面积 (m²)</div>
          </div>
          <div className="stat-item">
            <div className="stat-value">{totalArea.toFixed(0)}</div>
            <div className="stat-label">总面积 (m²)</div>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-label">当日阴影覆盖率 (6:00 - 19:00)</div>
        <div className="bar-chart">
          {hourlyData.map((data, index) => {
            const heightPercent = (data.coveragePercent / maxCoverage) * 100
            return (
              <div key={index} className="bar-wrapper" title={`${data.hour}:00 - ${data.coveragePercent}%`}>
                <div
                  className="bar"
                  style={{
                    height: `${Math.max(heightPercent, 2)}%`,
                    backgroundColor: interpolateColor(data.coveragePercent),
                  }}
                />
                <div className="bar-label">{data.hour}</div>
              </div>
            )
          })}
        </div>
        <div className="chart-legend">
          <span>0%</span>
          <span className="legend-center">时间 (时)</span>
          <span>{maxCoverage.toFixed(0)}%</span>
        </div>
      </div>

      <div className="panel-section">
        <div className="avg-display">
          <div className="avg-label">
            全天平均覆盖率
            <span className="tooltip-icon" title="6:00至19:00各整点时刻的平均值">?</span>
          </div>
          <div className="avg-value">{averageCoverage.toFixed(2)}%</div>
        </div>
        <div className="avg-bar">
          <div
            className="avg-fill"
            style={{
              width: `${averageCoverage}%`,
              backgroundColor: interpolateColor(averageCoverage),
            }}
          />
        </div>
      </div>

      <div className="panel-footer">
        <p>数据基于当前场景建筑配置实时计算</p>
      </div>
    </div>
  )
}
