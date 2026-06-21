import { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { TravelPlan, Member } from './types';
import Timeline from './Timeline';
import Budget from './Budget';
import FileWall from './FileWall';
import './styles.css';

type Tab = 'timeline' | 'budget' | 'files';

export default function App() {
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [planTitle, setPlanTitle] = useState('');
  const [planDays, setPlanDays] = useState(3);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<Tab>('timeline');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const s = io({ path: '/ws/socket.io' });
    setSocket(s);
    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!socket || !plan) return;
    socket.emit('plan:join', plan.id);
    socket.on('plan:updated', (updatedPlan: TravelPlan) => {
      setPlan(updatedPlan);
    });
    return () => {
      socket.off('plan:updated');
      socket.emit('plan:leave', plan.id);
    };
  }, [socket, plan?.id]);

  const createPlan = async () => {
    if (!memberName.trim()) return;
    const res = await fetch('/api/plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: planTitle || '我的旅行',
        memberName: memberName.trim(),
        startDate,
        days: planDays,
      }),
    });
    const data = await res.json();
    setPlan(data.plan);
    setCurrentMemberId(data.memberId);
  };

  const joinPlan = async () => {
    if (!memberName.trim() || !shareCode.trim()) return;
    const res = await fetch(`/api/plans/${shareCode.trim()}/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberName: memberName.trim() }),
    });
    if (res.status === 404) {
      alert('分享码无效，请检查后重试');
      return;
    }
    const data = await res.json();
    setPlan(data.plan);
    setCurrentMemberId(data.memberId);
  };

  const copyShareCode = () => {
    if (!plan) return;
    navigator.clipboard.writeText(plan.shareCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCurrentMember = (): Member | undefined => {
    if (!plan || !currentMemberId) return undefined;
    return plan.members.find(m => m.id === currentMemberId);
  };

  if (!plan) {
    return (
      <div className="landing-page">
        <div className="landing-bg" />
        <div className="landing-content">
          <div className="logo">
            <span className="logo-icon">✈️</span>
            <h1>旅行规划</h1>
            <p>多人协作 · 实时同步 · 预算透明</p>
          </div>

          <div className="auth-card">
            <input
              type="text"
              placeholder="你的昵称"
              value={memberName}
              onChange={e => setMemberName(e.target.value)}
              className="input"
            />

            <div className="divider">
              <span>创建新计划</span>
            </div>

            <input
              type="text"
              placeholder="旅行名称（可选）"
              value={planTitle}
              onChange={e => setPlanTitle(e.target.value)}
              className="input"
            />
            <div className="row-inputs">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="input"
              />
              <input
                type="number"
                min={1}
                max={30}
                placeholder="天数"
                value={planDays}
                onChange={e => setPlanDays(parseInt(e.target.value) || 1)}
                className="input"
              />
            </div>
            <button className="btn-primary" onClick={createPlan} disabled={!memberName.trim()}>
              🚀 创建旅行计划
            </button>

            <div className="divider">
              <span>或通过分享码加入</span>
            </div>

            <input
              type="text"
              placeholder="输入分享码"
              value={shareCode}
              onChange={e => setShareCode(e.target.value.toUpperCase())}
              className="input"
            />
            <button className="btn-secondary" onClick={joinPlan} disabled={!memberName.trim() || !shareCode.trim()}>
              🤝 加入计划
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentMember = getCurrentMember();

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <span className="logo-icon-small">✈️</span>
          <div>
            <h2>{plan.title}</h2>
            <div className="plan-meta">
              <span>{plan.startDate} · {plan.days}天</span>
              <span className="share-code" onClick={copyShareCode}>
                分享码: <strong>{plan.shareCode}</strong> {copied && '✅'}
              </span>
            </div>
          </div>
        </div>
        <div className="header-right">
          <div className="members-avatars">
            {plan.members.map(m => (
              <div
                key={m.id}
                className={`avatar ${m.id === currentMemberId ? 'avatar-self' : ''}`}
                style={{ background: m.color }}
                title={m.name}
              >
                {m.name.charAt(0)}
              </div>
            ))}
          </div>
          {currentMember && (
            <span className="self-label" style={{ borderColor: currentMember.color }}>
              {currentMember.name}
            </span>
          )}
        </div>
      </header>

      <nav className="tabs">
        <button
          className={`tab ${activeTab === 'timeline' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          📅 行程时间轴
        </button>
        <button
          className={`tab ${activeTab === 'budget' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('budget')}
        >
          💰 预算看板
        </button>
        <button
          className={`tab ${activeTab === 'files' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('files')}
        >
          📁 文件墙
        </button>
      </nav>

      <main className="app-main">
        {activeTab === 'timeline' && (
          <Timeline
            plan={plan}
            currentMemberId={currentMemberId!}
          />
        )}
        {activeTab === 'budget' && (
          <Budget plan={plan} />
        )}
        {activeTab === 'files' && (
          <FileWall
            plan={plan}
            currentMemberId={currentMemberId!}
            currentMemberName={currentMember?.name || ''}
          />
        )}
      </main>
    </div>
  );
}
