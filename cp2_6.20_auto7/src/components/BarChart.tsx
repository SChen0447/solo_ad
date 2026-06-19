import type { PollOption } from '../types'

interface BarChartProps {
  options: PollOption[]
  totalVotes: number
}

export function BarChart({ options, totalVotes }: BarChartProps) {
  const maxVotes = Math.max(...options.map(o => o.votes), 1)

  return (
    <div className="bar-chart">
      <div className="bar-chart-wrapper">
        {options.map(option => {
          const heightPercent = totalVotes > 0
            ? (option.votes / maxVotes) * 100
            : 0
          const isWinning = option.votes === maxVotes && option.votes > 0

          return (
            <div
              key={option.id}
              className="bar-chart-bar-container"
              style={{ animation: 'fadeInBar 0.3s ease' }}
            >
              <div
                className={`bar-chart-bar ${isWinning ? 'winning' : ''}`}
                style={{ height: `${heightPercent}%` }}
                title={`${option.text}: ${option.votes} 票`}
              />
              <div className="bar-chart-xlabel">{option.text}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {options.map(option => {
          const percent = totalVotes > 0
            ? ((option.votes / totalVotes) * 100).toFixed(1)
            : '0.0'
          const isWinning = option.votes === maxVotes && option.votes > 0

          return (
            <div key={option.id} className="bar-chart-item">
              <div className="bar-chart-label">
                <span className="bar-chart-name">
                  {isWinning && '🏆 '}{option.text}
                </span>
                <span className="bar-chart-stats">
                  <span>{option.votes} 票</span>
                  <span>({percent}%)</span>
                </span>
              </div>
              <div
                style={{
                  height: '6px',
                  background: '#e0e0e0',
                  borderRadius: '3px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    background: 'linear-gradient(to right, #1a237e, #5c6bc0)',
                    width: `${percent}%`,
                    transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                    borderRadius: '3px'
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
