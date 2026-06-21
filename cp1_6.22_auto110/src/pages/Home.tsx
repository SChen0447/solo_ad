import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Team } from '../types';
import MatchCard from '../components/MatchCard';

const Home: React.FC = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/teams');
      const data = await response.json();
      setTeams(data);
    } catch (error) {
      console.error('获取小队列表失败:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleJoin = (teamId: string) => {
    navigate(`/room/${teamId}`);
  };

  return (
    <div className="home-container">
      <header className="navbar">
        <div className="navbar-content">
          <h1 className="logo">🎯 校园搭子</h1>
          <p className="subtitle">找到你的兴趣伙伴，一起组队出发！</p>
        </div>
      </header>

      <main className="main-content">
        {loading ? (
          <div className="teams-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton-card skeleton-pulse"></div>
            ))}
          </div>
        ) : teams.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🚀</div>
            <h2>还没有小队</h2>
            <p>成为第一个创建小队的人吧！</p>
          </div>
        ) : (
          <div className="teams-grid">
            {teams.map((team, index) => (
              <MatchCard
                key={team.id}
                team={team}
                onJoin={handleJoin}
                index={index}
              />
            ))}
          </div>
        )}
      </main>

      <Link to="/create" className="fab-create">
        <span className="fab-icon">+</span>
        <span className="fab-text">创建小队</span>
      </Link>
    </div>
  );
};

export default Home;
