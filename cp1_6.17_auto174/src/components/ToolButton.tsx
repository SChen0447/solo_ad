import React, { useState, useCallback } from 'react';

interface ToolButtonProps {
  icon: string;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}

export const ToolButton: React.FC<ToolButtonProps> = ({
  icon,
  label,
  onClick,
  disabled = false,
  title,
}) => {
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([]);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const id = Date.now();

      setRipples((prev) => [...prev, { x, y, id }]);

      setTimeout(() => {
        setRipples((prev) => prev.filter((r) => r.id !== id));
      }, 600);

      onClick();
    },
    [disabled, onClick]
  );

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      title={title || label}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '10px 16px',
        backgroundColor: 'transparent',
        border: 'none',
        color: disabled ? 'rgba(255,255,255,0.3)' : '#ffffff',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '12px',
        overflow: 'hidden',
        transition: 'background-color 0.2s ease',
        gap: '4px',
        minWidth: '60px',
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <span style={{ fontSize: '20px' }}>{icon}</span>
      <span style={{ fontSize: '11px' }}>{label}</span>

      {ripples.map((ripple) => (
        <span
          key={ripple.id}
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: '10px',
            height: '10px',
            marginLeft: '-5px',
            marginTop: '-5px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255,255,255,0.4)',
            transform: 'scale(0)',
            animation: 'ripple 0.6s ease-out',
            pointerEvents: 'none',
          }}
        />
      ))}
    </button>
  );
};
