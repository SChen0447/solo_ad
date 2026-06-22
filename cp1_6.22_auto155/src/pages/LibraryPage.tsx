import React, { useState, useMemo } from 'react';
import ActionCard from '../components/ActionCard';
import { actions } from '../data/actions';
import { MUSCLE_GROUPS } from '../types';

const LibraryPage: React.FC = () => {
  const [selectedMuscle, setSelectedMuscle] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      const matchesMuscle = selectedMuscle === '全部' || action.muscle === selectedMuscle;
      const matchesSearch = action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMuscle && matchesSearch;
    });
  }, [selectedMuscle, searchQuery]);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px', color: '#f8fafc' }}>
          💪 动作库
        </h1>
        <p style={{ color: '#94a3b8', marginBottom: '20px' }}>
          浏览 {actions.length} 个精选健身动作，找到适合你的训练内容
        </p>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: '#94a3b8' }}>肌肉群筛选</label>
            <select
              value={selectedMuscle}
              onChange={(e) => setSelectedMuscle(e.target.value)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
                minWidth: '150px',
              }}
            >
              <option value="全部">全部肌肉群</option>
              {MUSCLE_GROUPS.map(muscle => (
                <option key={muscle} value={muscle}>{muscle}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '200px' }}>
            <label style={{ fontSize: '13px', color: '#94a3b8' }}>搜索动作</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="输入动作名称或描述..."
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                fontSize: '14px',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>
        </div>

        <div style={{ marginTop: '16px', fontSize: '14px', color: '#94a3b8' }}>
          找到 <span style={{ color: '#3b82f6', fontWeight: 600 }}>{filteredActions.length}</span> 个动作
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '24px',
          justifyItems: 'center',
        }}
        className="action-grid"
      >
        {filteredActions.map(action => (
          <ActionCard key={action.id} action={action} />
        ))}
      </div>

      {filteredActions.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: '#94a3b8',
          }}
        >
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <p style={{ fontSize: '18px' }}>没有找到匹配的动作</p>
          <p style={{ fontSize: '14px', marginTop: '8px' }}>试试更换筛选条件或搜索关键词</p>
        </div>
      )}

      <style>{`
        @media (max-width: 1024px) {
          .action-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .action-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LibraryPage;
