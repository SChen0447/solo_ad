import React from 'react';

interface ColorInfo {
  hex: string;
  percentage: number;
  locked: boolean;
}

interface TemplatePreviewProps {
  colors: ColorInfo[];
}

const TemplatePreview: React.FC<TemplatePreviewProps> = ({ colors }) => {
  const c = colors.length >= 5
    ? colors
    : [
        { hex: '#6200ea', percentage: 0, locked: false },
        { hex: '#03dac6', percentage: 0, locked: false },
        { hex: '#ff0266', percentage: 0, locked: false },
        { hex: '#e0e0e0', percentage: 0, locked: false },
        { hex: '#9e9e9e', percentage: 0, locked: false },
      ];

  const cardData = [
    { title: 'Feature One', subtitle: 'Explore more', body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
    { title: 'Feature Two', subtitle: 'Explore more', body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
    { title: 'Feature Three', subtitle: 'Explore more', body: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.' },
  ];

  return (
    <div
      style={{
        background: c[0].hex,
        width: '100%',
        height: '100%',
        borderRadius: 12,
        overflow: 'hidden',
        transition: 'all 0.4s',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `rgba(255, 255, 255, 0.92)`,
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div
          style={{
            height: 80,
            background: c[1].hex,
            padding: '0 24px',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.4s',
          }}
        >
          <span style={{ color: '#fff', fontSize: 20, fontWeight: 700 }}>My Website</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 20 }}>
            <span style={{ color: '#fff', fontSize: 14 }}>Home</span>
            <span style={{ color: '#fff', fontSize: 14 }}>About</span>
            <span style={{ color: '#fff', fontSize: 14 }}>Contact</span>
          </div>
        </div>
        <div
          style={{
            padding: 24,
            display: 'flex',
            gap: 20,
            flexWrap: 'wrap',
            minHeight: 300,
            flex: 1,
          }}
        >
          {cardData.map((card, i) => (
            <div
              key={i}
              style={{
                minWidth: 280,
                flex: 1,
                borderRadius: 12,
                background: '#fff',
                border: `2px solid ${c[2].hex}`,
                padding: 20,
                transition: 'border-color 0.4s',
              }}
            >
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: c[3].hex,
                  transition: 'color 0.4s',
                }}
              >
                {card.title}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: c[4].hex,
                  marginTop: 8,
                  transition: 'color 0.4s',
                }}
              >
                {card.subtitle}
              </div>
              <div style={{ fontSize: 14, color: '#666', marginTop: 12, lineHeight: 1.6 }}>
                {card.body}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            height: 60,
            background: c[0].hex,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'background 0.4s',
          }}
        >
          <span style={{ color: '#fff', fontSize: 13 }}>© 2024 My Website. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
};

export default TemplatePreview;
