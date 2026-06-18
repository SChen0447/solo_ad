import { useState, useCallback } from 'react'
import { X, Copy, Check, FileText, Loader2 } from 'lucide-react'
import useStore from './StateManager'
import type { BoardElement } from './types'

interface SummaryPanelProps {
  onClose: () => void
}

export default function SummaryPanel({ onClose }: SummaryPanelProps) {
  const { elements, summary, setSummary } = useStore()
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  const generateSummary = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8080/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ elements: elements as BoardElement[] }),
      })
      if (!response.ok) {
        throw new Error('Network error')
      }
      const data = await response.json()
      setSummary(data.summary || '')
    } catch {
      const textOnly = elements
        .filter((el) => el.type === 'text' && el.text)
        .sort((a, b) => a.createdAt - b.createdAt)
        .map((el) => el.text)
        .join('\n\n')
      const fallback =
        textOnly ||
        '（当前白板中暂无文本内容，请先添加文本框后再生成纪要）'
      setSummary(fallback)
    } finally {
      setLoading(false)
    }
  }, [elements, setSummary])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore copy error
    }
  }, [summary])

  return (
    <div
      className="fixed top-0 right-0 h-full z-40 flex"
      style={{
        pointerEvents: 'none',
      }}
    >
      <div
        className="h-full flex flex-col transition-transform duration-300 ease-out"
        style={{
          transform: summary !== undefined && summary !== null ? 'translateX(0)' : 'translateX(100%)',
          pointerEvents: 'auto',
          width: 'min(420px, 90vw)',
          background: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderLeft: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
        }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200/60">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-[#4da6ff]" />
            <h2 className="text-[17px] font-semibold text-gray-800">会议纪要</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-500 hover:bg-black/5 transition-all duration-200 hover:-translate-y-0.5"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4 border-b border-gray-200/60">
          <button
            onClick={generateSummary}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium text-white transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
            style={{ background: '#4da6ff' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>正在生成...</span>
              </>
            ) : (
              <>
                <FileText size={18} />
                <span>生成纪要</span>
              </>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 bg-gray-200/70 rounded animate-pulse"
                  style={{ width: `${70 + Math.random() * 30}%` }}
                />
              ))}
            </div>
          ) : summary ? (
            <div className="text-[14.5px] leading-7 text-gray-700 whitespace-pre-wrap break-words">
              {summary}
            </div>
          ) : (
            <div className="text-[13.5px] leading-6 text-gray-500">
              点击上方按钮，将根据白板上的文本、形状标签自动生成结构化会议纪要。
            </div>
          )}
        </div>

        {summary && !loading && (
          <div className="px-5 py-4 border-t border-gray-200/60">
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 hover:-translate-y-0.5"
              style={{
                background: copied ? '#4dff4d22' : 'rgba(0,0,0,0.04)',
                color: copied ? '#2aa82a' : '#333',
                border: copied ? '1px solid #4dff4d' : '1px solid transparent',
              }}
            >
              {copied ? (
                <>
                  <Check size={16} />
                  <span>已复制</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>复制文本</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
