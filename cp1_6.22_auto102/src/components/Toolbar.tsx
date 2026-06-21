import React from 'react';

interface ToolbarProps {
  onExportPNG: () => void;
  onResetLayout: () => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ onExportPNG, onResetLayout }) => {
  return (
    <div
      className="sidebar-left"
      style={{
        width: 80,
        backgroundColor: '#2d3748',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '16px 8px',
        gap: 12,
        borderRight: '1px solid #4a5568',
      }}
    >
      <div
        style={{
          fontSize: 12,
          fontWeight: 'bold',
          color: '#fff',
          marginBottom: 8,
          textAlign: 'center',
        }}
      >
        思维图
      </div>

      <button
        className="toolbar-btn"
        onClick={onExportPNG}
        style={{
          width: '100%',
          padding: '10px 4px',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
        }}
        title="导出PNG"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
        <span>导出PNG</span>
      </button>

      <button
        className="toolbar-btn"
        onClick={onResetLayout}
        style={{
          width: '100%',
          padding: '10px 4px',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          fontSize: 11,
        }}
        title="重置布局"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        <span>重置布局</span>
      </button>

      <div
        style={{
          flex: 1,
        }}
      />

      <div
        style={{
          fontSize: 10,
          color: '#a0aec0',
          textAlign: 'center',
          padding: '0 4px',
          lineHeight: 1.4,
        }}
      >
        点击画布
        <br />
        添加节点
      </div>
    </div>
  );
};

export default Toolbar;
