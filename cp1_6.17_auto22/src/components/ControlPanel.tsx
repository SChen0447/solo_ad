import React, { useRef, useEffect } from 'react';

interface ControlPanelProps {
  growthSpeed: number;
  nutrientRate: number;
  maxTreeCount: number;
  onGrowthSpeedChange: (value: number) => void;
  onNutrientRateChange: (value: number) => void;
  onMaxTreeCountChange: (value: number) => void;
  onReset: () => void;
  isOpen?: boolean;
  onToggle?: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  growthSpeed,
  nutrientRate,
  maxTreeCount,
  onGrowthSpeedChange,
  onNutrientRateChange,
  onMaxTreeCountChange,
  onReset,
  isOpen = true,
  onToggle,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<{ x: number; y: number; vx: number; vy: number; size: number; alpha: number }[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    const particleCount = 30;
    particlesRef.current = [];
    for (let i = 0; i < particleCount; i++) {
      particlesRef.current.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.3,
        size: 1 + Math.random() * 2,
        alpha: 0.2 + Math.random() * 0.4,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particlesRef.current) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 220, 160, ${p.alpha})`;
        ctx.fill();

        ctx.shadowColor = 'rgba(100, 220, 160, 0.5)';
        ctx.shadowBlur = 4;
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const sliderStyle: React.CSSProperties = {
    width: '100%',
    height: '6px',
    borderRadius: '3px',
    background: 'rgba(255,255,255,0.15)',
    outline: 'none',
    appearance: 'none',
    cursor: 'pointer',
    WebkitAppearance: 'none',
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: isOpen ? '20px' : '-280px',
        width: '280px',
        background: 'rgba(20, 50, 35, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderRadius: '16px',
        padding: '24px',
        color: 'white',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          opacity: 0.6,
        }}
      />

      <div style={{ position: 'relative', zIndex: 1 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h3
            style={{
              fontSize: '18px',
              fontWeight: 600,
              margin: 0,
              color: '#b8f0d0',
              textShadow: '0 0 20px rgba(100, 220, 160, 0.5)',
            }}
          >
            🌿 控制面板
          </h3>
          {onToggle && (
            <button
              onClick={onToggle}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: 'none',
                color: 'white',
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                transition: 'background 0.2s',
              }}
            >
              ×
            </button>
          )}
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>生长速度</span>
            <span
              style={{
                color: '#6be5a0',
                fontWeight: 600,
                fontFamily: 'monospace',
              }}
            >
              {growthSpeed.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="5"
            step="0.1"
            value={growthSpeed}
            onChange={(e) => onGrowthSpeedChange(parseFloat(e.target.value))}
            style={sliderStyle}
            className="custom-slider"
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              marginTop: '4px',
            }}
          >
            <span>0.5x</span>
            <span>5x</span>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>养分交换速率</span>
            <span
              style={{
                color: '#6be5a0',
                fontWeight: 600,
                fontFamily: 'monospace',
              }}
            >
              {nutrientRate.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="0.5"
            step="0.01"
            value={nutrientRate}
            onChange={(e) => onNutrientRateChange(parseFloat(e.target.value))}
            style={sliderStyle}
            className="custom-slider"
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              marginTop: '4px',
            }}
          >
            <span>0.1</span>
            <span>0.5</span>
          </div>
        </div>

        <div style={{ marginBottom: '24px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '8px',
              fontSize: '14px',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.8)' }}>最大树木数量</span>
            <span
              style={{
                color: '#6be5a0',
                fontWeight: 600,
                fontFamily: 'monospace',
              }}
            >
              {maxTreeCount}
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="200"
            step="10"
            value={maxTreeCount}
            onChange={(e) => onMaxTreeCountChange(parseInt(e.target.value))}
            style={sliderStyle}
            className="custom-slider"
          />
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '11px',
              color: 'rgba(255,255,255,0.4)',
              marginTop: '4px',
            }}
          >
            <span>50</span>
            <span>200</span>
          </div>
        </div>

        <button
          onClick={onReset}
          style={{
            width: '100%',
            padding: '12px',
            background: 'linear-gradient(135deg, #6be5a0 0%, #3db871 100%)',
            border: 'none',
            borderRadius: '10px',
            color: '#0d2818',
            fontWeight: 600,
            fontSize: '14px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(100, 220, 160, 0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 6px 20px rgba(100, 220, 160, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(100, 220, 160, 0.3)';
          }}
        >
          🔄 重置花园
        </button>
      </div>

      <style>{`
        .custom-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6be5a0 0%, #3db871 100%);
          cursor: pointer;
          box-shadow: 0 2px 8px rgba(100, 220, 160, 0.4);
          transition: transform 0.2s ease;
        }
        .custom-slider::-webkit-slider-thumb:hover {
          transform: scale(1.1);
        }
        .custom-slider::-moz-range-thumb {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6be5a0 0%, #3db871 100%);
          cursor: pointer;
          border: none;
          box-shadow: 0 2px 8px rgba(100, 220, 160, 0.4);
        }
      `}</style>
    </div>
  );
};

export default ControlPanel;
