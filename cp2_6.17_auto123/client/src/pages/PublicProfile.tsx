import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { addExchange } from '../services/api';
import type { User } from '../types';

function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exchanging, setExchanging] = useState(false);

  useEffect(() => {
    if (userId) {
      document.title = `${profile?.name || '名片'} - 数字名片`;
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', `${profile?.name || ''} ${profile?.position || ''} ${profile?.company || ''} 的数字名片`);
      }
    }

    return () => {
      document.title = '数字名片';
    };
  }, [userId, profile]);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  const loadProfile = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getProfile(userId!);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  };

  const handleExchange = async () => {
    if (!user || !profile) return;

    if (user.id === profile.id) {
      showToast('这是你自己的名片', 'error');
      return;
    }

    setExchanging(true);
    try {
      await addExchange(user.id, profile.id);
      showToast('名片交换成功！');
    } catch (error) {
      showToast(error instanceof Error ? error.message : '交换失败', 'error');
    } finally {
      setExchanging(false);
    }
  };

  if (loading) {
    return (
      <div className="public-profile-page loading-page">
        <div className="loading-spinner">
          <i className="fas fa-spinner fa-spin"></i>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="public-profile-page error-page">
        <div className="error-card card">
          <i className="fas fa-exclamation-circle"></i>
          <h2>名片不存在</h2>
          <p>{error || '无法找到该名片'}</p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            返回首页
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="public-profile-page">
      <div className="profile-card card">
        <div className="profile-card-header">
          <div className="profile-avatar-large">
            {profile.avatarUrl ? (
              <img src={profile.avatarUrl} alt={profile.name} />
            ) : (
              <div className="avatar-fallback-large">
                {profile.name.charAt(0) || '?'}
              </div>
            )}
          </div>
          <h1 className="profile-name">{profile.name || '未命名'}</h1>
          <p className="profile-position">{profile.position || '—'}</p>
          <p className="profile-company">{profile.company || '—'}</p>
        </div>

        <div className="profile-card-body">
          {profile.email && (
            <a href={`mailto:${profile.email}`} className="contact-item">
              <i className="fas fa-envelope"></i>
              <span>{profile.email}</span>
            </a>
          )}
          {profile.phone && (
            <a href={`tel:${profile.phone}`} className="contact-item">
              <i className="fas fa-phone"></i>
              <span>{profile.phone}</span>
            </a>
          )}
        </div>

        <div className="profile-card-social">
          {profile.socialLinks?.wechat && (
            <div className="social-item" title={`微信: ${profile.socialLinks.wechat}`}>
              <i className="fab fa-weixin"></i>
            </div>
          )}
          {profile.socialLinks?.linkedin && (
            <a href={profile.socialLinks.linkedin} target="_blank" rel="noopener noreferrer" className="social-item">
              <i className="fab fa-linkedin"></i>
            </a>
          )}
          {profile.socialLinks?.twitter && (
            <a href={`https://twitter.com/${profile.socialLinks.twitter}`} target="_blank" rel="noopener noreferrer" className="social-item">
              <i className="fab fa-twitter"></i>
            </a>
          )}
          {profile.socialLinks?.github && (
            <a href={`https://github.com/${profile.socialLinks.github}`} target="_blank" rel="noopener noreferrer" className="social-item">
              <i className="fab fa-github"></i>
            </a>
          )}
        </div>

        {user && user.id !== profile.id && (
          <div className="profile-card-actions">
            <button className="btn-primary btn-full" onClick={handleExchange} disabled={exchanging}>
              {exchanging ? '交换中...' : '交换名片'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PublicProfile;
