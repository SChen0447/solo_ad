import React, { useEffect, useRef } from 'react';

interface InfoPopupProps {
  name: string;
  type: 'ingredient' | 'tool';
  status: string;
  onClose: () => void;
}

const InfoPopup: React.FC<InfoPopupProps> = ({ name, type, status, onClose }) => {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const getTypeIcon = () => {
    return type === 'ingredient' ? '🥗' : '🔧';
  };

  const getTypeLabel = () => {
    return type === 'ingredient' ? '食材' : '工具';
  };

  const getStatusColor = () => {
    if (type === 'tool') return '#3498db';
    switch (status) {
      case '未处理':
        return '#e67e22';
      case '已切丁':
      case '已切片':
      case '已切丝':
      case '已切碎':
        return '#3498db';
      case '已炒熟':
      case '已煎熟':
      case '已煮熟':
      case '已蒸熟':
      case '已焖煮':
        return '#27ae60';
      case '已盛出':
        return '#9b59b6';
      default:
        return '#888';
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 100,
        pointerEvents: 'none',
        animation: 'popupFadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
      }}
    >
      <div
        ref={popupRef}
        style={{
          position: 'relative',
          minWidth: '200px',
          padding: '20px 24px',
          borderRadius: '16px',
          background: 'rgba(20, 20, 40, 0.92)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
          pointerEvents: 'auto',
          animation: 'popupBounce 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55)'
        }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.1)',
            color: '#aaa',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.color = '#aaa';
          }}
        >
          ✕
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: `linear-gradient(135deg, ${getStatusColor()}30, ${getStatusColor()}10)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            border: `1px solid ${getStatusColor()}40`
          }}>
            {getTypeIcon()}
          </div>
          <div>
            <div style={{
              fontSize: '18px',
              fontWeight: 600,
              color: '#fff',
              marginBottom: '2px'
            }}>
              {name}
            </div>
            <div style={{
              fontSize: '12px',
              color: '#888',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {getTypeLabel()}
            </div>
          </div>
        </div>

        <div style={{
          padding: '10px 14px',
          borderRadius: '8px',
          background: `${getStatusColor()}15`,
          border: `1px solid ${getStatusColor()}30`,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: getStatusColor(),
            boxShadow: `0 0 8px ${getStatusColor()}`
          }} />
          <span style={{
            fontSize: '13px',
            color: getStatusColor(),
            fontWeight: 500
          }}>
            {status}
          </span>
        </div>

        {type === 'ingredient' && (
          <div style={{
            marginTop: '14px',
            paddingTop: '14px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '12px',
            color: '#888',
            lineHeight: 1.6
          }}>
            <div style={{ marginBottom: '6px' }}>
              💡 <span style={{ color: '#aaa' }}>提示：</span>
            </div>
            {status === '未处理' && '点击步骤开始处理此食材'}
            {status.startsWith('已切') && '食材已切好，可以进行下一步烹饪'}
            {(status.includes('熟') || status.includes('煮') || status.includes('蒸')) && '食材已烹饪完成'}
            {status === '已盛出' && '食材已盛盘，可以享用啦！'}
          </div>
        )}

        <div style={{
          position: 'absolute',
          bottom: '-8px',
          left: '50%',
          width: '16px',
          height: '16px',
          background: 'rgba(20, 20, 40, 0.92)',
          borderRight: '1px solid rgba(255, 255, 255, 0.15)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.15)',
          transform: 'translateX(-50%) rotate(45deg)'
        }} />
      </div>

      <style>{`
        @keyframes popupFadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes popupBounce {
          0% {
            transform: scale(0.8);
            opacity: 0;
          }
          50% {
            transform: scale(1.05);
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default InfoPopup;
