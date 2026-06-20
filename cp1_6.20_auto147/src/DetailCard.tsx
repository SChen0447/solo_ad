import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BubbleData } from './types';

interface DetailCardProps {
  bubble: BubbleData | null;
  onClose: () => void;
}

const DetailCard: React.FC<DetailCardProps> = ({ bubble, onClose }) => {
  return (
    <AnimatePresence>
      {bubble && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            top: '50%',
            right: '40px',
            transform: 'translateY(-50%)',
            width: '280px',
            height: '400px',
            background: '#ffffff',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            padding: '24px',
            zIndex: 1000,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
          }}>
            <h3 style={{
              fontSize: '16px',
              fontWeight: 700,
              color: '#0f172a',
              margin: 0,
            }}>
              数据详情
            </h3>
            <button
              onClick={onClose}
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: 'none',
                background: '#f1f5f9',
                color: '#64748b',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 700,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.target as HTMLElement).style.background = '#e2e8f0';
              }}
              onMouseLeave={(e) => {
                (e.target as HTMLElement).style.background = '#f1f5f9';
              }}
            >
              ✕
            </button>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            marginBottom: '16px',
            padding: '10px',
            background: '#f8fafc',
            borderRadius: '10px',
          }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: bubble.color,
              opacity: 0.85,
              flexShrink: 0,
            }} />
            <div>
              <div style={{ fontSize: '12px', color: '#64748b' }}>半径</div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                {bubble.radius.toFixed(2)}
              </div>
            </div>
          </div>

          <div style={{
            marginBottom: '12px',
            padding: '8px 10px',
            background: '#f0f0ff',
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '11px', color: '#6366f1', marginBottom: '4px', fontWeight: 600 }}>
              矩阵坐标
            </div>
            <div style={{ fontSize: '13px', color: '#334155', fontFamily: 'monospace' }}>
              [{bubble.matrixIndex.join(', ')}]
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              数据维度
            </div>
            {Object.entries(bubble.values).map(([key, value]) => (
              <div
                key={key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <span style={{ fontSize: '13px', color: '#64748b' }}>{key}</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', fontFamily: 'monospace' }}>
                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DetailCard;
