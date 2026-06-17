import React, { useState, useCallback } from 'react';
import { Resizable } from 're-resizable';
import type { PreviewShape } from '../types';

interface PreviewPanelProps {
  gradient: string;
  webkitGradient: string;
}

const shapeLabels: Record<PreviewShape, string> = {
  background: '背景填充',
  circle: '圆形遮罩',
  text: '文字填充',
  border: '边框渐变',
  stripes: '渐变条纹',
};

type StripeDirection = 'horizontal' | 'vertical';

const PreviewPanel: React.FC<PreviewPanelProps> = ({ gradient, webkitGradient }) => {
  const [shape, setShape] = useState<PreviewShape>('background');
  const [stripeDirection, setStripeDirection] = useState<StripeDirection>('horizontal');

  const renderPreview = useCallback(() => {
    switch (shape) {
      case 'background':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              background: gradient,
              borderRadius: '8px',
            }}
          />
        );

      case 'circle':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background:
                'repeating-conic-gradient(#f0f0f0 0% 25%, #fff 0% 50%) 50% / 20px 20px',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                width: '150px',
                height: '150px',
                borderRadius: '50%',
                background: gradient,
                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
              }}
            />
          </div>
        );

      case 'text':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#1a1a2e',
              borderRadius: '8px',
            }}
          >
            <svg width="200" height="120" viewBox="0 0 200 120">
              <defs>
                <linearGradient id="text-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ff6b6b" />
                  <stop offset="50%" stopColor="#feca57" />
                  <stop offset="100%" stopColor="#48dbfb" />
                </linearGradient>
              </defs>
              <text
                x="100"
                y="85"
                textAnchor="middle"
                fontSize="72"
                fontWeight="bold"
                fontFamily="Arial, sans-serif"
                fill="url(#text-gradient)"
              >
                CSS
              </text>
            </svg>
          </div>
        );

      case 'border':
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fafafa',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                position: 'relative',
                padding: '16px 40px',
                borderRadius: '50px',
                background: gradient,
              }}
            >
              <div
                style={{
                  padding: '12px 32px',
                  borderRadius: '42px',
                  background: '#fff',
                  fontSize: '16px',
                  fontWeight: 600,
                  color: '#333',
                }}
              >
                渐变按钮
              </div>
            </div>
          </div>
        );

      case 'stripes':
        const stripeCount = 8;
        const stripes = [];
        for (let i = 0; i < stripeCount; i++) {
          const offset = (i / stripeCount) * 100;
          stripes.push(
            <div
              key={i}
              style={{
                flex: stripeDirection === 'horizontal' ? '1' : '0 0 auto',
                width: stripeDirection === 'vertical' ? `${100 / stripeCount}%` : '100%',
                height: stripeDirection === 'horizontal' ? 'auto' : '100%',
                background: gradient,
                backgroundSize: stripeDirection === 'horizontal'
                  ? '100% 200%'
                  : '200% 100%',
                backgroundPosition: stripeDirection === 'horizontal'
                  ? `0 ${offset * 2}%`
                  : `${offset * 2}% 0`,
              }}
            />
          );
        }
        return (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              flexDirection: stripeDirection === 'horizontal' ? 'column' : 'row',
              gap: '4px',
              padding: '8px',
              background: '#f5f5f5',
              borderRadius: '8px',
              boxSizing: 'border-box',
            }}
          >
            {stripes}
          </div>
        );

      default:
        return null;
    }
  }, [shape, gradient, webkitGradient, stripeDirection]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', height: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#333' }}>实时预览</div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(Object.keys(shapeLabels) as PreviewShape[]).map((s) => (
              <button
                key={s}
                onClick={() => setShape(s)}
                style={{
                  padding: '6px 10px',
                  border: shape === s ? '1px solid #1890ff' : '1px solid #d9d9d9',
                  background: shape === s ? '#e6f7ff' : '#fff',
                  color: shape === s ? '#1890ff' : '#666',
                  borderRadius: '6px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              >
                {shapeLabels[s]}
              </button>
            ))}
          </div>
        </div>

        {shape === 'stripes' && (
          <div
            style={{
              display: 'flex',
              gap: '6px',
              alignItems: 'center',
              padding: '6px 10px',
              background: '#fafafa',
              borderRadius: '6px',
            }}
          >
            <span style={{ fontSize: '12px', color: '#666' }}>条纹方向：</span>
            <button
              onClick={() => setStripeDirection('horizontal')}
              style={{
                padding: '4px 10px',
                border: stripeDirection === 'horizontal' ? '1px solid #1890ff' : '1px solid #d9d9d9',
                background: stripeDirection === 'horizontal' ? '#e6f7ff' : '#fff',
                color: stripeDirection === 'horizontal' ? '#1890ff' : '#666',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              水平
            </button>
            <button
              onClick={() => setStripeDirection('vertical')}
              style={{
                padding: '4px 10px',
                border: stripeDirection === 'vertical' ? '1px solid #1890ff' : '1px solid #d9d9d9',
                background: stripeDirection === 'vertical' ? '#e6f7ff' : '#fff',
                color: stripeDirection === 'vertical' ? '#1890ff' : '#666',
                borderRadius: '4px',
                fontSize: '11px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              垂直
            </button>
          </div>
        )}
      </div>

      <Resizable
        defaultSize={{ width: '100%', height: 300 }}
        minWidth={200}
        minHeight={150}
        maxHeight={600}
        style={{ flex: 1 }}
        handleStyles={{
          bottomRight: {
            right: '0',
            bottom: '0',
            cursor: 'se-resize',
          },
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            minHeight: '150px',
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        >
          {renderPreview()}
        </div>
      </Resizable>
    </div>
  );
};

export default PreviewPanel;
