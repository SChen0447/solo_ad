import React, { useState } from 'react';
import { useMoleculeStore } from '@/store/moleculeStore';
import { ALL_AMINO_ACIDS, ResidueType, RESIDUE_PROPERTIES } from '@/types';

interface MutationPanelProps {
  sceneManagerRef: React.MutableRefObject<any>;
}

export const MutationPanel: React.FC<MutationPanelProps> = ({ sceneManagerRef }) => {
  const {
    isMutationPanelOpen,
    selectedResidueInfo,
    closeMutationPanel,
    applyMutation,
    selectResidue,
  } = useMoleculeStore();

  const [targetResidue, setTargetResidue] = useState<ResidueType>('ALA');
  const [isApplying, setIsApplying] = useState(false);

  if (!isMutationPanelOpen || !selectedResidueInfo) return null;

  const originalProps = RESIDUE_PROPERTIES[selectedResidueInfo.name];
  const targetProps = RESIDUE_PROPERTIES[targetResidue];

  const handleConfirm = () => {
    setIsApplying(true);
    setTimeout(() => {
      const chainId = selectedResidueInfo.id.split('_')[0];
      const record = applyMutation(chainId, selectedResidueInfo.id, targetResidue);

      if (record && sceneManagerRef.current) {
        sceneManagerRef.current.applyMutation(chainId, selectedResidueInfo.id, targetResidue);
        selectResidue(null);
      }

      setIsApplying(false);
      closeMutationPanel();
    }, 150);
  };

  return (
    <>
      <div style={styles.backdrop} onClick={closeMutationPanel} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.headerIcon}>🧬</div>
          <div>
            <div style={styles.title}>虚拟突变</div>
            <div style={styles.subtitle}>
              将 {originalProps.fullName}（{selectedResidueInfo.name}）替换为其他氨基酸
            </div>
          </div>
          <button style={styles.closeBtn} onClick={closeMutationPanel}>
            ×
          </button>
        </div>

        <div style={styles.body}>
          <div style={styles.currentInfo}>
            <div style={styles.currentLabel}>原始残基</div>
            <div style={styles.currentCard}>
              <span style={styles.currentBadge(originalProps.sideChainType)}>
                {selectedResidueInfo.oneLetterCode}
              </span>
              <div style={styles.currentText}>
                <div style={styles.currentName}>{originalProps.fullName}</div>
                <div style={styles.currentMeta}>
                  {selectedResidueInfo.name} · 位置 {selectedResidueInfo.sequenceNumber}
                </div>
              </div>
            </div>
          </div>

          <div style={styles.arrowContainer}>
            <div style={styles.arrow}>↓</div>
          </div>

          <div style={styles.targetSection}>
            <div style={styles.targetLabel}>选择目标氨基酸</div>
            <div style={styles.grid}>
              {ALL_AMINO_ACIDS.map((res) => {
                const p = RESIDUE_PROPERTIES[res];
                const isSelected = res === targetResidue;
                const isSame = res === selectedResidueInfo.name;
                return (
                  <button
                    key={res}
                    style={{
                      ...styles.gridItem,
                      ...(isSelected ? styles.gridItemSelected : {}),
                      ...(isSame ? styles.gridItemSame : {}),
                    }}
                    onClick={() => !isSame && setTargetResidue(res)}
                    disabled={isSame || isApplying}
                  >
                    <span
                      style={{
                        ...styles.gridBadge,
                        background: p.sideChainType === 'hydrophobic'
                          ? '#888'
                          : p.sideChainType === 'charged'
                          ? '#ff4444'
                          : p.sideChainType === 'polar'
                          ? '#44aaff'
                          : p.sideChainType === 'hydrophilic'
                          ? '#4488ff'
                          : '#aa44aa',
                      }}
                    >
                      {p.oneLetter}
                    </span>
                    <span style={styles.gridName}>{p.fullName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.preview}>
            <div style={styles.previewLabel}>突变预览</div>
            <div style={styles.previewCard}>
              <span style={styles.previewBadge(originalProps.sideChainType)}>
                {selectedResidueInfo.oneLetterCode}
              </span>
              <span style={styles.previewArrow}>→</span>
              <span style={styles.previewBadge(targetProps.sideChainType)}>
                {targetProps.oneLetter}
              </span>
              <span style={styles.previewText}>
                {originalProps.fullName} → {targetProps.fullName}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelBtn} onClick={closeMutationPanel} disabled={isApplying}>
            取消
          </button>
          <button
            style={styles.confirmBtn}
            onClick={handleConfirm}
            disabled={isApplying || targetResidue === selectedResidueInfo.name}
          >
            {isApplying ? '应用中...' : '确认突变'}
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
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 200,
    animation: 'fadeIn 0.2s ease-out',
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 520,
    maxWidth: '90vw',
    maxHeight: '85vh',
    background: 'rgba(30, 35, 45, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: 16,
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
    color: '#e0e4ec',
    zIndex: 210,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    animation: 'modalIn 0.3s ease-out',
  },
  header: {
    padding: '20px 24px',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    background: 'linear-gradient(180deg, rgba(170, 68, 255, 0.08) 0%, transparent 100%)',
  },
  headerIcon: {
    fontSize: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    color: '#fff',
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#8892a6',
  },
  closeBtn: {
    marginLeft: 'auto',
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
    padding: '20px 24px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  currentInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  currentLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#5a6478',
    fontWeight: 600,
  },
  currentCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 10,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  currentBadge: (type: string): React.CSSProperties => {
    const colors: Record<string, string> = {
      hydrophobic: '#888',
      hydrophilic: '#4488ff',
      charged: '#ff4444',
      polar: '#44aaff',
      special: '#aa44aa',
    };
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 36,
      height: 36,
      borderRadius: 8,
      background: colors[type] || '#888',
      color: '#fff',
      fontSize: 18,
      fontWeight: 800,
    };
  },
  currentText: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  currentName: {
    fontSize: 15,
    fontWeight: 600,
    color: '#fff',
  },
  currentMeta: {
    fontSize: 11,
    color: '#5a6478',
  },
  arrowContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  arrow: {
    fontSize: 18,
    color: '#aa44ff',
  },
  targetSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  targetLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#5a6478',
    fontWeight: 600,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: 6,
  },
  gridItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '8px 4px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  gridItemSelected: {
    background: 'rgba(170, 68, 255, 0.18)',
    border: '1px solid rgba(170, 68, 255, 0.5)',
    boxShadow: '0 0 12px rgba(170, 68, 255, 0.3)',
  },
  gridItemSame: {
    opacity: 0.35,
    cursor: 'not-allowed',
  },
  gridBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 24,
    height: 24,
    borderRadius: 5,
    color: '#fff',
    fontSize: 12,
    fontWeight: 700,
  },
  gridName: {
    fontSize: 10,
    color: '#8892a6',
  },
  preview: {
    marginTop: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  previewLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#5a6478',
    fontWeight: 600,
  },
  previewCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '12px 14px',
    borderRadius: 10,
    background: 'linear-gradient(135deg, rgba(0,212,170,0.08) 0%, rgba(0,153,255,0.08) 100%)',
    border: '1px solid rgba(0, 212, 170, 0.2)',
  },
  previewBadge: (type: string): React.CSSProperties => {
    const colors: Record<string, string> = {
      hydrophobic: '#888',
      hydrophilic: '#4488ff',
      charged: '#ff4444',
      polar: '#44aaff',
      special: '#aa44aa',
    };
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 30,
      height: 30,
      borderRadius: 7,
      background: colors[type] || '#888',
      color: '#fff',
      fontSize: 14,
      fontWeight: 800,
    };
  },
  previewArrow: {
    fontSize: 16,
    color: '#00d4aa',
    fontWeight: 700,
  },
  previewText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#e0e4ec',
    fontWeight: 500,
  },
  footer: {
    padding: '16px 24px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
    display: 'flex',
    gap: 10,
    justifyContent: 'flex-end',
  },
  cancelBtn: {
    padding: '10px 20px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#8892a6',
    fontSize: 13,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  confirmBtn: {
    padding: '10px 24px',
    borderRadius: 8,
    background: 'linear-gradient(135deg, #aa44ff 0%, #6633ff 100%)',
    border: 'none',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(170, 68, 255, 0.35)',
    transition: 'all 0.2s ease',
  },
};
