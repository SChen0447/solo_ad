import { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RenderEngine } from '../modules/RenderEngine';
import { MoleculeParser } from '../modules/MoleculeParser';
import { useMoleculeStore } from '../store/useMoleculeStore';
import type { MoleculeRenderData, AtomRenderData, BondRenderData } from '../types';
import { ELEMENT_NAMES } from '../types';

const MoleculeViewer = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const renderEngineRef = useRef<RenderEngine | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const parsedDataRef = useRef<MoleculeRenderData | null>(null);
  
  const [hoveredAtom, setHoveredAtom] = useState<AtomRenderData | null>(null);
  const [hoveredBond, setHoveredBond] = useState<BondRenderData | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const { 
    currentMolecule, 
    params, 
    selectedAtom, 
    selectedBond,
    setSelectedAtom, 
    setSelectedBond 
  } = useMoleculeStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new RenderEngine();
    engine.init(containerRef.current);
    renderEngineRef.current = engine;

    const camera = engine.getCamera();
    const domElement = engine.getDomElement();
    
    if (camera && domElement) {
      const controls = new OrbitControls(camera, domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.minDistance = 3;
      controls.maxDistance = 30;
      controls.enablePan = true;
      controlsRef.current = controls;
      
      const animateControls = () => {
        requestAnimationFrame(animateControls);
        controls.update();
      };
      animateControls();
    }

    return () => {
      controlsRef.current?.dispose();
      engine.dispose();
    };
  }, []);

  useEffect(() => {
    if (!renderEngineRef.current || !currentMolecule) return;

    const parsedData = MoleculeParser.parseFromAPI(currentMolecule);
    parsedDataRef.current = parsedData;
    renderEngineRef.current.addMolecule(parsedData);
  }, [currentMolecule]);

  useEffect(() => {
    if (!renderEngineRef.current) return;
    renderEngineRef.current.updateParams(params);
  }, [params]);

  useEffect(() => {
    if (!renderEngineRef.current) return;
    renderEngineRef.current.highlightBond(selectedBond?.id || null);
  }, [selectedBond]);

  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !renderEngineRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    setMousePosition({ x: event.clientX, y: event.clientY });

    const atom = renderEngineRef.current.getAtomAtPosition(
      mouseRef.current,
      raycasterRef.current
    );
    
    const bond = renderEngineRef.current.getBondAtPosition(
      mouseRef.current,
      raycasterRef.current
    );

    if (atom) {
      setHoveredAtom(atom);
      setHoveredBond(null);
      containerRef.current.style.cursor = 'pointer';
    } else if (bond) {
      setHoveredBond(bond);
      setHoveredAtom(null);
      containerRef.current.style.cursor = 'pointer';
    } else {
      setHoveredAtom(null);
      setHoveredBond(null);
      containerRef.current.style.cursor = 'grab';
    }
  }, []);

  const handleClick = useCallback((event: MouseEvent) => {
    if (!containerRef.current || !renderEngineRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    const atom = renderEngineRef.current.getAtomAtPosition(
      mouseRef.current,
      raycasterRef.current
    );
    
    const bond = renderEngineRef.current.getBondAtPosition(
      mouseRef.current,
      raycasterRef.current
    );

    if (atom) {
      if (selectedAtom?.id === atom.id) {
        setSelectedAtom(null);
      } else {
        setSelectedAtom(atom);
      }
      setSelectedBond(null);
    } else if (bond) {
      if (selectedBond?.id === bond.id) {
        setSelectedBond(null);
      } else {
        setSelectedBond(bond);
      }
      setSelectedAtom(null);
    } else {
      setSelectedAtom(null);
      setSelectedBond(null);
    }
  }, [selectedAtom, selectedBond, setSelectedAtom, setSelectedBond]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('click', handleClick);
    };
  }, [handleMouseMove, handleClick]);

  const getCardPosition = () => {
    const container = containerRef.current;
    if (!container) return {};
    
    const rect = container.getBoundingClientRect();
    let x = mousePosition.x - rect.left + 20;
    let y = mousePosition.y - rect.top + 20;
    
    const cardWidth = 220;
    const cardHeight = selectedAtom ? 180 : 100;
    
    if (x + cardWidth > rect.width) {
      x = mousePosition.x - rect.left - cardWidth - 20;
    }
    if (y + cardHeight > rect.height) {
      y = mousePosition.y - rect.top - cardHeight - 20;
    }
    
    return { left: x, top: y };
  };

  const displayAtom = selectedAtom || hoveredAtom;
  const displayBond = selectedBond || hoveredBond;
  const cardPosition = getCardPosition();

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full overflow-hidden"
      style={{ minHeight: '400px' }}
    >
      {displayAtom && (
        <div
          className="absolute z-50 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700 shadow-xl pointer-events-none"
          style={{
            ...cardPosition,
            width: '220px',
            transition: 'all 0.2s ease',
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-black"
              style={{ backgroundColor: displayAtom.color }}
            >
              {displayAtom.element}
            </div>
            <div>
              <div className="text-white font-semibold text-sm">
                {ELEMENT_NAMES[displayAtom.element]}原子
              </div>
              <div className="text-gray-400 text-xs">
                编号: {displayAtom.index}
              </div>
            </div>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-gray-300">
              <span>元素符号:</span>
              <span className="text-white font-mono">{displayAtom.element}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>X坐标:</span>
              <span className="text-white font-mono">{displayAtom.x.toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Y坐标:</span>
              <span className="text-white font-mono">{displayAtom.y.toFixed(3)}</span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>Z坐标:</span>
              <span className="text-white font-mono">{displayAtom.z.toFixed(3)}</span>
            </div>
          </div>
        </div>
      )}

      {displayBond && !displayAtom && (
        <div
          className="absolute z-50 bg-black/80 backdrop-blur-sm rounded-lg p-4 border border-gray-700 shadow-xl pointer-events-none"
          style={{
            ...cardPosition,
            width: '220px',
            transition: 'all 0.2s ease',
          }}
        >
          <div className="text-white font-semibold text-sm mb-2">化学键信息</div>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-gray-300">
              <span>连接原子:</span>
              <span className="text-white font-mono">
                {displayBond.atom1.element} — {displayBond.atom2.element}
              </span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>键长:</span>
              <span className="text-yellow-400 font-mono">
                {(displayBond.length * params.bondScale).toFixed(3)} Å
              </span>
            </div>
            <div className="flex justify-between text-gray-300">
              <span>键级:</span>
              <span className="text-white font-mono">{displayBond.order}</span>
            </div>
          </div>
        </div>
      )}

      {currentMolecule && (
        <div className="absolute top-4 left-4 z-40 bg-black/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-700">
          <div className="text-white font-bold text-lg">
            {currentMolecule.name}
          </div>
          <div className="text-gray-300 text-sm">
            {currentMolecule.formula}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            {currentMolecule.atoms.length} 个原子 · {currentMolecule.bonds.length} 个化学键
          </div>
        </div>
      )}

      <div className="absolute bottom-4 left-4 z-40 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-700">
        <div className="text-gray-300 text-xs space-y-1">
          <div>🖱️ 拖拽旋转 · 滚轮缩放 · 右键平移</div>
          <div>👆 点击原子/键查看详细信息</div>
        </div>
      </div>
    </div>
  );
};

export default MoleculeViewer;
