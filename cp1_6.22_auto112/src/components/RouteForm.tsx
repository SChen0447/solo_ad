import { useState } from 'react';
import { RoutePoint } from '../types';
import { createRoute, CreateRouteData } from '../services/api';
import { useNavigate } from 'react-router-dom';

interface RouteFormProps {
  points: RoutePoint[];
  onClearPoints?: () => void;
}

export default function RouteForm({ points, onClearPoints }: RouteFormProps) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [author, setAuthor] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const distance = calculateDistance(points);
  const elevationGain = calculateElevationGain(points);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('请输入路线名称');
      return;
    }

    if (points.length < 2) {
      setError('请在地图上至少添加2个点');
      return;
    }

    setSubmitting(true);

    try {
      const data: CreateRouteData = {
        name: name.trim(),
        description: description.trim(),
        duration: duration.trim() || `${Math.ceil(distance / 4)}小时`,
        difficulty,
        points: points.map(p => ({ lng: p.lng, lat: p.lat, elevation: p.elevation })),
        author: author.trim() || '匿名用户'
      };

      const route = await createRoute(data);
      navigate(`/route/${route.id}`);
    } catch (err) {
      setError('创建路线失败，请重试');
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-6 shadow-md">
      <h2 className="text-xl font-bold text-[#2d3748] mb-6">路线信息</h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm">
          {error}
        </div>
      )}

      {points.length >= 2 && (
        <div className="mb-6 p-4 bg-[#f7fafc] rounded-xl">
          <div className="text-sm text-[#718096] mb-2">自动计算</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-2xl font-bold text-[#2d3748]">{distance.toFixed(1)}</div>
              <div className="text-xs text-[#718096]">总距离 (公里)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-[#2d3748]">{elevationGain}</div>
              <div className="text-xs text-[#718096]">累计爬升 (米)</div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-[#2d3748] mb-1.5">
            路线名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="给你的路线起个名字"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48bb78]/50 focus:border-[#48bb78] transition-all"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[#2d3748] mb-1.5">
            路线描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="分享一下这条路线的特色、注意事项..."
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48bb78]/50 focus:border-[#48bb78] transition-all resize-none"
            maxLength={500}
          />
          <div className="text-right text-xs text-gray-400 mt-1">{description.length}/500</div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#2d3748] mb-1.5">
              预计耗时
            </label>
            <input
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="如：2小时30分钟"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48bb78]/50 focus:border-[#48bb78] transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2d3748] mb-1.5">
              难度等级
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48bb78]/50 focus:border-[#48bb78] transition-all bg-white"
            >
              <option value="easy">简单</option>
              <option value="medium">中等</option>
              <option value="hard">困难</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[#2d3748] mb-1.5">
            发布者昵称
          </label>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            placeholder="你的昵称"
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#48bb78]/50 focus:border-[#48bb78] transition-all"
            maxLength={20}
          />
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        {onClearPoints && (
          <button
            type="button"
            onClick={onClearPoints}
            className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-lg font-medium hover:bg-gray-50 transition-colors"
          >
            清除路径
          </button>
        )}
        <button
          type="submit"
          disabled={submitting || points.length < 2}
          className="flex-1 py-3 bg-gradient-to-r from-[#3182ce] to-[#2b6cb0] text-white rounded-lg font-medium hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-none"
        >
          {submitting ? '发布中...' : '发布路线'}
        </button>
      </div>
    </form>
  );
}

function calculateDistance(points: RoutePoint[]): number {
  if (points.length < 2) return 0;
  
  let total = 0;
  const R = 6371;
  
  for (let i = 1; i < points.length; i++) {
    const dLat = (points[i].lat - points[i-1].lat) * Math.PI / 180;
    const dLng = (points[i].lng - points[i-1].lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(points[i-1].lat * Math.PI / 180) * Math.cos(points[i].lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    total += R * c;
  }
  
  return Math.round(total * 10) / 10;
}

function calculateElevationGain(points: RoutePoint[]): number {
  let gain = 0;
  for (let i = 1; i < points.length; i++) {
    const diff = (points[i].elevation || 0) - (points[i-1].elevation || 0);
    if (diff > 0) gain += diff;
  }
  return Math.round(gain);
}
