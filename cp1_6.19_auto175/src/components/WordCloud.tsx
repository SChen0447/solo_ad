import { useMemo } from 'react'
import type { Keyword } from '../types'

interface Props {
  keywords: Keyword[]
}

export default function WordCloud({ keywords }: Props) {
  const colorPalette = [
    '#0f3460',
    '#1a1a2e',
    '#16213e',
    '#533483',
    '#7b2cbf',
    '#9d4edd',
    '#c77dff',
    '#e0aaff',
  ]

  const processedWords = useMemo(() => {
    if (keywords.length === 0) return []

    const maxCount = Math.max(...keywords.map(k => k.count))
    const minCount = Math.min(...keywords.map(k => k.count))
    const range = maxCount - minCount || 1

    return keywords.map((keyword, _index) => {
      const normalizedCount = (keyword.count - minCount) / range
      const fontSize = 14 + normalizedCount * 32
      const colorIndex = Math.floor(normalizedCount * (colorPalette.length - 1))
      const rotation = (Math.random() - 0.5) * 30
      const opacity = 0.6 + normalizedCount * 0.4

      return {
        ...keyword,
        fontSize,
        color: colorPalette[colorIndex],
        rotation,
        opacity,
      }
    })
  }, [keywords])

  if (keywords.length === 0) {
    return (
      <div style={styles.empty}>
        <p style={{ color: '#666', fontSize: '14px' }}>
          暂无关键词数据，请先添加反思记录
        </p>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.cloud}>
        {processedWords.map((word, index) => (
          <span
            key={word.word}
            className="word-cloud-item"
            style={{
              fontSize: `${word.fontSize}px`,
              color: word.color,
              backgroundColor: `${word.color}20`,
              transform: `rotate(${word.rotation}deg)`,
              opacity: word.opacity,
              fontWeight: word.fontSize > 30 ? 700 : 500,
              animationDelay: `${index * 0.05}s`,
            }}
          >
            {word.word}
            <span style={styles.countBadge}>{word.count}</span>
          </span>
        ))}
      </div>
      <div style={styles.footer}>
        <p style={styles.footerText}>
          共 {keywords.length} 个关键词，词频越高字体越大、颜色越深
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    textAlign: 'center' as const,
  },
  empty: {
    padding: '60px 20px',
    textAlign: 'center' as const,
  },
  cloud: {
    padding: '24px',
    minHeight: '300px',
    display: 'flex',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
    alignItems: 'center',
    alignContent: 'center',
    gap: '8px',
    background: 'rgba(15, 52, 96, 0.3)',
    borderRadius: '16px',
    border: '1px solid rgba(15, 52, 96, 0.5)',
  },
  countBadge: {
    display: 'inline-block',
    marginLeft: '6px',
    fontSize: '10px',
    backgroundColor: 'rgba(233, 69, 96, 0.8)',
    color: 'white',
    padding: '2px 6px',
    borderRadius: '10px',
    verticalAlign: 'middle',
  },
  footer: {
    marginTop: '16px',
  },
  footerText: {
    fontSize: '12px',
    color: '#666',
  },
}
