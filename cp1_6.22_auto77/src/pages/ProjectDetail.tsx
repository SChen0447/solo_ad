import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useStore } from '@/store'
import TimelineView from '@/pages/TimelineView'
import StatsView from '@/pages/StatsView'

type ViewMode = 'timeline' | 'stats'

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const projects = useStore((s) => s.projects)
  const timeLogs = useStore((s) => s.timeLogs)
  const tags = useStore((s) => s.tags)
  const addTimeLog = useStore((s) => s.addTimeLog)
  const deleteTimeLog = useStore((s) => s.deleteTimeLog)

  const project = projects.find((p) => p.id === id)
  const [viewMode, setViewMode] = useState<ViewMode>('timeline')
  const [currentDate, setCurrentDate] = useState(
    new Date().toISOString().slice(0, 10)
  )

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-[#718096]">
        <p className="text-base mb-2">项目不存在</p>
        <button
          onClick={() => navigate('/')}
          className="text-[#4299e1] hover:underline text-sm"
        >
          返回首页
        </button>
      </div>
    )
  }

  const handleAddLog = (subtaskName: string, duration: number, tagIds: string[]) => {
    addTimeLog(project.id, currentDate, subtaskName, duration, tagIds)
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/')}
          className="text-[#718096] hover:text-[#2d3748] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: project.color }}
          />
          <h1 className="text-xl font-bold text-[#2d3748]">{project.name}</h1>
        </div>
      </div>

      <div className="flex items-center gap-1 mb-6 p-1 bg-gray-100 rounded-full w-fit">
        <button
          onClick={() => setViewMode('timeline')}
          className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            viewMode === 'timeline'
              ? 'text-white shadow-sm'
              : 'text-[#718096] hover:text-[#2d3748]'
          }`}
          style={
            viewMode === 'timeline'
              ? { backgroundColor: project.color }
              : undefined
          }
        >
          时间轴
        </button>
        <button
          onClick={() => setViewMode('stats')}
          className={`px-5 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
            viewMode === 'stats'
              ? 'text-white shadow-sm'
              : 'text-[#718096] hover:text-[#2d3748]'
          }`}
          style={
            viewMode === 'stats'
              ? { backgroundColor: project.color }
              : undefined
          }
        >
          统计
        </button>
      </div>

      {viewMode === 'timeline' ? (
        <TimelineView
          project={project}
          logs={timeLogs}
          tags={tags}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          onAddLog={handleAddLog}
          onDeleteLog={deleteTimeLog}
        />
      ) : (
        <StatsView
          project={project}
          projects={projects}
          logs={timeLogs}
          tags={tags}
        />
      )}
    </div>
  )
}
