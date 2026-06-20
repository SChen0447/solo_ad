import React, { useState, useRef, useEffect } from 'react';
import { motion, Reorder, AnimatePresence } from 'framer-motion';
import type { Item, User } from '../types';
import { itemApi } from '../services/api';
import { formatCurrency } from '../utils/expenseCalc';

const typeColors: Record<string, string> = {
  accommodation: '#3182ce',
  transport: '#e53e3e',
  attraction: '#38a169',
  food: '#d69e2e'
};

const typeLabels: Record<string, string> = {
  accommodation: '住宿',
  transport: '交通',
  attraction: '景点',
  food: '餐饮'
};

interface TimelineProps {
  planId: number;
  items: Item[];
  members: User[];
  onItemsChange: (items: Item[]) => void;
}

const ItemModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Partial<Item>) => Promise<void>;
  item?: Item | null;
  members: User[];
  defaultDate?: string;
}> = ({ isOpen, onClose, onSave, item, members, defaultDate }) => {
  const [type, setType] = useState<Item['type']>(item?.type || 'attraction');
  const [title, setTitle] = useState(item?.title || '');
  const [description, setDescription] = useState(item?.description || '');
  const [date, setDate] = useState(item?.date || defaultDate || '');
  const [time, setTime] = useState(item?.time || '');
  const [location, setLocation] = useState(item?.location || '');
  const [cost, setCost] = useState(item?.cost?.toString() || '0');
  const [responsibleId, setResponsibleId] = useState<string>(item?.responsible_id?.toString() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (item) {
      setType(item.type);
      setTitle(item.title);
      setDescription(item.description);
      setDate(item.date);
      setTime(item.time || '');
      setLocation(item.location);
      setCost(item.cost.toString());
      setResponsibleId(item.responsible_id?.toString() || '');
    } else {
      setType('attraction');
      setTitle('');
      setDescription('');
      setDate(defaultDate || '');
      setTime('');
      setLocation('');
      setCost('0');
      setResponsibleId('');
    }
    setError('');
  }, [item, defaultDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !date) {
      setError('请填写必填项');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await onSave({
        type,
        title,
        description,
        date,
        time: time || null,
        location,
        cost: parseFloat(cost) || 0,
        responsible_id: responsibleId ? parseInt(responsibleId) : null
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || '保存失败');
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
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '24px', color: '#1a202c' }}>
            {item ? '编辑行程' : '添加行程'}
          </h2>
          {error && <div style={{ backgroundColor: '#fff5f5', color: '#e53e3e', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '14px' }}>{error}</div>}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>类型 *</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {Object.entries(typeLabels).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key as Item['type'])}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: `2px solid ${type === key ? typeColors[key] : '#e2e8f0'}`,
                      backgroundColor: type === key ? `${typeColors[key]}15` : 'white',
                      color: type === key ? typeColors[key] : '#4a5568',
                      fontWeight: type === key ? 500 : 400,
                      fontSize: '13px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>标题 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：参观故宫"
                style={{ width: '100%' }}
                required
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>日期 *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={{ width: '100%' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>时间</label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>地点</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="例如：北京市东城区景山前街4号"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="添加一些详细说明..."
                style={{ width: '100%', minHeight: '80px', resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>费用 (¥)</label>
                <input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  min="0"
                  step="0.01"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 500, color: '#4a5568' }}>负责人</label>
                <select
                  value={responsibleId}
                  onChange={(e) => setResponsibleId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">未指定</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id}>{member.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={onClose} className="btn btn-outline" style={{ padding: '10px 24px' }}>
                取消
              </button>
              <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '10px 24px' }}>
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

const TimelineItem: React.FC<{
  item: Item;
  members: User[];
  planId: number;
  onEdit: (item: Item) => void;
  onDelete: (item: Item) => void;
}> = ({ item, members, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const color = typeColors[item.type];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const responsible = members.find(m => m.id === item.responsible_id);

  return (
    <Reorder.Item
      value={item}
      id={item.id.toString()}
      whileDrag={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragTransition={{ bounceStiffness: 300, bounceDamping: 20 }}
      style={{ position: 'relative' }}
    >
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        transition={{ layout: { duration: 0.3, ease: 'easeInOut' } }}
        style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '16px 20px',
          marginLeft: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
          cursor: 'grab',
          position: 'relative'
        }}
        whileHover={{ boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
      >
        <div
          style={{
            position: 'absolute',
            left: '-32px',
            top: '20px',
            width: '16px',
            height: '16px',
            borderRadius: '50%',
            backgroundColor: color,
            border: '3px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
            zIndex: 1
          }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{
                fontSize: '12px',
                padding: '2px 8px',
                borderRadius: '4px',
                backgroundColor: `${color}15`,
                color: color,
                fontWeight: 500
              }}>
                {typeLabels[item.type]}
              </span>
              <span style={{ color: '#718096', fontSize: '13px' }}>
                {item.time || '全天'}
              </span>
            </div>
            <h4 style={{ fontSize: '16px', fontWeight: 600, color: '#1a202c', marginBottom: '4px' }}>{item.title}</h4>
            {item.description && (
              <p style={{ color: '#4a5568', fontSize: '13px', marginBottom: '8px', lineHeight: 1.5 }}>{item.description}</p>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', fontSize: '13px', color: '#718096', marginTop: '8px' }}>
              {item.location && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                    <circle cx="12" cy="10" r="3" />
                  </svg>
                  {item.location}
                </div>
              )}
              {item.cost > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" y1="1" x2="12" y2="23" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                  {formatCurrency(item.cost)}
                </div>
              )}
              {responsible && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                  {responsible.name}
                </div>
              )}
            </div>
          </div>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                color: '#718096',
                fontSize: '18px',
                lineHeight: 1,
                transition: 'background-color 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f7fafc'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              ⋮
            </button>
            {showMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                backgroundColor: 'white',
                borderRadius: '8px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                minWidth: '120px',
                zIndex: 100,
                overflow: 'hidden'
              }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onEdit(item); setShowMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#4a5568',
                    fontSize: '14px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f7fafc'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  编辑
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(item); setShowMenu(false); }}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    textAlign: 'left',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#e53e3e',
                    fontSize: '14px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fff5f5'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  删除
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </Reorder.Item>
  );
};

