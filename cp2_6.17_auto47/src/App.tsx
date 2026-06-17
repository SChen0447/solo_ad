import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { MoleculeScene } from './threeScene';
import {
  CAFFEINE_MOLECULE,
  WATER_MOLECULE,
  GLUCOSE_MOLECULE,
  parseSMILES,
  calculateFormula,
  calculateMass,
} from './moleculeData';
import { Atom, Bond, ElementSymbol, BondType } from './types';
import './App.css';

const ELEMENT_OPTIONS: ElementSymbol[] = ['C', 'H', 'N', 'O', 'S', 'P', 'F', 'Cl'];

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<MoleculeScene | null>(null);

  const [atoms, setAtoms] = useState<Atom[]>([]);
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [moleculeName, setMoleculeName] = useState<string>('咖啡因');
  const [selectedAtomId, setSelectedAtomId] = useState<number | null>(null);
  const [smilesInput, setSmilesInput] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    atomId: number | null;
  }>({ visible: false, x: 0, y: 0, atomId: null });
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [panelOpen, setPanelOpen] = useState<boolean>(true);

  const formula = useMemo(() => calculateFormula(atoms), [atoms]);
  const mass = useMemo(() => calculateMass(atoms).toFixed(2), [atoms]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleAtomClick = useCallback((atomId: number) => {
    setSelectedAtomId(atomId);
  }, []);

  const handleAtomContextMenu = useCallback((atomId: number, event: MouseEvent) => {
    setSelectedAtomId(atomId);
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      atomId,
    });
  }, []);

  useEffect(() => {
    if (containerRef.current && !sceneRef.current) {
      const scene = new MoleculeScene(
        containerRef.current,
        handleAtomClick,
        handleAtomContextMenu
      );
      sceneRef.current = scene;
      scene.start();
    }

    return () => {
      if (sceneRef.current) {
        sceneRef.current.dispose();
        sceneRef.current = null;
      }
    };
  }, [handleAtomClick, handleAtomContextMenu]);

  useEffect(() => {
    if (sceneRef.current && atoms.length > 0) {
      sceneRef.current.loadMolecule({ name: moleculeName, atoms, bonds }, true);
    }
  }, [atoms, bonds, moleculeName]);

  useEffect(() => {
    if (atoms.length === 0 && sceneRef.current) {
      sceneRef.current.clearMolecule();
    }
  }, [atoms]);

  useEffect(() => {
    if (sceneRef.current && selectedAtomId !== null) {
      sceneRef.current.highlightAtom(selectedAtomId);
    }
  }, [selectedAtomId]);

  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.visible) {
        setContextMenu(prev => ({ ...prev, visible: false }));
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  const loadMolecule = useCallback((mol: { name: string; atoms: Atom[]; bonds: Bond[] }) => {
    setMoleculeName(mol.name);
    setAtoms([...mol.atoms]);
    setBonds([...mol.bonds]);
    setSelectedAtomId(null);
  }, []);

  const loadCaffeine = () => loadMolecule(CAFFEINE_MOLECULE);
  const loadWater = () => loadMolecule(WATER_MOLECULE);
  const loadGlucose = () => loadMolecule(GLUCOSE_MOLECULE);

  const clearCanvas = () => {
    setAtoms([]);
    setBonds([]);
    setMoleculeName('空');
    setSelectedAtomId(null);
  };

  const resetView = () => {
    if (sceneRef.current) {
      sceneRef.current.resetCamera();
    }
  };

  const parseSmiles = async () => {
    if (!smilesInput.trim()) return;

    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      const molecule = parseSMILES(smilesInput.trim());
      setMoleculeName('SMILES分子');
      setAtoms(molecule.atoms);
      setBonds(molecule.bonds);
      setSelectedAtomId(null);
    } catch (e) {
      console.error('SMILES解析失败:', e);
      alert('SMILES解析失败，请检查输入格式');
    } finally {
      setIsLoading(false);
    }
  };

  const changeAtomElement = (element: ElementSymbol) => {
    if (contextMenu.atomId === null) return;

    const atomId = contextMenu.atomId;

    setAtoms(prev =>
      prev.map(a =>
        a.id === atomId ? { ...a, element } : a
      )
    );

    if (sceneRef.current) {
      sceneRef.current.updateAtomElement(atomId, element);
    }

    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  const deleteAtom = () => {
    if (contextMenu.atomId === null) return;

    const atomId = contextMenu.atomId;

    setBonds(prev => prev.filter(b => b.atom1 !== atomId && b.atom2 !== atomId));
    setAtoms(prev => prev.filter(a => a.id !== atomId));

    if (sceneRef.current) {
      sceneRef.current.removeAtom(atomId);
    }

    if (selectedAtomId === atomId) {
      setSelectedAtomId(null);
    }

    setContextMenu(prev => ({ ...prev, visible: false }));
  };

  useEffect(() => {
    if (atoms.length > 0 && sceneRef.current) {
      sceneRef.current.loadMolecule({ name: moleculeName, atoms, bonds }, false);
    }
  }, [atoms, bonds, moleculeName]);

  const selectedAtom = atoms.find(a => a.id === selectedAtomId);

  return (
    <div className="app-container">
      <div className={`scene-container ${isMobile && !panelOpen ? 'fullscreen' : ''}`}>
        <div className="toolbar">
          <button className="btn btn-primary" onClick={loadCaffeine}>
            加载咖啡因
          </button>
          <button className="btn btn-primary" onClick={loadWater}>
            加载水
          </button>
          <button className="btn btn-primary" onClick={loadGlucose}>
            加载葡萄糖
          </button>
          <button className="btn btn-secondary" onClick={clearCanvas}>
            清空画布
          </button>
          <button className="btn btn-secondary" onClick={resetView}>
            重置视角
          </button>
        </div>

        <div className="smiles-input-container">
          <input
            type="text"
            className="smiles-input"
            placeholder="输入SMILES字符串，如：O=C(O)c1ccccc1C(=O)O"
            value={smilesInput}
            onChange={e => setSmilesInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && parseSmiles()}
          />
          <button
            className="btn btn-parse"
            onClick={parseSmiles}
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="spinner" />
            ) : (
              '解析'
            )}
          </button>
        </div>

        <div ref={containerRef} className="three-canvas" />

        {isMobile && (
          <button
            className={`mobile-toggle ${panelOpen ? 'open' : ''}`}
            onClick={() => setPanelOpen(!panelOpen)}
          >
            {panelOpen ? '▼ 隐藏面板' : '▲ 显示面板'}
          </button>
        )}
      </div>

      <div className={`property-panel ${isMobile ? (panelOpen ? 'panel-visible' : 'panel-hidden') : ''}`}>
        <h2 className="panel-title">分子属性</h2>

        <div className="property-section">
          <div className="property-row">
            <span className="property-label">名称：</span>
            <span className="property-value">{moleculeName}</span>
          </div>
          <div className="property-row">
            <span className="property-label">分子式：</span>
            <span className="property-value formula">{formula}</span>
          </div>
          <div className="property-row">
            <span className="property-label">分子量：</span>
            <span className="property-value">{mass} g/mol</span>
          </div>
        </div>

        <div className="property-section">
          <h3 className="section-title">原子列表</h3>
          <div className="atom-list-header">
            <span className="col-index">#</span>
            <span className="col-element">元素</span>
            <span className="col-coord">X</span>
            <span className="col-coord">Y</span>
            <span className="col-coord">Z</span>
          </div>
          <div className="atom-list">
            {atoms.map((atom, index) => (
              <div
                key={atom.id}
                className={`atom-row ${selectedAtomId === atom.id ? 'selected' : ''}`}
                onClick={() => setSelectedAtomId(atom.id)}
              >
                <span className="col-index">{index + 1}</span>
                <span className="col-element">
                  <span
                    className="element-dot"
                    style={{
                      backgroundColor: getElementColor(atom.element),
                    }}
                  />
                  {atom.element}
                </span>
                <span className="col-coord">{atom.x.toFixed(2)}</span>
                <span className="col-coord">{atom.y.toFixed(2)}</span>
                <span className="col-coord">{atom.z.toFixed(2)}</span>
              </div>
            ))}
            {atoms.length === 0 && (
              <div className="empty-message">暂无原子</div>
            )}
          </div>
        </div>

        {selectedAtom && (
          <div className="property-section">
            <h3 className="section-title">选中原子</h3>
            <div className="selected-atom-info">
              <div className="property-row">
                <span className="property-label">ID：</span>
                <span className="property-value">{selectedAtom.id}</span>
              </div>
              <div className="property-row">
                <span className="property-label">元素：</span>
                <span className="property-value">{selectedAtom.element}</span>
              </div>
              <div className="property-row">
                <span className="property-label">X：</span>
                <span className="property-value">{selectedAtom.x.toFixed(3)}</span>
              </div>
              <div className="property-row">
                <span className="property-label">Y：</span>
                <span className="property-value">{selectedAtom.y.toFixed(3)}</span>
              </div>
              <div className="property-row">
                <span className="property-label">Z：</span>
                <span className="property-value">{selectedAtom.z.toFixed(3)}</span>
              </div>

              <div className="edit-section">
                <label className="edit-label">修改元素：</label>
                <div className="element-buttons">
                  {ELEMENT_OPTIONS.map(el => (
                    <button
                      key={el}
                      className={`element-btn ${selectedAtom.element === el ? 'active' : ''}`}
                      style={{
                        backgroundColor: selectedAtom.element === el ? getElementColor(el) : 'transparent',
                        borderColor: getElementColor(el),
                        color: selectedAtom.element === el ? '#fff' : getElementColor(el),
                      }}
                      onClick={() => {
                        setAtoms(prev =>
                          prev.map(a =>
                            a.id === selectedAtom.id ? { ...a, element: el } : a
                          )
                        );
                        if (sceneRef.current) {
                          sceneRef.current.updateAtomElement(selectedAtom.id, el);
                        }
                      }}
                    >
                      {el}
                    </button>
                  ))}
                </div>
              </div>

              <button
                className="btn btn-delete"
                onClick={() => {
                  setBonds(prev => prev.filter(b => b.atom1 !== selectedAtom.id && b.atom2 !== selectedAtom.id));
                  setAtoms(prev => prev.filter(a => a.id !== selectedAtom.id));
                  if (sceneRef.current) {
                    sceneRef.current.removeAtom(selectedAtom.id);
                  }
                  setSelectedAtomId(null);
                }}
              >
                删除原子
              </button>
            </div>
          </div>
        )}

        <div className="property-section">
          <h3 className="section-title">使用说明</h3>
          <ul className="help-list">
            <li>左键拖动：旋转视角</li>
            <li>滚轮：缩放</li>
            <li>右键拖动：平移</li>
            <li>点击原子：选中并高亮</li>
            <li>右键原子：打开菜单</li>
          </ul>
        </div>
      </div>

      {contextMenu.visible && (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={e => e.stopPropagation()}
        >
          <div className="context-menu-title">修改元素类型</div>
          <div className="context-element-grid">
            {ELEMENT_OPTIONS.map(el => (
              <button
                key={el}
                className="context-element-btn"
                style={{ borderColor: getElementColor(el) }}
                onClick={() => changeAtomElement(el)}
              >
                <span
                  className="element-dot-large"
                  style={{ backgroundColor: getElementColor(el) }}
                />
                <span>{el}</span>
              </button>
            ))}
          </div>
          <div className="context-menu-divider" />
          <button className="context-menu-item danger" onClick={deleteAtom}>
            删除原子
          </button>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner" />
          <span className="loading-text">解析中...</span>
        </div>
      )}
    </div>
  );
}

function getElementColor(element: ElementSymbol): string {
  const colors: Record<ElementSymbol, string> = {
    C: '#404040',
    H: '#FFFFFF',
    N: '#3050F8',
    O: '#FF0D0D',
    S: '#FFFF30',
    P: '#FF8000',
    F: '#90E050',
    Cl: '#1FF01F',
  };
  return colors[element] || '#888888';
}

export default App;
