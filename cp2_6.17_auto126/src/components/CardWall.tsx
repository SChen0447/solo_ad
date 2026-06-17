import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Member, StandupCard, StandupItem } from '../hooks/useRoomData';

interface CardWallProps {
  members: Member[];
  cards: Record<string, StandupCard>;
  selectedMemberId: string | null;
  onUpdateCard: (memberId: string, patch: Partial<StandupCard>) => void;
  onToggleFollow: (memberId: string) => void;
  onScrollToMember?: (memberId: string) => void;
}

type FieldKey = 'done' | 'plan' | 'blocked';

const MAX_COUNTS: Record<FieldKey, number> = {
  done: 5,
  plan: 3,
  blocked: 2,
};

const FIELD_LABELS: Record<FieldKey, { icon: string; title: string }> = {
  done: { icon: '✅', title: '今日完成' },
  plan: { icon: '📌', title: '明日计划' },
  blocked: { icon: '⚠️', title: '遇到阻塞' },
};

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

const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

const CharCounter: React.FC<{ count: number; limit: number }> = ({ count, limit }) => {
  const warn = count > limit * 0.9;
  const danger = count >= limit;
  return (
    <span
      className={`char-counter${danger ? ' char-counter--danger' : warn ? ' char-counter--warn' : ''}`}
    >
      {count}/{limit}
    </span>
  );
};

const FollowButton: React.FC<{
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}> = ({ active, onClick }) => {
  return (
    <button
      className={`follow-btn${active ? ' follow-btn--active' : ''}`}
      onClick={onClick}
      aria-label={active ? '取消关注' : '标记关注'}
      title={active ? '取消关注' : '标记为需要跟进'}
      type="button"
    >
      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 21s-7.5-4.6-9.6-8.8C.7 9.2 2.2 5 6 5c2 0 3.4 1.1 4 2.3C10.6 6.1 12 5 14 5c3.8 0 5.3 4.2 3.6 7.2C19.5 16.4 12 21 12 21z" />
      </svg>
    </button>
  );
};

