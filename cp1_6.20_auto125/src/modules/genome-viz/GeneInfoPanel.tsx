import type { Gene } from './types';
import { GENE_CATEGORY_COLORS, GENE_CATEGORY_LABELS } from './types';

interface GeneInfoPanelProps {
  gene: Gene | null;
  onClose: () => void;
}

export function GeneInfoPanel({ gene, onClose }: GeneInfoPanelProps) {
  const isVisible = gene !== null;

  return (
    <>
      <style>
        {`
          @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
          }
          @keyframes slideInBottom {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes slideOutBottom {
            from { transform: translateY(0); opacity: 1; }
            to { transform: translateY(100%); opacity: 0; }
          }
          .gene-panel-enter-desktop {
            animation: slideInRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }
          .gene-panel-exit-desktop {
            animation: slideOutRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }
          .gene-panel-enter-mobile {
            animation: slideInBottom 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }
          .gene-panel-exit-mobile {
            animation: slideOutBottom 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards;
          }
        `}
      </style>
      {isVisible && gene && (
        <div
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            width: '320px',
            maxHeight: 'calc(100vh - 32px)',
            overflowY: 'auto',
            background: '#1e1e2e',
            borderRadius: '12px',
            border: '1px solid #3a3a5c',
            padding: '20px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            zIndex: 100,
            boxSizing: 'border-box',
            color: '#d0d0e0',
          }}
          className="gene-panel-enter-desktop"
          onAnimationEnd={(e) => {
            if (e.animationName === 'slideOutRight' || e.animationName === 'slideOutBottom') {
              // handled by parent via conditional rendering
            }
          }}
        >
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '12px',
              right: '12px',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              border: 'none',
              background: '#3a3a5c',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#5a5a7c';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#3a3a5c';
            }}
          >
            ×
          </button>

          <div style={{ marginBottom: '16px', paddingRight: '28px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '8px',
              }}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: GENE_CATEGORY_COLORS[gene.category],
                  boxShadow: `0 0 8px ${GENE_CATEGORY_COLORS[gene.category]}`,
                }}
              />
              <h2
                style={{
                  color: '#ffffff',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  margin: 0,
                }}
              >
                {gene.name}
              </h2>
            </div>
            <div
              style={{
                fontSize: '12px',
                color: '#8080a0',
                background: 'rgba(58, 58, 92, 0.5)',
                padding: '4px 10px',
                borderRadius: '12px',
                display: 'inline-block',
              }}
            >
              {GENE_CATEGORY_LABELS[gene.category]}
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '14px',
                color: '#a0a0c0',
                lineHeight: '1.6',
                marginBottom: '4px',
              }}
            >
              <strong style={{ color: '#c0c0e0' }}>位置坐标：</strong>
              X: {gene.position.x.toFixed(3)}, Y: {gene.position.y.toFixed(3)}, Z:{' '}
              {gene.position.z.toFixed(3)}
            </div>
            {gene.chromosome_band && (
              <div
                style={{
                  fontSize: '14px',
                  color: '#a0a0c0',
                  lineHeight: '1.6',
                }}
              >
                <strong style={{ color: '#c0c0e0' }}>染色体条带：</strong>
                {gene.chromosome_band}
              </div>
            )}
            {gene.expression_level && (
              <div
                style={{
                  fontSize: '14px',
                  color: '#a0a0c0',
                  lineHeight: '1.6',
                }}
              >
                <strong style={{ color: '#c0c0e0' }}>表达水平：</strong>
                {gene.expression_level}
              </div>
            )}
            {gene.conservation_score !== undefined && (
              <div
                style={{
                  fontSize: '14px',
                  color: '#a0a0c0',
                  lineHeight: '1.6',
                }}
              >
                <strong style={{ color: '#c0c0e0' }}>保守性评分：</strong>
                {gene.conservation_score.toFixed(3)}
              </div>
            )}
          </div>

          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '14px',
                color: '#c0c0e0',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              功能描述
            </div>
            <div
              style={{
                fontSize: '14px',
                color: '#d0d0e0',
                lineHeight: '1.6',
                textAlign: 'justify',
              }}
            >
              {gene.description}
            </div>
          </div>

          <div>
            <div
              style={{
                fontSize: '14px',
                color: '#c0c0e0',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              关联疾病
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {gene.diseases.map((disease, idx) => (
                <li
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 0',
                    fontSize: '14px',
                    color: '#d0d0e0',
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#e74c3c',
                      marginRight: '8px',
                      flexShrink: 0,
                      boxShadow: '0 0 4px #e74c3c',
                    }}
                  />
                  {disease}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <style>
        {`
          @media (max-width: 768px) {
            .gene-panel-enter-desktop {
              animation: slideInBottom 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards !important;
            }
            .gene-panel-exit-desktop {
              animation: slideOutBottom 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards !important;
            }
          }
        `}
      </style>

      {isVisible && gene && (
        <style>
          {`
            @media (max-width: 768px) {
              div[style*="right: '16px'"] {
                top: auto !important;
                right: 0 !important;
                bottom: 0 !important;
                left: 0 !important;
                width: 100% !important;
                height: 40vh !important;
                maxHeight: 40vh !important;
                borderRadius: 16px 16px 0 0 !important;
                border: none !important;
                borderTop: 1px solid #3a3a5c !important;
              }
            }
          `}
        </style>
      )}
    </>
  );
}
