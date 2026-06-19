import React from 'react';

interface ToolbarProps {
  autoRotate: boolean;
  onAutoRotateChange: (value: boolean) => void;
  onResetView: () => void;
  onRandomCluster: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({
  autoRotate,
  onAutoRotateChange,
  onResetView,
  onRandomCluster,
}) => {
  return (
    <div
      className="toolbar"
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '12px 20px',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '50px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        zIndex: 100,
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        className="auto-rotate-control"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <span
          style={{
            fontSize: '13px',
            color: 'rgba(255, 255, 255, 0.85)',
            whiteSpace: 'nowrap',
          }}
        >
          自动旋转
        </span>
        <div
          className="toggle-switch"
          onClick={() => onAutoRotateChange(!autoRotate)}
          style={{
            position: 'relative',
            width: '48px',
            height: '26px',
            background: autoRotate
              ? 'linear-gradient(135deg, #9b87ff, #7dd3fc)'
              : 'rgba(255, 255, 255, 0.15)',
            borderRadius: '13px',
            cursor: 'pointer',
            transition: 'background 0.2s ease',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '3px',
              left: autoRotate ? '25px' : '3px',
              width: '20px',
              height: '20px',
              background: '#fff',
              borderRadius: '50%',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
              transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
        </div>
      </div>

      <div
        style={{
          width: '1px',
          height: '28px',
          background: 'rgba(255, 255, 255, 0.15)',
        }}
      />

      <button
        onClick={onResetView}
        style={{
          padding: '10px 18px',
          background: 'rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '25px',
          color: '#fff',
          fontSize: '13px',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        🔄 重置视角
      </button>

      <button
        onClick={onRandomCluster}
        style={{
          padding: '10px 18px',
          background: 'linear-gradient(135deg, #9b87ff, #7dd3fc)',
          border: 'none',
          borderRadius: '25px',
          color: '#fff',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
          boxShadow: '0 2px 12px rgba(155, 135, 255, 0.4)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 16px rgba(155, 135, 255, 0.5)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(155, 135, 255, 0.4)';
        }}
      >
        ✨ 随机晶簇
      </button>
    </div>
  );
};

export default Toolbar;
