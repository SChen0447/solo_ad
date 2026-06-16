import React, { useState, useCallback } from 'react';
import CanvasBoard from './CanvasBoard';
import type { EmotionResult } from './EmotionMapper';

const App: React.FC = () => {
  const [emotion, setEmotion] = useState<EmotionResult | null>(null);
  const [clearKey, setClearKey] = useState(0);
  const [savedCount, setSavedCount] = useState(0);

  const handleEmotionChange = useCallback((newEmotion: EmotionResult | null) => {
    setEmotion(newEmotion);
  }, []);

  const handleClear = useCallback(() => {
    setClearKey(prev => prev + 1);
  }, []);

  const handleClearClick = useCallback(() => {
    const fn = (window as any).__clearEmotionBoard;
    if (typeof fn === 'function') {
      fn();
    }
    handleClear();
  }, [handleClear]);

  const handleSave = useCallback(() => {
    if (!emotion) return;
    const data = {
      timestamp: new Date().toISOString(),
      emotion: emotion.label,
      color: emotion.color,
      dimensions: {
        energy: emotion.energy,
        stress: emotion.stress,
        stability: emotion.stability
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emotion-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSavedCount(prev => prev + 1);
    setTimeout(() => setSavedCount(prev => Math.max(0, prev - 1)), 2000);
  }, [emotion]);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#1e1e2e',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        padding: '40px 20px',
        boxSizing: 'border-box',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <h1
          style={{
            margin: 0,
            fontSize: '36px',
            fontWeight: 800,
            background: 'linear-gradient(135deg, #6c63ff 0%, #4ecdc4 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '4px'
          }}
        >
          字迹情绪镜
        </h1>
        <p
          style={{
            marginTop: '12px',
            color: '#8888a8',
            fontSize: '14px',
            letterSpacing: '1px'
          }}
        >
          在画板上随意书写，感受笔迹背后的情绪
        </p>
      </div>

      <div style={{ width: '100%', marginBottom: '24px' }}>
        <CanvasBoard
          key={clearKey}
          onEmotionChange={handleEmotionChange}
          onClear={handleClear}
          emotion={emotion}
        />
      </div>

      {emotion && (
        <div
          style={{
            display: 'flex',
            gap: '32px',
            marginBottom: '24px',
            padding: '16px 28px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '12px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        >
          {[
            { label: '活力', value: emotion.energy, color: '#ff6584' },
            { label: '压力', value: emotion.stress, color: '#ffaa33' },
            { label: '稳定', value: emotion.stability, color: '#4ecdc4' }
          ].map(dim => (
            <div key={dim.label} style={{ textAlign: 'center', minWidth: '80px' }}>
              <div
                style={{
                  fontSize: '24px',
                  fontWeight: 700,
                  color: dim.color,
                  marginBottom: '4px'
                }}
              >
                {dim.value}%
              </div>
              <div style={{ fontSize: '12px', color: '#8888a8', letterSpacing: '1px' }}>
                {dim.label}
              </div>
              <div
                style={{
                  marginTop: '8px',
                  width: '100%',
                  height: '4px',
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: `${dim.value}%`,
                    height: '100%',
                    backgroundColor: dim.color,
                    borderRadius: '2px',
                    transition: 'width 0.5s ease'
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <button
          onClick={handleClearClick}
          style={{
            padding: '12px 32px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#ffffff',
            backgroundColor: 'rgba(108, 99, 255, 0.25)',
            border: '1px solid rgba(108, 99, 255, 0.4)',
            borderRadius: '12px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            letterSpacing: '1px'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = 'rgba(108, 99, 255, 0.45)';
            e.currentTarget.style.transform = 'translateY(-3px)';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(108, 99, 255, 0.3)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = 'rgba(108, 99, 255, 0.25)';
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          清空画板
        </button>

        <button
          onClick={handleSave}
          disabled={!emotion}
          style={{
            padding: '12px 32px',
            fontSize: '15px',
            fontWeight: 600,
            color: '#ffffff',
            backgroundColor: !emotion ? 'rgba(255,255,255,0.08)' : 'rgba(78, 205, 196, 0.25)',
            border: !emotion ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(78, 205, 196, 0.4)',
            borderRadius: '12px',
            cursor: !emotion ? 'not-allowed' : 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease',
            opacity: !emotion ? 0.5 : 1,
            letterSpacing: '1px',
            position: 'relative'
          }}
          onMouseEnter={e => {
            if (emotion) {
              e.currentTarget.style.backgroundColor = 'rgba(78, 205, 196, 0.45)';
              e.currentTarget.style.transform = 'translateY(-3px)';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(78, 205, 196, 0.3)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.backgroundColor = !emotion ? 'rgba(255,255,255,0.08)' : 'rgba(78, 205, 196, 0.25)';
          }}
        >
          保存结果
          {savedCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-8px',
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: '#4ecdc4',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1e1e2e',
                fontWeight: 700
              }}
            >
              ✓
            </span>
          )}
        </button>
      </div>

      <div
        style={{
          marginTop: '36px',
          padding: '16px 24px',
          maxWidth: '60%',
          background: 'rgba(255,255,255,0.03)',
          borderRadius: '10px',
          border: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'center' }}>
          {[
            { label: '兴奋', color: '#ff6584', desc: '高速度·大倾斜' },
            { label: '焦躁', color: '#ffaa33', desc: '高压力·大变异' },
            { label: '平稳', color: '#4ecdc4', desc: '均衡状态' },
            { label: '沮丧', color: '#7c6f9e', desc: '低活力·高压力' },
            { label: '匆忙', color: '#ff6b6b', desc: '中高能量·紧张' },
            { label: '从容', color: '#6c63ff', desc: '高稳定·低速度' }
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: item.color,
                  boxShadow: `0 0 8px ${item.color}60`
                }}
              />
              <div>
                <span style={{ color: item.color, fontWeight: 600, fontSize: '13px' }}>{item.label}</span>
                <span style={{ color: '#666688', fontSize: '11px', marginLeft: '6px' }}>{item.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes emotionFadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        * {
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: #1e1e2e;
        }
        ::-webkit-scrollbar-thumb {
          background: #3a3a5a;
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #4a4a6a;
        }
      `}</style>
    </div>
  );
};

export default App;
