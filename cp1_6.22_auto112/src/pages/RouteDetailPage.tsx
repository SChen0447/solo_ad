import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Route, Review } from '../types';
import { getRouteById, getReviews, createReview } from '../services/api';
import RouteMap from '../components/RouteMap';
import StarRating from '../components/StarRating';
import { MapPin, Clock, TrendingUp, User, Send, ArrowLeft } from 'lucide-react';

export default function RouteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [route, setRoute] = useState<Route | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  
  const [newReviewRating, setNewReviewRating] = useState(0);
  const [newReviewUsername, setNewReviewUsername] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [newReviewId, setNewReviewId] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    const fetchRoute = async () => {
      try {
        const data = await getRouteById(id);
        setRoute(data);
      } catch (err) {
        console.error('Failed to fetch route:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoute();
  }, [id]);

  useEffect(() => {
    if (!id) return;

    const fetchReviews = async () => {
      try {
        const data = await getReviews(id);
        setReviews(data);
      } catch (err) {
        console.error('Failed to fetch reviews:', err);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [id]);

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!id) return;
    if (newReviewRating < 1 || newReviewRating > 5) return;
    if (!newReviewUsername.trim()) return;
    if (newReviewComment.length > 200) return;

    setSubmitting(true);

    try {
      const newReview = await createReview(id, {
        username: newReviewUsername.trim(),
        rating: newReviewRating,
        comment: newReviewComment.trim()
      });

      setReviews(prev => [newReview, ...prev]);
      setNewReviewId(newReview.id);
      
      if (route) {
        const newCount = route.reviewCount + 1;
        const newAvg = Math.round(
          ((route.averageRating * route.reviewCount) + newReviewRating) / newCount * 10
        ) / 10;
        setRoute({ ...route, reviewCount: newCount, averageRating: newAvg });
      }

      setNewReviewRating(0);
      setNewReviewUsername('');
      setNewReviewComment('');

      setTimeout(() => setNewReviewId(null), 1000);
    } catch (err) {
      console.error('Failed to submit review:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const difficultyLabels: Record<string, { text: string; color: string }> = {
    easy: { text: '简单', color: 'bg-green-100 text-green-700' },
    medium: { text: '中等', color: 'bg-yellow-100 text-yellow-700' },
    hard: { text: '困难', color: 'bg-red-100 text-red-700' }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] pt-16">
        <div className="animate-pulse">
          <div className="h-[400px] bg-gray-300" />
          <div className="max-w-[1200px] mx-auto px-6 py-8">
            <div className="h-10 bg-gray-200 rounded w-1/3 mb-4" />
            <div className="h-5 bg-gray-200 rounded w-1/2 mb-8" />
            <div className="grid grid-cols-3 gap-6 mb-8">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 rounded-xl" />
            ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!route) {
    return (
      <div className="min-h-screen bg-[#f0f4f8] pt-16 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#2d3748] mb-2">路线不存在</h2>
          <Link to="/explore" className="text-[#276749] hover:underline">
            返回探索页
          </Link>
        </div>
      </div>
    );
  }

  const difficulty = difficultyLabels[route.difficulty] || difficultyLabels.medium;

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="pt-16">
        <div className="h-[400px] relative">
          <RouteMap
            points={route.points}
            height="400px"
            showElevationProfile
          />
          <Link
              to="/explore"
              className="absolute top-6 left-6 z-10 flex items-center gap-2 px-4 py-2 bg-white/95 backdrop-blur rounded-full shadow-lg text-[#2d3748] hover:bg-white transition-all"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>返回列表</span>
            </Link>
        </div>
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-[#2d3748]">{route.name}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${difficulty.color}`}>
                  {difficulty.text}
                </span>
              </div>
              <div className="flex items-center gap-4 text-[#718096]">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4" />
                  <span>{route.author}</span>
                </div>
                <span>·</span>
                <span>{new Date(route.createdAt).toLocaleDateString('zh-CN')}</span>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 mb-1">
                <StarRating rating={route.averageRating} size="md" />
                <span className="text-lg font-bold text-[#2d3748]">
                  {route.averageRating.toFixed(1)}
                </span>
              </div>
              <div className="text-sm text-[#718096]">
                {route.reviewCount} 条评价
              </div>
            </div>
          </div>

          <p className="text-[#4a5568] leading-relaxed">
            {route.description}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#f7fafc] rounded-xl p-6 text-center">
            <div className="text-sm text-[#718096] mb-2">总距离</div>
            <div className="flex items-center justify-center gap-2">
              <MapPin className="w-6 h-6 text-[#48bb78]" />
              <span className="text-3xl font-bold text-[#2d3748]">
                {route.distance.toFixed(1)}
              </span>
              <span className="text-lg text-[#4a5568]">公里</span>
            </div>
          </div>
          <div className="bg-[#f7fafc] rounded-xl p-6 text-center">
            <div className="text-sm text-[#718096] mb-2">预计耗时</div>
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-6 h-6 text-[#63b3ed]" />
              <span className="text-3xl font-bold text-[#2d3748]">
                {route.duration}
              </span>
            </div>
          </div>
          <div className="bg-[#f7fafc] rounded-xl p-6 text-center">
            <div className="text-sm text-[#718096] mb-2">累计爬升</div>
            <div className="flex items-center justify-center gap-2">
              <TrendingUp className="w-6 h-6 text-[#ed8936]" />
              <span className="text-3xl font-bold text-[#2d3748]">
                {route.elevationGain}
              </span>
              <span className="text-lg text-[#4a5568]">米</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-xl font-bold text-[#2d3748] mb-6">
            用户评价 <span className="text-[#718096] text-base font-normal">({route.reviewCount})</span>
          </h2>

          <form onSubmit={handleSubmitReview} className="mb-8 p-5 bg-[#f7fafc] rounded-xl">
            <h3 className="font-medium text-[#2d3748] mb-4">发表评价</h3>
            
            <div className="mb-4">
              <label className="block text-sm text-[#4a5568] mb-2">评分</label>
              <StarRating
                rating={newReviewRating}
                onRatingChange={setNewReviewRating}
                interactive
                size="lg"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-[#4a5568] mb-2">你的昵称</label>
              <input
                type="text"
                value={newReviewUsername}
                onChange={(e) => setNewReviewUsername(e.target.value)}
                placeholder="输入你的昵称"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48bb78]/50 focus:border-[#48bb78] transition-all bg-white"
                maxLength={20}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-[#4a5568] mb-2">评价内容</label>
              <div className="relative">
                <textarea
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  placeholder="分享你的体验和感受..."
                  rows={3}
                  maxLength={200}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48bb78]/50 transition-all resize-none bg-white ${
                    newReviewComment.length > 200
                      ? 'border-red-400 focus:ring-red-200'
                      : 'border-gray-200 focus:border-[#48bb78]'
                  }`}
                />
                <div className={`text-right text-xs mt-1 ${
                  newReviewComment.length > 200 ? 'text-red-500' : 'text-gray-400'
                }`}>
                  {newReviewComment.length}/200
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting || newReviewRating < 1 || !newReviewUsername.trim() || newReviewComment.length > 200}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-[#3182ce] to-[#2b6cb0] text-white rounded-lg font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              <Send className="w-4 h-4" />
              {submitting ? '提交中...' : '提交评价'}
            </button>
          </form>

          {reviewsLoading ? (
            <div className="space-y-4">
              {Array(3).fill(0).map((_, i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/4" />
                    <div className="h-4 bg-gray-100 rounded w-full" />
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-6">
              {reviews.map((review) => (
              <div
                key={review.id}
                className={`flex gap-4 pb-6 border-b border-gray-100 last:border-0 last:pb-0 transition-all duration-300 ${
                  review.id === newReviewId ? 'animate-fade-in' : ''
                }`}
                style={{
                  animation: review.id === newReviewId ? 'fadeIn 0.3s ease-out' : 'none'
                }}
              >
                <div
                  className="w-[50px] h-[50px] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                  style={{ backgroundColor: review.avatarColor }}
                >
                  {review.username.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-[#2d3748]">
                    {review.username}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(review.createdAt).toLocaleDateString('zh-CN')}
                  </span>
                </div>
                <div className="mb-2">
                  <StarRating rating={review.rating} size="sm" />
                </div>
                <p className="text-[#4a5568] text-sm leading-relaxed">
                  {review.comment}
                </p>
              </div>
            </div>
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              暂无评价，来做第一个评价的人吧！
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
