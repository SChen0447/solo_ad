import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts'
import type { Retrospective } from '../types'

interface Props {
  retro: Retrospective
}

export default function ScoreChart({ retro }: Props) {
  const chartData = retro.phases.map((phase, index) => {
    const scoreData = retro.scores.find(s => s.phase === phase)
    return {
      name: phase,
      score: scoreData?.score || 0,
      index,
    }
  })

  const avgScore = retro.scores.length > 0
    ? retro.scores.reduce((acc, s) => acc + s.score, 0) / retro.scores.length
    : 0

  const stdDev = retro.scores.length >= 2
    ? Math.sqrt(
        retro.scores.reduce((acc, s) => acc + Math.pow(s.score - avgScore, 2), 0) /
        retro.scores.length
      )
    : 0

  const upperBound = Math.min(10, avgScore + stdDev)
  const lowerBound = Math.max(0, avgScore - stdDev)

  return (
    <div style={{ height: '300px', width: '100%' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#e94560" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#e94560" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#0f3460" />
          <XAxis
            dataKey="name"
            stroke="#a0a0a0"
            tick={{ fill: '#a0a0a0', fontSize: 12 }}
          />
          <YAxis
            domain={[0, 10]}
            stroke="#a0a0a0"
            tick={{ fill: '#a0a0a0', fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#16213e',
              border: '1px solid #0f3460',
              borderRadius: '8px',
              color: '#e0e0e0',
            }}
            labelStyle={{ color: '#e0e0e0' }}
          />
          <ReferenceLine
            y={avgScore}
            stroke="#feca57"
            strokeDasharray="5 5"
            label={{
              value: `平均分: ${avgScore.toFixed(1)}`,
              fill: '#feca57',
              fontSize: 12,
              position: 'insideTopRight',
            }}
          />
          {stdDev > 0 && (
            <>
              <ReferenceLine
                y={upperBound}
                stroke="#1dd1a1"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
              <ReferenceLine
                y={lowerBound}
                stroke="#1dd1a1"
                strokeDasharray="3 3"
                strokeOpacity={0.5}
              />
            </>
          )}
          <Area
            type="monotone"
            dataKey="score"
            stroke="#e94560"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorScore)"
            dot={{
              fill: '#e94560',
              strokeWidth: 2,
              r: 6,
            }}
            activeDot={{
              r: 8,
              fill: '#e94560',
              stroke: '#fff',
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
      
      {stdDev > 0 && (
        <div style={styles.legend}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendColor, backgroundColor: '#feca57' }}></span>
            <span style={styles.legendText}>平均分</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendColor, backgroundColor: '#1dd1a1', height: '2px' }}></span>
            <span style={styles.legendText}>标准差范围 (±{stdDev.toFixed(2)})</span>
          </div>
        </div>
      )}
    </div>
  )
}

const styles = {
  legend: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    marginTop: '16px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  legendColor: {
    width: '24px',
    height: '4px',
    borderRadius: '2px',
  },
  legendText: {
    fontSize: '12px',
    color: '#a0a0a0',
  },
}
