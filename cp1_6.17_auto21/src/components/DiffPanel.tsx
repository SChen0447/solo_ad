import React, { useEffect, useMemo, useRef } from 'react';
import { X, Check, AlertTriangle } from 'lucide-react';
import type { DiffPanelProps, DiffResult } from '../types';
import { computeDiff } from '../utils/mergeStrategy';

const DiffPanel: React.FC<DiffPanelProps> = ({
  oldCode,
  newCode,
  onApply,
  onClose,
  visible,
}) => {
  const diffResults = useMemo<DiffResult[]>(() => {
    if (!oldCode || !newCode) return [];
    return computeDiff(oldCode, newCode);
  }, [oldCode, newCode]);

  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [visible, onClose]);

  const getLineStyle = (type: string): React.CSSProperties => {
    switch (type) {
      case 'added':
        return {
          backgroundColor: 'rgba(34, 197, 94, 0.15)',
          borderLeft: '3px solid #22c55e',
        };
      case 'removed':
        return {
          backgroundColor: 'rgba(239, 68, 68, 0.15)',
          borderLeft: '3px solid #ef4444',
        };
      case 'modified':
        return {
          backgroundColor: 'rgba(249, 115, 22, 0.15)',
          borderLeft: '3px solid #f97316',
        };
      default:
        return {};
    }
  };

  const getLinePrefix = (type: string): string => {
    switch (type) {
      case 'added':
        return '+ ';
      case 'removed':
        return '- ';
      default:
        return '  ';
    }
  };

  const getLineNumberClass = (type: string): string => {
    switch (type) {
      case 'added':
        return 'text-green-400';
      case 'removed':
        return 'text-red-400';
      case 'modified':
        return 'text-orange-400';
      default:
        return 'text-gray-500';
    }
  };

  const stats = useMemo(() => {
    const added = diffResults.filter((d) => d.type === 'added').length;
    const removed = diffResults.filter((d) => d.type === 'removed').length;
    const modified = diffResults.filter((d) => d.type === 'modified').length;
    return { added, removed, modified };
  }, [diffResults]);

  if (!visible) return null;

  return (
    <div
      className="diff-panel-overlay"
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        maxWidth: '600px',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        animation: 'slideInRight 0.3s ease-in-out',
        display: 'flex',
        flexDirection: 'column',
      }}
      ref={panelRef}
    >
      <div
        style={{
          backgroundColor: '#252526',
          borderLeft: '1px solid #333',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #333',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <h3
              style={{
                color: '#d4d4d4',
                fontSize: '16px',
                fontWeight: 600,
                margin: 0,
                fontFamily: "'Inter', sans-serif",
              }}
            >
              差异对比
            </h3>
            <div
              style={{
                display: 'flex',
                gap: '16px',
                marginTop: '8px',
                fontSize: '12px',
              }}
            >
              <span style={{ color: '#22c55e' }}>+{stats.added} 新增</span>
              <span style={{ color: '#ef4444' }}>-{stats.removed} 删除</span>
              {stats.modified > 0 && (
                <span style={{ color: '#f97316' }}>~{stats.modified} 修改</span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-icon"
            style={{
              background: 'none',
              border: 'none',
              color: '#858585',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '4px',
              transition: 'all 0.3s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#3c3c3c';
              e.currentTarget.style.color = '#d4d4d4';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#858585';
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid #333',
            display: 'flex',
            gap: '8px',
            alignItems: 'center',
            fontSize: '12px',
            color: '#858585',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <AlertTriangle size={14} style={{ color: '#f97316' }} />
          <span>应用差异将使用历史版本覆盖当前代码的对应部分</span>
        </div>

        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: '13px',
            lineHeight: '1.6',
          }}
        >
          {diffResults.map((diff, index) => (
            <div
              key={index}
              style={{
                ...getLineStyle(diff.type),
                display: 'flex',
                padding: '2px 16px',
                animation: 'fadeInLine 0.3s ease-in-out',
                animationDelay: `${index * 10}ms`,
                animationFillMode: 'both',
              }}
            >
              <span
                className={getLineNumberClass(diff.type)}
                style={{
                  width: '40px',
                  textAlign: 'right',
                  paddingRight: '12px',
                  userSelect: 'none',
                  flexShrink: 0,
                }}
              >
                {diff.lineNumber > 0 ? diff.lineNumber : diff.oldLineNumber}
              </span>
              <pre
                style={{
                  margin: 0,
                  fontFamily: 'inherit',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  color: diff.type === 'removed' ? '#fca5a5' : diff.type === 'added' ? '#86efac' : '#d4d4d4',
                }}
              >
                {getLinePrefix(diff.type)}
                {diff.value}
              </pre>
            </div>
          ))}
        </div>

        <div
          style={{
            padding: '16px 20px',
            borderTop: '1px solid #333',
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{
              padding: '10px 20px',
              backgroundColor: '#3c3c3c',
              color: '#d4d4d4',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
              transition: 'all 0.3s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#4a4a4a';
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3c3c3c';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            取消
          </button>
          <button
            onClick={onApply}
            className="btn-primary"
            style={{
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontFamily: "'Inter', sans-serif",
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.3s ease-in-out',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
              e.currentTarget.style.transform = 'scale(0.98)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            <Check size={16} />
            应用此差异
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeInLine {
          from {
            opacity: 0;
            transform: translateX(10px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        
        @media (max-width: 768px) {
          .diff-panel-overlay {
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
};

export default DiffPanel;
