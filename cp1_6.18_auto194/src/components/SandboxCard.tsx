import React from 'react';
import type { CardProps } from '@/types/componentTypes';

export const SandboxCard: React.FC<CardProps> = ({
  title,
  description,
  imageUrl,
  elevation,
  primaryColor,
  backgroundColor,
  borderRadius,
  width,
  height,
}) => {
  const getBoxShadow = () => {
    const shadows = [
      'none',
      '0 1px 3px rgba(0,0,0,0.3)',
      '0 4px 6px rgba(0,0,0,0.4)',
      '0 10px 15px rgba(0,0,0,0.5)',
      '0 20px 25px rgba(0,0,0,0.6)',
      '0 25px 50px rgba(0,0,0,0.7)',
    ];
    return shadows[Math.min(elevation, 5)];
  };

  return (
    <div
      style={{
        width: width ? `${width}px` : '280px',
        height: height ? `${height}px` : '320px',
        backgroundColor,
        borderRadius: `${borderRadius}px`,
        boxShadow: getBoxShadow(),
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        transition: 'all 0.15s ease',
        boxSizing: 'border-box',
      }}
    >
      {imageUrl && (
        <div
          style={{
            width: '100%',
            height: '40%',
            backgroundColor: '#3a3a3a',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            flexShrink: 0,
          }}
        />
      )}
      <div style={{ padding: '16px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h3
          style={{
            margin: 0,
            fontSize: '16px',
            fontWeight: 600,
            color: primaryColor,
          }}
        >
          {title}
        </h3>
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: '#b0b0b0',
            lineHeight: 1.5,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
};