const FieldSection: React.FC<{
  fieldKey: FieldKey;
  items: StandupItem[];
  editing: boolean;
  cardMemberId: string;
  onUpdateCard: (memberId: string, patch: Partial<StandupCard>) => void;
}> = ({ fieldKey, items, editing, cardMemberId, onUpdateCard }) => {
  const { icon, title } = FIELD_LABELS[fieldKey];
  const max = MAX_COUNTS[fieldKey];

  const addItem = () => {
    if (items.length >= max) return;
    const next = [...items, { id: uid(), content: '' }];
    onUpdateCard(cardMemberId, { [fieldKey]: next } as Partial<StandupCard>);
  };

  const updateItem = (idx: number, content: string) => {
    const next = items.slice();
    if (next[idx]) next[idx] = { ...next[idx], content };
    onUpdateCard(cardMemberId, { [fieldKey]: next } as Partial<StandupCard>);
  };

  const removeItem = (idx: number) => {
    const next = items.filter((_, i) => i !== idx);
    onUpdateCard(cardMemberId, { [fieldKey]: next } as Partial<StandupCard>);
  };

  const autoResizeRef = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    if (!autoResizeRef.current) return;
    autoResizeRef.current.style.height = 'auto';
    autoResizeRef.current.style.height = `${autoResizeRef.current.scrollHeight}px`;
  }, [items]);

  return (
    <div className="card__section">
      <div className="card__section-head">
        <span className="card__section-icon">{icon}</span>
        <span className="card__section-title">{title}</span>
        <span className="card__section-count">
          {items.length}/{max}
        </span>
        {editing && items.length < max && (
          <button
            type="button"
            className="card__btn-add"
            onClick={addItem}
            title="添加一条"
          >
            +
          </button>
        )}
      </div>

      <div className="card__items">
        {items.length === 0 && !editing && (
          <div className="card__empty">— 暂无内容 —</div>
        )}
        {items.map((it, idx) => (
          <div key={it.id} className="card__item">
            <span className="card__item-bullet">{idx + 1}.</span>
            {editing ? (
              <div className="card__textarea-wrap">
                <textarea
                  ref={(el) => {
                    if (idx === items.length - 1) autoResizeRef.current = el;
                  }}
                  className="card__textarea"
                  value={it.content}
                  maxLength={80}
                  rows={2}
                  placeholder={`请输入${title}内容...`}
                  onChange={(e) => updateItem(idx, e.target.value)}
                  style={{ minHeight: '80px', height: 'auto' }}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = `${el.scrollHeight}px`;
                  }}
                />
                <CharCounter count={it.content.length} limit={80} />
                <button
                  type="button"
                  className="card__btn-remove"
                  onClick={() => removeItem(idx)}
                  title="删除此条"
                  aria-label="删除"
                >
                  ×
                </button>
              </div>
            ) : (
              <>
                <span className="card__item-text">{it.content || '(空)'}</span>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const StandupCardComponent: React.FC<{
  member: Member;
  card: StandupCard;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdateCard: (memberId: string, patch: Partial<StandupCard>) => void;
  onToggleFollow: (memberId: string) => void;
  casting?: boolean;
}> = ({ member, card, index, isSelected, onSelect, onUpdateCard, onToggleFollow, casting }) => {
  const [editing, setEditing] = useState(false);
  const color = getColorForCode(member.code);

  const cardClass = [
    'standup-card',
    isSelected ? 'standup-card--selected' : '',
    casting ? 'standup-card--casting' : '',
  ].join(' ');

  return (
    <article
      className={cardClass}
      style={{ animationDelay: `${Math.min(index * 50, 500)}ms` }}
      onClick={() => {
        if (!casting) onSelect(member.id);
      }}
    >
      <header className="card__header">
        <div className="card__member">
          <span className="card__code" style={{ background: color }}>
            #{member.code}
          </span>
          <span className="card__name">{member.name}</span>
        </div>
        {!casting && (
          <FollowButton
            active={card.followed}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFollow(member.id);
            }}
          />
        )}
      </header>

      <div className="card__body">
        <FieldSection
          fieldKey="done"
          items={card.done}
          editing={editing && !casting}
          cardMemberId={member.id}
          onUpdateCard={onUpdateCard}
        />
        <FieldSection
          fieldKey="plan"
          items={card.plan}
          editing={editing && !casting}
          cardMemberId={member.id}
          onUpdateCard={onUpdateCard}
        />
        <FieldSection
          fieldKey="blocked"
          items={card.blocked}
          editing={editing && !casting}
          cardMemberId={member.id}
          onUpdateCard={onUpdateCard}
        />
      </div>

      {!casting && (
        <footer className="card__footer">
          <button
            type="button"
            className={`btn btn--ghost btn--sm${editing ? ' btn--primary' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              setEditing((v) => !v);
            }}
          >
            {editing ? '✓ 完成编辑' : '✎ 编辑内容'}
          </button>
          {card.updatedAt && (
            <span className="card__updated">
              更新 {new Date(card.updatedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </footer>
      )}
    </article>
  );
};

const CastingModeOverlay: React.FC<{
  members: Member[];
  cards: Record<string, StandupCard>;
  onExit: () => void;
}> = ({ members, cards, onExit }) => {
  const isExitingRef = useRef(false);
  const mountedRef = useRef(true);

  const handleExit = useCallback(async () => {
    if (isExitingRef.current) return;
    isExitingRef.current = true;
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.warn('退出全屏失败:', err);
    }
    if (mountedRef.current) {
      onExit();
    }
  }, [onExit]);

  useEffect(() => {
    isExitingRef.current = false;
    mountedRef.current = true;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleExit();
      }
    };

    const onFullscreenChange = () => {
      if (!document.fullscreenElement && !isExitingRef.current && mountedRef.current) {
        isExitingRef.current = true;
        onExit();
      }
    };

    const enterFullscreen = async () => {
      try {
        const el = document.documentElement as HTMLElement & {
          webkitRequestFullscreen?: () => Promise<void>;
        };
        if (!document.fullscreenElement) {
          if (el.requestFullscreen) {
            await el.requestFullscreen();
          } else if (el.webkitRequestFullscreen) {
            await el.webkitRequestFullscreen();
          }
        }
      } catch (err) {
        console.warn('进入全屏失败（可能被浏览器阻止）:', err);
      }
    };

    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    enterFullscreen();

    return () => {
      mountedRef.current = false;
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      if (document.fullscreenElement && !isExitingRef.current) {
        document.exitFullscreen().catch(() => {});
      }
      isExitingRef.current = false;
    };
  }, [handleExit, onExit]);

  return (
    <div className="casting-overlay">
      <div className="casting-overlay__topbar">
        <div className="casting-overlay__title">📺 投屏模式</div>
        <button className="btn btn--ghost casting-overlay__exit" onClick={handleExit}>
          ✕ 退出投屏
        </button>
      </div>
      <div className="casting-overlay__body">
        <div className="card-grid card-grid--casting">
          {members.map((m, idx) => {
            const card = cards[m.id];
            if (!card) return null;
            return (
              <StandupCardComponent
                key={m.id}
                member={m}
                card={card}
                index={idx}
                isSelected={false}
                onSelect={() => {}}
                onUpdateCard={() => {}}
                onToggleFollow={() => {}}
                casting
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface CardWallPropsExtended extends CardWallProps {
  castingMode: boolean;
  onToggleCasting: () => void;
}

const CardWall: React.FC<CardWallPropsExtended> = ({
  members,
  cards,
  selectedMemberId,
  onUpdateCard,
  onToggleFollow,
  onScrollToMember,
  castingMode,
  onToggleCasting,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const followedCount = useMemo(
    () => Object.values(cards).filter((c) => c.followed).length,
    [cards]
  );

  const handleSelect = (id: string) => {
    if (onScrollToMember) onScrollToMember(id);
  };

  return (
    <section className="card-wall-area">
      <div className="card-wall__toolbar">
        <div className="card-wall__toolbar-left">
          <h1 className="card-wall__title">🎯 卡片墙</h1>
          <span className="card-wall__meta">
            {members.length} 位成员 · {followedCount} 条关注
          </span>
        </div>
        <div className="card-wall__toolbar-right">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onToggleCasting}
          >
            📺 投屏模式
          </button>
        </div>
      </div>

      <div className="card-grid" ref={gridRef}>
        {members.map((m, idx) => {
          const card = cards[m.id];
          if (!card) return null;
          return (
            <StandupCardComponent
              key={m.id}
              member={m}
              card={card}
              index={idx}
              isSelected={selectedMemberId === m.id}
              onSelect={handleSelect}
              onUpdateCard={onUpdateCard}
              onToggleFollow={onToggleFollow}
            />
          );
        })}
      </div>

      {castingMode && (
        <CastingModeOverlay
          members={members}
          cards={cards}
          onExit={onToggleCasting}
        />
      )}
    </section>
  );
};

export default CardWall;
