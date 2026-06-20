import { GENE_CATEGORY_COLORS, GENE_CATEGORY_LABELS } from './types';
import type { GeneCategory } from './types';

const CATEGORIES: GeneCategory[] = ['transcription_factor', 'structural_protein', 'non_coding_rna'];

export function Legend() {
  return (
    <div
      style={{
        position: 'absolute',
        top: '16px',
        left: '16px',
        background: 'rgba(30, 30, 46, 0.8)',
        backdropFilter: 'blur(8px)',
        borderRadius: '8px',
        padding: '12px',
        zIndex: 50,
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
      }}
    >
      <div
        style={{
          color: '#c0c0e0',
          fontSize: '12px',
          marginBottom: '10px',
          fontWeight: 'bold',
          letterSpacing: '0.5px',
        }}
      >
        基因类别图例
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '8px',
          alignItems: 'center',
        }}
      >
        {CATEGORIES.map((category) => (
          <div
            key={category}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: GENE_CATEGORY_COLORS[category],
                boxShadow: `0 0 6px ${GENE_CATEGORY_COLORS[category]}`,
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: '#c0c0e0',
                fontSize: '12px',
                whiteSpace: 'nowrap',
              }}
            >
              {GENE_CATEGORY_LABELS[category]}
            </span>
          </div>
        ))}
      </div>

      <style>
        {`
          @media (max-width: 768px) {
            div[style*="left: '16px'"] {
              left: auto !important;
              right: 16px !important;
            }
          }
        `}
      </style>
    </div>
  );
}
