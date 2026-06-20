import type { FeedbackItem } from '../api'
import { Star } from 'lucide-react'

interface Props {
  feedbacks: FeedbackItem[]
  averageRating: number
}

export default function FeedbackList({ feedbacks, averageRating }: Props) {
  if (feedbacks.length === 0) {
    return (
      <div className="text-center py-8 text-clay-400 text-sm">
        暂无反馈，成为第一个评价者吧！
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-1">
          <span className="text-2xl font-serif font-bold text-clay-700">
            {averageRating.toFixed(1)}
          </span>
          <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
        </div>
        <span className="text-xs text-clay-400">
          共 {feedbacks.length} 条评价
        </span>
      </div>

      <div className="space-y-3">
        {feedbacks.map((fb, idx) => (
          <div
            key={fb.id}
            className="animate-fade-in bg-white/70 rounded-lg p-4 border border-clay-100"
            style={{ animationDelay: `${idx * 0.05}s` }}
          >
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-3.5 h-3.5 ${
                    star <= fb.rating
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-clay-200'
                  }`}
                />
              ))}
              <span className="text-xs text-clay-400 ml-2">
                {new Date(fb.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
            <p className="text-sm text-clay-700 leading-relaxed">{fb.comment}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
