import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import BookShelf from './pages/BookShelf';
import Reader from './pages/Reader';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || (isRegister ? '注册失败' : '登录失败'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center mb-6 text-text-light">
          {isRegister ? '注册账户' : '读者工作台'}
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-light mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-stroke text-text-light focus:outline-none focus:border-primary"
              placeholder="请输入邮箱"
            />
          </div>
          <div>
            <label className="block text-sm text-text-light mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg bg-white/5 border border-stroke text-text-light focus:outline-none focus:border-primary"
              placeholder="请输入密码"
            />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? '处理中...' : (isRegister ? '注册' : '登录')}
          </button>
        </form>
        <button
          onClick={() => setIsRegister(!isRegister)}
          className="w-full mt-4 text-sm text-primary hover:underline"
        >
          {isRegister ? '已有账户？去登录' : '没有账户？去注册'}
        </button>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-text-light">加载中...</div>;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={isAuthenticated ? <BookShelf /> : <Navigate to="/login" replace />}
      />
      <Route
        path="/reader/:id"
        element={isAuthenticated ? <Reader /> : <Navigate to="/login" replace />}
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
