import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api';
import { useAuthStore } from '../store';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!form.email || !form.password) {
      setError('请填写邮箱和密码');
      return;
    }

    setLoading(true);
    try {
      const res = await userApi.login(form);
      if (res.success && res.data) {
        setUser(res.data);
        navigate(res.data.isAdmin ? '/admin/activity' : '/profile');
      } else {
        setError(res.message || '登录失败');
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
        <h1 className="text-xl font-bold text-gray-800 mb-6 text-center">登录</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">邮箱</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full input-focus-ring border"
              placeholder="请输入邮箱"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full input-focus-ring border"
              placeholder="请输入密码"
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
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-4">
          还没有账号？
          <a href="/register" className="text-amber-600 hover:underline ml-1">立即注册</a>
        </p>

        <div className="mt-6 p-3 bg-amber-50 rounded-lg text-xs text-gray-500">
          <p className="font-medium text-amber-700 mb-1">测试账号：</p>
          <p>管理员：admin@example.com / admin123</p>
          <p>志愿者：liziyuan@example.com / 123456</p>
        </div>
      </div>
    </div>
  );
}
