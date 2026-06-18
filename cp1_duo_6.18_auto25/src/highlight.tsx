import React, { useRef, useEffect, useState, useCallback } from 'react'
import { useCommentStore, TYPE_CONFIG, CommentType, Comment } from './commentStore'

export const SAMPLE_TEXT = `在《红楼梦》中，林黛玉的形象是中国古典文学中最令人难忘的女性角色之一。她的性格复杂而深邃，既有对生命的敏感与脆弱，又有对命运的抗争与不屈。

首先，林黛玉的敏感性是她最突出的特征。她对自然的变化有着超乎常人的感知力，一片落花就能引发她对生命无常的深切感悟。这种敏感性既源于她天生的诗人气质，也与她孤苦的身世密不可分。自幼丧母，寄人篱下的生活让她对周围的一切都格外在意，任何细微的冷暖变化都能触动她纤细的神经。

其次，林黛玉的才情是她人格魅力的核心。她在诗词上的造诣远超贾府中的其他女子，无论是咏白海棠的含蓄优雅，还是葬花吟的凄美绝伦，都展现了她卓越的文学才华。她的诗作不仅是才情的展现，更是内心世界的真实投射，每一首都饱含着她对生活的独特理解和深沉情感。

然而，林黛玉并非只有柔弱和才情。她对爱情的执着追求体现了她性格中的刚强一面。在那个礼教森严的时代，她敢于向贾宝玉表达真实的情感，这种勇气是难能可贵的。她的爱情虽然最终以悲剧收场，但那份真挚和热烈却穿越了时空，至今仍能打动读者的心。

总的来说，林黛玉是一个集敏感、才情与刚强于一身的复杂形象。她的悲剧命运不仅是个人性格的必然结果，更是封建社会对女性压迫的缩影。正因如此，林黛玉的形象才具有了超越时代的普遍意义，成为中国文学史上不可磨灭的经典。`

interface Segment {
  start: number
  end: number
  text: string
  comments: Comment[]
}

function buildSegments(text: string, comments: Comment[]): Segment[] {
  if (comments.length === 0) {
    return [{ start: 0, end: text.length, text, comments: [] }]
  }
  const points = new Set<number>([0, text.length])
  comments.forEach((c) => {
    points.add(c.offsetStart)
    points.add(c.offsetEnd)
  })
  const sorted = Array.from(points).sort((a, b) => a - b)
  const segments: Segment[] = []
  for (let i = 0; i < sorted.length - 1; i++) {
    const start = sorted[i]
    const end = sorted[i + 1]
    if (start === end) continue
    const applicable = comments.filter(
      (c) => c.offsetStart <= start && c.offsetEnd >= end
    )
    segments.push({ start, end, text: text.slice(start, end), comments: applicable })
  }
  return segments
}

function getOffsetFromNode(node: Node, offset: number): number {
  if (node.nodeType === Node.TEXT_NODE) {
    const parent = node.parentElement
    if (parent && parent.dataset.offset !== undefined) {
      return parseInt(parent.dataset.offset, 10) + offset
    }
  }
  return offset
}

interface ToolbarState {
  visible: boolean
  x: number
  y: number
  start: number
  end: number
}

interface TooltipState {
  visible: boolean
  x: number
  y: number
  comments: Comment[]
}

export const TextHighlight: React.FC = () => {
  const { comments, selectedCommentId, flashKey, addComment, selectComment } = useCommentStore()
  const containerRef = useRef<HTMLDivElement>(null)
  const [toolbar, setToolbar] = useState<ToolbarState | null>(null)
  const [tooltip, setTooltip] = useState<TooltipState | null>(null)
  const [flashingId, setFlashingId] = useState<string | null>(null)

  const segments = buildSegments(SAMPLE_TEXT, comments)

  const handleMouseUp = useCallback(() => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || !containerRef.current) {
      if (!selection || selection.isCollapsed) {
        setToolbar(null)
      }
      return
    }
    const range = selection.getRangeAt(0)
    const anchorOffset = getOffsetFromNode(range.startContainer, range.startOffset)
    const focusOffset = getOffsetFromNode(range.endContainer, range.endOffset)
    const start = Math.min(anchorOffset, focusOffset)
    const end = Math.max(anchorOffset, focusOffset)
    if (start === end) {
      setToolbar(null)
      return
    }
    const rect = range.getBoundingClientRect()
    const containerRect = containerRef.current.getBoundingClientRect()
    setToolbar({
      visible: true,
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top - containerRect.top,
      start,
      end,
    })
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('.highlight-toolbar')) return
    setToolbar(null)
  }, [])

  const handleAddComment = useCallback(
    (type: CommentType) => {
      if (!toolbar) return
      const selectedText = SAMPLE_TEXT.slice(toolbar.start, toolbar.end)
      addComment({
        text: selectedText,
        offsetStart: toolbar.start,
        offsetEnd: toolbar.end,
        type,
        content: TYPE_CONFIG[type].label,
      })
      setToolbar(null)
      window.getSelection()?.removeAllRanges()
    },
    [toolbar, addComment]
  )

  useEffect(() => {
    if (!selectedCommentId || flashKey === 0) return
    const el = containerRef.current?.querySelector(
      `[data-comment-ids*="${selectedCommentId}"]`
    ) as HTMLElement | null
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setFlashingId(null)
      requestAnimationFrame(() => {
        setFlashingId(selectedCommentId)
      })
      const timer = setTimeout(() => setFlashingId(null), 600)
      return () => clearTimeout(timer)
    }
  }, [selectedCommentId, flashKey])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest('.highlight-toolbar') && !target.closest('.text-container')) {
        setToolbar(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSpanMouseEnter = useCallback(
    (e: React.MouseEvent<HTMLSpanElement>, seg: Segment) => {
      if (seg.comments.length === 0) return
      const rect = e.currentTarget.getBoundingClientRect()
      const containerRect = containerRef.current!.getBoundingClientRect()
      setTooltip({
        visible: true,
        x: rect.left + rect.width / 2 - containerRect.left,
        y: rect.top - containerRect.top,
        comments: seg.comments,
      })
    },
    []
  )

  const handleSpanMouseLeave = useCallback(() => {
    setTooltip(null)
  }, [])

  return (
    <div
      ref={containerRef}
      className="text-container"
      onMouseUp={handleMouseUp}
      onMouseDown={handleMouseDown}
    >
      <div className="text-content">
        {segments.map((seg, i) => {
          if (seg.comments.length === 0) {
            return (
              <span key={i} data-offset={seg.start}>
                {seg.text}
              </span>
            )
          }
          const lastComment = seg.comments[seg.comments.length - 1]
          const config = TYPE_CONFIG[lastComment.type]
          const isFlashing = seg.comments.some((c) => c.id === flashingId)
          const isSelected = seg.comments.some((c) => c.id === selectedCommentId)
          const commentIds = seg.comments.map((c) => c.id).join(',')
          return (
            <span
              key={i}
              data-offset={seg.start}
              data-comment-ids={commentIds}
              className={`highlight-span${isFlashing ? ' highlight-flash' : ''}${isSelected ? ' highlight-selected' : ''}`}
              style={{ backgroundColor: config.bgColor }}
              onMouseEnter={(e) => handleSpanMouseEnter(e, seg)}
              onMouseLeave={handleSpanMouseLeave}
            >
              {seg.text}
            </span>
          )
        })}
      </div>

      {toolbar && toolbar.visible && (
        <div
          className="highlight-toolbar"
          style={{
            left: toolbar.x,
            top: toolbar.y - 44,
          }}
        >
          {(Object.keys(TYPE_CONFIG) as CommentType[]).map((type) => {
            const cfg = TYPE_CONFIG[type]
            return (
              <button
                key={type}
                className="toolbar-btn"
                style={{ color: cfg.color, borderColor: cfg.color }}
                onClick={() => handleAddComment(type)}
                title={cfg.label}
              >
                <span className="toolbar-icon">{cfg.icon}</span>
                <span className="toolbar-label">{cfg.label}</span>
              </button>
            )
          })}
        </div>
      )}

      {tooltip && tooltip.visible && (
        <div
          className="highlight-tooltip"
          style={{
            left: tooltip.x,
            top: tooltip.y,
          }}
        >
          {tooltip.comments.map((c) => {
            const cfg = TYPE_CONFIG[c.type]
            return (
              <div key={c.id} className="tooltip-item">
                <span style={{ color: cfg.color }}>{cfg.icon}</span>
                <span className="tooltip-type" style={{ color: cfg.color }}>
                  {cfg.label}
                </span>
                <span className="tooltip-content">{c.content}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
