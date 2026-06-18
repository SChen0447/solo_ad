import React, { useState, useEffect } from 'react';
import { NodePalette } from './NodePalette';
import { Canvas } from './Canvas';
import { PropertyPanel } from './PropertyPanel';
import { ExportModal } from './ExportModal';
import { NodeType } from './types';

export const App: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 900);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleDragStart = (e: React.DragEvent, type: NodeType) => {
    e.dataTransfer.setData('nodeType', type);
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>用户旅程地图制作器</h1>
      </header>
      <div className="app-body">
        <NodePalette onDragStart={handleDragStart} isCollapsed={isMobile} />
        <Canvas onExportClick={() => setShowExportModal(true)} />
        <PropertyPanel />
      </div>
      <ExportModal isOpen={showExportModal} onClose={() => setShowExportModal(false)} />
    </div>
  );
};
