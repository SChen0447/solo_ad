import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import type { Plan } from '../types';
import { useAuth } from '../App';
import { planApi } from '../services/api';
import { formatCurrency } from '../utils/expenseCalc';

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      ease: 'easeOut'
    }
  })
};

const PlanCard: React.FC<{ plan: Plan; index: number; onClick: () => void }> = ({ plan, index, onClick }) => {
  const maxVisibleAvatars = 4;
  const hiddenMembersCount = plan.members.length - maxVisibleAvatars;
  const budgetPercentage = plan.total_budget > 0 ? Math.min((plan.total_spent / plan.total_budget) * 100, 100) : 0;

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      whileHover={{ y: -6, transition: { duration: 0.3, ease: 'easeInOut' } }}
      onClick={onClick}
      style={{
        background: 'linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'box-shadow 0.3s ease-in-out',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)';
      }}
    >
      <div style={{ position: 'relative', height: '160px', overflow: 'hidden' }}>
        <img
          src={plan.cover_image}
          alt={plan.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          padding: '16px',
          background: 'linear-gradient(transparent, rgba(0,0,0,0.6)'
        }}>
          <h3 style={{ color: 'white', fontSize: '18px', fontWeight: 600, margin: 0 }}>{plan.name}</h3>
        </div>
      </div>
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4a5568', fontSize: '13px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span>{plan.start_date} ~ {plan.end_date}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {plan.members.slice(0, maxVisibleAvatars).map((member, idx) => (
              <div key={member.id} style={{ position: 'relative', marginLeft: idx > 0 ? '-10px' : 0 }}>
                <img
                  src={member.avatar}
                  alt={member.name}
                  className="avatar avatar-small"
                  style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white', position: 'relative', zIndex: maxVisibleAvatars - idx }}
                />
                <span
                  className={`online-indicator ${member.online ? '' : 'offline'}`}
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    backgroundColor: member.online ? '#38a169' : '#718096',
                    border: '2px solid white',
                    zIndex: maxVisibleAvatars - idx + 1
                  }}
                ></span>
              </div>
            ))}
            {hiddenMembersCount > 0 && (
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 500,
                color: '#4a5568',
                marginLeft: '-10px',
                border: '2px solid white',
                zIndex: 0
              }}>
                +{hiddenMembersCount}
              </div>
            )}
          </div>
        </div>
        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '13px' }}>
            <span style={{ color: '#4a5568' }}>已花费</span>
            <span style={{ color: '#1a202c', fontWeight: 500 }}>
              {formatCurrency(plan.total_spent)} / {formatCurrency(plan.total_budget)}
            </span>
          </div>
          <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${budgetPercentage}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: index * 0.05 }}
              style={{
                height: '100%',
                backgroundColor: budgetPercentage > 90 ? '#e53e3e' : budgetPercentage > 70 ? '#d69e2e' : '#3182ce',
                borderRadius: '4px'
              }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CreatePlanModal: React.FC<{ isOpen: boolean; onClose: () => void; onCreate: (plan: Plan) => void }> = ({ isOpen, onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [totalBudget, setTotalBudget] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      setError('请填写必填项');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setError('结束日期不能早于开始日期');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const plan = await planApi.createPlan({
        name,
        description,
        start_date: startDate,
        end_date: endDate,
        total_budget: totalBudget ? parseFloat(totalBudget) : 0
      });
      onCreate(plan);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || '创建失败');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '16px'
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '32px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: '#1a202c' }}>创建新计划</h2>
          {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>计划名称 *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：东京五日游"
                style={{ width: '100%' }}
                required
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="简单描述一下这次旅行"
                style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>开始日期 *</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>结束日期 *</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>总预算 (¥)</label>
              <input
                type="number"
                value={totalBudget}
                onChange={(e) => setTotalBudget(e.target.value)}
                placeholder="0.00"
                min="0"
                step="0.01"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} className="btn btn-outline" style={{ padding: '10px 24px' }}>
                取消
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                {loading ? '创建中...' : '创建计划'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const PlanList: React.FC = () => {
  const { plans } = useAuth();
  const [planList, setPlanList] = useState<Plan[]>(plans);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();

  const handleCreatePlan = (plan: Plan) => {
    setPlanList([...planList, plan]);
  };

  return (
    <div className="page-container" style={{ paddingTop: '32px', paddingBottom: '48px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 600, color: '#1a202c', marginBottom: '4px' }}>我的旅行计划</h1>
          <p style={{ color: '#718096', fontSize: '14px' }}>共 {planList.length} 个计划</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn btn-primary"
          style={{ padding: '10px 20px', fontSize: '14px' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          创建计划
        </button>
      </div>
      {planList.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            padding: '80px 20px',
            backgroundColor: '#f7fafc',
            borderRadius: '12px'
          }}
        >
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#cbd5e0" strokeWidth="1.5" style={{ margin: '0 auto 16px' }}>
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <h3 style={{ fontSize: '18px', fontWeight: 500, color: '#4a5568', marginBottom: '8px' }}>还没有旅行计划</h3>
          <p style={{ color: '#718096', fontSize: '14px', marginBottom: '24px' }}>点击上方按钮创建你的第一个旅行计划吧</p>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            创建第一个计划
          </button>
        </motion.div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '24px'
        }}>
          <AnimatePresence>
            {planList.map((plan, index) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                index={index}
                onClick={() => navigate(`/plans/${plan.id}`)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
      <CreatePlanModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreate={handleCreatePlan}
      />
    </div>
  );
};

export default PlanList;
