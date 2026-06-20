import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { userApi } from '../api';
import { useAuth } from '../context/AuthContext';

function RegisterPage() {
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [availableTime, setAvailableTime] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleAddSkill = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && skillInput.trim()) {
      e.preventDefault();
      if (!skills.includes(skillInput.trim())) {
        setSkills([...skills, skillInput.trim()]);
      }
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nickname || !email || !password) {
      setError('请填写必填项');
      return;
    }

    if (password !== confirmPassword) {
      setError('两次密码输入不一致');
      return;
    }

    if (password.length < 6) {
      setError('密码至少6位');
      return;
    }

    setLoading(true);
    try {
      const user = await userApi.register({
        nickname,
        email,
        password,
        skills,
        availableTime,
      });
      login(user);
      navigate('/profile');
    } catch (err: any) {
      setError(err.message || '注册失败');
    } finally {
      setLoading(false);
    }
  };

  const timeOptions = [
    '工作日全天',
    '工作日晚上',
    '周末全天',
    '周末上午',
    '周末下午',
    '灵活安排',
  ];

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-icon">❤</div>
          <h1 className="auth-title">加入我们</h1>
          <p className="auth-subtitle">成为一名光荣的志愿者</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">昵称 *</label>
            <input
              type="text"
              className={`form-input ${error && !nickname ? 'form-input-error' : ''}`}
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="请输入您的昵称"
            />
          </div>

          <div className="form-group">
            <label className="form-label">邮箱 *</label>
            <input
              type="email"
              className={`form-input ${error ? 'form-input-error' : ''}`}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入您的邮箱"
            />
          </div>

          <div className="form-group">
            <label className="form-label">密码 *</label>
            <input
              type="password"
              className={`form-input ${error ? 'form-input-error' : ''}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入密码（至少6位）"
            />
          </div>

          <div className="form-group">
            <label className="form-label">确认密码 *</label>
            <input
              type="password"
              className={`form-input ${error ? 'form-input-error' : ''}`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="请再次输入密码"
            />
            {error && <div className="form-error">{error}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">技能标签</label>
            <div className="skills-input" onClick={(e) => {
              const input = e.currentTarget.querySelector('input');
              input?.focus();
            }}>
              {skills.map((skill) => (
                <span key={skill} className="skill-tag">
                  {skill}
                  <button
                    type="button"
                    className="skill-tag-remove"
                    onClick={() => handleRemoveSkill(skill)}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleAddSkill}
                placeholder={skills.length === 0 ? '输入后按回车添加' : ''}
              />
            </div>
            <div style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '6px' }}>
              例如：教学、医疗、设计、摄影等
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">可服务时段</label>
            <select
              className="form-select"
              value={availableTime}
              onChange={(e) => setAvailableTime(e.target.value)}
            >
              <option value="">请选择</option>
              {timeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={loading}
          >
            {loading ? '注册中...' : '立即注册'}
          </button>
        </form>

        <div className="auth-footer">
          已有账号？ <Link to="/login">立即登录</Link>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;
