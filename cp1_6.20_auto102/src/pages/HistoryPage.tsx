import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getHistory, HistoryItem } from '../utils/api';

const HistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    in: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setHistory(data);
    } catch (err) {
      console.error('加载历史记录失败', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCardClick = (analysisId: string) => {
    navigate(`/analyze?analysisId=${analysisId}`);
  };

  const getScoreClass = (score: number): string => {
    if (score >= 75) return 'match-score-high';
    if (score >= 50) return 'match-score-medium';
    return 'match-score-low';
  };

  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="initial"
      variants={pageVariants}
      transition={{ duration: 0.3 }}
    >
      <h1 className="page-title">历史记录</h1>
      <p className="page-subtitle">查看您的简历分析历史记录</p>

      {isLoading ? (
        <div className="loading-wrapper">
          <div className="loading-spinner"></div>
          <div className="loading-text">加载中...</div>
        </div>
      ) : history.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <div className="empty-state-text">暂无历史记录，上传简历开始第一次分析吧</div>
        </div>
      ) : (
        <div className="history-grid">
          {history.map((item, idx) => (
            <motion.div
              key={item.analysis_id}
              className="history-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -4 }}
              onClick={() => handleCardClick(item.analysis_id)}
            >
              <div className="history-job-title">{item.job_title || '未指定岗位'}</div>
              <div className={`history-score ${getScoreClass(item.overall_score)}`}>
                {item.overall_score}%
              </div>
              <div className="history-date">{item.created_at}</div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default HistoryPage;
