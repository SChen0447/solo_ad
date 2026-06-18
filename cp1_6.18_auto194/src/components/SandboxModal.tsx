import React from 'react';
import type { ModalProps } from '@/types/componentTypes';

export const SandboxModal: React.FC<ModalProps> = ({
  title,
  content,
  showCloseButton,
  primaryColor,
  backgroundColor,
  borderRadius,
  overlayOpacity,
  width,
  height,
}) => {
  return (
    <div
      style={{
        width: width ? `${width}px` : '400px',
        height: height ? `${height}px` : '300px',
        position: 'relative',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: `rgba(0, 0, 0, ${overlayOpacity})`,
          borderRadius: `${borderRadius}px`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '85%',
          maxHeight: '85%',
          backgroundColor,
          borderRadius: `${borderRadius}px`,
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          transition: 'all 0.15s ease',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '18px',
              fontWeight: 600,
              color: primaryColor,
            }}
          >
            {title}
          </h3>
          {showCloseButton && (
            <button
              style={{
                background: 'none',
                border: 'none',
                color: '#b0b0b0',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '0',
                lineHeight: 1,
                width: '24px',
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ×
            </button>
          )}
        </div>
        <p
          style={{
            margin: 0,
            fontSize: '14px',
            color: '#e0e0e0',
            lineHeight: 1.6,
            flex: 1,
          }}
        >
          {content}
        </p>
      </div>
    </div>
  );
};
