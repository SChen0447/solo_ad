import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../apiClient'
import type { DiscussionKeyword, Discussion } from '../types'
import Modal from './Modal'
import '../styles/WordCloud.css'

interface WordCloudProps {
  shelfId: string
}

interface WordPosition {
  word: string
  frequency: number
  x: number
  y: number
  fontSize: number
  color: string
  width: number
  height: number
}

function WordCloud({ shelfId }: WordCloudProps) {
  const [keywords, setKeywords] = useState<DiscussionKeyword[]>([])
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const [discussions, setDiscussions] = useState<Discussion[]>([])
  const containerRef = useRef<HTMLDivElement>(null)
  const [wordPositions, setWordPositions] = useState<WordPosition[]>([])

  useEffect(() => {
    loadWordCloud()
  }, [shelfId])

  useEffect(() => {
    if (keywords.length > 0 && containerRef.current) {
      calculateWordPositions()
    }
  }, [keywords, containerRef.current?.offsetWidth])

  const loadWordCloud = async () => {
    try {
      const data = await apiClient.getWordCloud(shelfId)
      setKeywords(data)
    } catch (err) {
      console.error('Failed to load word cloud:', err)
    }
  }

  const calculateWordPositions = () => {
    if (!containerRef.current) return

    const containerWidth = containerRef.current.offsetWidth
    const containerHeight = 300

    const maxFreq = Math.max(...keywords.map((k) => k.frequency))
    const minFreq = Math.min(...keywords.map((k) => k.frequency))

    const positions: WordPosition[] = []
    const placedRects: { x: number; y: number; width: number; height: number }[] = []

    const sortedKeywords = [...keywords].sort((a, b) => b.frequency - a.frequency)

    sortedKeywords.forEach((keyword, index) => {
      const normalizedFreq = maxFreq === minFreq ? 1 : (keyword.frequency - minFreq) / (maxFreq - minFreq)
      const fontSize = 14 + normalizedFreq * 32
      
      const colorRatio = normalizedFreq
      const color = lerpColor('#b0b0b0', '#ff6b6b', colorRatio)

      const tempSpan = document.createElement('span')
      tempSpan.style.fontSize = `${fontSize}px`
      tempSpan.style.fontWeight = '600'
      tempSpan.style.visibility = 'hidden'
      tempSpan.style.position = 'absolute'
      tempSpan.textContent = keyword.word
      document.body.appendChild(tempSpan)
      const textWidth = tempSpan.offsetWidth
      const textHeight = tempSpan.offsetHeight
      document.body.removeChild(tempSpan)

      const padding = 10
      const wordWidth = textWidth + padding * 2
      const wordHeight = textHeight + padding * 2

      let placed = false
      let x = containerWidth / 2 - wordWidth / 2
      let y = containerHeight / 2 - wordHeight / 2

      if (index === 0) {
        positions.push({
          word: keyword.word,
          frequency: keyword.frequency,
          x,
          y,
          fontSize,
          color,
          width: wordWidth,
          height: wordHeight,
        })
        placedRects.push({ x, y, width: wordWidth, height: wordHeight })
        return
      }

      for (let attempt = 0; attempt < 500 && !placed; attempt++) {
        const angle = attempt * 0.5
        const radius = 5 + attempt * 2
        
        x = containerWidth / 2 - wordWidth / 2 + Math.cos(angle) * radius
        y = containerHeight / 2 - wordHeight / 2 + Math.sin(angle) * radius * 0.6

        x = Math.max(0, Math.min(containerWidth - wordWidth, x))
        y = Math.max(0, Math.min(containerHeight - wordHeight, y))

        const rect = { x, y, width: wordWidth, height: wordHeight }
        let collision = false

        for (const placed of placedRects) {
          if (intersects(rect, placed)) {
            collision = true
            break
          }
        }

        if (!collision) {
          placed = true
        }
      }

      if (placed) {
        positions.push({
          word: keyword.word,
          frequency: keyword.frequency,
          x,
          y,
          fontSize,
          color,
          width: wordWidth,
          height: wordHeight,
        })
        placedRects.push({ x, y, width: wordWidth, height: wordHeight })
      }
    })

    setWordPositions(positions)
  }

  const intersects = (
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean => {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    )
  }

  const lerpColor = (color1: string, color2: string, t: number): string => {
    const c1 = hexToRgb(color1)
    const c2 = hexToRgb(color2)
    if (!c1 || !c2) return color1

    const r = Math.round(c1.r + (c2.r - c1.r) * t)
    const g = Math.round(c1.g + (c2.g - c1.g) * t)
    const b = Math.round(c1.b + (c2.b - c1.b) * t)

    return `rgb(${r}, ${g}, ${b})`
  }

  const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  }

  const handleWordClick = async (word: string) => {
    setSelectedWord(word)
    try {
      const data = await apiClient.getDiscussions(word)
      setDiscussions(data)
    } catch (err) {
      console.error('Failed to load discussions:', err)
    }
  }

  return (
    <div className="wordcloud-section card">
      <h2 className="section-title">💬 讨论热词</h2>
      <div
        ref={containerRef}
        className="wordcloud-container"
        style={{ minHeight: '300px' }}
      >
        {wordPositions.map((wp, index) => (
          <span
            key={wp.word}
            className="wordcloud-word"
            style={{
              left: wp.x,
              top: wp.y,
              fontSize: `${wp.fontSize}px`,
              color: wp.color,
              animationDelay: `${index * 0.05}s`,
            }}
            onClick={() => handleWordClick(wp.word)}
            title={`出现 ${wp.frequency} 次`}
          >
            {wp.word}
          </span>
        ))}
      </div>

      <Modal
        isOpen={!!selectedWord}
        onClose={() => setSelectedWord(null)}
        title={`「${selectedWord}」相关讨论`}
      >
        <div className="discussion-list">
          {discussions.length === 0 ? (
            <p className="empty-discussions">暂无相关讨论</p>
          ) : (
            discussions.map((discussion) => (
              <div key={discussion.id} className="discussion-item">
                <div className="discussion-header">
                  <span className="discussion-author">{discussion.author}</span>
                  <span className="discussion-date">{discussion.date}</span>
                </div>
                <p className="discussion-content">{discussion.content}</p>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}

export default WordCloud
