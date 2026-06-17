import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username || !password) {
      showToast('请填写用户名和密码', 'error');
      return;
    }

    if (password !== confirmPassword) {
      showToast('两次密码输入不一致', 'error');
      return;
    }

    if (password.length < 6) {
      showToast('密码长度至少6位', 'error');
      return;
    }

    setLoading(true);
    try {
      const user = await register(username, password);
      login(user);
      showToast('注册成功');
      navigate('/profile');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '注册失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">
            <i className="fas fa-address-card"></i>
          </div>
          <h1>数字名片</h1>
          <p>创建您的专属数字名片</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="请输入用户名"
            />
          </div>

          <div className="form-group">
            <label>密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码（至少6位）"
            />
          </div>

          <div className="form-group">
            <label>确认密码</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入密码"
            />
          </div>

          <button type="submit" className="btn-primary btn-full" disabled={loading}>
            {loading ? '注册中...' : '注册'}
          </button>
        </form>

        <div className="auth-footer">
          已有账号？<Link to="/login">立即登录</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;
