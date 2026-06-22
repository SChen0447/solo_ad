import { useState, useEffect, useRef } from 'react'
import type { FillBlankChallenge, Score, LineResult } from '../types'

interface Props {
  challenge: FillBlankChallenge
  onComplete: (score: number, maxScore: number) => void
}

type AnswerMap = Record<string, string>

const getAnswerKey = (lineIndex: number, blankIndex: number) => `${lineIndex}-${blankIndex}`

export default function FillBlankGame({ challenge, onComplete }: Props) {
  const [answers, setAnswers] = useState<AnswerMap>({})
  const [scoreResult, setScoreResult] = useState<Score | null>(null)
  const [displayScore, setDisplayScore] = useState(0)
  const [submitting, setSubmitting] = useState(false)
  const animRef = useRef<number>()

  const totalBlanks = challenge.lines.reduce((sum, line) => sum + line.blanks.length, 0)

  useEffect(() => {
    return () => {
      if (animRef.current) {
        cancelAnimationFrame(animRef.current)
      }
    }
  }, [])

  const handleInputChange = (lineIndex: number, blankIndex: number, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [getAnswerKey(lineIndex, blankIndex)]: value
    }))
  }

  const animateScore = (targetScore: number) => {
    const duration = 1000
    const startTime = performance.now()

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = targetScore * eased
      setDisplayScore(Math.round(current * 100) / 100)

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      }
    }

    animRef.current = requestAnimationFrame(animate)
  }

  const handleSubmit = async () => {
    if (submitting || scoreResult) return
    setSubmitting(true)

    const answerList = Object.entries(answers).map(([key, value]) => {
      const [lineIndex, blankIndex] = key.split('-').map(Number)
      return { lineIndex, blankIndex, answer: value }
    })

    challenge.lines.forEach(line => {
      line.blanks.forEach(blank => {
        const key = getAnswerKey(line.index, blank.position)
        if (!answers[key]) {
          answerList.push({
            lineIndex: line.index,
            blankIndex: blank.position,
            answer: ''
          })
        }
      })
    })

    try {
      const res = await fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          songId: challenge.songId,
          answers: answerList
        })
      })
      const result: Score = await res.json()
      setScoreResult(result)
      animateScore(result.totalScore)
      onComplete(result.totalScore, result.maxScore)
    } finally {
      setSubmitting(false)
    }
  }

  const getLineResult = (lineIndex: number): LineResult | undefined => {
    return scoreResult?.lineResults.find(r => r.lineIndex === lineIndex)
  }

  const getBlankResult = (lineIndex: number, blankIndex: number) => {
    const lineResult = getLineResult(lineIndex)
    return lineResult?.results.find(r => r.blankIndex === blankIndex)
  }

  const isLineCorrect = (lineIndex: number): boolean | null => {
    if (!scoreResult) return null
    const lineResult = getLineResult(lineIndex)
    return lineResult ? lineResult.results.every(r => r.correct) : false
  }

  const renderLine = (line: FillBlankChallenge['lines'][0]) => {
    const elements: React.ReactNode[] = []
    let blankCounter = 0
    const lineCorrect = isLineCorrect(line.index)
    const lineClassName = `challenge-line${
      lineCorrect === true ? ' correct' : lineCorrect === false ? ' incorrect' : ''
    }`

    line.displayParts.forEach((part, partIdx) => {
      if (part === '___BLANK___') {
        const blankIdx = blankCounter
        const key = getAnswerKey(line.index, blankIdx)
        const blankResult = getBlankResult(line.index, blankIdx)
        const inputClassName = `blank-input${
          blankResult?.correct ? ' correct' : blankResult?.correct === false ? ' incorrect' : ''
        }`

        elements.push(
          <input
            key={`blank-${line.index}-${blankIdx}`}
            className={inputClassName}
            type="text"
            value={answers[key] || ''}
            onChange={e => handleInputChange(line.index, blankIdx, e.target.value)}
            disabled={!!scoreResult}
            placeholder="____"
          />
        )

        if (blankResult?.correct === false) {
          elements.push(
            <span
              key={`correct-${line.index}-${blankIdx}`}
              className="correct-answer"
            >
              ({blankResult.correctAnswer})
            </span>
          )
        }

        blankCounter++
      } else {
        elements.push(
          <span key={`text-${line.index}-${partIdx}`}>{part}</span>
        )
      }
    })

    return (
      <div key={line.index} className={lineClassName}>
        {elements}
      </div>
    )
  }

  return (
    <>
      <div className="challenge-container">
        {challenge.lines.map(line => renderLine(line))}
      </div>

      {scoreResult && (
        <div className="score-display">
          <div className="score-label">本次得分</div>
          <div className="score-value">
            {displayScore.toFixed(0)} <span style={{ fontSize: 20, color: '#94a3b8' }}>/ {scoreResult.maxScore.toFixed(0)}</span>
          </div>
        </div>
      )}

      {!scoreResult && (
        <div className="button-group">
          <button
            className="action-button"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? '提交中...' : '提交答案'}
          </button>
        </div>
      )}
    </>
  )
}
