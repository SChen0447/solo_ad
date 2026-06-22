import React from 'react';
import { QuizRecord } from '../types';

interface HistoryPanelProps {
  records: QuizRecord[];
  onViewRecord: (record: QuizRecord) => void;
}

const HistoryPanel: React.FC<HistoryPanelProps> = ({ records, onViewRecord }) => {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  };

  return (
    <div className="history-panel">
      <h2 className="page-title">📊 历史记录</h2>

      <div className="card">
        <h3 className="card-title">
          答题记录
          <span className="badge">{records.length} / 50</span>
        </h3>

        {records.length === 0 ? (
          <div className="empty-state">
            <p className="empty-icon">📭</p>
            <p>暂无历史记录，完成一次答题后将显示在这里</p>
          </div>
        ) : (
          <div className="history-list">
            {records.map((record) => (
              <div key={record.id} className="history-item">
                <div className="history-info">
                  <h4 className="history-title">{record.title}</h4>
                  <p className="history-date">{formatDate(record.createdAt)}</p>
                  <div className="history-meta">
                    <span>共 {record.questions.length} 题</span>
                    {record.scoreResult && (
                      <>
                        <span>•</span>
                        <span className={`history-score score-${getScoreColor(record.scoreResult.totalScore)}`}>
                          {record.scoreResult.totalScore} 分
                        </span>
                      </>
                    )}
                  </div>
                  {record.scoreResult && (
                    <div className="knowledge-tags">
                      {Object.entries(record.scoreResult.knowledgeStats).map(([k, v]) => (
                        <span key={k} className="mini-knowledge-tag">
                          {k}: {v.percentage}%
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-outline"
                  onClick={() => onViewRecord(record)}
                >
                  查看详情 →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
