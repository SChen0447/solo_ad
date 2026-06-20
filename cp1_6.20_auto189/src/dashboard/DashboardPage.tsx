import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import LogImporter from './components/LogImporter';
import ChartGroup from './components/ChartGroup';
import StatsSummary from './components/StatsSummary';
import { dashboardAPI, achievementsAPI } from '../services/api';
import type { CombatEvent, Achievement } from '../types';
import './DashboardPage.css';

const DashboardPage = () => {
  const [events, setEvents] = useState<CombatEvent[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    loadAchievements();
  }, []);

  useEffect(() => {
    if (events.length > 0) {
      updateAchievementProgress();
    }
  }, [events]);

  const loadAchievements = async () => {
    try {
      const data = await achievementsAPI.getAchievements();
      setAchievements(data);
    } catch (error) {
      console.error('加载成就失败:', error);
    }
  };

  const updateAchievementProgress = async () => {
    try {
      const data = await achievementsAPI.calculateProgress(events);
      setAchievements(data);
    } catch (error) {
      console.error('更新进度失败:', error);
    }
  };

  const handleParseLogs = async (file: File) => {
    return await dashboardAPI.parseLogs(file);
  };

  const handleParseComplete = (parsedEvents: CombatEvent[]) => {
    setEvents(parsedEvents);
  };

  const incompleteAchievements = achievements
    .filter((a) => a.current_count < a.target_count)
    .slice(0, 3);

  const getProgressColor = (current: number, target: number) => {
    const percent = (current / target) * 100;
    if (percent < 33) return '#ff4757';
    if (percent < 66) return '#ffa502';
    return '#2ed573';
  };

  return (
    <motion.div
      className="dashboard-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="dashboard-layout">
        <div className="dashboard-left">
          <div className="card">
            <h3 className="section-title">日志导入</h3>
            <LogImporter onParse={handleParseLogs} onComplete={handleParseComplete} />
          </div>

          {events.length > 0 && (
            <div className="card stats-card">
              <StatsSummary events={events} />
            </div>
          )}
        </div>

        <div className="dashboard-center">
          <div className="card chart-card">
            <h3 className="section-title">战斗数据分析</h3>
            {events.length > 0 ? (
              <ChartGroup events={events} />
            ) : (
              <div className="empty-state">
                <p className="empty-icon">📈</p>
                <p className="empty-text">请先上传战斗日志以查看数据分析</p>
              </div>
            )}
          </div>
        </div>

        <div className="dashboard-right">
          <div className="card">
            <h3 className="section-title">快捷目标</h3>
            {incompleteAchievements.length > 0 ? (
              <div className="quick-goals">
                {incompleteAchievements.map((goal) => (
                  <div key={goal.id} className="quick-goal-item">
                    <div className="quick-goal-info">
                      <p className="quick-goal-name">{goal.name}</p>
                      <p className="quick-goal-count">
                        {goal.current_count} / {goal.target_count}
                      </p>
                    </div>
                    <div
                      className="quick-goal-progress"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: `conic-gradient(${getProgressColor(goal.current_count, goal.target_count)} ${(goal.current_count / goal.target_count) * 360}deg, var(--border-color) 0)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          fontWeight: 'bold',
                        }}
                      >
                        {Math.round((goal.current_count / goal.target_count) * 100)}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state small">
                <p className="empty-text small">暂无未完成目标</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default DashboardPage;
