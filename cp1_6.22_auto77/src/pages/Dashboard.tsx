import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X } from 'lucide-react'
import { useStore } from '@/store'
import { PALETTE } from '@/types'
import type { Project } from '@/types'

function ProjectCard({ project, totalToday }: { project: Project; totalToday: number }) {
  const navigate = useNavigate()
  const ratio = Math.min(totalToday / project.dailyLimit, 1)
  const hours = (totalToday / 60).toFixed(1)
  const limitHours = (project.dailyLimit / 60).toFixed(1)

  return (
    <div
      onClick={() => navigate(`/project/${project.id}`)}
      className="w-[240px] rounded-xl bg-white shadow-sm hover:shadow-lg hover:-translate-y-1.5 transition-all duration-[250ms] cursor-pointer overflow-hidden group"
    >
      <div className="h-2" style={{ backgroundColor: project.color }} />
      <div className="p-4">
        <h3 className="text-[#2d3748] font-semibold text-base truncate">{project.name}</h3>
        <div className="mt-3 flex items-center gap-3">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              stroke="#e2e8f0"
              strokeWidth="6"
            />
            <circle
              cx="28"
              cy="28"
              r="22"
              fill="none"
              stroke={project.color}
              strokeWidth="6"
              strokeDasharray={`${ratio * 2 * Math.PI * 22} ${2 * Math.PI * 22}`}
              strokeLinecap="round"
              transform="rotate(-90 28 28)"
              style={{ transition: 'stroke-dasharray 0.6s ease-out' }}
            />
          </svg>
          <div>
            <p className="text-[#2d3748] text-sm font-medium">
              {hours}h / {limitHours}h
            </p>
            <p className="text-[#718096] text-xs">今日工时</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function CreateProjectModal({
  onClose,
}: {
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(PALETTE[0])
  const [limit, setLimit] = useState(480)
  const addProject = useStore((s) => s.addProject)

  const handleCreate = () => {
    if (!name.trim()) return
    addProject(name.trim(), color, limit)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-[400px] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[#2d3748]">创建项目</h2>
          <button
            onClick={onClose}
            className="text-[#718096] hover:text-[#2d3748] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2d3748] mb-1">项目名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入项目名称"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1] focus:border-transparent text-[#2d3748]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2d3748] mb-2">颜色标签</label>
            <div className="flex flex-wrap gap-2">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform duration-150 ${
                    color === c ? 'scale-125 ring-2 ring-offset-2 ring-[#4299e1]' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2d3748] mb-1">日工时上限（分钟）</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              min={60}
              max={720}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#4299e1] focus:border-transparent text-[#2d3748]"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-[#718096] bg-gray-100 hover:bg-gray-200 transition-colors duration-200 active:scale-95"
          >
            取消
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 py-2 rounded-lg text-sm font-medium text-white bg-[#4299e1] hover:bg-[#3182ce] transition-colors duration-200 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            创建
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [showCreate, setShowCreate] = useState(false)
  const projects = useStore((s) => s.projects)
  const timeLogs = useStore((s) => s.timeLogs)

  const today = new Date().toISOString().slice(0, 10)

  const getTodayTotal = (projectId: string) =>
    timeLogs
      .filter((l) => l.projectId === projectId && l.date === today)
      .reduce((sum, l) => sum + l.duration, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#2d3748]">我的项目</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#4299e1] hover:bg-[#3182ce] transition-colors duration-200 active:scale-95"
        >
          <Plus size={16} />
          新建项目
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#718096]">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Plus size={28} className="text-[#4299e1]" />
          </div>
          <p className="text-base mb-1">还没有项目</p>
          <p className="text-sm">点击「新建项目」开始记录工时</p>
        </div>
      ) : (
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(240px,1fr))]">
          {projects.map((p) => (
            <ProjectCard key={p.id} project={p} totalToday={getTodayTotal(p.id)} />
          ))}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
