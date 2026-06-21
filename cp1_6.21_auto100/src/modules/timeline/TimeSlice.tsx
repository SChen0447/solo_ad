import { useState } from 'react'
import { Info } from 'lucide-react'
import type { AnimationSlice } from '@/types'
import { useAnimationStore } from '@/store/useAnimationStore'
import { cn } from '@/lib/utils'

export default function TimeSlice({ slice }: { slice: AnimationSlice }) {
  const [hovered, setHovered] = useState(false)
  const selectedSliceId = useAnimationStore((s) => s.selectedSliceId)
  const selectSlice = useAnimationStore((s) => s.selectSlice)
  const isSelected = selectedSliceId === slice.id
  const width = Math.max(slice.duration, 40)

  const { transform, color } = slice

  return (
    <div className="relative" onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div
        onClick={() => selectSlice(slice.id)}
        className={cn(
          'h-10 rounded cursor-pointer transition-transform hover:scale-105',
          isSelected && 'ring-2 ring-blue-500 ring-offset-1'
        )}
        style={{
          width,
          background: `linear-gradient(90deg, ${color.startColor}, ${color.endColor})`,
        }}
      >
        <div className="flex items-center justify-between h-full px-2 text-xs text-white truncate">
          <span className="truncate">{slice.selector}</span>
          <Info size={12} className="shrink-0 opacity-60" />
        </div>
      </div>

      {hovered && (
        <div className="absolute z-50 left-0 top-12 w-56 rounded-lg bg-gray-900 p-3 text-xs text-gray-200 shadow-xl">
          <p><span className="text-gray-400">选择器：</span>{slice.selector}</p>
          <p><span className="text-gray-400">时长：</span>{slice.duration}ms</p>
          <p><span className="text-gray-400">缓动：</span>{slice.easing}</p>
          <p><span className="text-gray-400">延迟：</span>{slice.delay}ms</p>
          <p><span className="text-gray-400">位移：</span>{transform.translateX}, {transform.translateY}</p>
          <p><span className="text-gray-400">旋转：</span>{transform.rotate}°</p>
          <p><span className="text-gray-400">缩放：</span>{transform.scale}</p>
          <p><span className="text-gray-400">倾斜：</span>{transform.skewX}°, {transform.skewY}°</p>
          <p><span className="text-gray-400">透明度：</span>{slice.opacity}</p>
        </div>
      )}
    </div>
  )
}
