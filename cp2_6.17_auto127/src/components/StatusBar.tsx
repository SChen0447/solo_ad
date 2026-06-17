import React from 'react';

interface StatusBarProps {
  wordCount: number;
  charCount: number;
}

const StatusBar: React.FC<StatusBarProps> = ({ wordCount, charCount }) => {
  return (
    <div style={{
      padding: '12px 24px',
      background: '#ffffff',
      borderTop: '1px solid #e5e7eb',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      fontSize: '14px',
      color: '#9ca3af',
      borderBottomLeftRadius: '16px',
      borderBottomRightRadius: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <span>字数: <strong style={{ color: '#6b7280' }}>{wordCount}</strong></span>
        <span>字符: <strong style={{ color: '#6b7280' }}>{charCount}</strong></span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '12px' }}>💡 选中文本可添加评注</span>
      </div>
    </div>
  );
};

export default StatusBar;
