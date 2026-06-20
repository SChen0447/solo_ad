import React, { useState, useEffect } from 'react';
import { RankingItem } from '../types';
import { getRankings, exportRankings } from '../services/scores';
import BarChart from '../components/BarChart';

const Rankings: React.FC = () => {
  const [rankings, setRankings] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const fetchRankings = async () => {
      try {
        const response = await getRankings();
        setRankings(response.rankings);
      } catch (err: any) {
        setError(err.response?.data?.message || '加载排行榜失败');
      } finally {
        setLoading(false);
      }
    };

    fetchRankings();
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportRankings();
    } catch (err: any) {
      setError(err.response?.data?.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="main-content">
        <div className="loading">加载中...</div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="ranking-header">
        <h1 className="page-title" style={{ marginBottom: 0 }}>
          排行榜
        </h1>
        <button
          className="btn btn-primary"
          onClick={handleExport}
          disabled={exporting || rankings.length === 0}
        >
          {exporting ? '导出中...' : '导出CSV'}
        </button>
      </div>

      {error && (
        <div className="loading" style={{ color: 'var(--color-error)' }}>
          {error}
        </div>
      )}

      {rankings.length === 0 ? (
        <div className="loading">暂无排名数据</div>
      ) : (
        <div>
          {rankings.map((item) => (
            <div key={item.work_id} className="ranking-item">
              <div className={`rank-number rank-${item.rank}`}>
                {item.rank <= 3 ? `🥇🥈🥉`[item.rank - 1] || item.rank : item.rank}
              </div>
              <div className="ranking-thumbnail">
                <img src={item.thumbnail_path} alt={item.title} />
              </div>
              <div className="ranking-info">
                <h3>{item.title}</h3>
                <p className="author">@{item.author}</p>
                <div className="ranking-stats">
                  <span>评分人数：{item.score_count}</span>
                </div>
                <BarChart
                  data={[
                    { label: '构图', value: item.avg_composition, max: 10 },
                    { label: '色彩', value: item.avg_color, max: 10 },
                    { label: '创意', value: item.avg_creativity, max: 10 },
                    { label: '情感', value: item.avg_emotion, max: 10 },
                  ]}
                />
              </div>
              <div className="ranking-score">
                <div className="ranking-avg">{item.avg_total.toFixed(2)}</div>
                <div className="ranking-minmax">
                  最高 {item.max_score} / 最低 {item.min_score}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Rankings;
