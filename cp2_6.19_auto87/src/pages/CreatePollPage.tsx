import { useState } from 'react'
import { Link } from 'react-router-dom'
import { createPoll } from '../api'
import QRCode from '../components/QRCode'
import Notification from '../components/Notification'
import type { Poll, Notification as NotificationType } from '../types'

export default function CreatePollPage() {
  const [title, setTitle] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [deadline, setDeadline] = useState('')
  const [hasDeadline, setHasDeadline] = useState(false)
  const [loading, setLoading] = useState(false)
  const [createdPoll, setCreatedPoll] = useState<Poll | null>(null)
  const [notification, setNotification] = useState<NotificationType | null>(null)

  const addOption = () => {
    if (options.length < 10) {
      setOptions([...options, ''])
    }
  }

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index))
    }
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const validOptions = options.filter(opt => opt.trim())
    if (!title.trim()) {
      setNotification({
        id: Date.now().toString(),
        type: 'error',
        message: '请输入投票标题'
      })
      return
    }

    if (validOptions.length < 2) {
      setNotification({
        id: Date.now().toString(),
        type: 'error',
        message: '至少需要2个有效选项'
      })
      return
    }

    setLoading(true)

    try {
      const data = await createPoll({
        title: title.trim(),
        options: validOptions,
        deadline: hasDeadline && deadline ? deadline : undefined
      })

      setCreatedPoll(data)
      setNotification({
        id: Date.now().toString(),
        type: 'success',
        message: '投票创建成功！'
      })
    } catch (error) {
      setNotification({
        id: Date.now().toString(),
        type: 'error',
        message: error instanceof Error ? error.message : '创建投票失败'
      })
    } finally {
      setLoading(false)
    }
  }

  const copyLink = () => {
    if (createdPoll) {
      const link = `${window.location.origin}/poll/${createdPoll.id}`
      navigator.clipboard.writeText(link)
      setNotification({
        id: Date.now().toString(),
        type: 'success',
        message: '链接已复制到剪贴板'
      })
    }
  }

  if (createdPoll) {
    const pollLink = `${window.location.origin}/poll/${createdPoll.id}`

    return (
      <div className="min-h-screen bg-gray-50">
        <Notification
          notification={notification}
          onClose={() => setNotification(null)}
        />

        <header className="bg-[#1a237e] text-white py-6 shadow-lg">
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold">创建成功</h1>
              <Link
                to="/"
                className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
              >
                返回列表
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">{createdPoll.title}</h2>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                投票链接
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={pollLink}
                  readOnly
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700"
                />
                <button
                  onClick={copyLink}
                  className="px-4 py-2 bg-[#1a237e] text-white rounded-lg
                             hover:bg-[#283593] transition-colors duration-200"
                >
                  复制链接
                </button>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                二维码
              </label>
              <div className="flex justify-center">
                <QRCode value={pollLink} size={200} />
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                to={`/poll/${createdPoll.id}`}
                className="flex-1 px-4 py-3 bg-[#1a237e] text-white rounded-lg text-center font-medium
                           hover:bg-[#283593] transition-colors duration-200"
              >
                查看投票
              </Link>
              <Link
                to="/create"
                onClick={() => setCreatedPoll(null)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg text-center font-medium
                           hover:bg-gray-300 transition-colors duration-200"
              >
                继续创建
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Notification
        notification={notification}
        onClose={() => setNotification(null)}
      />

      <header className="bg-[#1a237e] text-white py-6 shadow-lg">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">创建投票</h1>
            <Link
              to="/"
              className="px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
            >
              返回列表
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 shadow-sm">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              投票标题 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="请输入投票标题"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-[#1a237e] focus:border-transparent"
              maxLength={100}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              投票选项 <span className="text-red-500">*</span>
              <span className="text-gray-400 font-normal ml-2">
                (至少2个，最多10个)
              </span>
            </label>

            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                    placeholder={`选项 ${index + 1}`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg
                               focus:outline-none focus:ring-2 focus:ring-[#1a237e] focus:border-transparent"
                    maxLength={50}
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeOption(index)}
                      className="px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 10 && (
              <button
                type="button"
                onClick={addOption}
                className="mt-3 px-4 py-2 text-[#1a237e] border border-[#1a237e] rounded-lg
                           hover:bg-[#1a237e] hover:text-white transition-colors duration-200"
              >
                + 添加选项
              </button>
            )}
          </div>

          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <input
                type="checkbox"
                id="hasDeadline"
                checked={hasDeadline}
                onChange={(e) => setHasDeadline(e.target.checked)}
                className="w-4 h-4 text-[#1a237e] rounded"
              />
              <label htmlFor="hasDeadline" className="text-sm font-medium text-gray-700">
                设置投票截止时间（可选）
              </label>
            </div>

            {hasDeadline && (
              <input
                type="datetime-local"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg
                           focus:outline-none focus:ring-2 focus:ring-[#1a237e] focus:border-transparent"
                min={new Date().toISOString().slice(0, 16)}
              />
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1a237e] text-white rounded-lg font-medium
                       hover:bg-[#283593] transition-colors duration-200
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '创建中...' : '创建投票'}
          </button>
        </form>
      </main>
    </div>
  )
}
