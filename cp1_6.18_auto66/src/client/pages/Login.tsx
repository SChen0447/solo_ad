import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link, Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, isAuthenticated } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      toast.success('登录成功！');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '登录失败');
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <Helmet>
        <title>登录 - 虚拟商品二手交易平台</title>
      </Helmet>

      <div className="auth-page">
        <div className="auth-container">
          <div className="auth-header">
            <h2>欢迎回来</h2>
            <p>登录您的账号继续购物</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="email">邮箱</label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="请输入邮箱"
                required
                autoComplete="email"
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">密码</label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? '登录中...' : '登录'}
            </button>
          </form>

          <div className="auth-footer">
            <p>还没有账号？ <Link to="/register">立即注册</Link></p>
          </div>
        </div>
      </div>
    </>
  );
};
