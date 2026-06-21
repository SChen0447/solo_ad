import { useEffect, useState, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Clock, Users, ChefHat, ArrowLeft, Send } from 'lucide-react'
import StarRating from '@/components/StarRating'
import type { Recipe, Comment } from '@/types'

export default function RecipeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [recipe, setRecipe] = useState<Recipe | null>(null)
  const [recipeComments, setRecipeComments] = useState<Comment[]>([])
  const [avgRating, setAvgRating] = useState(0)
  const [loading, setLoading] = useState(true)
  const [commentText, setCommentText] = useState('')
  const [username, setUsername] = useState('')
  const [userRating, setUserRating] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const fetchRecipe = useCallback(() => {
    if (!id) return
    fetch(`/api/recipes/${id}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setRecipe(data.data)
          setRecipeComments(data.data.comments || [])
          setAvgRating(data.data.avgRating || 0)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    fetchRecipe()
  }, [fetchRecipe])

  const handleSubmitComment = async () => {
    if (!commentText.trim() || !username.trim() || !userRating || !id) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/recipes/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), rating: userRating, content: commentText.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setRecipeComments(prev => [data.data, ...prev])
        const allRatings = [data.data, ...recipeComments].map(c => c.rating)
        setAvgRating(allRatings.reduce((a, b) => a + b, 0) / allRatings.length)
        setCommentText('')
        setUserRating(0)
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="text-warm-orange animate-pulse text-lg">加载中...</div>
      </div>
    )
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-lg">食谱未找到</p>
        <Link to="/" className="text-warm-orange hover:underline">返回首页</Link>
      </div>
    )
  }

  const coverUrl = recipe.coverImage || `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=delicious%20${encodeURIComponent(recipe.title)}%20food%20photography%20professional%20plating%20warm%20lighting&image_size=landscape_16_9`

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-orange-100 shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2 text-gray-500 hover:text-warm-orange transition-colors no-underline">
            <ArrowLeft size={20} />
            <span>返回</span>
          </Link>
          <Link to="/" className="flex items-center gap-2 no-underline">
            <ChefHat size={28} className="text-warm-orange" />
            <span className="font-serif text-xl font-bold text-warm-orange">味集</span>
          </Link>
        </div>
      </header>

      <div className="relative w-full h-[300px] md:h-[300px] max-h-[300px] overflow-hidden">
        <img src={coverUrl} alt={recipe.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-white drop-shadow-lg">{recipe.title}</h1>
          <p className="text-white/80 mt-2 text-sm md:text-base">by {recipe.author}</p>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">{recipe.description}</p>

            <section className="mb-10 animate-fade-in-up" style={{ animationDelay: '0.1s', opacity: 0 }}>
              <h2 className="font-serif text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-1 bg-warm-orange rounded-full" />
                食材清单
              </h2>
              <div className="bg-white rounded-xl p-5 space-y-2" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                {recipe.ingredients.map((ing, i) => (
                  <div key={i} className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0 animate-fade-in-up" style={{ animationDelay: `${i * 0.05}s`, opacity: 0 }}>
                    <span className="text-gray-700">{ing.name}</span>
                    <span className="text-gray-400 text-sm">{ing.amount}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="animate-fade-in-up" style={{ animationDelay: '0.2s', opacity: 0 }}>
              <h2 className="font-serif text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-1 bg-warm-orange rounded-full" />
                烹饪步骤
              </h2>
              <div className="space-y-6">
                {recipe.steps.map((step, i) => (
                  <div key={i} className="flex gap-4 animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s`, opacity: 0 }}>
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warm-orange text-white flex items-center justify-center font-bold text-sm">
                      {i + 1}
                    </div>
                    <div className="flex-1 pt-1">
                      <p className="text-gray-700 leading-relaxed">{step.text}</p>
                      {step.image && (
                        <img src={step.image} alt={`步骤${i + 1}`} className="mt-3 rounded-lg max-h-48 object-cover" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="lg:w-80 flex-shrink-0 space-y-6">
            <div className="bg-white rounded-xl p-5 space-y-4" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 className="font-serif text-lg font-bold text-gray-800">食谱信息</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-gray-600">
                  <Clock size={18} className="text-warm-orange" />
                  <span>准备时间：{recipe.prepTime}分钟</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Clock size={18} className="text-warm-orange" />
                  <span>烹饪时间：{recipe.cookTime}分钟</span>
                </div>
                <div className="flex items-center gap-3 text-gray-600">
                  <Users size={18} className="text-warm-orange" />
                  <span>食用人数：{recipe.servings}人份</span>
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-gray-600 text-sm">综合评分</span>
                  <span className="text-warm-orange font-bold text-lg">{avgRating.toFixed(1)}</span>
                </div>
                <StarRating rating={Math.round(avgRating)} size={22} />
              </div>
            </div>

            <div className="bg-white rounded-xl p-5" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
              <h3 className="font-serif text-lg font-bold text-gray-800 mb-3">发表评论</h3>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="你的昵称"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-warm-orange focus:ring-[3px] focus:ring-orange-200/30 transition-all"
                  style={{ boxShadow: username ? 'none' : undefined }}
                />
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">评分：</span>
                  <StarRating rating={userRating} interactive onRate={setUserRating} size={20} />
                </div>
                <textarea
                  placeholder="分享你的烹饪体验..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:border-warm-orange focus:ring-[3px] focus:ring-orange-200/30 transition-all"
                  style={{ background: '#f7fafc', borderRadius: '8px' }}
                />
                <button
                  onClick={handleSubmitComment}
                  disabled={submitting || !commentText.trim() || !username.trim() || !userRating}
                  className="w-full py-2.5 rounded-lg text-white font-medium transition-all duration-300 relative overflow-hidden ripple-btn disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(to right, #48bb78, #38a169)' }}
                >
                  <span className="flex items-center justify-center gap-2">
                    <Send size={16} />
                    {submitting ? '提交中...' : '发表评论'}
                  </span>
                </button>
              </div>
            </div>
          </aside>
        </div>

        <section className="mt-12">
          <h2 className="font-serif text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="w-8 h-1 bg-warm-orange rounded-full" />
            评论 ({recipeComments.length})
          </h2>
          {recipeComments.length === 0 ? (
            <p className="text-gray-400 text-center py-8">暂无评论，快来发表第一条吧！</p>
          ) : (
            <div className="space-y-4">
              {recipeComments.map((comment, i) => (
                <div
                  key={comment.id}
                  className="bg-white rounded-xl p-4 flex gap-4 animate-fade-in-up"
                  style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.04)', animationDelay: `${i * 0.1}s`, opacity: 0 }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: comment.avatarColor }}
                  >
                    {comment.username.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-800">{comment.username}</span>
                      <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                    <StarRating rating={comment.rating} size={14} />
                    <p className="text-gray-600 mt-2 text-sm leading-relaxed">{comment.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
