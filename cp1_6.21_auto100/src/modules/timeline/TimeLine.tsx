import { useRef, useEffect, useCallback } from 'react'
import { Plus, Play, Pause, GripVertical } from 'lucide-react'
import { useAnimationStore } from '@/store/useAnimationStore'
import { cn } from '@/lib/utils'
import TimeSlice from './TimeSlice'

export default function TimeLine() {
  const { slices, isPlaying, currentTime, totalDuration, addSlice, setPlaying, setCurrentTime, reorderSlices } = useAnimationStore()
  const timelineRef = useRef<HTMLDivElement>(null)
  const dragIdx = useRef<number | null>(null)

  useEffect(() => {
    if (!isPlaying) return
    let raf: number
    let prev = performance.now()
    const tick = (now: number) => {
      setCurrentTime(Math.min(currentTime + (now - prev), totalDuration))
      prev = now
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [isPlaying])

  const step = totalDuration > 5000 ? 1000 : 500
  const markers = Array.from({ length: Math.ceil(totalDuration / step) + 1 }, (_, i) => i * step)

  const onDragStart = (idx: number) => { dragIdx.current = idx }
  const onDragOver = useCallback((e: React.DragEvent) => e.preventDefault(), [])
  const onDrop = (toIdx: number) => {
    if (dragIdx.current !== null && dragIdx.current !== toIdx) reorderSlices(dragIdx.current, toIdx)
    dragIdx.current = null
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button onClick={addSlice} className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
          <Plus size={14} /> 添加切片
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">
            {Math.round(currentTime)}ms / {totalDuration}ms
          </span>
          <button onClick={() => setPlaying(!isPlaying)} className="rounded bg-gray-700 p-1.5 text-white hover:bg-gray-600">
            {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          </button>
        </div>
      </div>

      <div ref={timelineRef} className="relative overflow-x-auto rounded border border-gray-700 bg-gray-900 p-2">
        <div className="relative" style={{ width: totalDuration + 60, minWidth: '100%' }}>
          <div className="flex h-6 border-b border-gray-700 text-[10px] text-gray-500">
            {markers.map((t) => (
              <div key={t} className="absolute" style={{ left: t }}>
                <span className="ml-0.5">{t}ms</span>
              </div>
            ))}
          </div>

          {slices.length === 0 && (
            <div className="py-8 text-center text-sm text-gray-500">暂无动画切片，点击上方按钮添加</div>
          )}

          {slices.map((slice, idx) => (
            <div
              key={slice.id}
              draggable
              onDragStart={() => onDragStart(idx)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(idx)}
              className="flex items-center gap-1 py-1"
            >
              <GripVertical size={14} className="cursor-grab text-gray-600" />
              <div style={{ marginLeft: slice.startTime }}>
                <TimeSlice slice={slice} />
              </div>
            </div>
          ))}

          {isPlaying && (
            <div
              className="absolute top-0 h-full w-0.5 bg-red-500 transition-[left] duration-75"
              style={{ left: currentTime }}
            />
          )}
        </div>
      </div>
    </div>
  )
}
