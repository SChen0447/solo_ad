import React from 'react';
import { useApp } from '../context/AppContext';
import '../styles/dashboard.css';

const Dashboard: React.FC = () => {
  const { state } = useApp();

  const totalArtists = state.artists.length;
  const totalWorks = state.artists.reduce((sum, a) => sum + a.works.length, 0);
  const totalPerformances = state.performances.length;

  const upcomingReleases = state.artists
    .flatMap(a => a.works.map(w => ({ ...w, artistName: a.name })))
    .filter(w => new Date(w.releaseDate) > new Date())
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate))
    .slice(0, 5);

  const upcomingPerformances = state.performances
    .filter(p => new Date(p.date) >= new Date())
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time))
    .slice(0, 5);

  const getArtistName = (artistId: string) => {
    return state.artists.find(a => a.id === artistId)?.name || '未知';
  };

  const stats = [
    { label: '签约艺术家', value: totalArtists, icon: '🎤', color: '#6c63ff' },
    { label: '作品总数', value: totalWorks, icon: '🎵', color: '#4ade80' },
    { label: '演出场次', value: totalPerformances, icon: '🎫', color: '#fbbf24' },
    { label: '音乐风格', value: 10, icon: '🎸', color: '#f472b6' },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1 className="page-title">数据概览</h1>
      </div>

      <div className="stats-grid">
        {stats.map(stat => (
          <div key={stat.label} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}20`, color: stat.color }}>
              {stat.icon}
            </div>
            <div className="stat-info">
              <div className="stat-number">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <h2 className="section-title">即将发布</h2>
          <div className="section-content">
            {upcomingReleases.length === 0 ? (
              <div className="empty-mini">暂无即将发布的作品</div>
            ) : (
              upcomingReleases.map(work => (
                <div key={work.id} className="release-item">
                  <span className="release-icon">🎵</span>
                  <div className="release-info">
                    <span className="release-name">{work.name}</span>
                    <span className="release-artist">{work.artistName}</span>
                  </div>
                  <span className="release-date">{work.releaseDate}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="dashboard-section">
          <h2 className="section-title">近期演出</h2>
          <div className="section-content">
            {upcomingPerformances.length === 0 ? (
              <div className="empty-mini">暂无近期演出</div>
            ) : (
              upcomingPerformances.map(perf => (
                <div key={perf.id} className="perf-item">
                  <div className="perf-date-mini">
                    <span className="day">{new Date(perf.date).getDate()}</span>
                    <span className="month">{perf.date.slice(5, 7)}月</span>
                  </div>
                  <div className="perf-info-mini">
                    <span className="perf-artist-mini">{getArtistName(perf.artistId)}</span>
                    <span className="perf-venue-mini">{perf.venue} · {perf.time}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
