import React from 'react';
import { useMoleculeStore } from '@/store/moleculeStore';
import { RESIDUE_PROPERTIES } from '@/types';

const sideChainLabels: Record<string, string> = {
  hydrophobic: '疏水性残基',
  hydrophilic: '亲水性残基',
  charged: '带电荷残基',
  polar: '极性残基',
  special: '特殊残基',
};

export const InfoModal: React.FC = () => {
  const {
    selectedResidueInfo,
    isInfoPanelOpen,
    closeInfoPanel,
    openMutationPanel,
    selectResidue,
  } = useMoleculeStore();

  if (!isInfoPanelOpen || !selectedResidueInfo) return null;

  const props = RESIDUE_PROPERTIES[selectedResidueInfo.name];
  const hydroAbs = Math.abs(selectedResidueInfo.hydrophobicity);
  const hydroPct = Math.min(hydroAbs / 5, 1) * 100;
  const hydroColor = selectedResidueInfo.hydrophobicity >= 0 ? '#888' : '#4488ff';

  const handleOpenMutation = () => {
    openMutationPanel();
  };

  return (
    <>
      <div
        style={styles.backdrop}
        onClick={() => {
          selectResidue(null);
        }}
      />
      <div style={styles.panel}>
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <span style={styles.badge}>{selectedResidueInfo.oneLetterCode}</span>
            <div style={styles.headerText}>
              <div style={styles.fullName}>{props.fullName}</div>
              <div style={styles.codeRow}>
                <span style={styles.threeLetter}>{selectedResidueInfo.threeLetterCode}</span>
                <span style={styles.sep}>·</span>
                <span style={styles.posLabel}>位置 {selectedResidueInfo.sequenceNumber}</span>
              </div>
            </div>
          </div>
          <button
            style={styles.closeBtn}
            onClick={() => {
              selectResidue(null);
            }}
          >
            ×
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.row}>
            <div style={styles.label}>侧链类型</div>
            <div style={{ ...styles.value, color: '#00d4aa' }}>
              {sideChainLabels[selectedResidueInfo.sideChainType]}
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.label}>疏水性指数</div>
            <div style={styles.value}>
              <div style={styles.hydroRow}>
                <span style={{ color: hydroColor, fontWeight: 600 }}>
                  {selectedResidueInfo.hydrophobicity >= 0 ? '+' : ''}
                  {selectedResidueInfo.hydrophobicity.toFixed(1)}
                </span>
                <div style={styles.hydroBarBg}>
                  <div
                    style={{
                      ...styles.hydroBarFill,
                      width: `${hydroPct}%`,
                      background: hydroColor,
                      marginLeft: selectedResidueInfo.hydrophobicity < 0 ? `${100 - hydroPct}%` : '0',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div style={styles.row}>
            <div style={styles.label}>原子数量</div>
            <div style={styles.value}>{selectedResidueInfo.atomCount} 个</div>
          </div>

          <div style={styles.row}>
            <div style={styles.label}>突变状态</div>
            <div style={{ ...styles.value, color: selectedResidueInfo.isMutated ? '#aa44ff' : '#8892a6' }}>
              {selectedResidueInfo.isMutated ? '已突变' : '野生型'}
            </div>
          </div>

          <div style={styles.divider} />

          <div style={styles.neighborSection}>
            <div style={styles.sectionTitle}>序列上下文</div>
            <div style={styles.neighborRow}>
              <div style={styles.neighborCell(false)}>
                {selectedResidueInfo.prevResidue ? (
                  <>
                    <span style={styles.neighborBadge}>
                      {RESIDUE_PROPERTIES[selectedResidueInfo.prevResidue].oneLetter}
                    </span>
                    <span style={styles.neighborName}>
                      {RESIDUE_PROPERTIES[selectedResidueInfo.prevResidue].fullName}
                    </span>
                    <span style={styles.neighborLabel}>上游</span>
                  </>
                ) : (
                  <span style={styles.neighborEmpty}>N端</span>
                )}
              </div>
              <div style={styles.neighborArrow}>←</div>
              <div style={styles.neighborCell(true)}>
                <span style={{ ...styles.neighborBadge, background: '#00d4aa' }}>
                  {selectedResidueInfo.oneLetterCode}
                </span>
                <span style={{ ...styles.neighborName, color: '#fff', fontWeight: 600 }}>
                  {props.fullName}
                </span>
                <span style={styles.neighborLabel}>当前</span>
              </div>
              <div style={styles.neighborArrow}>→</div>
              <div style={styles.neighborCell(false)}>
                {selectedResidueInfo.nextResidue ? (
                  <>
                    <span style={styles.neighborBadge}>
                      {RESIDUE_PROPERTIES[selectedResidueInfo.nextResidue].oneLetter}
                    </span>
                    <span style={styles.neighborName}>
                      {RESIDUE_PROPERTIES[selectedResidueInfo.nextResidue].fullName}
                    </span>
                    <span style={styles.neighborLabel}>下游</span>
                  </>
                ) : (
                  <span style={styles.neighborEmpty}>C端</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.mutateBtn} onClick={handleOpenMutation}>
            🧬 突变此残基
          </button>
        </div>
      </div>
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    background: 'rgba(0, 0, 0, 0.3)',
    zIndex: 90,
    animation: 'fadeIn 0.2s ease-out',
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    width: 340,
    height: '100%',
    background: 'rgba(30, 35, 45, 0.92)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    color: '#e0e4ec',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '-8px 0 40px rgba(0,0,0,0.4)',
    animation: 'slideInRight 0.25s ease-out',
  },
  header: {
    padding: '18px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'linear-gradient(180deg, rgba(0,212,170,0.06) 0%, transparent 100%)',
  },
  headerTitle: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'linear-gradient(135deg, #00d4aa 0%, #0099ff 100%)',
    color: '#fff',
    fontSize: 22,
    fontWeight: 800,
    boxShadow: '0 0 20px rgba(0, 212, 170, 0.3)',
  },
  headerText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
  },
  fullName: {
    fontSize: 18,
    fontWeight: 600,
    color: '#fff',
  },
  codeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 12,
  },
  threeLetter: {
    color: '#00d4aa',
    fontWeight: 600,
    letterSpacing: 1,
  },
  sep: {
    color: '#3a4258',
  },
  posLabel: {
    color: '#8892a6',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#8892a6',
    cursor: 'pointer',
    fontSize: 20,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  body: {
    flex: 1,
    padding: '20px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  row: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  label: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#5a6478',
    fontWeight: 600,
  },
  value: {
    fontSize: 14,
    color: '#e0e4ec',
  },
  hydroRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  hydroBarBg: {
    height: 6,
    borderRadius: 3,
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    position: 'relative',
  },
  hydroBarFill: {
    height: '100%',
    borderRadius: 3,
    transition: 'all 0.3s ease',
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.06)',
    margin: '8px 0',
  },
  sectionTitle: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#5a6478',
    fontWeight: 600,
    marginBottom: 10,
  },
  neighborSection: {},
  neighborRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  neighborCell: (active: boolean): React.CSSProperties => ({
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '10px 4px',
    borderRadius: 8,
    background: active ? 'rgba(0, 212, 170, 0.12)' : 'rgba(255,255,255,0.03)',
    border: active ? '1px solid rgba(0, 212, 170, 0.3)' : '1px solid rgba(255,255,255,0.06)',
  }),
  neighborBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 6,
    background: '#3a4258',
    color: '#fff',
    fontSize: 14,
    fontWeight: 700,
  },
  neighborName: {
    fontSize: 10,
    color: '#8892a6',
    textAlign: 'center',
  },
  neighborLabel: {
    fontSize: 9,
    color: '#5a6478',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  neighborEmpty: {
    fontSize: 11,
    color: '#5a6478',
    padding: '8px 0',
  },
  neighborArrow: {
    color: '#3a4258',
    fontSize: 12,
    flexShrink: 0,
  },
  footer: {
    padding: '16px 20px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  mutateBtn: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: 10,
    background: 'linear-gradient(135deg, #00d4aa 0%, #0099ff 100%)',
    border: 'none',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(0, 212, 170, 0.35)',
    transition: 'all 0.2s ease',
  },
};
