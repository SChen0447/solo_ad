import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { User, UserChallenge, ChallengeStats, Group, CheckIn } from '../types';

interface Props {
  currentUser: User | null;
}

const Star = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="#facc15"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
);

export default function ProfilePage({ currentUser }: Props) {
  const navigate = useNavigate();
  const [challenges, setChallenges] = useState<UserChallenge[]>([]);
  const [cStats, setCStats] = useState<ChallengeStats>({ wins: 0, losses: 0, total: 0 });
  const [userGroups, setUserGroups] = useState<Group[]>([]);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [tab, setTab] = useState<'groups' | 'challenges' | 'checkins'>('groups');

  useEffect(() => {
    if (!currentUser) return;
    (async () => {
      const [chalData, allGroups, userCIs] = await Promise.all([
        api.fetchUserChallenges(currentUser.id),
        api.fetchGroups(),
        api.fetchUserCheckIns(currentUser.id),
      ]);
      setChallenges(chalData.challenges);
      setCStats(chalData.stats);
      setUserGroups(allGroups.filter((g) => currentUser.groups.includes(g.id)));
      setCheckIns(userCIs);
    })();
  }, [currentUser]);

  if (!currentUser) return <div className="loading">加载中...</div>;

  return (
    <div className="page">
      <button className="btn back-btn" onClick={() => navigate(-1)}>← 返回</button>

      <div className="profile-header card">
        <img src={currentUser.avatar} alt={currentUser.name} className="profile-avatar" />
        <div className="profile-info">
          <h1>{currentUser.name}</h1>
          <div className="profile-stats">
            <div className="stat-item">
              <div className="stat-value">{currentUser.totalPoints}</div>
              <div className="stat-label">总积分</div>
            </div>
            <div className="stat-item">
              <div className="stat-value star-stat">
                <Star /> <span>{currentUser.continuousDays}</span>
              </div>
              <div className="stat-label">连续打卡</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{cStats.wins} / {cStats.total}</div>
              <div className="stat-label">挑战胜/总数</div>
            </div>
          </div>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'groups' ? 'active' : ''}`} onClick={() => setTab('groups')}>
          加入的小组 ({userGroups.length})
        </button>
        <button className={`tab-btn ${tab === 'challenges' ? 'active' : ''}`} onClick={() => setTab('challenges')}>
          挑战记录 ({challenges.length})
        </button>
        <button className={`tab-btn ${tab === 'checkins' ? 'active' : ''}`} onClick={() => setTab('checkins')}>
          打卡历史 ({checkIns.length})
        </button>
      </div>

      {tab === 'groups' && (
        <div className="card-list">
          {userGroups.length === 0 && <div className="empty-feed">还未加入任何小组</div>}
          {userGroups.map((g) => (
            <div
              key={g.id}
              className="list-item"
              onClick={() => navigate(`/group/${g.id}`)}
            >
              <div>
                <div className="item-title">{g.name}</div>
                <div className="item-sub">🎯 {g.goal} · {g.memberCount}人</div>
              </div>
              <button className="btn btn-secondary">进入</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'challenges' && (
        <div className="card-list">
          {challenges.length === 0 && <div className="empty-feed">暂无挑战记录</div>}
          {challenges.map((c) => (
            <div key={c.id} className="challenge-history">
              <div className="challenge-history-left">
                <div className="ch-title">{c.title}</div>
                <div className="ch-meta">
                  进度: {c.progress}/{c.targetCount} · 投入{c.pointsInvested}分 ·
                  {c.rewards > 0 && <span className="reward-badge-inline">+{c.rewards}分</span>}
                </div>
              </div>
              <div className="challenge-history-right">
                <span className={`ch-status ${c.status}`}>
                  {c.status === 'active' ? '进行中' : c.status === 'completed' ? (c.won ? '胜利 🎉' : '参与') : '待开始'}
                </span>
                <div className="ch-rank">排名 #{c.rank}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'checkins' && (
        <div className="card-list">
          {checkIns.length === 0 && <div className="empty-feed">暂无打卡记录</div>}
          {checkIns.map((ci) => (
            <div key={ci.id} className="checkin-history">
              <div className="ci-date">
                {new Date(ci.createdAt).toLocaleDateString('zh-CN')}
              </div>
              <div className="ci-content">
                <div className="ci-text">{ci.text}</div>
                <div className="ci-meta">
                  <span>{ci.groupName}</span>
                  {ci.pointsEarned > 0 && <span className="points-badge-sm">+{ci.pointsEarned}分</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
