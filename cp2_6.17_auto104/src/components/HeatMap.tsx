import React, { useMemo } from 'react'
import type { StageRatings } from '../../shared/types'

interface HeatMapProps {
  ratings: StageRatings[]
}

function getScoreColor(score: number): string {
  if (score <= 0) return '#2a2a4a'
  if (score <= 1) return '#ff4d4f'
  if (score <= 2) {
    const t = score - 1
    const r = Math.round(255 - t * (255 - 250))
    const g = Math.round(77 + t * (173 - 77))
    const b = Math.round(79 + t * (20 - 79))
    return `rgb(${r},${g},${b})`
  }
  if (score <= 3) {
    const t = score - 2
    const r = Math.round(250 - t * (250 - 250))
    const g = Math.round(173 + t * (219 - 173))
    const b = Math.round(20 + t * (20 - 20))
    return `rgb(${r},${g},${b})`
  }
  if (score <= 4) {
    const t = score - 3
    const r = Math.round(250 - t * (250 - 82))
    const g = Math.round(219 + t * (196 - 219))
    const b = Math.round(20 + t * (26 - 20))
    return `rgb(${r},${g},${b})`
  }
  if (score <= 5) {
    const t = score - 4
    const r = Math.round(82 - t * (82 - 82))
    const g = Math.round(196 + t * (196 - 196))
    const b = Math.round(26 + t * (26 - 26))
    return `rgb(${r},${g},${b})`
  }
  return '#52c41a'
}

const HeatMap: React.FC<HeatMapProps> = ({ ratings }) => {
  const blocks = useMemo(() => {
    return ratings.map((r) => ({
      ...r,
      color: getScoreColor(r.averageScore),
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
          <h3 className="text-white font-bold text-lg mb-1 drop-shadow-md text-center">
            {block.stageName}
          </h3>
          <p className="text-white text-3xl font-extrabold drop-shadow-lg">
            {block.averageScore > 0 ? block.averageScore.toFixed(1) : '-'}
          </p>
          <p className="text-white/80 text-xs mt-1">
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
