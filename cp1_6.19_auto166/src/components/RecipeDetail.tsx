import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Heart, Star, Send, Edit3, Trash2, X, Check } from 'lucide-react';
import type { RecipeDetail as RecipeDetailType, Comment } from '@/data/recipeData';
import { fetchRecipeDetail, likeRecipe, addComment, editComment, deleteComment, getCurrentUserId } from '@/data/recipeData';

interface RecipeDetailProps {
  recipeId: string;
  onBack: () => void;
}

export default function RecipeDetail({ recipeId, onBack }: RecipeDetailProps) {
  const [recipe, setRecipe] = useState<RecipeDetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(0);
  const [pulse, setPulse] = useState(false);
  const [sliderRating, setSliderRating] = useState(5);
  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editRating, setEditRating] = useState(5);
  const [newCommentAnim, setNewCommentAnim] = useState<string | null>(null);
  const [visibleSteps, setVisibleSteps] = useState(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const currentUserId = getCurrentUserId();

  useEffect(() => {
    loadRecipe();
  }, [recipeId]);

  const loadRecipe = async () => {
    setLoading(true);
    try {
      const data = await fetchRecipeDetail(recipeId);
      setRecipe(data);
      setLiked(data.liked);
      setLikes(data.likes);
      setVisibleSteps(0);
      data.steps.forEach((_, i) => {
        setTimeout(() => setVisibleSteps(v => v + 1), (i + 1) * 150);
      });
    } catch {}
    setLoading(false);
  };

  const handleLike = async () => {
    try {
      const result = await likeRecipe(recipeId);
      if (result.success) {
        setLiked(result.liked);
        setLikes(result.likes);
        setPulse(true);
        setTimeout(() => setPulse(false), 300);
      }
    } catch {}
  };

  const handleSliderMove = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, x / rect.width));
    setSliderRating(Math.round(ratio * 5 * 2) / 2 || 0.5);
  }, []);

  const handleSliderMouseDown = (e: React.MouseEvent) => {
    handleSliderMove(e.clientX);
    const onMove = (ev: MouseEvent) => handleSliderMove(ev.clientX);
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  const handleSliderTouchStart = (e: React.TouchEvent) => {
    handleSliderMove(e.touches[0].clientX);
    const onMove = (ev: TouchEvent) => handleSliderMove(ev.touches[0].clientX);
    const onEnd = () => {
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    };
    document.addEventListener('touchmove', onMove);
    document.addEventListener('touchend', onEnd);
  };

  const handleSubmitComment = async () => {
    if (!commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const result = await addComment(recipeId, commentText, sliderRating);
      if (result.success) {
        setRecipe(prev => prev ? {
          ...prev,
          comments: [result.comment, ...prev.comments],
        } : prev);
        setCommentText('');
        setNewCommentAnim(result.comment.id);
        setTimeout(() => setNewCommentAnim(null), 600);
      }
    } catch {}
    setSubmitting(false);
  };

  const handleStartEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditText(comment.content);
    setEditRating(comment.rating);
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;
    try {
      const result = await editComment(recipeId, commentId, editText, editRating);
      if (result.success) {
        setRecipe(prev => prev ? {
          ...prev,
          comments: prev.comments.map(c => c.id === commentId ? result.comment : c),
        } : prev);
        setEditingId(null);
      }
    } catch {}
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const result = await deleteComment(recipeId, commentId);
      if (result.success) {
        setRecipe(prev => prev ? {
          ...prev,
          comments: prev.comments.filter(c => c.id !== commentId),
        } : prev);
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-burnt border-t-transparent rounded-full animate-spin" />
          <span className="text-warm-gray text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="flex items-center justify-center h-96">
        <span className="text-warm-gray">菜谱不存在</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-warm-gray btn-hover mb-6 hover:text-burnt group"
      >
        <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
        <span className="text-sm font-medium">返回菜谱列表</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <img
              src={recipe.image}
              alt={recipe.title}
              loading="lazy"
              className="w-full h-64 sm:h-80 object-cover"
            />

            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-charcoal mb-2">
                    {recipe.title}
                  </h1>
                  <div className="flex items-center gap-2">
                    <img src={recipe.authorAvatar} alt={recipe.author} className="w-8 h-8 rounded-full object-cover ring-2 ring-warm-border" />
                    <span className="text-sm text-warm-gray font-medium">{recipe.author}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-amber-50 px-3 py-1.5 rounded-full">
                    <Star size={16} className="fill-amber-400 text-amber-400" />
                    <span className="font-semibold text-charcoal text-sm">{recipe.rating}</span>
                  </div>

                  <button
                    onClick={handleLike}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-300 btn-hover
                      ${liked ? 'bg-red-50 text-red-500' : 'bg-gray-50 text-warm-gray hover:text-red-400 hover:bg-red-50'}
                      ${pulse ? 'animate-pulse-like' : ''}
                    `}
                  >
                    <Heart size={18} className={`transition-all duration-300 ${liked ? 'fill-red-500' : 'fill-transparent'}`} />
                    <span className="text-sm font-medium">{likes}</span>
                  </button>
                </div>
              </div>

              <div className="mt-6">
                <h2 className="font-display text-lg font-semibold text-charcoal mb-3">食材清单</h2>
                <div className="flex flex-wrap gap-2">
                  {recipe.ingredients.map((ing, i) => (
                    <span
                      key={i}
                      className="bg-orange-50 text-burnt-dark text-sm px-3 py-1.5 rounded-full border border-orange-100"
                    >
                      {ing}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-6">
                <h2 className="font-display text-lg font-semibold text-charcoal mb-4">烹饪步骤</h2>
                <div className="space-y-4">
                  {recipe.steps.map((step, i) => (
                    <div
                      key={i}
                      className={`transition-all duration-500 ${
                        i < visibleSteps ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
                      }`}
                    >
                      <div className="flex gap-4 items-start">
                        <span className="text-3xl font-display font-bold text-warm-border leading-none mt-0.5 shrink-0" style={{ lineHeight: '1.5' }}>
                          {i + 1}
                        </span>
                        <p className="text-charcoal leading-relaxed pt-1">{step}</p>
                      </div>
                      {i < recipe.steps.length - 1 && (
                        <div
                          className="ml-8 mt-3 h-px bg-warm-border animate-fade-in"
                          style={{ animationDelay: `${(i + 1) * 0.1}s` }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-md p-6 sticky top-6">
            <h2 className="font-display text-lg font-semibold text-charcoal mb-4">评分与评论</h2>

            <div className="mb-6 p-4 bg-cream/50 rounded-xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-warm-gray font-medium">拖拽评分</span>
                <div className="flex items-center gap-1">
                  <Star size={16} className="fill-burnt text-burnt" />
                  <span className="text-lg font-bold text-burnt">{sliderRating}</span>
                </div>
              </div>

              <div
                ref={sliderRef}
                className="relative h-3 bg-warm-border/50 rounded-full cursor-pointer select-none"
                onMouseDown={handleSliderMouseDown}
                onTouchStart={handleSliderTouchStart}
              >
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-burnt-light to-burnt transition-all duration-100"
                  style={{ width: `${(sliderRating / 5) * 100}%` }}
                />
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-5 h-5 bg-white border-2 border-burnt rounded-full shadow-md transition-all duration-100"
                  style={{ left: `calc(${(sliderRating / 5) * 100}% - 10px)` }}
                />
              </div>

              <div className="flex justify-between mt-1.5 px-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <span key={n} className="text-xs text-warm-gray">{n}</span>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder="分享你的试做体验..."
                className="w-full p-3 border border-warm-border rounded-xl text-charcoal text-sm resize-none focus:outline-none focus:border-burnt focus:ring-1 focus:ring-burnt/30 transition-all duration-200 bg-cream/30"
                rows={3}
              />
              <button
                onClick={handleSubmitComment}
                disabled={!commentText.trim() || submitting}
                className="mt-2 w-full flex items-center justify-center gap-2 bg-burnt text-white py-2.5 rounded-xl font-medium btn-hover disabled:opacity-50 disabled:cursor-not-allowed hover:bg-burnt-dark transition-colors duration-200"
              >
                <Send size={16} />
                <span className="text-sm">{submitting ? '提交中...' : '发表评论'}</span>
              </button>
            </div>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {recipe.comments.map(comment => (
                <div
                  key={comment.id}
                  className={`p-3 bg-cream/30 rounded-xl transition-all duration-500 ${
                    newCommentAnim === comment.id ? 'animate-slide-up-blur' : ''
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <img src={comment.userAvatar} alt={comment.userName} className="w-7 h-7 rounded-full object-cover" />
                      <span className="text-sm font-medium text-charcoal">{comment.userName}</span>
                    </div>
                    <span className="text-xs text-warm-gray">
                      {new Date(comment.createdAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {editingId === comment.id ? (
                    <div className="mt-2">
                      <textarea
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        className="w-full p-2 border border-burnt rounded-lg text-sm resize-none focus:outline-none focus:ring-1 focus:ring-burnt/30"
                        rows={2}
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleSaveEdit(comment.id)}
                          className="flex items-center gap-1 text-xs bg-burnt text-white px-3 py-1.5 rounded-lg btn-hover hover:bg-burnt-dark"
                        >
                          <Check size={12} /> 保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="flex items-center gap-1 text-xs bg-gray-100 text-warm-gray px-3 py-1.5 rounded-lg btn-hover"
                        >
                          <X size={12} /> 取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm text-charcoal/80 leading-relaxed">{comment.content}</p>
                      <div className="flex items-center justify-between mt-2">
                        {comment.rating > 0 && (
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={i < comment.rating ? 'fill-amber-400 text-amber-400' : 'text-warm-border'}
                              />
                            ))}
                          </div>
                        )}
                        {comment.userId === currentUserId && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleStartEdit(comment)}
                              className="text-warm-gray hover:text-burnt transition-colors duration-200"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="text-warm-gray hover:text-red-500 transition-colors duration-200"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}

              {recipe.comments.length === 0 && (
                <p className="text-center text-warm-gray text-sm py-8">暂无评论，来分享你的试做体验吧！</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
