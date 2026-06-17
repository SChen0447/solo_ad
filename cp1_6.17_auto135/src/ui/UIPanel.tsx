import React, { useState, useRef, useEffect } from 'react';
import type { GameState, ToolType, MirrorOrientation } from '../game/types';

interface UIPanelProps {
  state: GameState;
  levelName: string;
  onNextLevel: () => void;
  onRetry: () => void;
  onRestart: () => void;
  onSelectTool: (tool: ToolType) => void;
  onRotateMirror: () => void;
}

const panelStyle: React.CSSProperties = {
  background: 'rgba(20, 20, 40, 0.7)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '8px',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
};

const buttonStyle: React.CSSProperties = {
  background: 'linear-gradient(135deg, rgba(80, 100, 200, 0.4), rgba(120, 80, 200, 0.4))',
  border: '1px solid rgba(150, 180, 255, 0.5)',
  color: '#fff',
  padding: '10px 24px',
  borderRadius: '6px',
  cursor: 'pointer',
  fontSize: '15px',
  fontWeight: 600,
  transition: 'all 0.2s ease',
  letterSpacing: '0.5px',
};

const buttonHover: React.CSSProperties = {
  filter: 'brightness(1.2)',
  transform: 'translateY(-1px)',
  boxShadow: '0 4px 16px rgba(100, 150, 255, 0.3)',
};

