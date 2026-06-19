import type { PollOption } from '../types'

interface BarChartProps {
  options: PollOption[]
  totalVotes: number
}

const BAR_GRADIENTS = [
  'linear-gradient(to top, #1a237e 0%, #5c6bc0 50%, #9fa8da 100%)',
  'linear-gradient(to top, #1b5e20 0%, #43a047 50%, #a5d6a7 100%)',
  'linear-gradient(to top, #bf360c 0%, #f4511e 50%, #ffab91 100%)',
  'linear-gradient(to top, #006064 0%, #00acc1 50%, #80deea 100%)',
  'linear-gradient(to top, #4a148c 0%, #8e24aa 50%, #ce93d8 100%)',
  'linear-gradient(to top, #e65100 0%, #ff9800 50%, #ffcc80 100%)',
  'linear-gradient(to top, #880e4f 0%, #ec407a 50%, #f48fb1 100%)',
  'linear-gradient(to top, #263238 0%, #607d8b 50%, #b0bec5 100%)',
  'linear-gradient(to top, #0d47a1 0%, #42a5f5 50%, #90caf9 100%)',
  'linear-gradient(to top, #33691e 0%, #7cb342 50%, #c5e1a5 100%)'
]

const ROW_GRADIENTS = [
  'linear-gradient(to right, #1a237e, #5c6bc0)',
  'linear-gradient(to right, #1b5e20, #43a047)',
  'linear-gradient(to right, #bf360c, #f4511e)',
  'linear-gradient(to right, #006064, #00acc1)',
  'linear-gradient(to right, #4a148c, #8e24aa)',
  'linear-gradient(to right, #e65100, #ff9800)',
  'linear-gradient(to right, #880e4f, #ec407a)',
  'linear-gradient(to right, #263238, #607d8b)',
  'linear-gradient(to right, #0d47a1, #42a5f5)',
  'linear-gradient(to right, #33691e, #7cb342)'
]

const GLOW_COLORS = [
  'rgba(92, 107, 192, 0.4)',
  'rgba(67, 160, 71, 0.4)',
  'rgba(244, 81, 30, 0.4)',
  'rgba(0, 172, 193, 0.4)',
  'rgba(142, 36, 170, 0.4)',
  'rgba(255, 152, 0, 0.4)',
  'rgba(236, 64, 122, 0.4)',
  'rgba(96, 125, 139, 0.4)',
  'rgba(66, 165, 245, 0.4)',
  'rgba(124, 179, 66, 0.4)'
]

export function BarChart({ options, totalVotes }: BarChartProps) {
  const maxVotes = Math.max(...options.map(o => o.votes), 1)

  return (
    <div className="bar-chart">
      <div className="bar-chart-wrapper">
        {options.map((option, idx) => {
          const heightPercent = totalVotes > 0
            ? (option.votes / maxVotes) * 100
            : 0
          const isWinning = option.votes === maxVotes && option.votes > 0
          const gradientIdx = idx % BAR_GRADIENTS.length

          return (
            <div
              key={option.id}
              className="bar-chart-bar-container"
              style={{ animation: 'fadeInBar 0.3s ease' }}
            >
              <div
                className={`bar-chart-bar ${isWinning ? 'winning' : ''}`}
                style={{
                  height: `${heightPercent}%`,
                  background: BAR_GRADIENTS[gradientIdx],
                  boxShadow: isWinning ? `0 0 12px ${GLOW_COLORS[gradientIdx]}` : undefined
                }}
                title={`${option.text}: ${option.votes} 票`}
              />
              <div className="bar-chart-xlabel">{option.text}</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {options.map((option, idx) => {
          const percentRaw = totalVotes > 0
            ? (option.votes / totalVotes) * 100
            : 0
          const percent = percentRaw.toFixed(1)
          const isWinning = option.votes === maxVotes && option.votes > 0
          const gradientIdx = idx % ROW_GRADIENTS.length

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
                    background: ROW_GRADIENTS[gradientIdx],
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
