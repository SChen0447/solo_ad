import React, { useMemo } from 'react'
import type { StageRatings } from '../../shared/types'

interface HeatMapProps {
  ratings: StageRatings[]
}

/**
 * RGB颜色对象
 * @property r - 红色通道值 (0-255)
 * @property g - 绿色通道值 (0-255)
 * @property b - 蓝色通道值 (0-255)
 */
interface RGBColor {
  r: number
  g: number
  b: number
}

/**
 * 热力图颜色配置
 * - LOW: 最低分对应的红色 (#ff4d4f)
 * - HIGH: 最高分对应的绿色 (#52c41a)
 * - EMPTY: 未投票舞台的占位色
 */
const HEATMAP_COLORS: Record<string, RGBColor> = {
  LOW: { r: 255, g: 77, b: 79 },
  HIGH: { r: 82, g: 196, b: 26 },
  EMPTY: { r: 42, g: 42, b: 74 },
}

/**
 * 在两个RGB颜色之间进行线性插值
 * @param c1 - 起始颜色
 * @param c2 - 结束颜色
 * @param t - 插值比例 (0-1)，0 返回 c1，1 返回 c2
 * @returns rgb() 格式的颜色字符串
 */
function interpolateRGB(c1: RGBColor, c2: RGBColor, t: number): string {
  const r = Math.round(c1.r + (c2.r - c1.r) * t)
  const g = Math.round(c1.g + (c2.g - c1.g) * t)
  const b = Math.round(c1.b + (c2.b - c1.b) * t)
  return `rgb(${r},${g},${b})`
}

/**
 * 基于动态分数范围计算舞台热力图颜色
 * 最低分映射为红色，最高分映射为绿色，中间分数线性插值
 * @param score - 舞台平均分
 * @param minScore - 当前所有舞台的最低分
 * @param maxScore - 当前所有舞台的最高分
 * @returns rgb() 格式的颜色字符串
 */
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
  return interpolateRGB(HEATMAP_COLORS.LOW, HEATMAP_COLORS.HIGH, normalized)
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
          <h3 className="text-white font-bold text-lg drop-shadow-md text-center">
            {block.stageName}
          </h3>
          <p
            className="text-white font-bold drop-shadow-lg mt-1"
            style={{ fontSize: '16px', lineHeight: 1.4 }}
          >
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
