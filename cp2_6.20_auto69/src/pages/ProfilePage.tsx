import React, { useState, useEffect, useMemo } from 'react';
import { User, Post } from '../types';
import { getUser, getPosts } from '../api';

const ProgressRing: React.FC<{ value: number; max: number; label: string; color: string; suffix?: string }> = ({ value, max, label, color, suffix = '' }) => {
  const [animatedValue, setAnimatedValue] = useState(0);
  const percentage = Math.min((animatedValue / max) * 100, 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 50);
    return () => clearTimeout(timer);
  }, [value]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={100} height={100} viewBox="0 0 100 100">
        <circle cx={50} cy={50} r={radius} fill="none" stroke="#E8F5E9" strokeWidth={6} />
        <circle
          cx={50} cy={50} r={radius} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 50 50)"
          style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
        />
        <text x={50} y={50} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={600} fill={color}>
          {animatedValue}{suffix}
        </text>
      </svg>
      <span style={{ fontSize: 12, color: '#666' }}>{label}</span>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);

  useEffect(() => {
    getUser().then(setUser).catch(console.error);
    getPosts().then(posts => setSavedPosts(posts.filter(p => p.saved))).catch(console.error);
  }, []);

  const stats = useMemo(() => {
    if (!user) return { totalPlants: 0, healthIndex: 0, careDays: 0 };
    return user.stats;
  }, [user]);

  const levelColors = useMemo(() => {
    if (!user) return { from: '#CD7F32', to: '#FFD700' };
    const level = user.level;
    if (level <= 1) return { from: '#CD7F32', to: '#B87333' };
    if (level <= 3) return { from: '#CD7F32', to: '#FFD700' };
    return { from: '#FFD700', to: '#FFF8E1' };
  }, [user]);

  if (!user) return <div style={{ padding: 16, color: '#999' }}>加载中...</div>;

  return (
    <div style={{ padding: 16 }}>
      <div style={{
        borderRadius: 12, padding: 24,
        background: 'linear-gradient(135deg, #E8F5E9, #FFFFFF)',
        display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          backgroundImage: `url(${user.avatar})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          backgroundColor: '#C8E6C9',
          border: `3px solid transparent`,
          backgroundImage: `url(${user.avatar}), linear-gradient(${levelColors.from}, ${levelColors.to})`,
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }} />
        <div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#2E7D32' }}>{user.name}</div>
          <div style={{ fontSize: 13, color: '#666', marginTop: 4 }}>{user.email}</div>
          <div style={{
            display: 'inline-block', marginTop: 6, padding: '2px 10px',
            borderRadius: 10, fontSize: 11,
            background: `linear-gradient(135deg, ${levelColors.from}, ${levelColors.to})`,
            color: '#fff', fontWeight: 500,
          }}>
            Lv.{user.level} 花艺师
          </div>
        </div>
      </div>

      <div style={{
        background: '#fff', borderRadius: 12, padding: 20, marginBottom: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <h4 style={{ color: '#333', marginBottom: 16 }}>植物统计</h4>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <ProgressRing value={stats.totalPlants} max={20} label="植物总数" color="#43A047" />
          <ProgressRing value={stats.healthIndex} max={100} label="健康指数" color="#42A5F5" suffix="%" />
          <ProgressRing value={stats.careDays} max={365} label="养护天数" color="#FF9800" />
        </div>
      </div>

      <div style={{
        background: '#fff', borderRadius: 12, padding: 20,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        <h4 style={{ color: '#333', marginBottom: 12 }}>我的收藏</h4>
        {savedPosts.length === 0 && (
          <div style={{ fontSize: 13, color: '#999', textAlign: 'center', padding: 20 }}>暂无收藏帖子</div>
        )}
        {savedPosts.map(post => (
          <div key={post.id} style={{
            padding: '10px 0', borderBottom: '1px solid #f0f0f0',
            fontSize: 13, color: '#555', lineHeight: 1.5,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}>
            <div style={{ fontWeight: 500, color: '#333', marginBottom: 4 }}>{post.author}</div>
            {post.content}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProfilePage;
