import React, { useRef, useEffect, useState } from 'react';

interface Action {
  name: string;
  action: string;
  duration: number;
}

interface Step {
  id: number;
  description: string;
  actions: Action[];
  ingredients: string[];
  tools: string[];
  status: 'pending' | 'in_progress' | 'completed';
}

interface StepPanelProps {
  steps: Step[];
  currentStepIndex: number;
  onStepClick: (index: number) => void;
  onPrevStep: () => void;
  onNextStep: () => void;
}

interface RippleType {
  x: number;
  y: number;
  id: number;
}

const StepPanel: React.FC<StepPanelProps> = ({ steps, currentStepIndex, onStepClick, onPrevStep, onNextStep }) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<Record<number, RippleType[]>>({});

  useEffect(() => {
    if (listRef.current && steps.length > 0) {
      const currentStepEl = listRef.current.querySelector(`[data-step-index="${currentStepIndex}"]`);
      if (currentStepEl) {
        currentStepEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStepIndex, steps.length]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return '✓';
      case 'in_progress':
        return '▶';
      default:
        return '○';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#27ae60';
      case 'in_progress':
        return '#e94560';
      default:
        return '#666';
    }
  };

  const createRipple = (e: React.MouseEvent<HTMLDivElement>, stepIndex: number) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = Date.now();

    setRipples(prev => ({
      ...prev,
      [stepIndex]: [...(prev[stepIndex] || []), { x, y, id }]
    }));

    setTimeout(() => {
      setRipples(prev => ({
        ...prev,
        [stepIndex]: (prev[stepIndex] || []).filter(r => r.id !== id)
      }));
    }, 600);
  };

  return (
    <div style={{
      width: '15%',
      minWidth: '240px',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(255, 255, 255, 0.03)',
      backdropFilter: 'blur(8px)',
      borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
    }}>
      <div style={{
        padding: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <h3 style={{ fontSize: '15px', marginBottom: '8px', color: '#e94560' }}>📝 烹饪步骤</h3>
        <div style={{ fontSize: '12px', color: '#888' }}>
          共 {steps.length} 步 · 当前第 {currentStepIndex + 1} 步
        </div>
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        {steps.map((step, index) => (
          <div
            key={step.id}
            data-step-index={index}
            onClick={(e) => {
              createRipple(e, index);
              onStepClick(index);
            }}
            style={{
              position: 'relative',
              padding: '12px 14px',
              borderRadius: '10px',
              background: step.status === 'in_progress'
                ? 'linear-gradient(135deg, rgba(233, 69, 96, 0.2), rgba(243, 156, 18, 0.15))'
                : step.status === 'completed'
                ? 'rgba(39, 174, 96, 0.1)'
                : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${step.status === 'in_progress'
                ? 'rgba(233, 69, 96, 0.5)'
                : step.status === 'completed'
                ? 'rgba(39, 174, 96, 0.3)'
                : 'rgba(255, 255, 255, 0.1)'}`,
              cursor: 'pointer',
              transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
              overflow: 'hidden',
              transform: step.status === 'in_progress' ? 'scale(1.02)' : 'scale(1)',
              boxShadow: step.status === 'in_progress'
                ? '0 4px 20px rgba(233, 69, 96, 0.2)'
                : 'none'
            }}
            onMouseEnter={(e) => {
              if (step.status !== 'in_progress') {
                e.currentTarget.style.transform = 'scale(1.02)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (step.status !== 'in_progress') {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }
            }}
          >
            {(ripples[index] || []).map(ripple => (
              <span
                key={ripple.id}
                style={{
                  position: 'absolute',
                  left: ripple.x,
                  top: ripple.y,
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.4)',
                  transform: 'translate(-50%, -50%)',
                  animation: 'ripple 0.6s ease-out forwards',
                  pointerEvents: 'none'
                }}
              />
            ))}

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <div style={{
                width: '26px',
                height: '26px',
                borderRadius: '50%',
                background: getStatusColor(step.status),
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 600,
                flexShrink: 0,
                boxShadow: step.status === 'in_progress'
                  ? `0 0 12px ${getStatusColor(step.status)}60`
                  : 'none'
              }}>
                {getStatusIcon(step.status)}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: '12px',
                  color: '#888',
                  marginBottom: '4px',
                  fontWeight: 500
                }}>
                  步骤 {step.id}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: step.status === 'in_progress' ? '#fff' : '#ccc',
                  lineHeight: 1.5,
                  wordBreak: 'break-word'
                }}>
                  {step.description.length > 50
                    ? step.description.slice(0, 50) + '...'
                    : step.description}
                </div>

                {step.ingredients.length > 0 && (
                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '4px',
                    marginTop: '8px'
                  }}>
                    {step.ingredients.slice(0, 3).map(ing => (
                      <span
                        key={ing}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.1)',
                          fontSize: '10px',
                          color: '#aaa'
                        }}
                      >
                        {ing}
                      </span>
                    ))}
                    {step.ingredients.length > 3 && (
                      <span style={{
                        padding: '2px 6px',
                        fontSize: '10px',
                        color: '#666'
                      }}>
                        +{step.ingredients.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {steps.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px 20px',
            color: '#666',
            fontSize: '13px'
          }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📖</div>
            暂无步骤，请先解析菜谱
          </div>
        )}
      </div>

      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        gap: '8px',
        background: 'rgba(0, 0, 0, 0.2)'
      }}>
        <button
          onClick={onPrevStep}
          disabled={currentStepIndex <= 0}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: currentStepIndex <= 0
              ? 'rgba(255, 255, 255, 0.03)'
              : 'rgba(255, 255, 255, 0.1)',
            color: currentStepIndex <= 0 ? '#555' : '#fff',
            fontSize: '13px',
            cursor: currentStepIndex <= 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentStepIndex > 0) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentStepIndex > 0) {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }
          }}
        >
          ← 上一步
        </button>
        <button
          onClick={onNextStep}
          disabled={currentStepIndex >= steps.length - 1}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            border: 'none',
            background: currentStepIndex >= steps.length - 1
              ? '#555'
              : 'linear-gradient(135deg, #e94560, #f39c12)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 500,
            cursor: currentStepIndex >= steps.length - 1 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (currentStepIndex < steps.length - 1) {
              e.currentTarget.style.transform = 'scale(1.02)';
            }
          }}
          onMouseLeave={(e) => {
            if (currentStepIndex < steps.length - 1) {
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
        >
          下一步 →
        </button>
      </div>

      <style>{`
        @keyframes ripple {
          0% {
            width: 10px;
            height: 10px;
            opacity: 0.5;
          }
          100% {
            width: 200px;
            height: 200px;
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default StepPanel;
