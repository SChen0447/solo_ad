import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useActivity } from '../App'
import { SUPPLIES_LIST } from '../types'

const Activity = () => {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { currentActivity, setCurrentActivity, currentMember, setCurrentMember, refreshActivity } = useActivity()
  const [loading, setLoading] = useState(true)
  const [selectedCheckpoint, setSelectedCheckpoint] = useState<number | null>(null)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [now, setNow] = useState(new Date())
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (code) {
      loadActivity()
    }
  }, [code])

  useEffect(() => {
    if (code) {
      const interval = setInterval(() => {
        refreshActivity(code)
      }, 30000)
      return () => clearInterval(interval)
    }
  }, [code, refreshActivity])

  const loadActivity = async () => {
    try {
      const response = await fetch(`/api/activities/${code}`)
      if (response.ok) {
        const data = await response.json()
        setCurrentActivity(data)
      }
    } catch (error) {
      console.error('Failed to load activity:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckpointClick = (checkpointId: number) => {
    if (!currentMember) {
      const memberName = prompt('请输入您的姓名以确认身份：')
      if (!memberName) return
      
      const member = currentActivity?.members.find(
        m => m.name === memberName
      )
      if (member) {
        setCurrentMember(member)
        setSelectedMemberId(member.id)
      } else {
        alert('未找到该成员，请先加入活动')
        return
      }
    }
    
    setSelectedCheckpoint(checkpointId)
    setShowConfirmModal(true)
  }

  const handleConfirmReport = async () => {
    if (!code || selectedCheckpoint === null || !currentMember) return

    try {
      const response = await fetch(`/api/activities/${code}/members/${currentMember.id}/location`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ checkpointId: selectedCheckpoint })
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentActivity(data.activity)
        setCurrentMember(data.member)
        setShowConfirmModal(false)
        setSelectedCheckpoint(null)
      }
    } catch (error) {
      console.error('Failed to report location:', error)
      alert('上报位置失败')
    }
  }

  const handleSupplyToggle = async (supply: string) => {
    if (!code || !currentMember) {
      alert('请先选择成员身份')
      return
    }

    const newSupplies = currentMember.supplies.includes(supply)
      ? currentMember.supplies.filter(s => s !== supply)
      : [...currentMember.supplies, supply]

    try {
      const response = await fetch(`/api/activities/${code}/members/${currentMember.id}/supplies`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ supplies: newSupplies })
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentMember(data.member)
        if (currentActivity) {
          const updatedMembers = currentActivity.members.map(m =>
            m.id === currentMember.id ? data.member : m
          )
          setCurrentActivity({ ...currentActivity, members: updatedMembers })
        }
      }
    } catch (error) {
      console.error('Failed to update supplies:', error)
    }
  }

  const handleEmergencyContactChange = async (value: string) => {
    if (!code || !currentMember) return

    try {
      const response = await fetch(`/api/activities/${code}/members/${currentMember.id}/emergency`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emergencyContact: value })
      })

      if (response.ok) {
        const data = await response.json()
        setCurrentMember(data.member)
      }
    } catch (error) {
      console.error('Failed to update emergency contact:', error)
    }
  }

  const handleFinishActivity = async () => {
    if (!code) return
    if (!confirm('确定要结束活动吗？结束后将生成活动摘要报告。')) return

    try {
      const response = await fetch(`/api/activities/${code}/finish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        navigate(`/activity/${code}/summary`)
      }
    } catch (error) {
      console.error('Failed to finish activity:', error)
      alert('结束活动失败')
    }
  }

  const isMemberOverdue = (lastReportTime: string | null) => {
    if (!lastReportTime) return true
    const lastTime = new Date(lastReportTime).getTime()
    const currentTime = now.getTime()
    return currentTime - lastTime > 30 * 60 * 1000
  }

  const formatLastReportTime = (time: string | null) => {
    if (!time) return '未上报'
    const date = new Date(time)
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }

  const filteredMembers = currentActivity?.members.filter(member =>
    member.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  const getInitial = (name: string) => {
    return name.charAt(0).toUpperCase()
  }

  const generateMapPath = () => {
    if (!currentActivity?.checkpoints || currentActivity.checkpoints.length < 2) return ''
    
    const checkpoints = currentActivity.checkpoints
    const width = 800
    const height = 400
    const padding = 50
    
    const maxDistance = Math.max(...checkpoints.map(c => c.distance))
    const maxElevation = Math.max(...checkpoints.map(c => c.elevation))
    
    const points = checkpoints.map((cp, index) => {
      const x = padding + (cp.distance / maxDistance) * (width - 2 * padding)
      const y = height - padding - (cp.elevation / maxElevation) * (height - 2 * padding)
      return { x, y, ...cp }
    })
    
    return { points, width, height, padding }
  }

  const mapData = generateMapPath()

  if (loading) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⏳</div>
        <div className="empty-state-text">加载中...</div>
      </div>
    )
  }

  if (!currentActivity) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❓</div>
        <div className="empty-state-text">活动不存在</div>
        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate('/')}>
          返回首页
        </button>
      </div>
    )
  }

  return (
    <div>
      <div className="back-btn" onClick={() => navigate('/')}>
        ← 返回活动列表
      </div>

      <div className="page-header">
        <h1 className="page-title">{currentActivity.name}</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          活动码：{currentActivity.code} | 
          集合点：{currentActivity.meetingPoint} | 
          预计用时：{currentActivity.estimatedDuration}分钟
        </p>
      </div>

      {currentActivity.status === 'ongoing' && (
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
          <button className="btn btn-secondary" onClick={handleFinishActivity}>
            结束活动
          </button>
        </div>
      )}

      <div className="activity-layout">
        <div className="member-panel">
          <div className="panel-section">
            <div className="panel-title">👥 成员列表 ({currentActivity.members.length}/{currentActivity.maxMembers})</div>
            <input
              type="text"
              className="form-input"
              placeholder="搜索成员..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ marginBottom: 12 }}
            />
            <div className="member-list">
              {filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className={`member-item ${selectedMemberId === member.id ? 'selected' : ''}`}
                  onClick={() => {
                    setSelectedMemberId(member.id)
                    setCurrentMember(member)
                  }}
                >
                  <div className={`member-avatar ${!member.isActive ? 'inactive' : ''}`}>
                    {getInitial(member.name)}
                    <div className={`status-dot ${member.isActive ? 'active' : 'inactive'}`}></div>
                    {member.lastReportTime && isMemberOverdue(member.lastReportTime) && member.isActive && (
                      <div className="warning-icon">⚠️</div>
                    )}
                  </div>
                  <div className="member-info">
                    <div className="member-name">{member.name}</div>
                    <div className="member-detail">
                      {member.lastReportTime ? (
                        <>最后上报：{formatLastReportTime(member.lastReportTime)}</>
                      ) : (
                        <>尚未上报位置</>
                      )}
                    </div>
                    <div className="member-detail">
                      距起点：{member.distanceFromStart}米
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-title">🎒 个人物资</div>
            <div className="supplies-list">
              {SUPPLIES_LIST.map((supply) => (
                <div
                  key={supply}
                  className={`supply-item ${currentMember?.supplies.includes(supply) ? 'checked' : ''}`}
                  onClick={() => handleSupplyToggle(supply)}
                >
                  <div className="supply-checkbox">
                    {currentMember?.supplies.includes(supply) ? '✓' : ''}
                  </div>
                  <div className="supply-name">{supply}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-title">📞 紧急联系人</div>
            <input
              type="text"
              className="form-input"
              placeholder="输入紧急联系人电话"
              value={currentMember?.emergencyContact || ''}
              onChange={(e) => handleEmergencyContactChange(e.target.value)}
              disabled={!currentMember}
            />
            {!currentMember && (
              <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8 }}>
                请先在成员列表中选择您的身份
              </p>
            )}
          </div>
        </div>

        <div className="map-panel">
          <div className="panel-title">🗺️ 路线概览</div>
          <div className="map-container" ref={tooltipRef}>
            {mapData && (
              <svg
                viewBox={`0 0 ${mapData.width} ${mapData.height}`}
                className="map-svg"
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#52B788" />
                    <stop offset="100%" stopColor="#2D6A4F" />
                  </linearGradient>
                </defs>

                {mapData.points.length > 1 && (
                  <path
                    d={mapData.points.map((p, i) => 
                      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
                    ).join(' ')}
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="4"
                    strokeDasharray="10,6"
                    strokeLinecap="round"
                  />
                )}

                {mapData.points.map((point) => (
                  <g
                    key={point.id}
                    className="checkpoint-marker"
                    onClick={() => handleCheckpointClick(point.id)}
                  >
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="16"
                      fill="white"
                      stroke="#2D6A4F"
                      strokeWidth="3"
                    />
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r="8"
                      fill="#2D6A4F"
                    />
                    <text
                      x={point.x}
                      y={point.y - 24}
                      textAnchor="middle"
                      fontSize="12"
                      fontWeight="600"
                      fill="#1B1B1B"
                    >
                      {point.distance}m
                    </text>
                    <text
                      x={point.x}
                      y={point.y + 36}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#6B7280"
                    >
                      ⏱️ {point.estimatedTime}
                    </text>
                    <text
                      x={point.x}
                      y={point.y + 50}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#6B7280"
                    >
                      ⛰️ {point.elevation}m
                    </text>
                  </g>
                ))}

                <text
                  x={mapData.padding}
                  y={mapData.height - 10}
                  fontSize="12"
                  fill="#9CA3AF"
                >
                  起点
                </text>
                <text
                  x={mapData.width - mapData.padding}
                  y={mapData.height - 10}
                  fontSize="12"
                  fill="#9CA3AF"
                  textAnchor="end"
                >
                  终点
                </text>
              </svg>
            )}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 12, textAlign: 'center' }}>
            💡 点击标记点上报当前位置
          </p>
        </div>
      </div>

      {showConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-title">确认位置上报</div>
            <div className="confirm-modal">
              <p>
                您确定要上报到达 
                <strong style={{ color: 'var(--primary-color)' }}>
                  {' '}第{selectedCheckpoint}个标记点 ({currentActivity.checkpoints.find(c => c.id === selectedCheckpoint)?.distance}米)
                </strong>
                {' '}吗？
              </p>
              <p style={{ fontSize: 13 }}>
                上报时间：{new Date().toLocaleTimeString('zh-CN')}
              </p>
            </div>
            <div className="form-actions">
              <button
                className="btn btn-secondary"
                onClick={() => setShowConfirmModal(false)}
              >
                取消
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmReport}
              >
                确认上报
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Activity
