import React from 'react';

interface CrystalInfo {
  id: string;
  name: string;
  formula: string;
  hardness: number;
  formation: string;
  description: string;
  color: string;
}

interface InfoPanelProps {
  crystal: CrystalInfo | null;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ crystal }) => {
  const hardnessPercentage = (crystal?.hardness || 0) * 10;

  return (
    <div
      className={`info-panel ${crystal ? 'visible' : ''}`}
      style={{
        position: 'fixed',
        top: '50%',
        right: crystal ? '24px' : '-400px',
        transform: 'translateY(-50%)',
        width: '360px',
        maxHeight: '80vh',
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        padding: '24px',
        color: '#fff',
        zIndex: 100,
        transition: 'right 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        overflowY: 'auto',
      }}
    >
      {crystal ? (
        <>
          <div
            className="crystal-thumbnail"
            style={{
              width: '100%',
              height: '160px',
              borderRadius: '12px',
              background: `linear-gradient(135deg, ${crystal.color}40, ${crystal.color}10)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '20px',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                background: `linear-gradient(135deg, ${crystal.color}, ${crystal.color}80)`,
                clipPath: 'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)',
                opacity: 0.9,
                filter: 'drop-shadow(0 4px 20px rgba(255, 255, 255, 0.3))',
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: '8px',
                right: '12px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.5)',
              }}
            >
              缩略图
            </div>
          </div>

          <h2
            style={{
              fontSize: '24px',
              fontWeight: 600,
              marginBottom: '8px',
              background: `linear-gradient(135deg, #fff, ${crystal.color})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            {crystal.name}
          </h2>

          <div
            className="formula"
            style={{
              fontSize: '16px',
              color: 'rgba(255, 255, 255, 0.7)',
              marginBottom: '20px',
              fontFamily: 'serif',
              fontStyle: 'italic',
            }}
          >
            {crystal.formula}
          </div>

          <div className="hardness-section" style={{ marginBottom: '20px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                莫氏硬度
              </span>
              <span
                style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: crystal.color,
                }}
              >
                {crystal.hardness} / 10
              </span>
            </div>
            <div
              style={{
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${hardnessPercentage}%`,
                  background: `linear-gradient(90deg, ${crystal.color}, ${crystal.color}80)`,
                  borderRadius: '4px',
                  transition: 'width 0.5s ease',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '0 1px',
                }}
              >
                {Array.from({ length: 10 }).map((_, i) => (
                  <div
                    key={i}
                    style={{
                      width: '1px',
                      height: '100%',
                      background: 'rgba(0, 0, 0, 0.2)',
                    }}
                  />
                ))}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: '4px',
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.4)',
              }}
            >
              <span>1</span>
              <span>5</span>
              <span>10</span>
            </div>
          </div>

          <div className="description-section" style={{ marginBottom: '16px' }}>
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              简介
            </h3>
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.65)',
              }}
            >
              {crystal.description}
            </p>
          </div>

          <div className="formation-section">
            <h3
              style={{
                fontSize: '14px',
                fontWeight: 600,
                marginBottom: '8px',
                color: 'rgba(255, 255, 255, 0.9)',
              }}
            >
              形成环境
            </h3>
            <p
              style={{
                fontSize: '13px',
                lineHeight: 1.6,
                color: 'rgba(255, 255, 255, 0.65)',
              }}
            >
              {crystal.formation}
            </p>
          </div>
        </>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: 'rgba(255, 255, 255, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: '40px',
              marginBottom: '12px',
            }}
          >
            💎
          </div>
          <div style={{ fontSize: '14px' }}>点击晶体查看详情</div>
        </div>
      )}
    </div>
  );
};

export default InfoPanel;
