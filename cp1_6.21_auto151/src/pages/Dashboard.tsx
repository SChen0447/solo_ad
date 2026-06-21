import { useState, useEffect, useCallback } from 'react';
import { api, type Plot, type Task, type User } from '../utils/api';

interface DashboardProps {
  currentUser: User | null;
}

const TASK_INFO: Record<string, { icon: string; name: string }> = {
  water: { icon: '💧', name: '浇水' },
  fertilize: { icon: '🌿', name: '施肥' },
  weed: { icon: '🔪', name: '除草' },
};

const STAGE_INFO: Record<string, { label: string; color: string }> = {
  seed: { label: '播种期', color: '#8D6E63' },
  sprout: { label: '发芽期', color: '#81C784' },
  bloom: { label: '开花期', color: '#F48FB1' },
  harvest: { label: '收获期', color: '#FFB74D' },
};

function Dashboard({ currentUser }: DashboardProps) {
  const [plots, setPlots] = useState<Plot[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showEmojiPopup, setShowEmojiPopup] = useState(false);
  const [emojiPopupContent, setEmojiPopupContent] = useState({ emoji: '', text: '' });
  const [loading, setLoading] = useState(true);

  const emojiOptions = [
    { emoji: '😊', text: '开心！' },
    { emoji: '🎉', text: '很棒！' },
    { emoji: '💪', text: '继续加油！' },
  ];

  const loadData = useCallback(async () => {
    if (!currentUser) return;
    
    setLoading(true);
    try {
      const [plotsData, tasksData] = await Promise.all([
        api.getUserPlots(currentUser.id),
        api.getTasks(currentUser.id),
      ]);
      setPlots(plotsData);
      setTasks(tasksData);
    } catch (error) {
      console.error('加载数据失败:', error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const calculateProgress = (plot: Plot) => {
    const totalDays = (plot.seedDays || 0) + (plot.sproutDays || 0) + 
                      (plot.bloomDays || 0) + (plot.harvestDays || 0);
    if (totalDays === 0) return 0;

    const stageDays: Record<string, number> = {
      seed: plot.seedDays || 0,
      sprout: plot.sproutDays || 0,
      bloom: plot.bloomDays || 0,
      harvest: plot.harvestDays || 0,
    };

    const stages = ['seed', 'sprout', 'bloom', 'harvest'];
    const currentStageIndex = stages.indexOf(plot.currentStage || 'seed');
    
    let completedDays = 0;
    for (let i = 0; i < currentStageIndex; i++) {
      completedDays += stageDays[stages[i]];
    }

    const tasksPerDay = Math.ceil(
      (plot.waterPerDay || 0) + (plot.fertilizePerDay || 0) + (plot.weedPerDay || 0)
    );
    const currentStageTotal = stageDays[plot.currentStage || 'seed'] * tasksPerDay;
    const currentProgress = currentStageTotal > 0 
      ? ((plot.stageProgress || 0) / currentStageTotal) * stageDays[plot.currentStage || 'seed']
      : 0;

    return Math.min(100, ((completedDays + currentProgress) / totalDays) * 100);
  };

  const handleCompleteTask = async (taskId: string) => {
    if (!currentUser) return;

    try {
      await api.completeTask(taskId);
      
      const randomOption = emojiOptions[Math.floor(Math.random() * emojiOptions.length)];
      setEmojiPopupContent(randomOption);
      setShowEmojiPopup(true);

      setTimeout(() => {
        setShowEmojiPopup(false);
      }, 1500);

      await loadData();
    } catch (error: any) {
      alert(error.message || '打卡失败');
    }
  };

  const handleHarvest = async (plotId: string) => {
    if (!currentUser) return;

    try {
      const result = await api.harvest(plotId);
      alert(`🎉 收获成功！获得 ${result.harvestQuantity} 个作物`);
      await loadData();
    } catch (error: any) {
      alert(error.message || '收获失败');
    }
  };

  const getPlotTasks = (plotId: string) => {
    return tasks.filter(t => t.plotId === plotId);
  };

  const getStatusBadge = (status: string) => {
    const badgeClass = `status-${status}`;
    const labels: Record<string, string> = {
      claimed: '生长中',
      mature: '已成熟',
      wilted: '已萎蔫',
    };
    return <span className={`plot-status-badge ${badgeClass}`}>{labels[status] || status}</span>;
  };

  if (loading) {
    return (
      <div>
        <h2 className="page-title">🏡 我的农场</h2>
        <p>加载中...</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="page-title">🏡 我的农场</h2>

      {plots.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-emoji">🌱</div>
          <p>你还没有认领任何菜地</p>
          <p style={{ fontSize: '0.9rem', marginTop: '8px' }}>
            去菜地页面认领一块地开始种植吧！
          </p>
        </div>
      ) : (
        <div className="dashboard-grid list-scroll">
          {plots.map(plot => (
            <div key={plot.id} className="card plot-card">
              <div className="plot-card-header">
                <div className="plot-crop">
                  <span className="plot-crop-emoji">{plot.cropEmoji}</span>
                  <span>{plot.cropName}</span>
                </div>
                {getStatusBadge(plot.status)}
              </div>

              <div className="stage-progress">
                <div className="stage-labels">
                  {['seed', 'sprout', 'bloom', 'harvest'].map(stage => (
                    <span 
                      key={stage} 
                      style={{ 
                        color: plot.currentStage === stage ? 'var(--grass-green)' : undefined,
                        fontWeight: plot.currentStage === stage ? '600' : 'normal'
                      }}
                    >
                      {STAGE_INFO[stage].label}
                    </span>
                  ))}
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-fill" 
                    style={{ width: `${calculateProgress(plot)}%` }}
                  />
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-medium)', marginTop: '6px' }}>
                  当前阶段：{STAGE_INFO[plot.currentStage || 'seed'].label}
                </p>
              </div>

              {plot.status === 'mature' && (
                <button 
                  className="btn btn-yellow"
                  style={{ width: '100%', marginBottom: '12px' }}
                  onClick={() => handleHarvest(plot.id)}
                >
                  🌾 收获作物
                </button>
              )}

              <div className="task-list">
                <h4 style={{ fontSize: '0.9rem', marginBottom: '10px', color: 'var(--text-dark)' }}>
                  今日任务
                </h4>
                {getPlotTasks(plot.id).length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-medium)' }}>
                    今日暂无任务
                  </p>
                ) : (
                  getPlotTasks(plot.id).map(task => (
                    <div 
                      key={task.id} 
                      className={`task-item ${!task.completed ? 'today pulse' : ''} ${task.completed ? 'task-completed' : ''}`}
                    >
                      <div className="task-info">
                        <span className="task-icon">{TASK_INFO[task.type]?.icon}</span>
                        <span className="task-name">{TASK_INFO[task.type]?.name}</span>
                      </div>
                      {task.completed ? (
                        <span className="task-btn task-btn-done">✓ 已完成</span>
                      ) : (
                        <button 
                          className="task-btn task-btn-do"
                          onClick={() => handleCompleteTask(task.id)}
                        >
                          打卡
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showEmojiPopup && (
        <div className="emoji-popup">
          <span className="emoji">{emojiPopupContent.emoji}</span>
          <span className="text">{emojiPopupContent.text}</span>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
