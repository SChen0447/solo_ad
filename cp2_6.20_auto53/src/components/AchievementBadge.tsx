import { useState } from 'react'
import type { Achievement } from '../api'

interface Props {
  achievements: Achievement[]
}

const BADGE_COLORS = ['#D2691E', '#6B8E23', '#8B4513', '#CD853F', '#B8860B']

export default function AchievementBadge({ achievements }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <div className="flex items-center gap-4">
      {achievements.map((ach, idx) => {
        const color = BADGE_COLORS[idx % BADGE_COLORS.length]
        return (
          <div
            key={ach.id}
            className="relative"
            onMouseEnter={() => setHoveredId(ach.id)}
            onMouseLeave={() => setHoveredId(null)}
          >
            <div
              className={`w-14 h-14 rounded-full flex items-center justify-center text-lg font-serif font-bold transition-all duration-200 ${
                ach.unlocked
                  ? 'shadow-md hover:shadow-lg hover:scale-105 cursor-default'
                  : 'opacity-30'
              }`}
              style={{
                background: ach.unlocked
                  ? `linear-gradient(135deg, ${color}, ${color}dd)`
                  : '#d4d4d4',
                color: ach.unlocked ? '#fff' : '#999',
              }}
            >
              {ach.condition}
            </div>

            {hoveredId === ach.id && (
              <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 whitespace-nowrap bg-clay-800 text-white text-xs px-2 py-1 rounded shadow-lg z-10 animate-fade-in">
                {ach.name}：{ach.description}
              </div>
            )}

            <div className="text-center mt-1.5">
              <span className={`text-[10px] ${ach.unlocked ? 'text-clay-600' : 'text-gray-400'}`}>
                {ach.name}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
