import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  fetchProjects,
  fetchMembers,
  fetchTimeRecords,
  submitTimeRecord,
  Project,
  Member,
  TimeRecord,
} from '../api'
import './TimeEntry.css'

interface ProjectWithMembers extends Project {
  membersData: (Member & { todayHours: number })[]
}

export default function TimeEntry() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectWithMembers[]>([])
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [selectedProject, setSelectedProject] = useState('')
  const [selectedMember, setSelectedMember] = useState('')
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [hours, setHours] = useState<number>(8)
  const [members, setMembers] = useState<Member[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    if (selectedProject) {
      loadMembers(selectedProject)
    } else {
      setMembers([])
    }
  }, [selectedProject])

  const loadProjects = async () => {
    try {
      const projectsData = await fetchProjects()
      const today = new Date().toISOString().split('T')[0]

      const projectsWithMembers: ProjectWithMembers[] = []
      for (const project of projectsData) {
        const membersData = await fetchMembers(project.id)
        const records = await fetchTimeRecords({
          projectId: project.id,
          dateRange: `${today},${today}`,
        })

        const membersWithHours = membersData.map((member) => {
          const memberRecords = records.filter((r) => r.memberId === member.id)
          const todayHours = memberRecords.reduce((sum, r) => sum + r.hours, 0)
          return { ...member, todayHours }
        })

        projectsWithMembers.push({
          ...project,
          membersData: membersWithHours,
        })
      }
      setProjects(projectsWithMembers)
    } catch (error) {
      console.error('Failed to load projects:', error)
    }
  }

  const loadMembers = async (projectId: string) => {
    try {
      const membersData = await fetchMembers(projectId)
      setMembers(membersData)
    } catch (error) {
      console.error('Failed to load members:', error)
    }
  }

  const toggleProject = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev)
      if (next.has(projectId)) {
        next.delete(projectId)
      } else {
        next.add(projectId)
      }
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedProject || !selectedMember || !selectedDate || hours <= 0) {
      return
    }

    try {
      setSubmitting(true)
      await submitTimeRecord({
        projectId: selectedProject,
        memberId: selectedMember,
        date: selectedDate,
        hours,
      })

      setTimeout(() => {
        setSubmitting(false)
        setShowSuccess(true)
        loadProjects()
        setHours(8)

        setTimeout(() => {
          setShowSuccess(false)
        }, 1500)
      }, 800)
    } catch (error) {
      console.error('Failed to submit record:', error)
      setSubmitting(false)
    }
  }

  const handleMemberClick = (memberId: string) => {
    navigate(`/member/${memberId}`)
  }

  return (
    <div className="time-entry">
      <h2 className="page-title">工时录入</h2>

      <div className="entry-container">
        <div className="project-list">
          <h3 className="section-title">项目成员列表</h3>
          <div className="project-groups">
            {projects.map((project) => (
              <div key={project.id} className="project-group">
                <div
                  className="project-header"
                  onClick={() => toggleProject(project.id)}
                >
                  <span className="project-name">{project.name}</span>
                  <span className="project-count">
                    {project.membersData.length}人
                  </span>
                  <span
                    className={`expand-icon ${
                      expandedProjects.has(project.id) ? 'expanded' : ''
                    }`}
                  >
                    ▼
                  </span>
                </div>
                {expandedProjects.has(project.id) && (
                  <div className="member-list">
                    {project.membersData.map((member) => (
                      <div
                        key={member.id}
                        className="member-item"
                        onClick={() => handleMemberClick(member.id)}
                      >
                        <span className="member-name">{member.name}</span>
                        <span className="member-hours">
                          今日 {member.todayHours.toFixed(1)}h
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="entry-form">
          <h3 className="section-title">快速录入</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>项目名称</label>
              <select
                value={selectedProject}
                onChange={(e) => {
                  setSelectedProject(e.target.value)
                  setSelectedMember('')
                }}
                required
              >
                <option value="">请选择项目</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>成员姓名</label>
              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                required
                disabled={!selectedProject}
              >
                <option value="">请选择成员</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>日期</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>工时（小时）</label>
              <input
                type="number"
                value={hours}
                onChange={(e) => setHours(parseFloat(e.target.value) || 0)}
                min="0"
                max="24"
                step="0.5"
                required
              />
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={submitting || showSuccess}
            >
              {submitting && <span className="spinner" />}
              {showSuccess && <span className="success-icon">✓</span>}
              {!submitting && !showSuccess && '提交'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
