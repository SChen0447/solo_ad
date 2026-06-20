import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import type { Ranking, UserInfo, HistorySubmission } from '../types';

interface RankTabProps {
  user: UserInfo;
  problemId: number;
}

const RankTab: React.FC<RankTabProps> = ({ user, problemId }) => {
  const [rankings, setRankings] = useState<Ranking[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySubmissions, setHistorySubmissions] = useState<HistorySubmission[]>([]);

  const mockRankings: Ranking[] = [
    { rank: 1, userId: 'user_001', username: '算法大神', problemId: 1, passRate: 1, avgExecutionTime: 15, codeLines: 12 },
    { rank: 2, userId: 'user_002', username: 'Python专家', problemId: 1, passRate: 1, avgExecutionTime: 23, codeLines: 15 },
    { rank: 3, userId: 'user_003', username: '代码高手', problemId: 1, passRate: 0.8, avgExecutionTime: 18, codeLines: 20 },
    { rank: 4, userId: 'user_004', username: '编程爱好者', problemId: 1, passRate: 0.8, avgExecutionTime: 45, codeLines: 25 },
    { rank: 5, userId: 'user_005', username: '学习中', problemId: 1, passRate: 0.6, avgExecutionTime: 30, codeLines: 30 },
  ];

  const fetchRankings = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await axios.get(`/api/rankings?problemId=${problemId}`);
      setRankings(res.data);
    } catch {
      setRankings(mockRankings);
    } finally {
      setTimeout(() => setIsRefreshing(false), 300);
    }
  }, [problemId]);

  useEffect(() => {
    fetchRankings();
    const interval = setInterval(fetchRankings, 10000);
    return () => clearInterval(interval);
  }, [fetchRankings]);

  const handleViewHistory = (ranking: Ranking) => {
    if (ranking.userId === user.userId) {
      setHistorySubmissions([
        {
          id: 1,
          timestamp: '2024-01-15 14:30:00',
          code: 'def solution():\n    pass',
          passRate: 0.6,
          executionTime: 45,
        },
        {
          id: 2,
          timestamp: '2024-01-15 14:35:00',
          code: 'def solution():\n    return [0, 1]',
          passRate: 1,
          executionTime: 20,
        },
      ]);
      setShowHistory(true);
    }
  };

  return (
    <div className={isRefreshing ? 'fade-in' : ''}>
      <div style={styles.header}>
        <h3 style={styles.title}>🏆 排行榜</h3>
        <button onClick={fetchRankings} className="btn-secondary" style={styles.refreshBtn}>
          🔄 刷新
        </button>
      </div>

      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr style={styles.tableHeader}>
              <th style={styles.th}>排名</th>
              <th style={styles.th}>用户</th>
              <th style={styles.th}>通过率</th>
              <th style={styles.th}>耗时(ms)</th>
              <th style={styles.th}>代码行数</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((ranking, index) => (
              <tr
                key={ranking.userId}
                onClick={() => handleViewHistory(ranking)}
                style={{
                  ...styles.tableRow,
                  backgroundColor:
                    ranking.userId === user.userId ? 'rgba(102, 126, 234, 0.15)' : index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  cursor: ranking.userId === user.userId ? 'pointer' : 'default',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                    ranking.userId === user.userId ? 'rgba(102, 126, 234, 0.25)' : '#e0e7ff22';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                    ranking.userId === user.userId
                      ? 'rgba(102, 126, 234, 0.15)'
                      : index % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)';
                }}
              >
                <td style={styles.td}>
                  <span
                    style={{
                      ...styles.rankBadge,
                      backgroundColor:
                        ranking.rank === 1
                          ? '#fbbf24'
                          : ranking.rank === 2
                          ? '#9ca3af'
                          : ranking.rank === 3
                          ? '#d97706'
                          : 'var(--accent)',
                    }}
                  >
                    {ranking.rank <= 3 ? ['🥇', '🥈', '🥉'][ranking.rank - 1] : ranking.rank}
                  </span>
                </td>
                <td style={{ ...styles.td, textAlign: 'left' }}>
                  <span style={styles.username}>
                    {ranking.username}
                    {ranking.userId === user.userId && <span style={styles.youBadge}>(我)</span>}
                  </span>
                </td>
                <td style={styles.td}>
                  <span style={{
                    color: ranking.passRate === 1 ? '#4ade80' : ranking.passRate >= 0.6 ? '#fbbf24' : '#f87171',
                    fontWeight: 600,
                  }}>
                    {Math.round(ranking.passRate * 100)}%
                  </span>
                </td>
                <td style={styles.td}>{ranking.avgExecutionTime}</td>
                <td style={styles.td}>{ranking.codeLines}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showHistory && (
        <div style={styles.modalOverlay} onClick={() => setShowHistory(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>📜 历史提交记录</h3>
              <button onClick={() => setShowHistory(false)} style={styles.closeBtn}>
                ✕
              </button>
            </div>
            <div style={styles.modalContent}>
              {historySubmissions.map((sub) => (
                <div key={sub.id} style={styles.historyItem}>
                  <div style={styles.historyHeader}>
                    <span style={styles.historyTime}>{sub.timestamp}</span>
                    <span
                      style={{
                        ...styles.historyPassRate,
                        color: sub.passRate === 1 ? '#4ade80' : sub.passRate >= 0.6 ? '#fbbf24' : '#f87171',
                      }}
                    >
                      {Math.round(sub.passRate * 100)}%
                    </span>
                    <span style={styles.historyTime}>{sub.executionTime}ms</span>
                  </div>
                  <pre style={styles.historyCode}>{sub.code}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  title: {
    fontSize: '18px',
    fontWeight: 700,
  },
  refreshBtn: {
    padding: '6px 16px',
    fontSize: '12px',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeader: {
    backgroundColor: 'var(--accent)',
  },
  th: {
    padding: '10px 12px',
    textAlign: 'center',
    fontSize: '12px',
    fontWeight: 600,
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
  },
  tableRow: {
    transition: 'background-color 0.2s ease',
  },
  td: {
    padding: '12px',
    textAlign: 'center',
    fontSize: '13px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
  },
  rankBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    fontSize: '12px',
    fontWeight: 700,
    color: 'white',
  },
  username: {
    fontSize: '13px',
    fontWeight: 500,
  },
  youBadge: {
    marginLeft: '6px',
    fontSize: '11px',
    color: 'var(--gradient-start)',
    fontWeight: 600,
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    width: '500px',
    maxHeight: '80vh',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '12px',
    border: '1px solid var(--accent)',
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeIn 0.3s ease',
  },
  modalHeader: {
    padding: '16px 20px',
    borderBottom: '1px solid var(--accent)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: '16px',
    fontWeight: 700,
  },
  closeBtn: {
    backgroundColor: 'transparent',
    color: 'var(--text-secondary)',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
  },
  modalContent: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
  },
  historyItem: {
    marginBottom: '16px',
    padding: '12px',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
  },
  historyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  historyTime: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  historyPassRate: {
    fontSize: '14px',
    fontWeight: 600,
  },
  historyCode: {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: '10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontFamily: "'Fira Code', monospace",
    color: 'var(--text-primary)',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    maxHeight: '150px',
    overflowY: 'auto',
  },
};

export default RankTab;
