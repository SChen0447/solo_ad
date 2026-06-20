import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { activityApi } from '../api';
import { useAuthStore } from '../store';

export default function AdminActivityPage() {
  const navigate = useNavigate();
  const { user, isLoggedIn } = useAuthStore();
  const [form, setForm] = useState({
    name: '',
    location: '',
    dateTime: '',
    maxParticipants: 10,
    description: '',
    skillRequirements: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!isLoggedIn || !user?.isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <div className="bg-white rounded-[10px] shadow-sm p-8 animate-fade-up">
          <p className="text-gray-500">您没有管理员权限</p>
          <a href="/login" className="text-amber-600 hover:underline text-sm mt-2 inline-block">
            前往登录
          </a>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!form.name || !form.location || !form.dateTime || !form.maxParticipants) {
      setError('请填写必填字段');
      return;
    }

    setLoading(true);
    try {
      const res = await activityApi.create({
        name: form.name,
        location: form.location,
        dateTime: form.dateTime,
        maxParticipants: form.maxParticipants,
        description: form.description,
        skillRequirements: form.skillRequirements
          ? form.skillRequirements.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      });

      if (res.success) {
        setSuccess(true);
        setForm({
          name: '',
          location: '',
          dateTime: '',
          maxParticipants: 10,
          description: '',
          skillRequirements: '',
        });
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(res.message || '发布失败');
      }
    } catch (e) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-[10px] shadow-sm p-6 animate-fade-up">
        <h1 className="text-xl font-bold text-gray-800 mb-6">发布新活动</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              活动名称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full input-focus-ring border"
              placeholder="请输入活动名称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              活动地点 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.location}
              onChange={e => setForm({ ...form, location: e.target.value })}
              className="w-full input-focus-ring border"
              placeholder="请输入活动地点"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              活动时间 <span className="text-red-400">*</span>
            </label>
            <input
              type="datetime-local"
              value={form.dateTime}
              onChange={e => setForm({ ...form, dateTime: e.target.value.replace('T', ' ') })}
              className="w-full input-focus-ring border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              招募人数上限 <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.maxParticipants}
              onChange={e => setForm({ ...form, maxParticipants: parseInt(e.target.value) || 1 })}
              className="w-full input-focus-ring border"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">活动描述</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={4}
              className="w-full input-focus-ring border resize-none"
              placeholder="请输入活动描述"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">技能要求</label>
            <input
              type="text"
              value={form.skillRequirements}
              onChange={e => setForm({ ...form, skillRequirements: e.target.value })}
              className="w-full input-focus-ring border"
              placeholder="如：沟通能力, 耐心（逗号分隔）"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && (
            <p className="text-sm text-green-600 animate-fade-up">🎉 活动发布成功！</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
            style={{
              background: 'linear-gradient(135deg, #F59E0B, #D97706)',
              borderRadius: '8px',
            }}
          >
            {loading ? '发布中...' : '发布活动'}
          </button>
        </form>
      </div>
    </div>
  );
}
