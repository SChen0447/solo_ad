import React, { useState } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  title: string;
  content: string;
  width: number;
  borderRadius: number;
  primaryColor: string;
  showClose?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ title, content, width, borderRadius, primaryColor, showClose = true }) => {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '10px 20px',
          backgroundColor: primaryColor,
          color: '#ffffff',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 500,
        }}
      >
        打开弹窗
      </button>
    );
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 300ms ease',
  };

  const modalStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: `${borderRadius}px`,
    width: `${width}px`,
    maxWidth: '90vw',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
    overflow: 'hidden',
    animation: 'slideUp 300ms ease',
  };

  const headerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    borderBottom: '1px solid #f0f0f0',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: '#333333',
    margin: 0,
  };

  const contentStyle: React.CSSProperties = {
    padding: '20px',
    fontSize: '14px',
    color: '#666666',
    lineHeight: 1.6,
  };

  const footerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 20px',
    borderTop: '1px solid #f0f0f0',
  };

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div style={overlayStyle} onClick={() => setIsOpen(false)} className="playground-modal-overlay">
        <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
          <div style={headerStyle}>
            <h3 style={titleStyle}>{title}</h3>
            {showClose && (
              <X
                size={20}
                color="#999999"
                style={{ cursor: 'pointer', transition: 'color 200ms ease' }}
                onClick={() => setIsOpen(false)}
              />
            )}
          </div>
          <div style={contentStyle}>{content}</div>
          <div style={footerStyle}>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: '#f0f0f0',
                color: '#666666',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              取消
            </button>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                padding: '8px 16px',
                backgroundColor: primaryColor,
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              确认
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export const generateModalCode = (props: ModalProps): string => {
  return `<Modal
  title="${props.title}"
  content="${props.content}"
  width={${props.width}}
  borderRadius={${props.borderRadius}}
  primaryColor="${props.primaryColor}"
  showClose={${props.showClose}}
/>`;
};

export const defaultModalProps: ModalProps = {
  title: '提示',
  content: '这是一个模态框组件，用于展示重要信息或需要用户确认的操作。',
  width: 420,
  borderRadius: 12,
  primaryColor: '#6c63ff',
  showClose: true,
};
