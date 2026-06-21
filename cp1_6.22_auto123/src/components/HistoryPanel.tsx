import { X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { getLast7DaysHistory } from '@/utils/storage';
import styles from './HistoryPanel.module.css';

const HistoryPanel = () => {
  const { history, showHistoryPanel, setShowHistoryPanel } = useAppStore();
  const last7Days = getLast7DaysHistory(history);
  const maxSessions = Math.max(...last7Days.map((d) => d.completedSessions), 1);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    return days[date.getDay()];
  };

  if (!showHistoryPanel) return null;

  return (
    <div className={styles.overlay} onClick={() => setShowHistoryPanel(false)}>
      <div
        className={`${styles.panel} ${showHistoryPanel ? styles.visible : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h2 className={styles.title}>历史记录</h2>
          <button
            className={styles.closeButton}
            onClick={() => setShowHistoryPanel(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.content}>
          <p className={styles.subtitle}>最近7天完成次数</p>

          <div className={styles.chartContainer}>
            {last7Days.map((day, index) => {
              const heightPercent = maxSessions > 0
                ? (day.completedSessions / maxSessions) * 100
                : 0;

              return (
                <div key={day.date} className={styles.barGroup}>
                  <div className={styles.barWrapper}>
                    <div
                      className={styles.bar}
                      style={{
                        height: `${Math.max(heightPercent, 4)}%`,
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <span className={styles.barValue}>{day.completedSessions}</span>
                    </div>
                  </div>
                  <div className={styles.dayLabel}>{getDayName(day.date)}</div>
                  <div className={styles.dateLabel}>{formatDate(day.date)}</div>
                </div>
              );
            })}
          </div>

          <div className={styles.stats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {last7Days.reduce((sum, d) => sum + d.completedSessions, 0)}
              </span>
              <span className={styles.statLabel}>本周总计</span>
            </div>
            <div className={styles.statItem}>
              <span className={styles.statValue}>
                {(last7Days.reduce((sum, d) => sum + d.completedSessions, 0) / 7).toFixed(1)}
              </span>
              <span className={styles.statLabel}>日均次数</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPanel;
