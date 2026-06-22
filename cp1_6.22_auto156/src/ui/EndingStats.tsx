import { useEffect, useState } from 'react';
import { ChoiceRecord } from '../store/store';

interface EndingStatsProps {
  choiceHistory: ChoiceRecord[];
  endingType?: string;
  onRestart: () => void;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const ALL_ACHIEVEMENTS: Achievement[] = [
  { id: 'first_dialogue', name: '初次对话', description: '完成第一段对话', icon: '💬' },
  { id: 'hesitant', name: '犹豫不决', description: '在选项前停留超过10秒', icon: '🤔' },
  { id: 'complete_hero', name: '英雄之路', description: '达成英雄结局', icon: '🦸' },
  { id: 'all_endings', name: '完整通关', description: '通关任意结局', icon: '🏆' },
  { id: 'explorer', name: '探索者', description: '经历3个以上分支', icon: '🔍' }
];

const ENDING_NAMES: Record<string, string> = {
  hero: '英雄结局',
  coward: '逃避结局',
  refuse: '拒绝结局',
  villager: '村民结局'
};

export function EndingStats({ choiceHistory, endingType, onRestart }: EndingStatsProps) {
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [showAnimation, setShowAnimation] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('achievements');
    const existing: string[] = saved ? JSON.parse(saved) : [];
    
    const newAchievements: string[] = [...existing];

    if (!newAchievements.includes('first_dialogue')) {
      newAchievements.push('first_dialogue');
    }

    if (!newAchievements.includes('all_endings') && endingType) {
      newAchievements.push('all_endings');
    }

    if (!newAchievements.includes('complete_hero') && endingType === 'hero') {
      newAchievements.push('complete_hero');
    }

    const uniqueScenes = new Set(choiceHistory.map(c => c.sceneId));
    if (!newAchievements.includes('explorer') && uniqueScenes.size >= 3) {
      newAchievements.push('explorer');
    }

    localStorage.setItem('achievements', JSON.stringify(newAchievements));
    setUnlockedAchievements(newAchievements);

    setTimeout(() => setShowAnimation(true), 300);
  }, [choiceHistory, endingType]);

  const branchStats = () => {
    const sceneCounts: Record<string, number> = {};
    const sceneNames: Record<string, string> = {};
    
    choiceHistory.forEach(choice => {
      if (!sceneCounts[choice.sceneId]) {
        sceneCounts[choice.sceneId] = 0;
      }
      sceneCounts[choice.sceneId]++;
      sceneNames[choice.sceneId] = choice.choiceText;
    });

    const total = choiceHistory.length || 1;
    return Object.entries(sceneCounts).map(([sceneId, count]) => ({
      sceneId,
      label: sceneNames[sceneId] || sceneId,
      percentage: Math.round((count / total) * 100)
    }));
  };

  const stats = branchStats();
  const endingName = endingType ? ENDING_NAMES[endingType] || '未知结局' : '游戏结束';

  return (
    <div className="ending-stats-overlay">
      <div className={`ending-stats-panel ${showAnimation ? 'show' : ''}`}>
        <h1 className="ending-title">🎉 {endingName}</h1>
        
        <div className="stats-section">
          <h2>分支路线统计</h2>
          <div className="branch-stats">
            {stats.length > 0 ? (
              stats.map((stat, index) => (
                <div key={stat.sceneId} className="stat-bar" style={{ animationDelay: `${index * 0.2}s` }}>
                  <span className="stat-label">{stat.label}</span>
                  <div className="bar-container">
                    <div 
                      className="bar-fill" 
                      style={{ width: `${stat.percentage}%` }}
                    />
                  </div>
                  <span className="stat-percentage">{stat.percentage}%</span>
                </div>
              ))
            ) : (
              <p className="no-stats">暂无分支数据</p>
            )}
          </div>
          <div className="total-choices">
            总选择次数：{choiceHistory.length} 次
          </div>
        </div>

        <div className="achievements-section">
          <h2>🏅 成就</h2>
          <div className="achievement-list">
            {ALL_ACHIEVEMENTS.map(achievement => {
              const isUnlocked = unlockedAchievements.includes(achievement.id);
              return (
                <div
                  key={achievement.id}
                  className={`achievement-card ${isUnlocked ? 'unlocked' : 'locked'}`}
                >
                  <div className="achievement-icon">{achievement.icon}</div>
                  <div className="achievement-info">
                    <div className="achievement-name">{achievement.name}</div>
                    <div className="achievement-desc">{achievement.description}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <button className="restart-btn" onClick={onRestart}>
          重新开始
        </button>
      </div>
    </div>
  );
}
