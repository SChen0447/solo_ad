import { useStore } from './store';

const controlBarStyle: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: '50px',
  background: 'rgba(10, 14, 39, 0.7)',
  borderBottom: '1px solid rgba(79, 195, 247, 0.3)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '0 24px',
  zIndex: 100,
  backdropFilter: 'blur(10px)'
};

const buttonBaseStyle: React.CSSProperties = {
  width: '100px',
  height: '36px',
  borderRadius: '18px',
  border: 'none',
  color: 'white',
  fontSize: '14px',
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  fontFamily: 'inherit'
};

const clearButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  background: '#ff6b6b'
};

const resetButtonStyle: React.CSSProperties = {
  ...buttonBaseStyle,
  background: '#4fc3f7'
};

const buttonGroupStyle: React.CSSProperties = {
  display: 'flex',
  gap: '12px',
  alignItems: 'center'
};

const counterStyle: React.CSSProperties = {
  color: '#f0e6d3',
  fontSize: '14px',
  fontWeight: 500,
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
  padding: '8px 16px',
  background: 'rgba(79, 195, 247, 0.1)',
  borderRadius: '12px',
  border: '1px solid rgba(79, 195, 247, 0.2)'
};

const scrollCardStyle: React.CSSProperties = {
  position: 'fixed',
  bottom: '24px',
  right: '24px',
  background: 'rgba(26, 26, 46, 0.85)',
  borderRadius: '16px',
  border: '1px solid rgba(255, 215, 0, 0.3)',
  padding: '16px',
  maxWidth: '320px',
  backdropFilter: 'blur(10px)',
  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
  transition: 'all 0.3s ease-out',
  zIndex: 100,
  animation: 'slideIn 0.3s ease-out'
};

const scrollTitleStyle: React.CSSProperties = {
  color: '#ffd700',
  fontSize: '18px',
  fontWeight: 600,
  marginBottom: '8px',
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)'
};

const scrollAuthorStyle: React.CSSProperties = {
  color: '#c9b896',
  fontSize: '13px',
  marginBottom: '12px',
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)'
};

const scrollContentStyle: React.CSSProperties = {
  color: '#f0e6d3',
  fontSize: '14px',
  lineHeight: 1.8,
  textShadow: '0 1px 3px rgba(0, 0, 0, 0.5)',
  whiteSpace: 'pre-wrap'
};

const titleStyle: React.CSSProperties = {
  color: '#4fc3f7',
  fontSize: '16px',
  fontWeight: 600,
  textShadow: '0 0 10px rgba(79, 195, 247, 0.5)',
  letterSpacing: '2px'
};

export function ControlBar() {
  const poemGroups = useStore(state => state.poemGroups);
  const removeAllPoems = useStore(state => state.removeAllPoems);
  const resetCamera = useStore(state => state.resetCamera);
  const isFusing = useStore(state => state.isFusing);
  
  const handleClear = () => {
    if (isFusing) return;
    if (window.confirm('确定要清空场景吗？所有诗句粒子将被重置。')) {
      removeAllPoems();
    }
  };
  
  const handleReset = () => {
    resetCamera();
  };
  
  return (
    <div style={controlBarStyle}>
      <div style={titleStyle}>✦ 粒子诗境 ✦</div>
      
      <div style={buttonGroupStyle}>
        <div style={counterStyle}>
          诗句数量: {poemGroups.length}
        </div>
        
        <button
          style={resetButtonStyle}
          onClick={handleReset}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#29b6f6';
            e.currentTarget.style.transform = 'scale(1.05)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#4fc3f7';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          重置视角
        </button>
        
        <button
          style={clearButtonStyle}
          onClick={handleClear}
          disabled={isFusing}
          onMouseEnter={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.background = '#ff5252';
              e.currentTarget.style.transform = 'scale(1.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (!e.currentTarget.disabled) {
              e.currentTarget.style.background = '#ff6b6b';
              e.currentTarget.style.transform = 'scale(1)';
            }
          }}
        >
          清空场景
        </button>
      </div>
      
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

export function ScrollCard() {
  const showScroll = useStore(state => state.showScroll);
  const scrollPoem = useStore(state => state.scrollPoem);
  const hideScroll = useStore(state => state.hideScroll);
  
  if (!showScroll || !scrollPoem) return null;
  
  const formatContent = (content: string) => {
    const parts: string[] = [];
    for (let i = 0; i < content.length; i += 6) {
      parts.push(content.slice(i, i + 6));
    }
    return parts.join('\n');
  };
  
  return (
    <div style={scrollCardStyle} onClick={hideScroll}>
      <div style={scrollTitleStyle}>{scrollPoem.title}</div>
      <div style={scrollAuthorStyle}>—— {scrollPoem.author}</div>
      <div style={scrollContentStyle}>
        {formatContent(scrollPoem.content)}
      </div>
    </div>
  );
}
