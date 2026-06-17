import React from 'react';
import { User } from '../types';
import UserList from './UserList';

interface ToolbarProps {
  onFormat: (command: string, value?: string) => void;
  roomCode: string;
  users: User[];
  currentUserId: string;
  onExport: (format: 'html' | 'txt') => void;
  onLeave: () => void;
  isConnected: boolean;
  saveStatus: 'saved' | 'unsaved' | 'saving';
}

const Toolbar: React.FC<ToolbarProps> = ({
  onFormat,
  roomCode,
  users,
  currentUserId,
  onExport,
  onLeave,
  isConnected,
  saveStatus
}) => {
  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(roomCode);
  };

  const buttons = [
    { command: 'bold', label: 'B', title: '加粗', style: { fontWeight: 700 } },
    { command: 'italic', label: 'I', title: '斜体', style: { fontStyle: 'italic' } },
    { command: 'underline', label: 'U', title: '下划线', style: { textDecoration: 'underline' } },
  ];

  const headingButtons = [
    { command: 'formatBlock', value: 'h1', label: 'H1', title: '标题1' },
    { command: 'formatBlock', value: 'h2', label: 'H2', title: '标题2' },
    { command: 'formatBlock', value: 'h3', label: 'H3', title: '标题3' },
  ];

  const listButtons = [
    { command: 'insertUnorderedList', label: '•', title: '无序列表' },
    { command: 'insertOrderedList', label: '1.', title: '有序列表' },
  ];

  return (
    <div style={{
      position: 'sticky',
      top: 0,
      background: '#ffffff',
      borderBottom: '1px solid #e5e7eb',
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      zIndex: 100,
      borderTopLeftRadius: '16px',
      borderTopRightRadius: '16px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
        borderRadius: '8px',
        color: 'white',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer'
      }} onClick={handleCopyRoomCode} title="点击复制房间码">
        <span>🏠</span>
        <span style={{ letterSpacing: '2px', fontFamily: 'monospace' }}>{roomCode}</span>
        <span style={{ fontSize: '11px', opacity: 0.8 }}>复制</span>
      </div>

      <div style={{
        width: '1px',
        height: '24px',
        background: '#e5e7eb'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {buttons.map((btn) => (
          <button
            key={btn.command}
            onClick={() => onFormat(btn.command)}
            title={btn.title}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              color: '#374151',
              background: 'transparent',
              ...btn.style
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div style={{
        width: '1px',
        height: '24px',
        background: '#e5e7eb'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {headingButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => onFormat(btn.command, btn.value)}
            title={btn.title}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 700,
              color: '#374151',
              background: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div style={{
        width: '1px',
        height: '24px',
        background: '#e5e7eb'
      }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {listButtons.map((btn) => (
          <button
            key={btn.command}
            onClick={() => onFormat(btn.command)}
            title={btn.title}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              color: '#374151',
              background: 'transparent'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f3f4f6'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            {btn.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          onClick={() => onExport('txt')}
          title="导出为纯文本"
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#374151',
            background: 'transparent',
            border: '1px solid #d1d5db'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          📄 TXT
        </button>
        <button
          onClick={() => onExport('html')}
          title="导出为HTML"
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            color: '#374151',
            background: 'transparent',
            border: '1px solid #d1d5db'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          🌐 HTML
        </button>
      </div>

      <div style={{
        width: '1px',
        height: '24px',
        background: '#e5e7eb'
      }} />

      <UserList users={users} currentUserId={currentUserId} />

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '8px',
        background: saveStatus === 'saved' ? '#f0fdf4' : saveStatus === 'saving' ? '#fffbeb' : '#fef2f2',
        transition: 'all 0.3s'
      }} title={
        saveStatus === 'saved' 
          ? '所有更改已保存到本地' 
          : saveStatus === 'saving' 
            ? '正在保存...' 
            : '有未保存的更改，30秒后自动保存'
      }>
        <div style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: saveStatus === 'saved' ? '#22c55e' : saveStatus === 'saving' ? '#eab308' : '#f59e0b',
          animation: saveStatus === 'saving' ? 'pulse 1s infinite' : 'none',
          transition: 'all 0.3s'
        }} />
        <span style={{
          fontSize: '13px',
          fontWeight: 500,
          color: saveStatus === 'saved' ? '#15803d' : saveStatus === 'saving' ? '#a16207' : '#b45309',
          transition: 'all 0.3s'
        }}>
          {saveStatus === 'saved' ? '已保存' : saveStatus === 'saving' ? '保存中' : '未保存'}
        </span>
      </div>

      <button
        onClick={onLeave}
        title="离开房间"
        style={{
          padding: '8px 16px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 500,
          color: '#dc2626',
          background: 'transparent'
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#fef2f2'; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
      >
        离开
      </button>

      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: isConnected ? '#22c55e' : '#ef4444',
        animation: isConnected ? 'none' : 'pulse 1s infinite'
      }} title={isConnected ? '已连接' : '连接断开'} />
    </div>
  );
};

export default Toolbar;
