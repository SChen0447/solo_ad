import React, { useState, useMemo, useEffect } from 'react';
import ActionCard from '../components/ActionCard';
import WorkoutTimeline from '../components/WorkoutTimeline';
import { actions } from '../data/actions';
import { Action, MUSCLE_GROUPS } from '../types';

interface SavedPlan {
  id: string;
  name: string;
  actions: Action[];
  restInterval: number;
  savedAt: string;
}

const STORAGE_KEY = 'fitness_plans';

const PlanBuilderPage: React.FC = () => {
  const [selectedMuscle, setSelectedMuscle] = useState<string>('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [planActions, setPlanActions] = useState<Action[]>([]);
  const [restInterval, setRestInterval] = useState(30);
  const [savedPlans, setSavedPlans] = useState<SavedPlan[]>([]);
  const [planName, setPlanName] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const plans = JSON.parse(saved);
        setSavedPlans(plans);
        if (plans.length > 0) {
          const latest = plans[0];
          setPlanActions(latest.actions);
          setRestInterval(latest.restInterval);
          setPlanName(latest.name);
        }
      } catch (e) {
        console.error('Failed to load saved plans', e);
      }
    }
  }, []);

  const filteredActions = useMemo(() => {
    return actions.filter(action => {
      const matchesMuscle = selectedMuscle === '全部' || action.muscle === selectedMuscle;
      const matchesSearch = action.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        action.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesMuscle && matchesSearch;
    });
  }, [selectedMuscle, searchQuery]);

  const handleDragStart = (e: React.DragEvent, action: Action) => {
    e.dataTransfer.setData('actionId', action.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const actionId = e.dataTransfer.getData('actionId');
    if (actionId) {
      const action = actions.find(a => a.id === actionId);
      if (action) {
        setPlanActions(prev => [...prev, { ...action }]);
      }
    }
  };

  const handleRemoveAction = (index: number) => {
    setPlanActions(prev => prev.filter((_, i) => i !== index));
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    setPlanActions(prev => {
      const newActions = [...prev];
      const [removed] = newActions.splice(fromIndex, 1);
      newActions.splice(toIndex, 0, removed);
      return newActions;
    });
  };

  const handleSavePlan = () => {
    if (planActions.length === 0) return;
    
    const newPlan: SavedPlan = {
      id: Date.now().toString(),
      name: planName || `训练计划 ${new Date().toLocaleDateString()}`,
      actions: planActions,
      restInterval,
      savedAt: new Date().toISOString(),
    };

    const updatedPlans = [newPlan, ...savedPlans].slice(0, 5);
    setSavedPlans(updatedPlans);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlans));
  };

  const handleLoadPlan = (plan: SavedPlan) => {
    setPlanActions(plan.actions);
    setRestInterval(plan.restInterval);
    setPlanName(plan.name);
  };

  const handleDeletePlan = (planId: string) => {
    const updatedPlans = savedPlans.filter(p => p.id !== planId);
    setSavedPlans(updatedPlans);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPlans));
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.08)',
          backdropFilter: 'blur(8px)',
          borderRadius: '16px',
          padding: '20px 24px',
          marginBottom: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px', color: '#f8fafc' }}>
              🛠️ 计划构建器
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              拖拽动作到时间轴，创建你的专属训练计划
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>组间休息 (秒)</label>
              <input
                type="number"
                value={restInterval}
                onChange={(e) => setRestInterval(Math.max(0, parseInt(e.target.value) || 0))}
                min={0}
                style={{
                  width: '80px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', color: '#94a3b8' }}>计划名称</label>
              <input
                type="text"
                value={planName}
                onChange={(e) => setPlanName(e.target.value)}
                placeholder="输入计划名称..."
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '14px',
                  outline: 'none',
                  minWidth: '150px',
                }}
              />
            </div>

            <button
              onClick={handleSavePlan}
              disabled={planActions.length === 0}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: planActions.length === 0
                  ? 'rgba(100, 116, 139, 0.5)'
                  : 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: 'white',
                fontSize: '14px',
                fontWeight: 600,
                cursor: planActions.length === 0 ? 'not-allowed' : 'pointer',
                transition: 'transform 0.15s ease',
                marginTop: '18px',
              }}
              onMouseEnter={(e) => {
                if (planActions.length > 0) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              💾 保存计划
            </button>
          </div>
        </div>

        {savedPlans.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '8px' }}>
              最近保存的计划
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {savedPlans.map((plan) => (
                <div
                  key={plan.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    background: 'rgba(59, 130, 246, 0.15)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease',
                  }}
                  onClick={() => handleLoadPlan(plan)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(59, 130, 246, 0.15)';
                  }}
                >
                  <span style={{ fontSize: '13px', color: '#f8fafc', fontWeight: 500 }}>
                    {plan.name}
                  </span>
                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                    ({plan.actions.length}个动作)
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeletePlan(plan.id);
                    }}
                    style={{
                      marginLeft: '4px',
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      fontSize: '16px',
                      padding: '0 4px',
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          alignItems: 'start',
        }}
        className="plan-builder-grid"
      >
        <div>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(8px)',
              borderRadius: '12px',
              padding: '16px',
              marginBottom: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <select
                value={selectedMuscle}
                onChange={(e) => setSelectedMuscle(e.target.value)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                  minWidth: '120px',
                }}
              >
                <option value="全部">全部肌肉群</option>
                {MUSCLE_GROUPS.map(muscle => (
                  <option key={muscle} value={muscle}>{muscle}</option>
                ))}
              </select>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索动作..."
                style={{
                  flex: 1,
                  minWidth: '150px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: '#f8fafc',
                  fontSize: '13px',
                  outline: 'none',
                }}
              />
            </div>
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#94a3b8' }}>
              {filteredActions.length} 个动作可拖拽
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '12px',
              justifyItems: 'center',
            }}
            className="action-library-grid"
          >
            {filteredActions.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                draggable
                onDragStart={handleDragStart}
              />
            ))}
          </div>
        </div>

        <div style={{ position: 'sticky', top: '20px' }}>
          <WorkoutTimeline
            actions={planActions}
            restInterval={restInterval}
            onRemoveAction={handleRemoveAction}
            onReorder={handleReorder}
            onDrop={handleDrop}
          />
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .plan-builder-grid {
            grid-template-columns: 1fr !important;
          }
          .action-library-grid {
            grid-template-columns: repeat(3, 1fr) !important;
          }
        }
        @media (max-width: 768px) {
          .action-library-grid {
            grid-template-columns: repeat(2, 1fr) !important;
          }
        }
        @media (max-width: 640px) {
          .action-library-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PlanBuilderPage;
