import { useEffect, useState } from 'react'
import type { PollOption } from '../types'

interface BarChartProps {
  options: PollOption[]
  totalVotes: number
  resetKey?: number
}

const styles = {
  container: {
    width: '100%'
  } as React.CSSProperties,
  chartContainer: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: '256px',
    gap: '8px',
    marginBottom: '16px'
  } as React.CSSProperties,
  barWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    transition: 'opacity 0.3s ease'
  } as React.CSSProperties,
  voteCount: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '4px',
    color: '#374151'
  } as React.CSSProperties,
  percentage: {
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '4px'
  } as React.CSSProperties,
  barOuter: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
    height: '100%',
    alignItems: 'flex-end'
  } as React.CSSProperties,
  bar: {
    width: '40px',
    borderTopLeftRadius: '8px',
    borderTopRightRadius: '8px',
    transition: 'all 0.5s ease-out',
    background: 'linear-gradient(to top, #1a237e 0%, #3f51b5 50%, #7986cb 100%)',
    minHeight: '2px'
  } as React.CSSProperties,
  optionLabel: {
    marginTop: '8px',
    fontSize: '12px',
    color: '#4b5563',
    textAlign: 'center',
    paddingLeft: '4px',
    paddingRight: '4px',
    width: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  } as React.CSSProperties,
  totalContainer: {
    textAlign: 'center',
    color: '#4b5563',
    marginTop: '16px'
  } as React.CSSProperties,
  totalHighlight: {
    fontWeight: 600,
    color: '#1a237e'
  } as React.CSSProperties
}

export default function BarChart({ options, totalVotes, resetKey = 0 }: BarChartProps) {
  const [visibleOptions, setVisibleOptions] = useState(options)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    setAnimating(true)
    setVisibleOptions([])
    const timer = setTimeout(() => {
      setVisibleOptions(options)
      setAnimating(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [options, resetKey])

  const maxVotes = Math.max(...visibleOptions.map(o => o.votes), 1)

  return (
    <div style={styles.container}>
      <div style={styles.chartContainer}>
        {visibleOptions.map((option) => {
          const percentage = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0
          const heightPercentage = maxVotes > 0 ? (option.votes / maxVotes) * 100 : 0

          return (
            <div
              key={option.id}
              style={{
                ...styles.barWrapper,
                opacity: animating ? 0 : 1
              }}
            >
              <div style={styles.voteCount}>
                {option.votes}
              </div>
              <div style={styles.percentage}>
                {percentage.toFixed(1)}%
              </div>
              <div style={styles.barOuter}>
                <div
                  style={{
                    ...styles.bar,
                    height: `${heightPercentage}%`
                  }}
                />
              </div>
              <div style={styles.optionLabel} title={option.text}>
                {option.text}
              </div>
            </div>
          )
        })}
      </div>
      <div style={styles.totalContainer}>
        总票数：<span style={styles.totalHighlight}>{totalVotes}</span>
      </div>
    </div>
  )
}
