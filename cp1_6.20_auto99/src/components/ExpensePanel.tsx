import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { User, Expense, MemberBalance, SettlementPair } from '../types';
import { expenseApi, settlementApi } from '../services/api';
import { calculateMemberBalances, calculateSettlementPairs, formatCurrency, getBalanceColor } from '../utils/expenseCalc';

interface ExpensePanelProps {
  planId: number;
  members: User[];
  expenses: Expense[];
  currentUserId: number;
  onExpensesChange: (expenses: Expense[]) => void;
}

const AddExpenseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onAdd: (expense: Expense) => void;
  members: User[];
  planId: number;
  currentUserId: number;
}> = ({ isOpen, onClose, onAdd, members, planId, currentUserId }) => {
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState(currentUserId.toString());
  const [splitType, setSplitType] = useState<'equal' | 'custom'>('equal');
  const [selectedMembers, setSelectedMembers] = useState<Set<number>>(new Set(members.map(m => m.id)));
  const [customRatios, setCustomRatios] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (isOpen) {
      setTitle('');
      setAmount('');
      setPaidBy(currentUserId.toString());
      setSplitType('equal');
      setSelectedMembers(new Set(members.map(m => m.id)));
      setCustomRatios({});
      setError('');
    }
  }, [isOpen, members, currentUserId]);

  const toggleMember = (memberId: number) => {
    setSelectedMembers(prev => {
      const next = new Set(prev);
      if (next.has(memberId)) {
        next.delete(memberId);
      } else {
        next.add(memberId);
      }
      return next;
    });
  };

  const handleRatioChange = (memberId: number, value: string) => {
    const ratio = parseFloat(value) || 0;
    setCustomRatios(prev => ({
      ...prev,
      [memberId.toString()]: ratio
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount) {
      setError('请填写必填项');
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError('请输入有效的金额');
      return;
    }
    if (selectedMembers.size === 0) {
      setError('请至少选择一位分摊成员');
      return;
    }
    if (splitType === 'custom') {
      const totalRatio = Object.values(customRatios).reduce((sum, r) => sum + r, 0);
      if (Math.abs(totalRatio - 1) > 0.01) {
        setError('比例总和必须等于1');
        return;
      }
    }
    setLoading(true);
    setError('');
    try {
      const splits: Record<string, number> = {};
      if (splitType === 'equal') {
        const share = amountNum / selectedMembers.size;
        selectedMembers.forEach(id => {
          splits[id.toString()] = Math.round(share * 100) / 100;
        });
      } else {
        selectedMembers.forEach(id => {
          const ratio = customRatios[id.toString()] || 0;
          splits[id.toString()] = Math.round(amountNum * ratio * 100) / 100;
        });
      }
      const expense = await expenseApi.createExpense(planId, {
        title,
        amount: Math.round(amountNum * 100) / 100,
        paid_by: parseInt(paidBy),
        split_type: splitType,
        splits
      });
      onAdd(expense);
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || '添加失败');
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
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: '#1a202c' }}>添加费用</h2>
          {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>费用名称 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：晚餐"
                style={{ width: '100%' }}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>金额 (¥) *</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0.01"
                  step="0.01"
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>支付人 *</label>
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  style={{ width: '100%' }}
                >
                  {members.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>分摊方式</label>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setSplitType('equal')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: `2px solid ${splitType === 'equal' ? '#3182ce' : '#e2e8f0'}`,
                    backgroundColor: splitType === 'equal' ? 'rgba(49, 130, 206, 0.1)' : 'white',
                    color: splitType === 'equal' ? '#3182ce' : '#4a5568',
                    fontWeight: splitType === 'equal' ? 500 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  平均分摊
                </button>
                <button
                  type="button"
                  onClick={() => setSplitType('custom')}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: `2px solid ${splitType === 'custom' ? '#3182ce' : '#e2e8f0'}`,
                    backgroundColor: splitType === 'custom' ? 'rgba(49, 130, 206, 0.1)' : 'white',
                    color: splitType === 'custom' ? '#3182ce' : '#4a5568',
                    fontWeight: splitType === 'custom' ? 500 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  按比例分摊
                </button>
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>
                参与分摊成员 ({selectedMembers.size}人)
              </label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                {members.map(member => (
                  <div
                    key={member.id}
                    onClick={() => toggleMember(member.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: selectedMembers.has(member.id) ? 'rgba(49, 130, 206, 0.08)' : '#f7fafc',
                      border: `1px solid ${selectedMembers.has(member.id) ? '#3182ce' : '#e2e8f0'}`,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.has(member.id)}
                      onChange={() => {}}
                      style={{ width: '16px', height: '16px', accentColor: '#3182ce' }}
                    />
                    <img src={member.avatar} alt={member.name} className="avatar avatar-small" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white' }} />
                    <span style={{ flex: 1, fontSize: '14px', color: '#1a202c' }}>{member.name}</span>
                    {splitType === 'custom' && selectedMembers.has(member.id) && (
                      <input
                        type="number"
                        value={customRatios[member.id.toString()] || ''}
                        onChange={(e) => handleRatioChange(member.id, e.target.value)}
                        placeholder="比例"
                        min="0"
                        max="1"
                        step="0.01"
                        onClick={(e) => e.stopPropagation()}
                        style={{ width: '80px', padding: '6px 8px', fontSize: '13px' }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} className="btn btn-outline" style={{ padding: '10px 24px' }}>
                取消
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                {loading ? '添加中...' : '添加费用'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const SettlementPage: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  balances: MemberBalance[];
  pairs: SettlementPair[];
  planId: number;
  onComplete: () => void;
}> = ({ isOpen, onClose, balances, pairs, planId, onComplete }) => {
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (pairs.length === 0) return;
    setLoading(true);
    try {
      await settlementApi.createSettlements(planId, pairs.map(p => ({
        from_user_id: p.from.id,
        to_user_id: p.to.id,
        amount: p.amount
      })));
      onComplete();
      onClose();
    } catch (err) {
      console.error('Settlement failed:', err);
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
            maxWidth: '700px',
            maxHeight: '90vh',
            overflowY: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: '#1a202c' }}>费用结算</h2>
          
          <div style={{ marginBottom: '32px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '16px', color: '#4a5568' }}>成员余额</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {balances.map((balance, idx) => (
                <motion.div
                  key={balance.user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  style={{
                    padding: '16px',
                    backgroundColor: '#f7fafc',
                    borderRadius: '8px',
                    borderLeft: `4px solid ${getBalanceColor(balance.balance)}`
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <img src={balance.user.avatar} alt={balance.user.name} className="avatar avatar-small" style={{ width: '32px', height: '32px', borderRadius: '50%', border: '2px solid white' }} />
                    <span style={{ fontWeight: 500, color: '#1a202c' }}>{balance.user.name}</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    已付: {formatCurrency(balance.paid)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#718096', marginBottom: '4px' }}>
                    应付: {formatCurrency(balance.should_pay)}
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: getBalanceColor(balance.balance) }}>
                    {balance.balance >= 0 ? '应收' : '应付'}: {formatCurrency(Math.abs(balance.balance))}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {pairs.length > 0 && (
            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '16px', color: '#4a5568' }}>转账明细</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {pairs.map((pair, idx) => (
                  <motion.div
                    key={`${pair.from.id}-${pair.to.id}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      backgroundColor: '#f7fafc',
                      borderRadius: '12px',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1 }}>
                      <img src={pair.from.avatar} alt={pair.from.name} className="avatar" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '2px solid white' }} />
                      <div>
                        <div style={{ fontWeight: 500, color: '#1a202c' }}>{pair.from.name}</div>
                        <div style={{ fontSize: '12px', color: '#e53e3e' }}>支付人</div>
                      </div>
                    </div>
                    <div style={{ position: 'absolute', left: '35%', right