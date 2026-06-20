import { useNavigate } from 'react-router-dom'
import { Users, Clock, Signal } from 'lucide-react'
import type { Course } from '../api'

const COURSE_COLORS = ['#D2691E', '#6B8E23', '#8B4513', '#CD853F', '#B8860B', '#556B2F']

const DIFFICULTY_LABEL: Record<string, string> = {
  beginner: '入门',
  intermediate: '进阶',
  advanced: '高级',
}

interface Props {
  course: Course
}

export default function CourseCard({ course }: Props) {
  const navigate = useNavigate()
  const remaining = course.maxStudents - course.enrolledStudents.length
  const color = COURSE_COLORS[course.colorIndex % COURSE_COLORS.length]

  return (
    <div
      onClick={() => navigate(`/course/${course.id}`)}
      className="relative w-[300px] rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:-translate-y-[5px] hover:shadow-lg"
      style={{
        background: 'linear-gradient(135deg, #F5F0E1 0%, #FFFFFF 100%)',
        boxShadow: '0 2px 8px rgba(139, 69, 19, 0.08)',
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ backgroundColor: color }}
      />

      <div className="pl-5 pr-4 py-4">
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: color }}
          >
            {course.type}
          </span>
          <span className="text-xs text-clay-400 flex items-center gap-1">
            <Signal className="w-3 h-3" />
            {DIFFICULTY_LABEL[course.difficulty]}
          </span>
        </div>

        <h3 className="font-serif text-base font-semibold text-clay-800 mb-2 leading-snug">
          {course.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-clay-500 mb-2">
          <Clock className="w-3.5 h-3.5" />
          <span>{course.date} {course.time}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-clay-500">
            <Users className="w-3.5 h-3.5" />
            <span>
              余 <span className={remaining <= course.maxStudents * 0.2 ? 'text-orange-500 font-semibold' : 'text-olive-500 font-semibold'}>{remaining}</span> / {course.maxStudents}
            </span>
          </div>
        </div>

        <div className="progress-bar-container mt-2">
          <div
            className="progress-bar-fill"
            style={{
              width: `${(course.enrolledStudents.length / course.maxStudents) * 100}%`,
              backgroundColor:
                remaining <= course.maxStudents * 0.2 ? '#F59E0B' : '#6B8E23',
            }}
          />
        </div>
      </div>
    </div>
  )
}
