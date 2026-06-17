import { useState, useMemo, useRef, useEffect } from 'react';
import type { Idea, Group } from '../types';

interface IdeaBoardProps {
  ideas: Idea[];
  groups: Group[];
  likedIds: Set<string>;
  onLike: (ideaId: string) => Promise<boolean>;
  onRandomGroup: (groupSize: number) => void;
  onExportMarkdown: () => Promise<boolean>;
  onClearGroups: () => void;
  isLoading: boolean;
}

const MAX_DISPLAY = 200;
const GROUP_BORDER_COLORS = [
  '#4A90D9', '#E53935', '#43A047', '#FF8C00',
  '#7B1FA2', '#00897B', '#D81B60', '#1E88E5',
  '#FBC02D', '#5D4037'
];

const CARD_PASTEL_COLORS = [
  '#E3F2FD',
  '#E8F5E9',
  '#FFF8E1',
  '#FCE4EC',
  '#F3E5F5',
  '#E0F7FA',
  '#FFF3E0',
  '#F1F8E9',
];

function getCardColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return CARD_PASTEL_COLORS[Math.abs(hash) % CARD_PASTEL_COLORS.length];
}

function IdeaBoard({ ideas, groups, likedIds, onLike, onRandomGroup, onExportMarkdown, onClearGroups, isLoading }: IdeaBoardProps) {
  const [groupSize, setGroupSize] = useState(3);
  const [showCopied, setShowCopied] = useState(false);
  const [sortByLikes, setSortByLikes] = useState(false);
  const prevIdeaIdsRef = useRef<Set<string>>(new Set());
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [pendingLike, setPendingLike] = useState<Set<string>>(new Set());

  const displayIdeas = useMemo(() => {
    const base = ideas.slice(0, MAX_DISPLAY);
    if (!sortByLikes) return base;
    return [...base].sort((a, b) => b.likes - a.likes || a.number - b.number);
  }, [ideas, sortByLikes]);

  const sortedGroups = useMemo(() => {
    if (!sortByLikes) return groups;
    return groups.map(group =>
      [...group].sort((a, b) => b.likes - a.likes || a.number - b.number)
    );
  }, [groups, sortByLikes]);

  useEffect(() => {
    const currentIds = new Set(ideas.map(i => i.id));
    const fresh = new Set<string>();
    currentIds.forEach(id => {
      if (!prevIdeaIdsRef.current.has(id)) {
        fresh.add(id);
      }
    });
    prevIdeaIdsRef.current = currentIds;
    if (fresh.size > 0) {
      setNewIds(fresh);
    }
  }, [ideas]);

  const gridGap = ideas.length > 30 ? 24 : ideas.length > 15 ? 20 : 16;

  const handleExport = async () => {
    const success = await onExportMarkdown();
    if (success) {
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 1500);
    }
  };

  const handleGroup = () => {
    if (ideas.length === 0) return;
    onRandomGroup(groupSize);
  };

  const renderIdeaCard = (idea: Idea, groupColor?: string) => {
    const isNew = newIds.has(idea.id);
    const alreadyLiked = likedIds.has(idea.id);
    const isLikePending = pendingLike.has(idea.id);

    const handleLikeClick = async (e: React.MouseEvent) => {
      e.stopPropagation();
      if (alreadyLiked || isLikePending) return;
      setPendingLike(prev => {
        const next = new Set(prev);
        next.add(idea.id);
        return next;
      });
      try {
        await onLike(idea.id);
      } finally {
        setPendingLike(prev => {
          const next = new Set(prev);
          next.delete(idea.id);
          return next;
        });
      }
    };

    return (
      <div
        key={idea.id}
        className={`idea-card${isNew ? ' idea-card-new' : ''}`}
        style={{
          borderColor: groupColor || '#e0e0e0',
          backgroundColor: getCardColor(idea.id),
        }}
      >
        <div className="card-header">
          <span className="idea-number">#{idea.number}</span>
          <div
            className="avatar"
            style={{ backgroundColor: idea.avatarColor }}
          >
            {idea.initials}
          </div>
        </div>
        <p className="idea-content">{idea.content}</p>
        <div className="card-footer">
          <button
            type="button"
            className={`like-btn${alreadyLiked ? ' liked' : ''}`}
            onClick={handleLikeClick}
            disabled={alreadyLiked || isLikePending}
            title={alreadyLiked ? '已点赞' : '点赞'}
          >
            <span className="like-icon" aria-hidden="true">
              {alreadyLiked ? '❤️' : '🤍'}
            </span>
            <span className="like-count">{idea.likes || 0}</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="idea-board-container">
      <div className="board-header">
        <div className="board-header-left">
          <h2 className="board-title">
            {groups.length > 0 ? '分组结果' : '想法看板'}
            <span className="idea-count">
              ({groups.length > 0 ? `${groups.length}组` : `${ideas.length}条`})
            </span>
          </h2>
        </div>
        <div className="board-header-right">
          <label className="sort-switch">
            <input
              type="checkbox"
              checked={sortByLikes}
              onChange={(e) => setSortByLikes(e.target.checked)}
              disabled={ideas.length === 0}
            />
            <span className="sort-switch-label">按点赞数排序</span>
          </label>
          {groups.length > 0 && (
            <button className="clear-groups-btn" onClick={onClearGroups}>
              取消分组
            </button>
          )}
        </div>
      </div>

      {sortedGroups.length > 0 ? (
        <div className="groups-container">
          {sortedGroups.map((group, groupIndex) => (
            <div
              key={groupIndex}
              className="group-section"
              style={{ borderLeftColor: GROUP_BORDER_COLORS[groupIndex % GROUP_BORDER_COLORS.length] }}
            >
              <h3 className="group-title" style={{ color: GROUP_BORDER_COLORS[groupIndex % GROUP_BORDER_COLORS.length] }}>
                第 {groupIndex + 1} 组
              </h3>
              <div className="ideas-grid" style={{ gap: `${gridGap}px` }}>
                {group.map((idea) => renderIdeaCard(idea, GROUP_BORDER_COLORS[groupIndex % GROUP_BORDER_COLORS.length]))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ideas-grid" style={{ gap: `${gridGap}px` }}>
          {displayIdeas.map((idea) => renderIdeaCard(idea))}
        </div>
      )}

      {ideas.length === 0 && groups.length === 0 && (
        <div className="empty-state">
          <p>还没有想法提交，开始输入您的想法吧！</p>
        </div>
      )}

      {ideas.length > MAX_DISPLAY && (
        <div className="limit-notice">
          仅显示前 {MAX_DISPLAY} 条想法
        </div>
      )}

      <div className="floating-panel">
        <div className="panel-section">
          <label className="panel-label">每组人数</label>
          <select
            className="group-size-select"
            value={groupSize}
            onChange={(e) => setGroupSize(Number(e.target.value))}
            disabled={isLoading || ideas.length === 0}
          >
            {[2, 3, 4, 5, 6].map((size) => (
              <option key={size} value={size}>{size}人</option>
            ))}
          </select>
        </div>
        
        <button
          className="floating-btn primary"
          onClick={handleGroup}
          disabled={isLoading || ideas.length === 0}
        >
          随机分组
        </button>
        
        <button
          className="floating-btn secondary"
          onClick={handleExport}
          disabled={isLoading || ideas.length === 0}
        >
          导出Markdown
        </button>
        
        {showCopied && (
          <div className="copied-toast">已复制</div>
        )}
      </div>

      <style>{`
        @keyframes cardFadeIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .idea-board-container {
          position: relative;
          padding-bottom: 20px;
        }
        
        .board-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 12px;
        }
        
        .board-header-left {
          display: flex;
          align-items: center;
        }
        
        .board-header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        
        .sort-switch {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
          user-select: none;
          font-size: 13px;
          color: #555;
        }
        
        .sort-switch input[type="checkbox"] {
          width: 16px;
          height: 16px;
          cursor: pointer;
          accent-color: #4A90D9;
        }
        
        .sort-switch input[type="checkbox"]:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        
        .sort-switch-label {
          font-weight: 500;
        }
        
        .board-title {
          color: #263238;
          font-size: 18px;
          font-weight: 600;
        }
        
        .idea-count {
          color: #666;
          font-size: 14px;
          font-weight: 400;
          margin-left: 8px;
        }
        
        .clear-groups-btn {
          padding: 8px 16px;
          background: #f5f5f5;
          color: #666;
          font-size: 13px;
        }
        
        .clear-groups-btn:hover {
          background: #e0e0e0;
        }
        
        .groups-container {
          display: flex;
          flex-direction: column;
          gap: 25px;
          margin-right: 140px;
        }
        
        .group-section {
          background: #ffffff;
          border-radius: 10px;
          padding: 20px;
          border-left: 4px solid;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .group-title {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 15px;
        }
        
        .ideas-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        }
        
        .idea-card {
          border: 1px solid #e0e0e0;
          border-radius: 10px;
          padding: 16px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          cursor: default;
        }

        .idea-card-new {
          animation: cardFadeIn 0.4s ease-out;
        }
        
        .idea-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        
        .idea-number {
          color: #FF8C00;
          font-size: 14px;
          font-weight: 700;
        }
        
        .avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #ffffff;
          font-size: 12px;
          font-weight: 600;
        }
        
        .idea-content {
          color: #333;
          font-size: 13px;
          line-height: 1.5;
          word-wrap: break-word;
          margin: 0;
        }
        
        .card-footer {
          margin-top: 12px;
          padding-top: 10px;
          border-top: 1px solid rgba(0, 0, 0, 0.06);
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }
        
        .like-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(0, 0, 0, 0.08);
          border-radius: 14px;
          color: #555;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        
        .like-btn:hover:not(:disabled) {
          background: #ffffff;
          border-color: #e53935;
          color: #e53935;
          transform: scale(1.04);
        }
        
        .like-btn:active:not(:disabled) {
          transform: scale(0.97);
        }
        
        .like-btn.liked {
          background: #ffebee;
          border-color: #ef9a9a;
          color: #e53935;
          cursor: default;
        }
        
        .like-btn:disabled:not(.liked) {
          opacity: 0.5;
          cursor: wait;
        }
        
        .like-icon {
          font-size: 13px;
          line-height: 1;
        }
        
        .like-count {
          min-width: 16px;
          text-align: center;
        }
        
        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #999;
          margin-right: 140px;
        }
        
        .empty-state p {
          font-size: 15px;
        }
        
        .limit-notice {
          text-align: center;
          padding: 10px;
          color: #999;
          font-size: 13px;
          margin-top: 15px;
          margin-right: 140px;
        }
        
        .floating-panel {
          position: fixed;
          right: 20px;
          top: 50%;
          transform: translateY(-50%);
          width: 120px;
          background: rgba(30, 30, 40, 0.85);
          border-radius: 8px;
          padding: 15px 12px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 100;
        }
        
        .panel-section {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        
        .panel-label {
          color: rgba(255, 255, 255, 0.8);
          font-size: 12px;
        }
        
        .group-size-select {
          padding: 6px 8px;
          border-radius: 4px;
          border: none;
          background: rgba(255, 255, 255, 0.1);
          color: #ffffff;
          font-size: 12px;
          outline: none;
        }
        
        .group-size-select option {
          background: #333;
          color: #ffffff;
        }
        
        .group-size-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .floating-btn {
          padding: 10px 8px;
          font-size: 13px;
          font-weight: 500;
          color: #ffffff;
        }
        
        .floating-btn.primary {
          background: #4A90D9;
        }
        
        .floating-btn.primary:hover:not(:disabled) {
          background: #357ABD;
        }
        
        .floating-btn.secondary {
          background: #43A047;
        }
        
        .floating-btn.secondary:hover:not(:disabled) {
          background: #2E7D32;
        }
        
        .floating-btn:disabled {
          background: rgba(255, 255, 255, 0.2);
          color: rgba(255, 255, 255, 0.5);
          cursor: not-allowed;
        }
        
        .copied-toast {
          text-align: center;
          color: #43A047;
          font-size: 12px;
          font-weight: 500;
          background: rgba(255, 255, 255, 0.95);
          padding: 6px;
          border-radius: 4px;
          animation: fadeInOut 1.5s ease;
        }
        
        @media (max-width: 768px) {
          .groups-container {
            margin-right: 0;
            margin-bottom: 80px;
          }
          
          .ideas-grid {
            grid-template-columns: repeat(2, minmax(140px, 1fr));
            margin-bottom: 80px;
          }
          
          .idea-card {
            padding: 12px;
          }
          
          .idea-number {
            font-size: 13px;
          }
          
          .idea-content {
            font-size: 12px;
          }
          
          .empty-state {
            margin-right: 0;
            margin-bottom: 80px;
          }
          
          .limit-notice {
            margin-right: 0;
            margin-bottom: 80px;
          }
          
          .floating-panel {
            position: fixed;
            right: 0;
            left: 0;
            bottom: 0;
            top: auto;
            transform: none;
            width: 100%;
            border-radius: 8px 8px 0 0;
            padding: 12px 15px;
            flex-direction: row;
            align-items: center;
            gap: 12px;
          }
          
          .panel-section {
            flex-direction: row;
            align-items: center;
            gap: 8px;
          }
          
          .floating-btn {
            padding: 10px 16px;
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

export default IdeaBoard;
