import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, GraduationCap } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { login, loading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || '登录失败，请检查邮箱和密码');
    }
  };

  return (
    <div className="auth-page">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="auth-container"
      >
        <div className="auth-header">
          <div className="auth-logo">
            <GraduationCap size={40} className="logo-icon" />
          </div>
          <h1 className="auth-title">LearnFlow</h1>
          <p className="auth-subtitle">智能学习助手，让学习更高效</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className={`form-group ${emailFocused || email ? 'focused' : ''}`}>
            <Mail size={18} className="form-icon" />
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
              required
              className="form-input"
            />
            <label htmlFor="email" className="form-label">邮箱地址</label>
          </div>

          <div className={`form-group ${passwordFocused || password ? 'focused' : ''}`}>
            <Lock size={18} className="form-icon" />
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => setPasswordFocused(false)}
              required
              className="form-input"
            />
            <label htmlFor="password" className="form-label">密码</label>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="auth-error"
            >
              {error}
            </motion.div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-block"
          >
            {loading ? (
              <Loader2 size={20} className="spinner" />
            ) : (
              '登录'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            还没有账号？{' '}
            <Link to="/register" className="auth-link">
              立即注册
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
