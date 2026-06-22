import React from 'react';
import type { HistoryEntry } from '../types';
import { formatTimestamp, getActionIcon } from './HistoryManager';

interface HistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  historyEntries: HistoryEntry[];
  currentIndex: number;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  isOpen,
  onClose,
  historyEntries,
  currentIndex,
}) => {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.1)',
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
          zIndex: 9998,
        }}
      />
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          width: '280px',
          height: '100vh',
          backgroundColor: '#FFFFFF',
          borderLeft: '1px solid #E2E8F0',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.3s ease',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1E293B', margin: 0 }}>
            📜 操作历史
          </h3>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '18px',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#F1F5F9';
              e.currentTarget.style.color = '#1E293B';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#64748B';
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '12px',
          }}
        >
          {historyEntries.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#94A3B8',
                fontSize: '14px',
              }}
            >
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>📝</div>
              暂无操作记录
              <div style={{ fontSize: '12px', marginTop: '8px' }}>
                添加或移动元素后会显示在这里
              </div>
            </div>
          ) : (
            historyEntries.map((entry, index) => {
              const isActive = index === currentIndex;
              return (
                <div
                  key={entry.id}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '8px',
                    backgroundColor: isActive ? '#EEF2FF' : '#F8FAFC',
                    border: `1px solid ${isActive ? '#6366F1' : '#E2E8F0'}`,
                    transition: 'all 0.2s ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#EEF2FF';
                    e.currentTarget.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isActive ? '#EEF2FF' : '#F8FAFC';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '8px',
                        backgroundColor: isActive ? '#6366F1' : '#E0E7FF',
                        color: isActive ? '#FFFFFF' : '#6366F1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        flexShrink: 0,
                      }}
                    >
                      {getActionIcon(entry.action)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 500,
                          color: isActive ? '#4F46E5' : '#334155',
                          marginBottom: '2px',
                        }}
                      >
                        {entry.description}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: '#94A3B8',
                          fontFamily: 'monospace',
                        }}
                      >
                        {formatTimestamp(entry.timestamp)}
                      </div>
                    </div>
                    <div
                      style={{
                        fontSize: '10px',
                        color: isActive ? '#6366F1' : '#CBD5E1',
                        fontWeight: 500,
                        flexShrink: 0,
                      }}
                    >
                      #{historyEntries.length - index}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid #E2E8F0',
            fontSize: '12px',
            color: '#94A3B8',
            textAlign: 'center',
            flexShrink: 0,
          }}
        >
          最多保留 50 步操作记录
        </div>
      </div>
    </>
  );
};
