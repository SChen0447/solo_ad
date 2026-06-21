import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApi } from '../hooks/useApi'
import { useApp } from '../App'

export default function CreateGroup() {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create')
  const [groupName, setGroupName] = useState('')
  const [creatorName, setCreatorName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [memberName, setMemberName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const navigate = useNavigate()
  const api = useApi()
  const { setCurrentMemberId } = useApp()

  useEffect(() => {
    const savedGroupId = localStorage.getItem('groupId')
    if (savedGroupId) {
      navigate(`/group/${savedGroupId}`, { replace: true })
    }
  }, [navigate])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await api.createGroup(groupName, creatorName)
      setCurrentMemberId(result.currentMemberId)
      localStorage.setItem('groupId', result.groupId)
      navigate(`/group/${result.groupId}`, { replace: true })
    } catch (err: any) {
      setError(err.message || '创建失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await api.joinGroup(inviteCode.toUpperCase(), memberName)
      setCurrentMemberId(result.currentMemberId)
      localStorage.setItem('groupId', result.groupId)
      navigate(`/group/${result.groupId}`, { replace: true })
    } catch (err: any) {
      setError(err.message || '加入失败，请检查邀请码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="create-group-container">
      <div className="create-group-card glass">
        <h1 className="create-group-title">📋 订阅管家</h1>
        <p className="create-group-subtitle">轻松管理家庭或办公室共享订阅服务</p>

        <div className="tabs">
          <button
            className={`tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => { setActiveTab('create'); setError('') }}
          >
            创建新组
          </button>
          <button
            className={`tab ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => { setActiveTab('join'); setError('') }}
          >
            加入已有组
          </button>
        </div>

        {error && <div className="error-message">{error}</div>}

        {activeTab === 'create' ? (
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label className="form-label">组名称</label>
              <input
                type="text"
                className="form-input"
                placeholder="如：幸福家庭、技术部"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">您的姓名</label>
              <input
                type="text"
                className="form-input"
                placeholder="输入您的姓名"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading}
              >
                {loading ? <div className="loading-spinner" style={{ width: 20, height: 20 }}></div> : '创建组'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleJoin}>
            <div className="form-group">
              <label className="form-label">邀请码</label>
              <input
                type="text"
                className="form-input"
                placeholder="输入6位邀请码"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                maxLength={6}
                style={{ textTransform: 'uppercase', letterSpacing: 4, fontFamily: 'monospace' }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">您的姓名</label>
              <input
                type="text"
                className="form-input"
                placeholder="输入您的姓名"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                required
              />
            </div>

            <div style={{ marginTop: 24 }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={loading}
              >
                {loading ? <div className="loading-spinner" style={{ width: 20, height: 20 }}></div> : '加入组'}
              </button>
            </div>
          </form>
        )}

        <div style={{ marginTop: 24, padding: 16, borderRadius: 12, background: 'rgba(102, 126, 234, 0.05)' }}>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 8 }}>💡 提示</div>
          <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6 }}>
            {activeTab === 'create' ? (
              <>创建组后，系统会生成一个邀请码，您可以分享给其他成员加入。支持管理Netflix、Spotify、百度网盘等多种订阅服务的费用分摊。</>
            ) : (
              <>请向组管理员获取邀请码，加入后即可查看和管理共享订阅服务。所有费用会自动计算分摊金额。</>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
          演示数据: 邀请码 FAMILY6
        </div>
      </div>
    </div>
  )
}
