import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Course } from '@/types'

interface CourseCardProps {
  course: Course
}

export default function CourseCard({ course }: CourseCardProps) {
  const navigate = useNavigate()
  const [animating, setAnimating] = useState(false)
  const remaining = course.maxSlots - (course.enrolledCount || 0)
  const isFull = remaining <= 0

  const handleEnroll = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isFull || animating) return
    setAnimating(true)
    setTimeout(() => {
      navigate(`/course/${course.id}`)
    }, 600)
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="group relative bg-white rounded-card shadow-card hover:shadow-card-hover hover:-translate-y-[3px] transition-all duration-300 overflow-hidden cursor-pointer"
      onClick={() => navigate(`/course/${course.id}`)}
    >
      <div className="relative w-full h-48 bg-warm-100 overflow-hidden">
        {course.coverImage ? (
          <img
            src={course.coverImage}
            alt={course.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-warm-200 to-warm-400">
            <span className="text-4xl">🎨</span>
          </div>
        )}
        {animating && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-sm flex items-center justify-center z-10">
            <div className="w-10 h-10 border-3 border-warm-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="text-2xl font-bold text-surface-dark mb-2 leading-tight">
          {course.name}
        </h3>
        <p className="text-sm text-surface-muted mb-1">
          📅 {formatDate(course.date)}
        </p>
        <p className="text-sm text-surface-muted mb-3">
          ⏱ {course.duration}分钟 · 💰 ¥{course.fee}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-sm">
            剩余名额{' '}
            <span className={`font-bold text-base ${isFull ? 'text-red-500' : 'text-skill-beginner'}`}>
              {remaining}
            </span>
            <span className="text-surface-muted">/{course.maxSlots}</span>
          </span>
          <button
            onClick={handleEnroll}
            disabled={isFull}
            className={`px-5 py-2 rounded-btn text-sm font-medium text-white transition-all duration-200 ${
              isFull
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-warm-500 hover:bg-warm-600 active:scale-95'
            }`}
          >
            {isFull ? '已满' : '报名'}
          </button>
        </div>
      </div>
    </div>
  )
}
