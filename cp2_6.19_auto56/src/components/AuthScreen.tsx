import React, { useState } from 'react'
import type { AuthScreenProps } from '../types'

const AuthScreen: React.FC<AuthScreenProps> = ({ onCreateRoom, onJoinRoom, error }) => {
  const [activeTab, setActiveTab] = useState<'teacher' | 'student'>('teacher')
  const [roomName, setRoomName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [roomId, setRoomId] = useState('')
  const [studentName, setStudentName] = useState('')
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([])

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = Date.now()
    setRipples((prev) => [...prev, { id, x, y }])
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id))
    }, 300)
  }

  const handleCreate = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!roomName.trim() || !teacherName.trim()) return
    createRipple(e)
    setTimeout(() => onCreateRoom(roomName.trim(), teacherName.trim()), 100)
  }

  const handleJoin = () => {
    if (!roomId.trim() || !studentName.trim()) return
    onJoinRoom(roomId.trim().toUpperCase(), studentName.trim())
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">实时互动词云</h1>
        <p className="auth-subtitle">让课堂讨论更直观、更有趣</p>

        <div className="tab-switcher">
          <button
            className={`tab ${activeTab === 'teacher' ? 'active' : ''}`}
            onClick={() => setActiveTab('teacher')}
          >
            我是教师
          </button>
          <button
            className={`tab ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => setActiveTab('student')}
          >
            我是学生
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {activeTab === 'teacher' ? (
          <>
            <div className="form-group">
              <label className="form-label">房间名称</label>
              <input
                className="form-input"
                type="text"
                placeholder="请输入房间名称"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                maxLength={20}
              />
            </div>
            <div className="form-group">
              <label className="form-label">您的昵称</label>
              <input
                className="form-input"
                type="text"
                placeholder="请输入教师昵称"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                maxLength={10}
              />
            </div>
            <button
              className="submit-btn"
              onClick={handleCreate}
              disabled={!roomName.trim() || !teacherName.trim()}
            >
              创建房间
              {ripples.map((r) => (
                <span
                  key={r.id}
                  className="ripple"
                  style={{ left: r.x, top: r.y, width: 10, height: 10, marginLeft: -5, marginTop: -5 }}
                />
              ))}
            </button>
          </>
        ) : (
          <>
            <div className="form-group">
              <label className="form-label">房间号</label>
              <input
                className="form-input"
                type="text"
                placeholder="请输入6位房间号"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                maxLength={6}
              />
            </div>
            <div className="form-group">
              <label className="form-label">您的昵称</label>
              <input
                className="form-input"
                type="text"
                placeholder="请输入学生昵称"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                maxLength={10}
              />
            </div>
            <button
              className="submit-btn"
              onClick={handleJoin}
              disabled={!roomId.trim() || !studentName.trim()}
            >
              加入房间
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default AuthScreen
