import React, { useEffect, useState, useCallback } from 'react'
import { Plus, Settings } from 'lucide-react'
import { api } from '@/utils/api'
import type { Stage, StageRatings } from '../../shared/types'

const AdminPanel: React.FC = () => {
  const [stages, setStages] = useState<Stage[]>([])
  const [ratings, setRatings] = useState<StageRatings[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [startTime, setStartTime] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      const stagesData = await api.getStages()
      setStages(stagesData)
      const ratingsData = await api.getRatings()
      setRatings(ratingsData.stages)
    } catch (err) {
      console.error('Failed to fetch data:', err)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 5000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleCreateStage = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    if (!name.trim() || !description.trim() || !startTime) {
      setMessage('请填写完整信息')
      return
    }
    setLoading(true)
    try {
      await api.createStage({
        name: name.trim(),
        description: description.trim(),
        startTime,
      })
      setName('')
      setDescription('')
      setStartTime('')
      setMessage('舞台创建成功！')
      fetchData()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '创建失败')
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (id: string) => {
    try {
      setStages((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, votingOpen: !s.votingOpen } : s
        )
      )
      await api.toggleStage(id)
      fetchData()
    } catch (err) {
      fetchData()
      console.error('Toggle failed:', err)
    }
  }

  const getRating = (stageId: string): StageRatings | undefined =>
    ratings.find((r) => r.stageId === stageId)

  return (
    <div className="min-h-screen bg-[#f0f2f5]">
      <div className="container mx-auto px-4 py-6 max-w-6xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Settings size={24} />
            音乐节管理后台
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            舞台管理 · 投票控制 · 数据总览
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Plus size={18} />
                创建舞台
              </h2>
              <form onSubmit={handleCreateStage} className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    舞台名称
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    placeholder="如：主舞台"
                    maxLength={20}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    描述
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="舞台介绍"
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">
                    起始时间
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                {message && (
                  <p
                    className={`text-sm ${
                      message.includes('成功')
                        ? 'text-green-600'
                        : 'text-red-500'
                    }`}
                  >
                    {message}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading || stages.length >= 10}
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 rounded-md transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? '创建中...' : '创建舞台'}
                </button>
                <p className="text-xs text-gray-400 text-center">
                  已创建 {stages.length}/10 个舞台
                </p>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">
                舞台列表 & 实时评分总览
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-gray-500">
                      <th className="text-left py-2 px-2 font-medium">
                        舞台名称
                      </th>
                      <th className="text-left py-2 px-2 font-medium">
                        起始时间
                      </th>
                      <th className="text-center py-2 px-2 font-medium">
                        当前平均分
                      </th>
                      <th className="text-center py-2 px-2 font-medium">
                        投票人数
                      </th>
                      <th className="text-center py-2 px-2 font-medium">
                        最高分
                      </th>
                      <th className="text-right py-2 px-2 font-medium">
                        投票开关
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stages.map((stage) => {
                      const rating = getRating(stage.id)
                      return (
                        <tr
                          key={stage.id}
                          className="border-b border-gray-100 hover:bg-[#e6f7ff] transition-colors"
                        >
                          <td className="py-3 px-2 font-medium text-gray-800">
                            {stage.name}
                          </td>
                          <td className="py-3 px-2 text-gray-500">
                            {stage.startTime}
                          </td>
                          <td className="py-3 px-2 text-center font-bold text-blue-600">
                            {rating
                              ? rating.averageScore.toFixed(1)
                              : '-'}
                          </td>
                          <td className="py-3 px-2 text-center text-gray-600">
                            {rating ? rating.voteCount : 0}
                          </td>
                          <td className="py-3 px-2 text-center text-gray-600">
                            {rating ? rating.maxScore.toFixed(1) : '-'}
                          </td>
                          <td className="py-3 px-2 text-right">
                            <button
                              onClick={() => handleToggle(stage.id)}
                              className="px-3 py-1 rounded-md text-sm font-medium transition-all duration-150 hover:scale-105"
                              style={{
                                color: stage.votingOpen
                                  ? '#52c41a'
                                  : '#d9d9d9',
                                border: `2px solid ${
                                  stage.votingOpen
                                    ? '#52c41a'
                                    : '#d9d9d9'
                                }`,
                                backgroundColor: stage.votingOpen
                                  ? 'rgba(82,196,26,0.08)'
                                  : 'transparent',
                              }}
                            >
                              {stage.votingOpen ? '开启' : '关闭'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                    {stages.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="py-8 text-center text-gray-400"
                        >
                          暂无舞台，请先创建
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPanel
