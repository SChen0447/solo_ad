import React, { useEffect, useRef, useState } from 'react'
import { Star } from 'lucide-react'
import type { Comment } from '../../shared/types'

interface CommentWallProps {
  comments: Comment[]
}

const CommentItem: React.FC<{ comment: Comment; isNew: boolean }> = ({
  comment,
  isNew,
}) => (
  <div
    className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
      isNew ? 'animate-fadeIn' : ''
    }`}
  >
    <div
      className="w-8 h-8 rounded-full flex-shrink-0"
      style={{ background: comment.avatarGradient }}
    />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-0.5">
        <span className="text-white text-xs">{comment.nickname}</span>
        <div className="flex">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              size={10}
              fill={s <= comment.score ? '#fadb14' : 'transparent'}
              stroke={s <= comment.score ? '#fadb14' : '#555'}
              strokeWidth={1.5}
            />
          ))}
        </div>
      </div>
      <p className="text-white text-sm leading-relaxed break-words">
        {comment.content}
      </p>
    </div>
  </div>
)

const CommentWall: React.FC<CommentWallProps> = ({ comments }) => {
  const [autoScrollIndex, setAutoScrollIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const displayComments = comments.slice(0, 200)

  useEffect(() => {
    const timer = setInterval(() => {
      setAutoScrollIndex((prev) => prev + 1)
    }, 30000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    setAutoScrollIndex(0)
  }, [comments.length])

  const newCommentIds = new Set<string>()
  if (comments.length > 0) {
    const newest = comments[0]
    if (Date.now() - newest.createdAt < 5000) {
      newCommentIds.add(newest.id)
    }
  }

  return (
    <div
      ref={containerRef}
      className="backdrop-blur-lg rounded-xl p-4 overflow-y-auto max-h-[400px] md:max-h-[500px]"
      style={{ background: 'rgba(255,255,255,0.05)' }}
    >
      <h3 className="text-white/70 text-sm font-semibold mb-3 uppercase tracking-wider">
        实时评论
      </h3>
      <div className="flex flex-col gap-2">
        {displayComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            isNew={newCommentIds.has(comment.id)}
          />
        ))}
      </div>
      {displayComments.length === 0 && (
        <p className="text-white/30 text-center py-8">暂无评论</p>
      )}
    </div>
  )
}

export default CommentWall
