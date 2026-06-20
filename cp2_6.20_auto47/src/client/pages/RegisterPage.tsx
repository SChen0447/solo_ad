import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api';
import { useAuthStore } from '../store';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [form, setForm] = useState({
    nickname: '',
    email: '',
    password: '',
    confirmPassword: '',
    skills: '',
    availableTime: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.nickname || !form.email || !form.password) {
      setError('请填写必填字段');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('两次密码不一致');
      return;
    }

    if (form.password.length < 6) {
      setError('密码至少6位');
      return;
    }

    setLoading(true);
    try {
      const res = await userApi.register({
        nickname: form.nickname,
        email: form.email,
        password: form.password,
        skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
        availableTime: form.availableTime,
      });

      if (res.success && res.data) {
        setUser(res.data);
        navigate('/profile');
      } else {
        setError(res.message || '注册失败');
      }
    } catch (e) {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white rounded-[10px] shadow-sm p-6 animate-fade-up">
        <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">志愿者注册</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              昵称 <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={form.nickname}
              onChange={e => setForm({ ...form, nickname: e.target.value })}
              className="w-full input-focus-ring border"
              placeholder="请输入昵称"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              邮箱 <span className="text-red-400">*</span>
            </label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full input-focus-ring border"
              placeholder="请输入邮箱"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              密码 <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full input-focus-ring border"
              placeholder="至少6位"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              确认密码 <span className="text-red-400">*</span>
            </label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full input-focus-ring border"
              placeholder="再次输入密码"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">技能标签</label>
            <input
              type="text"
              value={form.skills}
              onChange={e => setForm({ ...form, skills: e.target.value })}
              className="w-full input-focus-ring border"
              placeholder="如：陪护, 教学, 搬运（逗号分隔）"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">可服务时段</label>
            <input
              type="text"
              value={form.availableTime}
              onChange={e => setForm({ ...form, availableTime: e.target.value })}
              className="w-full input-focus-ring border"
              placeholder="如：周末全天"
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
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
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          已有账号？
          <a href="/login" className="text-amber-600 hover:underline ml-1">立即登录</a>
        </p>
      </div>
    </div>
  );
}