export const UIPanel: React.FC<UIPanelProps> = ({
  state,
  levelName,
  onNextLevel,
  onRetry,
  onRestart,
  onSelectTool,
  onRotateMirror,
}) => {
  const [hoverBtn, setHoverBtn] = useState<string | null>(null);
  const [showWinAnim, setShowWinAnim] = useState(false);
  const [showLevelText, setShowLevelText] = useState(true);
  const animRef = useRef<number | null>(null);

  useEffect(() => {
    if (state.isWin) {
      setShowWinAnim(true);
      if (animRef.current) clearTimeout(animRef.current);
      animRef.current = window.setTimeout(() => setShowWinAnim(false), 2000);
    }
    return () => {
      if (animRef.current) clearTimeout(animRef.current);
    };
  }, [state.isWin]);

  useEffect(() => {
    setShowLevelText(true);
    const t = setTimeout(() => setShowLevelText(false), 2000);
    return () => clearTimeout(t);
  }, [state.levelId]);

  const renderButton = (key: string, label: string, onClick: () => void): React.ReactNode => (
    <button
      onClick={onClick}
      onMouseEnter={() => setHoverBtn(key)}
      onMouseLeave={() => setHoverBtn(null)}
      style={{
        ...buttonStyle,
        ...(hoverBtn === key ? buttonHover : {}),
      }}
    >
      {label}
    </button>
  );

  return (
    <>
      <div
        style={{
          position: 'absolute',
          top: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          ...panelStyle,
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          opacity: showLevelText ? 1 : 0.85,
          transition: 'opacity 0.5s',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: '20px',
            fontWeight: 'bold',
            letterSpacing: '1px',
            textShadow: '0 0 10px rgba(100, 150, 255, 0.5)',
          }}
        >
          关卡 {state.levelId}: {levelName}
        </span>
      </div>

      <div
        style={{
          position: 'absolute',
          top: '16px',
          right: '16px',
          ...panelStyle,
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {Array.from({ length: Math.max(state.player.lives, 0) }).map((_, i) => (
          <span
            key={i}
            style={{
              fontSize: '22px',
              filter: 'drop-shadow(0 0 4px rgba(255, 80, 100, 0.6))',
            }}
          >
            ❤️
          </span>
        ))}
        {Array.from({ length: Math.max(5 - state.player.lives, 0) }).map((_, i) => (
          <span key={`empty-${i}`} style={{ fontSize: '22px', opacity: 0.3 }}>
            🖤
          </span>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: '16px',
          left: '16px',
          ...panelStyle,
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <ToolButton
          icon="◆"
          label="反射镜"
          count={state.inventoryMirrors}
          selected={state.selectedTool === 'mirror'}
          onClick={() => onSelectTool(state.selectedTool === 'mirror' ? null : 'mirror')}
          subInfo={
            state.selectedTool === 'mirror'
              ? `方向: ${state.selectedMirrorOrientation === '/' ? '╱' : '╲'} (R旋转)`
              : undefined
          }
          onRotate={onRotateMirror}
        />
        <ToolButton
          icon="▲"
          label="棱镜"
          count={state.inventoryPrisms}
          selected={state.selectedTool === 'prism'}
          onClick={() => onSelectTool(state.selectedTool === 'prism' ? null : 'prism')}
        />
        <div style={{ width: '1px', height: '36px', background: 'rgba(255,255,255,0.15)' }} />
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', lineHeight: 1.5 }}>
          WASD 移动<br />
          E 放置 | 右键移除<br />
          R 旋转 | 1/2 选工具
        </div>
      </div>

      {showWinAnim && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            pointerEvents: 'none',
            animation: 'fadeInScale 0.5s ease-out',
            zIndex: 100,
          }}
        >
          <span
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#fff',
              textShadow:
                '0 0 20px rgba(100, 255, 150, 0.8), 0 0 40px rgba(100, 255, 150, 0.5), 0 0 60px rgba(100, 255, 150, 0.3)',
              letterSpacing: '4px',
            }}
          >
            Level Cleared!
          </span>
        </div>
      )}

      {state.isWin && (
        <Modal>
          <h2
            style={{
              color: '#66ff99',
              fontSize: '28px',
              margin: '0 0 8px',
              textShadow: '0 0 15px rgba(100, 255, 150, 0.5)',
            }}
          >
            🎉 关卡完成!
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 24px', fontSize: '14px' }}>
            所有水晶目标已被激活
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {renderButton('retry', '重试', onRetry)}
            {renderButton('next', '下一关 →', onNextLevel)}
          </div>
        </Modal>
      )}

      {state.isGameOver && (
        <Modal>
          <h2
            style={{
              color: '#ff6666',
              fontSize: '28px',
              margin: '0 0 8px',
              textShadow: '0 0 15px rgba(255, 100, 100, 0.5)',
            }}
          >
            💀 Game Over
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', margin: '0 0 24px', fontSize: '14px' }}>
            生命值耗尽，再接再厉!
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            {renderButton('restart', '重新开始', onRestart)}
          </div>
        </Modal>
      )}

      <style>{`
        @keyframes fadeInScale {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  );
};

const Modal: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      animation: 'fadeIn 0.3s ease',
    }}
  >
    <div
      style={{
        background: 'rgba(20, 20, 40, 0.9)',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        borderRadius: '12px',
        padding: '32px 48px',
        textAlign: 'center',
        minWidth: '300px',
        backdropFilter: 'blur(15px)',
      }}
    >
      {children}
    </div>
  </div>
);

interface ToolButtonProps {
  icon: string;
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
  subInfo?: string;
  onRotate?: () => void;
}

const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  count,
  selected,
  onClick,
  subInfo,
  onRotate,
}) => {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '2px',
        padding: '6px 12px',
        borderRadius: '6px',
        cursor: count > 0 ? 'pointer' : 'not-allowed',
        background: selected
          ? 'rgba(100, 150, 255, 0.25)'
          : hover && count > 0
          ? 'rgba(100, 150, 255, 0.12)'
          : 'transparent',
        border: selected
          ? '1px solid rgba(100, 180, 255, 0.6)'
          : '1px solid transparent',
        opacity: count > 0 ? 1 : 0.4,
        transition: 'all 0.2s',
        minWidth: '72px',
        position: 'relative',
      }}
    >
      <span
        style={{
          fontSize: '24px',
          color: icon === '◆' ? '#c8d0e0' : '#ffffff',
          textShadow: selected ? '0 0 10px rgba(150, 200, 255, 0.8)' : 'none',
          filter: icon === '◆' ? 'drop-shadow(0 0 2px rgba(200,200,255,0.5))' : 'drop-shadow(0 0 2px rgba(255,255,255,0.5))',
        }}
      >
        {icon}
      </span>
      <span style={{ color: '#fff', fontSize: '11px', fontWeight: 500 }}>{label}</span>
      <span
        style={{
          color: selected ? '#99ccff' : 'rgba(255,255,255,0.6)',
          fontSize: '12px',
          fontWeight: 'bold',
        }}
      >
        x{count}
      </span>
      {subInfo && (
        <span
          style={{
            color: '#aaccff',
            fontSize: '10px',
            marginTop: '2px',
            cursor: 'pointer',
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (onRotate) onRotate();
          }}
        >
          {subInfo}
        </span>
      )}
    </div>
  );
};
