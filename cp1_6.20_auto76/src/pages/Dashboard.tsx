import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Clock, Loader2 } from 'lucide-react';
import api from '../utils/api';
import { Plan } from '../types';
import PlanCard from '../components/PlanCard';

const timeSlotOptions = [
  '06:00-06:30', '06:30-07:00', '07:00-07:30',
  '08:00-08:30', '08:30-09:00', '09:00-09:30',
  '10:00-10:30', '10:30-11:00', '11:00-11:30',
  '14:00-14:30', '14:30-15:00', '15:00-15:30',
  '16:00-16:30', '16:30-17:00', '17:00-17:30',
  '19:00-19:30', '19:30-20:00', '20:00-20:30',
  '21:00-21:30', '21:30-22:00', '22:00-22:30',
];

const Dashboard: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_date: '',
    end_date: '',
    time_slots: [] as string[],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await api.get('/plans');
      setPlans(response.data);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!formData.name || !formData.start_date || !formData.end_date || formData.time_slots.length === 0) {
      setError('请填写所有必填字段');
      return;
    }

    if (new Date(formData.start_date) > new Date(formData.end_date)) {
      setError('开始日期不能晚于结束日期');
      return;
    }

    try {
      setSubmitting(true);
      await api.post('/plans', formData);
      setShowModal(false);
      setFormData({ name: '', description: '', start_date: '', end_date: '', time_slots: [] });
      fetchPlans();
    } catch (err: any) {
      setError(err.response?.data?.message || '创建失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTimeSlot = (slot: string) => {
    setFormData(prev => ({
      ...prev,
      time_slots: prev.time_slots.includes(slot)
        ? prev.time_slots.filter(s => s !== slot)
        : [...prev.time_slots, slot]
    }));
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
      <div>
        <h1 className="page-title">我的学习计划</h1>
        <p className="page-subtitle">管理你的学习进度，实现学习目标</p>
      </div>
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowModal(true)}
        className="btn btn-primary"
      >
        <Plus size={18} />
        创建新计划
      </motion.button>
    </div>

    {loading ? (
      <div className="loading-container">
        <Loader2 size={32} className="spinner" />
      </div>
    ) : plans.length === 0 ? (
      <div className="empty-state">
        <div className="empty-icon">📚</div>
        <h3>还没有学习计划</h3>
        <p>点击上方按钮创建你的第一个学习计划</p>
      </div>
    ) : (
      <div className="plans-grid">
        {plans.map((plan, index) => (
          <PlanCard key={plan.id} plan={plan} index={index} />
        ))}
      </div>
    )}

    <AnimatePresence>
      {showModal && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="modal-overlay"
            onClick={() => setShowModal(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="modal"
          >
            <div className="modal-header">
              <h2>创建学习计划</h2>
              <button
                className="modal-close"
                onClick={() => setShowModal(false)}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="modal-body">
              <div className="form-field">
                <label className="field-label">计划名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))
                  placeholder="例如：Python 入门学习"
                  className="field-input"
                />
              </div>

              <div className="form-field">
                <label className="field-label">目标描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))
                  placeholder="描述你的学习目标..."
                  className="field-textarea"
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label className="field-label">开始日期 *</label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))
                    className="field-input"
                  />
                </div>
                <div className="form-field">
                  <label className="field-label">结束日期 *</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))
                    className="field-input"
                  />
                </div>
              </div>

              <div className="form-field">
                <label className="field-label">
                  <Clock size={16} style={{ marginRight: '4px' }} />
                  选择学习时段 *（可多选，每段30分钟
                </label>
                <div className="time-slots-grid">
                  {timeSlotOptions.map((slot) => (
                  <motion.button
                    key={slot}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleTimeSlot(slot)}
                    className={`time-slot-btn ${formData.time_slots.includes(slot) ? 'selected' : ''}`}
                  >
                    {slot}
                  </motion.button>
                ))}
              </div>
            </div>

              {error && (
              <div className="form-error">{error}</div>
            )}

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowModal(false)}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="btn btn-primary"
              >
                  {submitting ? (
                  <Loader2 size={16} className="spinner" />
                ) : (
                  '创建'
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </>
    )}
  </AnimatePresence>
    </div>
  );
};

export default Dashboard;
