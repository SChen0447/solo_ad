import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api';
import type { GroupDetail, User, Challenge } from '../types';
import CheckInFeed from '../components/CheckInFeed';

interface Props {
  currentUser: User | null;
  onUserUpdate: (u: User) => void;
}

const TrophyGold = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="#fbbf24"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
);
const TrophySilver = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="#d1d5db"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
);
const TrophyBronze = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="#d97706"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
);
const Star = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="#facc15"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg>
);

export default function GroupPage({ currentUser, onUserUpdate }: Props) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [newCheckInId, setNewCheckInId] = useState<string | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [cTitle, setCTitle] = useState('');
  const [cDesc, setCDesc] = useState('');
  const [cTarget, setCTarget] = useState(100);
  const [cDays, setCDays] = useState(3);

  const loadGroup = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api.fetchGroup(id);
      setGroup(data);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const isMember = currentUser && group?.members.some((m) => m.id === currentUser.id);
  const isLeader = !!(currentUser && group?.members.some((m) => m.id === currentUser.id && m.isLeader));

  const handleJoinGroup = async () => {
    if (!id || !currentUser) return;
    await api.joinGroup(id, currentUser.id);
    const updated = await api.getUser(currentUser.id);
    onUserUpdate(updated);
    loadGroup();
  };

  const handleCheckIn = async () => {
    if (!id || !currentUser || !text.trim()) return;
    const res = await api.postCheckIn({
      userId: currentUser.id,
      groupId: id,
      text: text.trim(),
      imageUrl: imageUrl.trim() || undefined,
    });
    setNewCheckInId(res.checkIn.id);
    setTimeout(() => setNewCheckInId(null), 600);
    setText('');
    setImageUrl('');
    setGroup((prev) => prev ? {
      ...prev,
      checkIns: [res.checkIn, ...prev.checkIns],
    } : prev);
    const updated = await api.getUser(currentUser.id);
    onUserUpdate(updated);
    setTimeout(loadGroup, 0);
  };

  const handleCreateChallenge = async () => {
    if (!id || !currentUser || !cTitle.trim()) return;
    await api.createChallenge({
      groupId: id,
      leaderId: currentUser.id,
      title: cTitle.trim(),
      description: cDesc.trim(),
      targetCount: cTarget,
      durationDays: cDays,
    });
    setShowChallengeModal(false);
    setCTitle('');
    setCDesc('');
    setCTarget(100);
    setCDays(3);
    loadGroup();
  };

  const handleJoinChallenge = async (challengeId: string) => {
    if (!currentUser) return;
    const res = await api.joinChallenge(challengeId, currentUser.id);
    onUserUpdate(res.user);
    loadGroup();
  };

  const handleUpdateProgress = async (challengeId: string, delta: number) => {
    if (!currentUser) return;
    await api.updateProgress(challengeId, currentUser.id, delta);
    loadGroup();
  };

  const handleCompleteChallenge = async (challengeId: string) => {
    const res = await api.completeChallenge(challengeId);
    loadGroup();
    if (currentUser) {
      const updated = await api.getUser(currentUser.id);
      onUserUpdate(updated);
    }
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (!group) return <div className="loading">小组不存在</div>;

  return (
    <div className="page">
      <button className="btn back-btn" onClick={() => navigate(-1)}>← 返回</button>

      <div className="group-detail-header">
        <div>
          <h1>{group.name}</h1>
          <p className="page-sub">🎯 {group.goal}</p>
        </div>
        {!isMember && (
          <button className="btn btn-primary" onClick={handleJoinGroup}>加入小组</button>
        )}
        {isLeader && (
          <button className="btn btn-secondary" onClick={() => setShowChallengeModal(true)}>
            发起挑战
          </button>
        )}
      </div>

      <div className="group-layout">
        <div className="group-main">
          {isMember && (
            <div className="checkin-form card">
              <div className="form-group">
                <textarea
                  className="input textarea"
                  placeholder="分享今天的学习收获..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                />
              </div>
              <div className="form-group">
                <input
                  type="text"
                  className="input"
                  placeholder="图片URL（可选）"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                />
              </div>
              <div className="checkin-form-actions">
                <div className="continuous-info">
                  <Star />
                  <span>连续打卡 {currentUser?.continuousDays || 0} 天</span>
                </div>
                <button className="btn btn-primary" onClick={handleCheckIn} disabled={!text.trim()}>
                  打卡
                </button>
              </div>
            </div>
          )}

          <div className="section-title">📰 打卡动态</div>
          <CheckInFeed checkIns={group.checkIns} newCheckInId={newCheckInId} />

          {group.challenges.length > 0 && (
            <>
              <div className="section-title">🏆 组内挑战</div>
              <div className="challenges-list">
                {group.challenges.map((ch) => (
                  <ChallengeCard
                    key={ch.id}
                    challenge={ch}
                    currentUser={currentUser}
                    isLeader={isLeader}
                    onJoin={() => handleJoinChallenge(ch.id)}
                    onProgress={(d) => handleUpdateProgress(ch.id, d)}
                    onComplete={() => handleCompleteChallenge(ch.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        <div className="group-sidebar">
          <div className="card">
            <div className="section-title">👥 成员 ({group.members.length})</div>
            <div className="members-list">
              {group.members.map((m) => (
                <div key={m.id} className="member-item">
                  <div className="avatar-wrap">
                    <img src={m.avatar} alt={m.name} className="avatar" />
                    {m.online && <span className="online-dot" />}
                  </div>
                  <div className="member-info">
                    <div className="member-name">
                      {m.name} {m.isLeader && <span className="leader-tag">组长</span>}
                    </div>
                    <div className="member-points">{m.totalPoints}分</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="section-title">🏆 积分排行榜</div>
            <div className="leaderboard-list">
              {group.leaderboard?.map((entry, i) => (
                <div key={entry.userId} className="leaderboard-item">
                  <div className="rank">
                    {i === 0 && <TrophyGold />}
                    {i === 1 && <TrophySilver />}
                    {i === 2 && <TrophyBronze />}
                    <span className="rank-num">{i + 1}</span>
                  </div>
                  <img src={entry.avatar} alt="" className="mini-avatar" />
                  <span className="lb-name">{entry.name}</span>
                  <span className="lb-points">{entry.points}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showChallengeModal && (
        <div className="modal-overlay" onClick={() => setShowChallengeModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>发起学习挑战</h3>
            <div className="form-group"><label>挑战标题</label>
              <input className="input" value={cTitle} onChange={(e) => setCTitle(e.target.value)} placeholder="如：三天刷100道LeetCode" />
            </div>
            <div className="form-group"><label>描述</label>
              <input className="input" value={cDesc} onChange={(e) => setCDesc(e.target.value)} placeholder="描述挑战内容" />
            </div>
            <div className="form-row">
              <div className="form-group"><label>目标数量</label>
                <input type="number" className="input" value={cTarget} onChange={(e) => setCTarget(+e.target.value)} />
              </div>
              <div className="form-group"><label>持续天数</label>
                <input type="number" className="input" value={cDays} onChange={(e) => setCDays(+e.target.value)} />
              </div>
            </div>
            <div className="form-hint">每位参与者需投入 10 分，挑战结束后按完成情况分配积分池</div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setShowChallengeModal(false)}>取消</button>
              <button className="btn btn-primary" onClick={handleCreateChallenge}>发起</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ChallengeCardProps {
  challenge: Challenge;
  currentUser: User | null;
  isLeader?: boolean;
  onJoin: () => void;
  onProgress: (delta: number) => void;
  onComplete: () => void;
}

function ChallengeCard({ challenge, currentUser, isLeader, onJoin, onProgress, onComplete }: ChallengeCardProps) {
  const participant = currentUser ? challenge.participants.find((p) => p.userId === currentUser.id) : null;
  const sorted = [...challenge.participants].sort((a, b) => b.progress - a.progress);

  const statusColor = challenge.status === 'active' ? '#38bdf8' : challenge.status === 'completed' ? '#4ade80' : '#fbbf24';
  const statusText = challenge.status === 'active' ? '进行中' : challenge.status === 'completed' ? '已结束' : '待开始';

  return (
    <div className="challenge-card">
      <div className="challenge-header">
        <div>
          <div className="challenge-title">{challenge.title}</div>
          <div className="challenge-desc">{challenge.description}</div>
        </div>
        <span className="challenge-status" style={{ background: statusColor }}>{statusText}</span>
      </div>
      <div className="challenge-meta">
        <span>目标: {challenge.targetCount}</span>
        <span>积分池: {challenge.poolPoints}分</span>
        <span>截止: {new Date(challenge.endDate).toLocaleDateString('zh-CN')}</span>
      </div>
      {sorted.length > 0 && (
        <div className="challenge-participants">
          {sorted.map((p, i) => {
            const pct = Math.min(100, (p.progress / challenge.targetCount) * 100);
            const isMe = currentUser && p.userId === currentUser.id;
            return (
              <div key={p.userId} className={`challenge-participant ${isMe ? 'is-me' : ''}`}>
                <div className="participant-left">
                  <img src={p.avatar} alt="" className="mini-avatar" />
                  <span className="lb-name">
                    {p.name} {isMe && '(我)'}
                  </span>
                  {p.rewards > 0 && <span className="reward-badge">+{p.rewards}分</span>}
                </div>
                <div className="participant-right">
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="progress-text">{p.progress}/{challenge.targetCount}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {!participant && challenge.status === 'active' && (
        <button className="btn btn-primary btn-block" onClick={onJoin}>加入挑战 (投入10分)</button>
      )}
      {participant && challenge.status === 'active' && (
        <div className="challenge-progress-actions">
          <button className="btn" onClick={() => onProgress(-5)}>-5</button>
          <button className="btn btn-secondary" onClick={() => onProgress(-1)}>-1</button>
          <span className="progress-current">{participant.progress}</span>
          <button className="btn btn-secondary" onClick={() => onProgress(1)}>+1</button>
          <button className="btn btn-primary" onClick={() => onProgress(5)}>+5</button>
        </div>
      )}
      {isLeader && challenge.status === 'active' && (
        <button className="btn btn-secondary btn-block" onClick={onComplete}>结束挑战并分配积分</button>
      )}
    </div>
  );
}
