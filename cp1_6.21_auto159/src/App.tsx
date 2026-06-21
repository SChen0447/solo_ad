import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from './scene/sceneManager';
import { UIController } from './ui/uiController';
import MaterialPanel from './ui/MaterialPanel';
import ComparisonPanel from './ui/ComparisonPanel';
import type { SnapshotData, AreaId, AreaMaterialMap } from './types';
import { DEFAULT_MATERIAL_MAP } from './data/materials';
import './styles/globals.css';

const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const uiControllerRef = useRef<UIController | null>(null);
  
  const [selectedArea, setSelectedArea] = useState<AreaId>('floor');
  const [currentMaterials, setCurrentMaterials] = useState<AreaMaterialMap>(DEFAULT_MATERIAL_MAP);
  const [snapshot, setSnapshot] = useState<SnapshotData | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const sceneManager = new SceneManager(canvasContainerRef.current);
    sceneManagerRef.current = sceneManager;
    sceneManager.buildScene();

    const uiController = new UIController();
    uiController.init(sceneManager);
    uiControllerRef.current = uiController;

    uiController.setOnMaterialChange((snap: SnapshotData) => {
      setSnapshot(snap);
      setCurrentMaterials(uiController.getCurrentMaterials());
    });

    uiController.setOnAnimatingChange((animating: boolean) => {
      setIsAnimating(animating);
    });

    return () => {
      uiController.dispose();
      sceneManager.dispose();
    };
  }, []);

  const handleAreaChange = useCallback((area: AreaId) => {
    setSelectedArea(area);
    uiControllerRef.current?.setSelectedArea(area);
  }, []);

  const handleMaterialSelect = useCallback(async (areaId: AreaId, materialId: string) => {
    await uiControllerRef.current?.switchMaterial(areaId, materialId);
  }, []);

  const handleReset = useCallback(async () => {
    await uiControllerRef.current?.resetAllMaterials();
  }, []);

  return (
    <div className="app-container">
      <div ref={canvasContainerRef} className="canvas-container" />
      
      <MaterialPanel
        selectedArea={selectedArea}
        onAreaChange={handleAreaChange}
        currentMaterials={currentMaterials}
        onMaterialSelect={handleMaterialSelect}
        onReset={handleReset}
        isAnimating={isAnimating}
      />
      
      <ComparisonPanel snapshot={snapshot} />
    </div>
  );
};

export default App;
