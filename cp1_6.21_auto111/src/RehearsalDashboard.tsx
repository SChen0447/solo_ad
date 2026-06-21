import { useState, useEffect } from 'react';
import { format, differenceInDays } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Music, Calendar, Clock, Users, ChevronRight } from 'lucide-react';
import { getRepertoires, Repertoire } from './dataStore';

const difficultyLabels: Record<string, string> = {
  easy: '简单',
  medium: '中等',
  hard: '困难',
};

const partDifficultyLabels: Record<string, string> = {
  easy: '易',
  medium: '中',
  hard: '难',
};

function getProgressColor(progress: number): 'red' | 'orange' | 'green' {
  if (progress < 30) return 'red';
  if (progress < 70) return 'orange';
  return 'green';
}

function formatCountdown(dateStr: string): string {
  const target = new Date(dateStr);
  const today = new Date();
  const days = differenceInDays(target, today);
  if (days < 0) return '已过期';
  if (days === 0) return '今天';
  if (days === 1) return '明天';
  return `${days}天后`;
}

export default function RehearsalDashboard() {
  const [repertoires, setRepertoires] = useState<Repertoire[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    getRepertoires()
      .then((data) => setRepertoires(data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    );
  }

  const totalRehearsals = repertoires.reduce((sum, r) => sum + r.rehearsalCount, 0);
  const avgProgress = Math.round(
    repertoires.reduce((sum, r) => sum + r.progress, 0) / repertoires.length
  );
  const upcomingCount = repertoires.filter((r) => {
    const days = differenceInDays(new Date(r.nextRehearsal), new Date());
    return days >= 0 && days <= 7;
  }).length;

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">排练进度总览</h1>
        <p className="page-subtitle">查看所有曲目的排练进度和计划安排</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{repertoires.length}</div>
          <div className="stat-label">曲目总数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{totalRehearsals}</div>
          <div className="stat-label">累计排练次数</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{avgProgress}%</div>
          <div className="stat-label">平均完成度</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{upcomingCount}</div>
          <div className="stat-label">本周排练</div>
        </div>
      </div>

      <div className="grid-container">
        {repertoires.map((rep, index) => (
          <div
            key={rep.id}
            className="glass-card"
            style={{ animationDelay: `${index * 0.1}s`, opacity: 0 }}
          >
            <div className="progress-row">
              <div className="repertoire-name">
                <Music size={18} style={{ color: '#3498DB' }} />
                {rep.name}
                <span className={`difficulty-tag ${rep.difficulty}`}>
                  {difficultyLabels[rep.difficulty]}
                </span>
              </div>

              <div className="progress-bar-container">
                <div
                  className={`progress-bar ${getProgressColor(rep.progress)}`}
                  style={{ width: `${rep.progress}%` }}
                />
              </div>

              <div className="progress-meta">
                <span className="progress-count">
                  <Calendar size={12} />
                  已排练 {rep.rehearsalCount} 次
                </span>
                <span className="countdown">
                  <Clock size={12} />
                  {formatCountdown(rep.nextRehearsal)}
                </span>
              </div>

              <button
                className="btn btn-secondary btn-small"
                style={{
                  width: '100%',
                  marginTop: '12px',
                  fontSize: '12px',
                  padding: '8px 12px',
                  minHeight: '36px',
                }}
                onClick={() => setExpandedId(expandedId === rep.id ? null : rep.id)}
              >
                分谱难度
                <ChevronRight
                  size={14}
                  style={{
                    transition: 'transform 0.2s ease',
                    transform: expandedId === rep.id ? 'rotate(90deg)' : 'rotate(0deg)',
                  }}
                />
              </button>

              {expandedId === rep.id && (
                <div className="parts-list">
                  {rep.parts.map((part, idx) => (
                    <span key={idx} className="part-tag">
                      {part.name}
                      <span
                        style={{
                          fontSize: '9px',
                          padding: '1px 4px',
                          borderRadius: '3px',
                          background:
                            part.difficulty === 'easy'
                              ? 'rgba(39, 174, 96, 0.2)'
                              : part.difficulty === 'medium'
                              ? 'rgba(243, 156, 18, 0.2)'
                              : 'rgba(231, 76, 60, 0.2)',
                          color:
                            part.difficulty === 'easy'
                              ? '#27AE60'
                              : part.difficulty === 'medium'
                              ? '#F39C12'
                              : '#E74C3C',
                        }}
                      >
                        {partDifficultyLabels[part.difficulty]}
                      </span>
                    </span>
                  ))}
                </div>
              )}

              <div style={{ marginTop: '12px', fontSize: '11px', color: '#95a5a6' }}>
                下次排练：
                {format(new Date(rep.nextRehearsal), 'yyyy年MM月dd日', { locale: zhCN })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
