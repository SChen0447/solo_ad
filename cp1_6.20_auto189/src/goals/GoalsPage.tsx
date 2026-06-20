import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import CircularProgress from './components/CircularProgress';
import Celebration from './components/Celebration';
import { achievementsAPI } from '../services/api';
import type { Achievement } from '../types';
import './GoalsPage.css';

const MONSTER_TYPES = ['人形', '野兽', '亡灵', '元素', '恶魔'];

const GoalsPage = () => {
  const [goals, setGoals] = useState<Achievement[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationGoal, setCelebrationGoal] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    monster_type: '人形',
    target_count: 100,
    deadline: '',
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const data = await achievementsAPI.getAchievements();
      setGoals(data);
    } catch (error) {
      console.error('加载目标失败:', error);
    }
  };

  const handleCreateGoal = async () => {
    if (!formData.name.trim()) {
      alert('请输入目标名称');
      return;
    }
    if (!formData.deadline) {
      alert('请选择截止日期');
      return;
    }

    try {
      const newGoal = await achievementsAPI.createAchievement(formData);
      setGoals((prev) => [...prev, newGoal]);
      setShowForm(false);
      setFormData({
        name: '',
        monster_type: '人形',
        target_count: 100,
        deadline: '',
      });
    } catch (error) {
      console.error('创建目标失败:', error);
    }
  };

  const handleDeleteGoal = async (id: string) => {
    try {
      await achievementsAPI.deleteAchievement(id);
      setGoals((prev) => prev.filter((g) => g.id !== id));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('删除目标失败:', error);
    }
  };

  const checkAchievement = (goal: Achievement) => {
    if (goal.current_count >= goal.target_count && !showCelebration) {
      setCelebrationGoal(goal.name);
      setShowCelebration(true);
    }
  };

  useEffect(() => {
    goals.forEach(checkAchievement);
  }, [goals]);

  return (
    <motion.div
      className="goals-page"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <div className="goals-header">
        <h2 className="goals-title">成就目标</h2>
        <button className="btn-primary add-goal-btn" onClick={() => setShowForm(true)}>
          + 新建目标
        </button>
      </div>

      {goals.length > 0 ? (
        <div className="goals-grid">
          {goals.map((goal, index) => (
            <motion.div
              key={goal.id}
              className="goal-card card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1, duration: 0.3 }}
              whileHover={{ y: -4, boxShadow: '0 8px 25px var(--shadow-color)' }}
            >
              <button
                className="delete-btn"
                onClick={() => setDeleteConfirm(goal.id)}
                title="删除目标"
              >
                🗑️
              </button>

              <div className="goal-card-content">
                <h3 className="goal-name">{goal.name}</h3>
                <p className="goal-type">类型：{goal.monster_type}</p>
                <p className="goal-target">目标：{goal.target_count} 次</p>
                <p className="goal-deadline">截止：{goal.deadline}</p>
              </div>

              <div className="goal-progress">
                <CircularProgress
                  current={goal.current_count}
                  target={goal.target_count}
                  size={80}
                  strokeWidth={4}
                />
                <p className="goal-count">
                  {goal.current_count} / {goal.target_count}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="empty-goals">
          <p className="empty-icon">🎯</p>
          <p className="empty-text">还没有成就目标，点击右上角创建一个吧！</p>
        </div>
      )}

      <AnimatePresence>
        {showForm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowForm(false)}
          >
            <motion.div
              className="modal-content"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="modal-title">新建成就目标</h3>

              <div className="form-group">
                <label className="form-label">目标名称</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="例如：百兽斩"
                />
              </div>

              <div className="form-group">
                <label className="form-label">怪物类型</label>
                <select
                  className="form-input"
                  value={formData.monster_type}
                  onChange={(e) => setFormData({ ...formData, monster_type: e.target.value })}
                >
                  {MONSTER_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">目标次数</label>
                <input
                  type="number"
                  className="form-input"
                  value={formData.target_count}
                  onChange={(e) =>
                    setFormData({ ...formData, target_count: parseInt(e.target.value) || 0 })
                  }
                  min="1"
                />
              </div>

              <div className="form-group">
                <label className="form-label">截止日期</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowForm(false)}>
                  取消
                </button>
                <button className="btn-primary" onClick={handleCreateGoal}>
                  创建
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              className="modal-content small"
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="modal-title">确认删除</h3>
              <p className="modal-text">确定要删除这个成就目标吗？此操作不可恢复。</p>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setDeleteConfirm(null)}>
                  取消
                </button>
                <button
                  className="btn-danger"
                  onClick={() => handleDeleteGoal(deleteConfirm)}
                >
                  删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <Celebration
        goalName={celebrationGoal}
        show={showCelebration}
        onClose={() => setShowCelebration(false)}
      />
    </motion.div>
  );
};

export default GoalsPage;