const Timeline: React.FC<TimelineProps> = ({ planId, items, members, onItemsChange }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [defaultDate, setDefaultDate] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<Item | null>(null);

  const handleReorder = async (newItems: Item[]) => {
    const reordered = newItems.map((item, index) => ({
      id: item.id,
      order: index + 1
    }));
    onItemsChange(newItems.map((item, index) => ({ ...item, order: index + 1 })));
    try {
      await itemApi.reorderItems(planId, reordered);
    } catch (err) {
      console.error('Reorder failed:', err);
    }
  };

  const handleSave = async (itemData: Partial<Item>) => {
    if (editingItem) {
      const updated = await itemApi.updateItem(planId, editingItem.id, itemData);
      onItemsChange(items.map(i => i.id === updated.id ? updated : i));
    } else {
      const newItem = await itemApi.createItem(planId, itemData as any);
      onItemsChange([...items, newItem]);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      await itemApi.deleteItem(planId, deleteConfirm.id);
      onItemsChange(items.filter(i => i.id !== deleteConfirm.id));
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const groupedByDate = items.reduce((acc, item) => {
    if (!acc[item.date]) {
      acc[item.date] = [];
    }
    acc[item.date].push(item);
    return acc;
  }, {} as Record<string, Item[]>);

  const sortedDates = Object.keys(groupedByDate).sort();

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#1a202c' }}>行程安排</h2>
        <button
          onClick={() => {
            setEditingItem(null);
            setDefaultDate(sortedDates[0] || new Date().toISOString().split('T')[0]);
            setIsModalOpen(true);
          }}
          className="btn btn-primary"
          style={{ padding: '8px 16px', fontSize: '13px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          添加行程
        </button>
      </div>
      <div style={{ position: 'relative', paddingLeft: '8px' }}>
        <div style={{
          position: 'absolute',
          left: '0',
          top: '0',
          bottom: '0',
          width: '2px',
          backgroundColor: '#e2e8f0'
        }} />
        {sortedDates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', marginLeft: '24px' }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e0" strokeWidth="1.5" style={{ margin: '0 auto 12px' }}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p style={{ color: '#718096', fontSize: '14px' }}>还没有行程安排，点击上方按钮添加</p>
          </div>
        ) : (
          sortedDates.map((date) => (
            <div key={date} style={{ marginBottom: '32px' }}>
              <div style={{
                display: 'inline-block',
                padding: '6px 16px',
                backgroundColor: '#3182ce',
                color: 'white',
                borderRadius: '20px',
                fontSize: '13px',
                fontWeight: 500,
                marginBottom: '16px',
                marginLeft: '8px'
              }}>
                {date}
              </div>
              <Reorder.Group
                axis="y"
                values={groupedByDate[date]}
                onReorder={(newItems) => {
                  const allItems = items.filter(i => i.date !== date);
                  const updatedDateItems = newItems.map((item, idx) => ({
                    ...item,
                    order: (allItems.length > 0 ? Math.max(...allItems.map(i => i.order)) : 0) + idx + 1
                  }));
                  handleReorder([...allItems, ...updatedDateItems]);
                }}
                style={{ listStyle: 'none', margin: 0, padding: 0 }}
              >
                <AnimatePresence>
                  {groupedByDate[date]
                    .sort((a, b) => a.order - b.order)
                    .map((item) => (
                      <TimelineItem
                        key={item.id}
                        item={item}
                        members={members}
                        planId={planId}
                        onEdit={(item) => { setEditingItem(item); setIsModalOpen(true); }}
                        onDelete={(item) => setDeleteConfirm(item)}
                      />
                    ))}
                </AnimatePresence>
              </Reorder.Group>
            </div>
          ))
        )}
      </div>
      <ItemModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingItem(null); }}
        onSave={handleSave}
        item={editingItem}
        members={members}
        defaultDate={defaultDate}
      />
      <AnimatePresence>
        {deleteConfirm && (
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
              zIndex: 3000
            }}
            onClick={() => setDeleteConfirm(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '32px',
                maxWidth: '400px',
                width: '100%',
                margin: '16px'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '12px', color: '#1a202c' }}>确认删除</h3>
              <p style={{ color: '#4a5568', marginBottom: '24px' }}>
                确定要删除行程"{deleteConfirm.title}"吗？此操作不可撤销。
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button onClick={() => setDeleteConfirm(null)} className="btn btn-outline">
                  取消
                </button>
                <button onClick={handleDelete} className="btn btn-danger">
                  删除
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Timeline;
