import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/gameStore';
import './HistoryPage.css';

const PAGE_SIZE = 10;

export default function HistoryPage() {
  const { state, setCurrentBattle } = useAppStore();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const history = state.battleHistory;

  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return history.slice(start, start + PAGE_SIZE);
  }, [history, currentPage]);

  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDuration = (ms: number) => {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}秒`;
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${m}分${ss}秒`;
  };

  const handleSelect = (id: string) => {
    setSelectedId(id);
  };

  const handleViewReplay = (battle: typeof history[0]) => {
    setCurrentBattle(battle);
    navigate('/replay');
  };

  const getVictoryText = (v: string) => {
    switch (v) {
      case 'win': return '胜利';
      case 'lose': return '失败';
      default: return '平局';
    }
  };

  const getVictoryColor = (v: string) => {
    switch (v) {
      case 'win': return '#22c55e';
      case 'lose': return '#ef4444';
      default: return '#eab308';
    }
  };

  const waveNames: Record<string, string> = {
    'wave-easy': '新手试炼',
    'wave-normal': '兽人入侵',
    'wave-hard': '魔王降临',
  };

  return (
    <div className="history-page">
      <div className="history-header">
        <h2>战斗记录</h2>
        <button className="back-btn" onClick={() => navigate('/')}>
          ← 返回编队
        </button>
      </div>

      <div className="history-list">
        {pageData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📜</div>
            <div className="empty-text">暂无战斗记录</div>
            <div className="empty-sub">完成一场推演后，记录会显示在这里</div>
          </div>
        ) : (
          pageData.map((battle, idx) => (
            <div
              key={battle.id}
              className={`history-card ${selectedId === battle.id ? 'selected' : ''}`}
              onClick={() => handleSelect(battle.id)}
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <div className="battle-avatars">
                <div className="avatars-group">
                  {battle.heroIds.slice(0, 4).map((_, i) => (
                    <div key={i} className="mini-avatar hero">⚔️</div>
                  ))}
                </div>
                <div className="vs">VS</div>
                <div className="avatars-group">
                  <div className="mini-avatar enemy">👹</div>
                </div>
              </div>

              <div className="battle-info">
                <div className="battle-wave">
                  {waveNames[battle.enemyWaveId] || '未知波次'}
                </div>
                <div className="battle-meta">
                  <span>共 {battle.totalTurns} 回合</span>
                  <span>·</span>
                  <span>{formatDuration(battle.duration)}</span>
                </div>
                <div className="battle-time">{formatTime(battle.timestamp)}</div>
              </div>

              <div className="battle-result" style={{ color: getVictoryColor(battle.victory) }}>
                {getVictoryText(battle.victory)}
              </div>

              <button
                className="replay-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleViewReplay(battle);
                }}
              >
                观看回放
              </button>
            </div>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
          >
            上一页
          </button>
          <div className="page-info">
            第 {currentPage} / {totalPages} 页
          </div>
          <button
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}
