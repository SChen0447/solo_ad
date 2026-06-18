import { useAppStore } from '../store';
import { X } from 'lucide-react';

export function Toast() {
  const toast = useAppStore((state) => state.toast);
  const hideToast = useAppStore((state) => state.hideToast);

  if (!toast) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '80px',
        right: '24px',
        zIndex: 1000,
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: toast.type === 'success' ? '#22c55e' : '#ef4444',
          color: '#ffffff',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '200px',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 500 }}>{toast.message}</span>
        <button
          onClick={hideToast}
          style={{
            background: 'none',
            border: 'none',
            color: '#ffffff',
            cursor: 'pointer',
            padding: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={16} />
        </button>
      </div>
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(100px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
