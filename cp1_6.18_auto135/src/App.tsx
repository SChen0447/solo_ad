import React, { useEffect, useRef, useState } from 'react';
import { SceneManager } from '@/scene/SceneManager';
import { useMoleculeStore } from '@/store/moleculeStore';
import { generateAllMolecules } from '@/data/moleculeData';
import { UIPanel } from '@/components/UIPanel';
import { InfoModal } from '@/components/InfoModal';
import { MutationPanel } from '@/components/MutationPanel';

const App: React.FC = () => {
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const [isReady, setIsReady] = useState(false);

  const { setMolecules, loadMolecule, selectResidue, currentMoleculeId, selectedResidueId, molecules } =
    useMoleculeStore();

  useEffect(() => {
    const mols = generateAllMolecules();
    setMolecules(mols);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sceneContainerRef.current || sceneManagerRef.current) return;

    const manager = new SceneManager(sceneContainerRef.current);
    sceneManagerRef.current = manager;

    manager.onResidueClick = (residueId: string) => {
      selectResidue(residueId);
    };

    setIsReady(true);

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!sceneManagerRef.current || molecules.length === 0 || currentMoleculeId) return;

    const firstMol = molecules[0];
    loadMolecule(firstMol.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [molecules, currentMoleculeId, loadMolecule]);

  useEffect(() => {
    if (!sceneManagerRef.current) return;
    const mol = useMoleculeStore.getState().currentMolecule;
    if (mol && !sceneManagerRef.current.molecule) {
      sceneManagerRef.current.setMolecule(mol);
    }
  });

  useEffect(() => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.highlightResidue(selectedResidueId);
  }, [selectedResidueId]);

  return (
    <div style={styles.app}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes modalIn {
          from { transform: translate(-50%, -48%) scale(0.95); opacity: 0; }
          to { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        ::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(255,255,255,0.02);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(0, 212, 170, 0.3);
          border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 212, 170, 0.5);
        }
        select option {
          background: #1e232d;
          color: #e0e4ec;
        }
      `}</style>

      <div style={styles.leftArea}>
        <UIPanel sceneManagerRef={sceneManagerRef} />
      </div>

      <div style={styles.sceneArea}>
        <div ref={sceneContainerRef} style={styles.sceneContainer} />
        {!isReady && (
          <div style={styles.loadingOverlay}>
            <div style={styles.loadingSpinner} />
            <div style={styles.loadingText}>正在初始化分子可视化引擎...</div>
          </div>
        )}

        {isReady && !useMoleculeStore.getState().currentMolecule && (
          <div style={styles.loadingOverlay}>
            <div style={styles.emptyHint}>🧬 请从左侧面板选择一个蛋白质分子开始</div>
          </div>
        )}
      </div>

      <InfoModal />
      <MutationPanel sceneManagerRef={sceneManagerRef} />
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  app: {
    width: '100%',
    height: '100%',
    display: 'flex',
    background: '#1a1d23',
    position: 'relative',
    overflow: 'hidden',
  },
  leftArea: {
    padding: 12,
    flexShrink: 0,
    zIndex: 10,
  },
  sceneArea: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  sceneContainer: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'rgba(26, 29, 35, 0.85)',
    backdropFilter: 'blur(8px)',
    pointerEvents: 'none',
    zIndex: 5,
  },
  loadingSpinner: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    border: '3px solid rgba(0, 212, 170, 0.2)',
    borderTopColor: '#00d4aa',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: '#8892a6',
    letterSpacing: 0.5,
  },
  emptyHint: {
    fontSize: 16,
    color: '#8892a6',
    padding: '16px 28px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
  },
};

export default App;
