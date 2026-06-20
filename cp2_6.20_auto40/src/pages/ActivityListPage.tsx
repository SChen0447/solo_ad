/* ============================================
 * 活动列表页面
 * 上游组件：App.tsx（通过React Router渲染 /）
 * 下游组件：ActivityCard、Modal
 * 数据流向：
 *   - 接收：activities: Activity[]（来自App.tsx props）
 *           onActivitiesChange: (Activity[]) => void
 *   - 调用ActivityCard.onRegister(id) → api.registerActivity/unregisterActivity → 更新
 *   - "新建活动" → Modal 表单 → api.createActivity → 刷新列表
 * ============================================ */

import React, { useState, useEffect } from 'react'
import ActivityCard from '../components/ActivityCard'
import Modal from '../components/Modal'
import { api } from '../api'
import type { Activity, ActivityType, Difficulty } from '../types'
import { ActivityTypeLabels, DifficultyLabels } from '../types'

interface ActivityListPageProps {
  activities: Activity[]
  onActivitiesChange: (activities: Activity[]) => void
}

const ActivityListPage: React.FC<ActivityListPageProps> = ({ activities, onActivitiesChange }) => {
  const [showCreate, setShowCreate] = useState(false)
  const [newId, setNewId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | ActivityType>('all')
  const [registeredIds, setRegisteredIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    title: '',
    type: 'hiking' as ActivityType,
    date: '',
    location: '',
    maxParticipants: 20,
    difficulty: 'moderate' as Difficulty,
    description: '',
    itinerary: '',
    coverImage: ''
  })

  useEffect(() => {
    api.getUser().then(user => {
      setRegisteredIds([...user.registeredActivities, ...user.completedActivities])
    }).catch(() => {})
  }, [])

  const filtered = filter === 'all'
    ? activities
    : activities.filter(a => a.type === filter)

  const handleRegister = async (id: string) => {
    try {
      const isReg = registeredIds.includes(id)
      if (isReg) {
        await api.unregisterActivity(id)
        setRegisteredIds(prev => prev.filter(x => x !== id))
      } else {
        await api.registerActivity(id)
        setRegisteredIds(prev => [...prev, id])
      }
      const res = await api.getActivities(1, 20)
      onActivitiesChange(res.data)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : '操作失败')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.date || !form.location || !form.description) {
      alert('请填写完整信息')
      return
    }
    setLoading(true)
    try {
      const newAct = await api.createActivity(form)
      setNewId(newAct.id)
      const res = await api.getActivities(1, 20)
      onActivitiesChange(res.data)
      setShowCreate(false)
      setForm({
        title: '', type: 'hiking', date: '', location: '',
        maxParticipants: 20, difficulty: 'moderate',
        description: '', itinerary: '', coverImage: ''
      })
      setTimeout(() => setNewId(null), 600)
    } catch (e) {
      console.error(e)
      alert(e instanceof Error ? e.message : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  const filterOptions: { key: 'all' | ActivityType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'hiking', label: ActivityTypeLabels.hiking },
    { key: 'camping', label: ActivityTypeLabels.camping },
    { key: 'climbing', label: ActivityTypeLabels.climbing },
    { key: 'cycling', label: ActivityTypeLabels.cycling },
    { key: 'running', label: ActivityTypeLabels.running }
  ]

  return (
    <div className="page-container page-fade-in">
      <div className="page-header">
        <div>
          <h2 className="page-title">🏔️ 活动列表</h2>
          <p className="page-subtitle">发现精彩户外，开启山野之旅</p>
        </div>
        <button className="btn-primary create-btn" onClick={() => setShowCreate(true)}>
          <span style={{ marginRight: '6px' }}>+</span> 新建活动
        </button>
      </div>

      <div className="filter-bar">
        {filterOptions.map(opt => (
          <button
            key={opt.key}
            className={`filter-btn ${filter === opt.key ? 'filter-active' : ''}`}
            onClick={() => setFilter(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="activity-grid">
        {filtered.map(act => (
          <ActivityCard
            key={act.id}
            activity={act}
            onRegister={handleRegister}
            isRegistered={registeredIds.includes(act.id)}
            isNew={newId === act.id}
          />
        ))}
        {filtered.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">🌿</div>
            <p className="empty-text">暂无活动，点击"新建活动"创建第一个吧！</p>
          </div>
        )}
      </div>

      {/* 新建活动Modal - 从中央淡入放大0.25秒，背景rgba(0,0,0,0.6) */}
      <Modal isOpen={showCreate} title="发布新活动" onClose={() => !loading && setShowCreate(false)} width="560px">
        <form onSubmit={handleSubmit} className="form-group">
          <div className="form-row">
            <label className="form-label">活动名称 *</label>
            <input
              className="form-input"
              type="text"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="如：周末黄山两日穿越"
              required
            />
          </div>
          <div className="form-row form-row-double">
            <div>
              <label className="form-label">活动类型 *</label>
              <select
                className="form-input"
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value as ActivityType })}
              >
                {(Object.keys(ActivityTypeLabels) as ActivityType[]).map(t => (
                  <option key={t} value={t}>{ActivityTypeLabels[t]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">难度等级 *</label>
              <select
                className="form-input"
                value={form.difficulty}
                onChange={e => setForm({ ...form, difficulty: e.target.value as Difficulty })}
              >
                {(Object.keys(DifficultyLabels) as Difficulty[]).map(d => (
                  <option key={d} value={d}>{DifficultyLabels[d].label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-row form-row-double">
            <div>
              <label className="form-label">活动时间 *</label>
              <input
                className="form-input"
                type="datetime-local"
                value={form.date}
                onChange={e => setForm({ ...form, date: new Date(e.target.value).toISOString() })}
                required
              />
            </div>
            <div>
              <label className="form-label">人数上限 *</label>
              <input
                className="form-input"
                type="number"
                min={2}
                max={100}
                value={form.maxParticipants}
                onChange={e => setForm({ ...form, maxParticipants: parseInt(e.target.value) || 20 })}
              />
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">活动地点 *</label>
            <input
              className="form-input"
              type="text"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              placeholder="如：安徽黄山风景区"
              required
            />
          </div>
          <div className="form-row">
            <label className="form-label">封面图URL（可选）</label>
            <input
              className="form-input"
              type="url"
              value={form.coverImage}
              onChange={e => setForm({ ...form, coverImage: e.target.value })}
              placeholder="https://..."
            />
          </div>
          <div className="form-row">
            <label className="form-label">活动描述 *</label>
            <textarea
              className="form-textarea"
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="介绍活动亮点、适合人群、装备建议等"
              rows={3}
              required
            />
          </div>
          <div className="form-row">
            <label className="form-label">行程安排</label>
            <textarea
              className="form-textarea"
              value={form.itinerary}
              onChange={e => setForm({ ...form, itinerary: e.target.value })}
              placeholder="每日行程详细安排"
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-ghost" onClick={() => setShowCreate(false)} disabled={loading}>取消</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '提交中...' : '发布活动'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default ActivityListPage
