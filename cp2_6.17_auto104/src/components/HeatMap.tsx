import React, { useMemo } from 'react'
import type { StageRatings } from '../../shared/types'

interface HeatMapProps {
  ratings: StageRatings[]
}

const HEATMAP_COLORS = {
  LOW: { r: 255, g: 77, b: 79 },
  MID: { r: 250, g: 219, b: 20 },
  HIGH: { r: 82, g: 196, b: 26 },
  EMPTY: { r: 42, g: 42, b: 74 },
}

function interpolateRGB(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): string {
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r},${g},${b})`
}

function getScoreColorDynamic(
  score: number,
  minScore: number,
  maxScore: number
): string {
  if (score <= 0) {
    const e = HEATMAP_COLORS.EMPTY
    return `rgb(${e.r},${e.g},${e.b})`
  }
  if (maxScore === minScore) {
    return interpolateRGB(HEATMAP_COLORS.LOW, HEATMAP_COLORS.HIGH, 0.5)
  }
  const normalized = (score - minScore) / (maxScore - minScore)
  if (normalized < 0.5) {
    return interpolateRGB(
      HEATMAP_COLORS.LOW,
      HEATMAP_COLORS.MID,
      normalized * 2
    )
  }
  return interpolateRGB(
    HEATMAP_COLORS.MID,
    HEATMAP_COLORS.HIGH,
    (normalized - 0.5) * 2
  )
}

const HeatMap: React.FC<HeatMapProps> = ({ ratings }) => {
  const blocks = useMemo(() => {
    const validScores = ratings
      .map((r) => r.averageScore)
      .filter((s) => s > 0)
    const minScore = validScores.length > 0 ? Math.min(...validScores) : 0
    const maxScore = validScores.length > 0 ? Math.max(...validScores) : 5

    return ratings.map((r) => ({
      ...r,
      color: getScoreColorDynamic(r.averageScore, minScore, maxScore),
    }))
  }, [ratings])

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {blocks.map((block) => (
        <div
          key={block.stageId}
          className="rounded-xl p-4 flex flex-col items-center justify-center min-h-[140px] transition-all duration-200 hover:scale-105 cursor-default"
          style={{
            backgroundColor: block.color,
            boxShadow: '0 4px 20px rgba(0,128,255,0.3)',
          }}
        >
          <h3 className="text-white font-bold text-[14px] drop-shadow-md text-center">
            {block.stageName}
          </h3>
          <p
            className="text-white font-extrabold drop-shadow-lg mt-1"
            style={{ fontSize: '32px', lineHeight: 1.2 }}
          >
            {block.averageScore > 0 ? block.averageScore.toFixed(1) : '-'}
          </p>
          <p className="text-white/80 text-xs mt-0.5">
            {block.voteCount} 人投票
          </p>
        </div>
      ))}
      {blocks.length === 0 && (
        <div className="col-span-full text-center text-white/40 py-12 text-lg">
          暂无舞台数据
        </div>
      )}
    </div>
  )
}

export default HeatMap
