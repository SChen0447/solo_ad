import { useState } from 'react'
import { Pipette } from 'lucide-react'
import { usePixelAvatarStore } from '@/store/usePixelAvatarStore'

export default function PaletteEditor() {
  const { palette, updatePaletteColor } = usePixelAvatarStore()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (palette.length === 0) return null

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Pipette className="w-4 h-4 text-stone-500" strokeWidth={1.5} />
        <span className="text-xs font-semibold text-stone-600 uppercase tracking-wider">
          调色板
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-white/60 border border-stone-200 backdrop-blur-sm">
        {palette.map((color, idx) => (
          <div key={idx} className="relative">
            <button
              onClick={() => setActiveIndex(activeIndex === idx ? null : idx)}
              className={`
                w-8 h-8 rounded-lg transition-all duration-150 border-2
                hover:scale-110 hover:shadow-md
                ${
                  activeIndex === idx
                    ? 'border-stone-800 shadow-md scale-110'
                    : 'border-stone-200 shadow-sm'
                }
              `}
              style={{ backgroundColor: color }}
              title={`颜色 ${idx + 1}: ${color}`}
            />

            {activeIndex === idx && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50">
                <div className="bg-white rounded-lg shadow-xl border border-stone-200 p-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => {
                      updatePaletteColor(idx, e.target.value)
                    }}
                    className="w-24 h-24 cursor-pointer border-0 p-0 bg-transparent"
                    autoFocus
                  />
                  <p className="text-[10px] text-stone-400 text-center mt-1 font-mono">
                    {color.toUpperCase()}
                  </p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="text-[10px] text-stone-400 leading-relaxed">
        点击色块打开拾色器，修改后像素画将实时更新
      </p>
    </div>
  )
}
