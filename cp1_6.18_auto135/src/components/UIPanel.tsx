import React from 'react';
import { useMoleculeStore } from '@/store/moleculeStore';
import { RenderMode, MutationRecord, ViewPreset, RESIDUE_PROPERTIES } from '@/types';
import { moleculeToPDB } from '@/data/moleculeData';

interface UIPanelProps {
  sceneManagerRef: React.MutableRefObject<any>;
}

const renderModeLabels: Record<RenderMode, string> = {
  backbone: '骨架线',
  cartoon: '卡通',
  surface: '表面',
  ballstick: '球棒',
};

const viewPresetLabels: Record<ViewPreset, string> = {
  front: '正面',
  side: '侧面',
  top: '俯瞰',
  inside: '内部透视',
};

const sideChainLabels: Record<string, string> = {
  hydrophobic: '疏水性',
  hydrophilic: '亲水性',
  charged: '带电荷',
  polar: '极性',
  special: '特殊',
};

export const UIPanel: React.FC<UIPanelProps> = ({ sceneManagerRef }) => {
  const {
    molecules,
    currentMolecule,
    currentMoleculeId,
    renderMode,
    mutationHistory,
    isLeftPanelCollapsed,
    isExporting,
    exportProgress,
    loadMolecule,
    setRenderMode,
    toggleLeftPanel,
    undoMutation,
    setViewPreset,
    setExporting,
    setExportProgress,
  } = useMoleculeStore();

  const handleExportSnapshot = () => {
    if (!sceneManagerRef.current) return;
    setExporting(true);
    setExportProgress(0);

    let progress = 0;
    const interval = setInterval(() => {
      progress += 0.2;
      setExportProgress(Math.min(progress, 1));
      if (progress >= 1) {
        clearInterval(interval);
        const dataUrl = sceneManagerRef.current.exportSnapshot();
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `${currentMolecule?.name || 'molecule'}_snapshot.png`;
        a.click();
        setTimeout(() => setExporting(false), 300);
      }
    }, 100);
  };

  const handleExportPDB = () => {
    if (!currentMolecule) return;
    const pdb = moleculeToPDB(currentMolecule);
    const blob = new Blob([pdb], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentMolecule.name.replace(/\s+/g, '_')}_变异记录.pdb`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUndo = (record: MutationRecord) => {
    if (!sceneManagerRef.current || !record.snapshot) return;
    undoMutation(record.id);
    sceneManagerRef.current.undoMutation(record.chainId, record.snapshot);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  };

  if (isLeftPanelCollapsed) {
    return (
      <div style={styles.collapsedPanel}>
        <button style={styles.collapseBtn} onClick={toggleLeftPanel} title="展开面板">
          »
        </button>
      </div>
    );
  }

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <div style={styles.title}>分子可视化实验室</div>
        <button style={styles.collapseBtn} onClick={toggleLeftPanel} title="折叠面板">
          «
        </button>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>选择分子</div>
        <select
          style={styles.select}
          value={currentMoleculeId || ''}
          onChange={(e) => {
            if (e.target.value) {
              loadMolecule(e.target.value);
              setTimeout(() => {
                if (sceneManagerRef.current && useMoleculeStore.getState().currentMolecule) {
                  sceneManagerRef.current.setMolecule(useMoleculeStore.getState().currentMolecule);
                }
              }, 50);
            }
          }}
        >
          <option value="">-- 请选择 --</option>
          {molecules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        {currentMolecule && (
          <div style={styles.moleculeDesc}>{currentMolecule.description}</div>
        )}
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>渲染模式</div>
        <div style={styles.btnGroup}>
          {(Object.keys(renderModeLabels) as RenderMode[]).map((mode) => (
            <button
              key={mode}
              style={{
                ...styles.modeBtn,
                ...(renderMode === mode ? styles.modeBtnActive : {}),
              }}
              onClick={() => {
                setRenderMode(mode);
                sceneManagerRef.current?.setRenderMode(mode);
              }}
            >
              {renderModeLabels[mode]}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>预设视角</div>
        <div style={styles.btnGroup}>
          {(Object.keys(viewPresetLabels) as ViewPreset[]).map((preset) => (
            <button
              key={preset}
              style={styles.viewBtn}
              onClick={() => {
                setViewPreset(preset);
                sceneManagerRef.current?.setViewPreset(preset);
              }}
            >
              {viewPresetLabels[preset]}
            </button>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>突变历史</div>
        <div style={styles.historyList}>
          {mutationHistory.length === 0 ? (
            <div style={styles.emptyText}>暂无突变记录</div>
          ) : (
            mutationHistory.map((record, idx) => {
              const origProps = RESIDUE_PROPERTIES[record.originalResidue];
              const newProps = RESIDUE_PROPERTIES[record.newResidue];
              return (
                <div key={record.id} style={styles.historyItem}>
                  <div style={styles.historyIdx}>#{mutationHistory.length - idx}</div>
                  <div style={styles.historyContent}>
                    <div style={styles.historyMutation}>
                      <span style={styles.residueBadge(origProps.sideChainType)}>
                        {origProps.oneLetter}
                      </span>
                      <span style={styles.arrow}>→</span>
                      <span style={styles.residueBadge(newProps.sideChainType)}>
                        {newProps.oneLetter}
                      </span>
                      <span style={styles.historyPos}>位置 {record.position}</span>
                    </div>
                    <div style={styles.historyTime}>{formatTime(record.timestamp)}</div>
                  </div>
                  <button style={styles.undoBtn} onClick={() => handleUndo(record)} title="撤销">
                    ↺
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div style={styles.section}>
        <div style={styles.sectionTitle}>导出</div>
        <div style={styles.btnGroup}>
          <button style={styles.exportBtn} onClick={handleExportSnapshot} disabled={isExporting}>
            {isExporting ? '导出中...' : '导出快照'}
          </button>
          <button style={styles.exportBtn} onClick={handleExportPDB} disabled={!currentMolecule}>
            导出PDB
          </button>
        </div>
        {isExporting && (
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${exportProgress * 100}%` }} />
          </div>
        )}
      </div>

      <div style={styles.helpSection}>
        <div style={styles.sectionTitle}>操作说明</div>
        <div style={styles.helpText}>
          • 左键拖拽：旋转视角<br />
          • 滚轮：缩放 (0.5x-5x)<br />
          • 右键拖拽：平移<br />
          • 点击残基：查看详情
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 320,
    height: '100%',
    background: 'rgba(30, 35, 45, 0.85)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderRadius: 12,
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    color: '#e0e4ec',
    overflowY: 'auto',
    boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
    border: '1px solid rgba(255,255,255,0.08)',
  },
  collapsedPanel: {
    width: 48,
    height: '100%',
    background: 'rgba(30, 35, 45, 0.85)',
    backdropFilter: 'blur(10px)',
    borderRadius: 12,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 30px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 600,
    background: 'linear-gradient(135deg, #00d4aa 0%, #0099ff 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  collapseBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    background: 'rgba(0, 212, 170, 0.15)',
    border: '1px solid rgba(0, 212, 170, 0.3)',
    color: '#00d4aa',
    cursor: 'pointer',
    fontSize: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: 1,
    color: '#00d4aa',
    marginBottom: 4,
  },
  select: {
    padding: '10px 12px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#e0e4ec',
    fontSize: 14,
    cursor: 'pointer',
    outline: 'none',
    transition: 'all 0.2s ease',
  },
  moleculeDesc: {
    fontSize: 12,
    color: '#8892a6',
    lineHeight: 1.5,
    marginTop: 4,
  },
  btnGroup: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
  },
  modeBtn: {
    flex: 1,
    minWidth: 60,
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#8892a6',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  modeBtnActive: {
    background: 'linear-gradient(135deg, #00d4aa 0%, #0099ff 100%)',
    border: '1px solid transparent',
    color: '#ffffff',
    fontWeight: 600,
    boxShadow: '0 0 12px rgba(0, 212, 170, 0.4)',
  },
  viewBtn: {
    flex: 1,
    minWidth: 60,
    padding: '6px 8px',
    borderRadius: 6,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#a0a8b8',
    fontSize: 11,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 200,
    overflowY: 'auto',
  },
  emptyText: {
    fontSize: 12,
    color: '#5a6478',
    textAlign: 'center',
    padding: '16px 0',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 10px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    transition: 'all 0.2s ease',
  },
  historyIdx: {
    fontSize: 11,
    color: '#5a6478',
    minWidth: 24,
  },
  historyContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  historyMutation: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
  },
  residueBadge: (type: string): React.CSSProperties => {
    const colors: Record<string, string> = {
      hydrophobic: '#888888',
      hydrophilic: '#4488ff',
      charged: '#ff4444',
      polar: '#44aaff',
      special: '#aa44aa',
    };
    return {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 22,
      height: 22,
      borderRadius: 4,
      background: colors[type] || '#888',
      color: '#fff',
      fontSize: 11,
      fontWeight: 700,
    };
  },
  arrow: {
    color: '#5a6478',
  },
  historyPos: {
    marginLeft: 6,
    fontSize: 11,
    color: '#8892a6',
  },
  historyTime: {
    fontSize: 10,
    color: '#5a6478',
  },
  undoBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    background: 'rgba(255, 100, 100, 0.15)',
    border: '1px solid rgba(255, 100, 100, 0.3)',
    color: '#ff6b6b',
    cursor: 'pointer',
    fontSize: 14,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  exportBtn: {
    flex: 1,
    padding: '10px 12px',
    borderRadius: 8,
    background: 'linear-gradient(135deg, rgba(0,212,170,0.2) 0%, rgba(0,153,255,0.2) 100%)',
    border: '1px solid rgba(0, 212, 170, 0.4)',
    color: '#00d4aa',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.06)',
    overflow: 'hidden',
    marginTop: 8,
  },
  progressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #00d4aa 0%, #0099ff 100%)',
    transition: 'width 0.1s linear',
  },
  helpSection: {
    marginTop: 'auto',
    paddingTop: 8,
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  helpText: {
    fontSize: 11,
    color: '#5a6478',
    lineHeight: 1.8,
  },
};
