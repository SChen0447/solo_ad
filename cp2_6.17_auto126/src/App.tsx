import React, { useState, useMemo, useEffect } from 'react';
import { useRoomData } from './hooks/useRoomData';
import type { Member, StandupCard } from './hooks/useRoomData';
import MemberList from './components/MemberList';
import CardWall from './components/CardWall';
import SummaryModal from './components/SummaryModal';

const COLOR_PALETTE = [
  '#3b82f6',
  '#10b981',
  '#f97316',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#14b8a6',
  '#eab308',
  '#06b6d4',
  '#a855f7',
];

const getColorForCode = (code: string): string => {
  const num = parseInt(code, 10) || 0;
  return COLOR_PALETTE[num % COLOR_PALETTE.length];
};

const CreateRoomOverlay: React.FC<{
  onCreate: (name: string, members: string[]) => void;
  initialName?: string;
  initialMembers?: string;
}> = ({ onCreate }) => {
  const [roomName, setRoomName] = useState('');
  const [membersRaw, setMembersRaw] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const names = membersRaw
      .split(/[\n,，、；;]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (names.length === 0) {
      alert('请至少输入一位成员姓名');
      return;
    }
    onCreate(roomName || '未命名站会', names);
  };

  return (
    <div className="create-overlay">
      <form className="create-card" onSubmit={handleSubmit}>
        <div className="create-card__header">
          <div className="create-card__logo">S</div>
          <h1 className="create-card__title">创建站会房间</h1>
          <p className="create-card__desc">
            输入房间名称和团队成员，每位成员将获得一个随机 4 位数字编号
          </p>
        </div>

        <div className="form-group">
          <label className="form-group__label">房间名称</label>
          <input
            type="text"
            className="form-control"
            placeholder="例如：前端组每日站会"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            maxLength={40}
            autoFocus
          />
        </div>

        <div className="form-group">
          <label className="form-group__label">
            成员名单 <span className="form-group__hint">（每行一人，或用逗号分隔）</span>
          </label>
          <textarea
            className="form-control form-control--textarea"
            placeholder="张三&#10;李四&#10;王五&#10;赵六"
            value={membersRaw}
            onChange={(e) => setMembersRaw(e.target.value)}
            rows={6}
            style={{ minHeight: '140px' }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <div className="form-group__counter">
            {membersRaw.split(/[\n,，、；;]+/).filter((s) => s.trim()).length} 位成员
          </div>
        </div>

        <button type="submit" className="btn btn--primary btn--block">
          🚀 创建房间并开始
        </button>

        <div className="create-card__tips">
          💡 提示：所有数据保存在浏览器本地，刷新页面不丢失
        </div>
      </form>
    </div>
  );
};

const FollowSidebar: React.FC<{
  items: Array<{ member: Member; card: StandupCard }>;
  onJumpTo: (memberId: string) => void;
  onRemove: (memberId: string) => void;
}> = ({ items, onJumpTo, onRemove }) => {
  if (items.length === 0) return null;
  return (
    <aside className="follow-sidebar">
      <div className="follow-sidebar__header">
        <span className="follow-sidebar__title">🔔 关注追踪</span>
        <span className="follow-sidebar__count">{items.length}</span>
      </div>
      <div className="follow-sidebar__list">
        {items.map(({ member, card }) => {
          const summaryText =
            card.blocked.length > 0
              ? `⚠️ ${card.blocked[0].content || '存在阻塞'}`
              : card.plan.length > 0
                ? `📌 ${card.plan[0].content || '有计划项'}`
                : card.done.length > 0
                  ? `✅ ${card.done[0].content || '有完成项'}`
                  : '点击查看详情';
          return (
            <div
              key={member.id}
              className="follow-card"
              onClick={() => onJumpTo(member.id)}
            >
              <button
                type="button"
                className="follow-card__remove"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(member.id);
                }}
                aria-label="取消关注"
                title="取消关注"
              >
                ×
              </button>
              <div className="follow-card__top">
                <span
                  className="follow-card__code"
                  style={{ background: getColorForCode(member.code) }}
                >
                  #{member.code}
                </span>
                <span className="follow-card__name">{member.name}</span>
              </div>
              <div className="follow-card__summary">{summaryText}</div>
              <div className="follow-card__stats">
                <span>✅ {card.done.length}</span>
                <span>📌 {card.plan.length}</span>
                <span>⚠️ {card.blocked.length}</span>
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

const TopBar: React.FC<{
  roomName: string;
  onSummary: () => void;
  onReset: () => void;
}> = ({ roomName, onSummary, onReset }) => {
  const today = new Date();
  const dateStr = `${today.getMonth() + 1}月${today.getDate()}日`;
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()];
  return (
    <header className="top-bar">
      <div className="top-bar__left">
        <div className="app-brand">
          <div className="app-brand__logo">S</div>
          <div className="app-brand__info">
            <div className="app-brand__name">{roomName}</div>
            <div className="app-brand__date">
              {dateStr} · 周{weekday}
            </div>
          </div>
        </div>
      </div>
      <div className="top-bar__right">
        <button type="button" className="btn btn--primary" onClick={onSummary}>
          📋 生成总结
        </button>
        <button
          type="button"
          className="btn btn--ghost btn--danger"
          onClick={() => {
            if (confirm('确定要清空当前站会所有数据吗？此操作不可撤销。')) onReset();
          }}
        >
          ↻ 重新创建
        </button>
      </div>
    </header>
  );
};

const App: React.FC = () => {
  const {
    room,
    isLoading,
    createRoom,
    resetRoom,
    updateCard,
    toggleFollow,
    getFollowedCards,
    generateSummaryText,
  } = useRoomData();

  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [castingMode, setCastingMode] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (room && room.members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(room.members[0].id);
    }
    if (!room) {
      setSelectedMemberId(null);
      setCastingMode(false);
      setShowSummary(false);
    }
  }, [room, selectedMemberId]);

  const followedItems = useMemo(() => getFollowedCards(), [getFollowedCards]);
  const summaryText = useMemo(() => generateSummaryText(), [generateSummaryText]);

  if (isLoading) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" />
        <div className="app-loading__text">加载中...</div>
      </div>
    );
  }

  if (!room) {
    return <CreateRoomOverlay onCreate={createRoom} />;
  }

  return (
    <div className="app-root">
      <TopBar
        roomName={room.name}
        onSummary={() => setShowSummary(true)}
        onReset={resetRoom}
      />
      <div className={`app-layout${followedItems.length > 0 ? ' app-layout--with-sidebar' : ''}`}>
        <MemberList
          members={room.members}
          selectedMemberId={selectedMemberId}
          onSelect={setSelectedMemberId}
        />
        <CardWall
          members={room.members}
          cards={room.cards}
          selectedMemberId={selectedMemberId}
          onUpdateCard={updateCard}
          onToggleFollow={toggleFollow}
          onScrollToMember={(id) => setSelectedMemberId(id)}
          castingMode={castingMode}
          onToggleCasting={() => setCastingMode((v) => !v)}
        />
        <FollowSidebar
          items={followedItems}
          onJumpTo={(id) => setSelectedMemberId(id)}
          onRemove={(id) => toggleFollow(id)}
        />
      </div>
      <SummaryModal
        open={showSummary}
        summaryText={summaryText}
        onClose={() => setShowSummary(false)}
      />
    </div>
  );
};

export default App;
