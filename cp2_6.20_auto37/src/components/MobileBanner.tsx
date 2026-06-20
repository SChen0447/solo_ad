import React from 'react';

interface MobileBannerProps {
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export const MobileBanner: React.FC<MobileBannerProps> = ({ isExpanded, onToggle, children }) => {
  return (
    <div style={styles.container}>
      <div style={styles.header} onClick={onToggle}>
        <span style={styles.title}>拓扑控制</span>
        <div style={{ ...styles.icon, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
          ▼
        </div>
      </div>
      <div
        style={{
          ...styles.content,
          maxHeight: isExpanded ? '500px' : '0',
          opacity: isExpanded ? 1 : 0,
        }}
      >
        {children}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    background: 'rgba(20, 25, 40, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(100, 150, 255, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
  },
  title: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 600,
  },
  icon: {
    color: '#aabbcc',
    fontSize: 14,
    transition: 'transform 0.3s ease',
  },
  content: {
    overflow: 'hidden',
    transition: 'max-height 0.3s ease, opacity 0.3s ease',
    padding: '0 16px',
  },
};

export default MobileBanner;
