import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from './core/SceneManager';
import { Furniture, FurnitureType } from './models/Furniture';
import { FloorMaterialType } from './models/Room';
import { ControlPanel } from './ui/ControlPanel';

interface AmbientLightState {
  intensity: number;
  color: string;
}

const DEFAULT_AMBIENT: AmbientLightState = {
  intensity: 0.4,
  color: '#FFFFFF'
};

const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);

  const [currentWallColor, setCurrentWallColor] = useState('#E0E0E0');
  const [currentFloorType, setCurrentFloorType] = useState<FloorMaterialType>('wood');
  const [addedTypes, setAddedTypes] = useState<Set<FurnitureType>>(new Set());

  const [spotIntensity, setSpotIntensity] = useState(1.0);
  const [spotAngle, setSpotAngle] = useState(45);
  const [spotColor, setSpotColor] = useState('#FFFFFF');
  const [spotX, setSpotX] = useState(0);
  const [spotY, setSpotY] = useState(0);
  const [spotZ, setSpotZ] = useState(0);

  const [ambient, setAmbient] = useState<AmbientLightState>(DEFAULT_AMBIENT);
  const ambientRef = useRef<AmbientLightState>(DEFAULT_AMBIENT);

  const [pointEnabled, setPointEnabled] = useState(true);
  const [pointIntensity, setPointIntensity] = useState(0.6);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const container = canvasContainerRef.current;
    const manager = new SceneManager(container);
    sceneManagerRef.current = manager;

    manager.lightManager.adjustAmbientLight(ambientRef.current.intensity, ambientRef.current.color);

    const defaultFurniture1 = new Furniture('sofa');
    defaultFurniture1.setPosition(-1.25, defaultFurniture1.size.y / 2, -0.75);
    manager.addObject(defaultFurniture1);

    const defaultFurniture2 = new Furniture('coffeeTable');
    defaultFurniture2.setPosition(0, defaultFurniture2.size.y / 2, 0);
    manager.addObject(defaultFurniture2);

    const defaultFurniture3 = new Furniture('floorLamp');
    defaultFurniture3.setPosition(2, defaultFurniture3.size.y / 2, -1.25);
    manager.addObject(defaultFurniture3);

    setAddedTypes(prev => {
      const next = new Set(prev);
      next.add('sofa');
      next.add('coffeeTable');
      next.add('floorLamp');
      return next;
    });

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  const handleWallColorChange = useCallback((color: string) => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.room.setWallColor(color);
    setCurrentWallColor(color);
  }, []);

  const handleFloorTypeChange = useCallback((type: FloorMaterialType) => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.room.setFloorMaterial(type);
    setCurrentFloorType(type);
  }, []);

  const handleAddFurniture = useCallback((type: FurnitureType) => {
    if (!sceneManagerRef.current) return;
    if (sceneManagerRef.current.furnitureList.length >= 10) return;

    const furniture = new Furniture(type);
    furniture.setPosition(0, furniture.size.y / 2, 0);
    sceneManagerRef.current.addObject(furniture);

    setAddedTypes(prev => {
      const next = new Set(prev);
      next.add(type);
      return next;
    });
  }, []);

  const handleSpotIntensityChange = useCallback((v: number) => {
    sceneManagerRef.current?.lightManager.setSpotLightIntensity(v);
    setSpotIntensity(v);
  }, []);

  const handleSpotAngleChange = useCallback((v: number) => {
    sceneManagerRef.current?.lightManager.setSpotLightAngle(v);
    setSpotAngle(v);
  }, []);

  const handleSpotColorChange = useCallback((v: string) => {
    sceneManagerRef.current?.lightManager.setSpotLightColor(v);
    setSpotColor(v);
  }, []);

  const handleSpotXChange = useCallback((v: number) => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.lightManager.setSpotLightPosition(v, spotY, spotZ);
    setSpotX(v);
  }, [spotY, spotZ]);

  const handleSpotYChange = useCallback((v: number) => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.lightManager.setSpotLightPosition(spotX, v, spotZ);
    setSpotY(v);
  }, [spotX, spotZ]);

  const handleSpotZChange = useCallback((v: number) => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    sm.lightManager.setSpotLightPosition(spotX, spotY, v);
    setSpotZ(v);
  }, [spotX, spotY]);

  const handlePointToggle = useCallback(() => {
    const sm = sceneManagerRef.current;
    if (!sm) return;
    const newState = !sm.lightManager.isPointLightEnabled();
    sm.lightManager.setPointLightEnabled(newState);
    setPointEnabled(newState);
  }, []);

  const handlePointIntensityChange = useCallback((v: number) => {
    sceneManagerRef.current?.lightManager.setPointLightIntensity(v);
    setPointIntensity(v);
  }, []);

  const handleAmbientIntensityChange = useCallback((intensity: number) => {
    const sm = sceneManagerRef.current;
    const next: AmbientLightState = { ...ambientRef.current, intensity };
    ambientRef.current = next;
    if (sm) sm.lightManager.adjustAmbientLight(next.intensity, next.color);
    setAmbient(next);
  }, []);

  const handleAmbientColorChange = useCallback((color: string) => {
    const sm = sceneManagerRef.current;
    const next: AmbientLightState = { ...ambientRef.current, color };
    ambientRef.current = next;
    if (sm) sm.lightManager.adjustAmbientLight(next.intensity, next.color);
    setAmbient(next);
  }, []);

  return (
    <div className="app-container">
      <div ref={canvasContainerRef} className="canvas-container" />
      <ControlPanel
        currentWallColor={currentWallColor}
        currentFloorType={currentFloorType}
        onWallColorChange={handleWallColorChange}
        onFloorTypeChange={handleFloorTypeChange}
        onAddFurniture={handleAddFurniture}
        addedTypes={addedTypes}
        spotIntensity={spotIntensity}
        spotAngle={spotAngle}
        spotColor={spotColor}
        spotX={spotX}
        spotY={spotY}
        spotZ={spotZ}
        onSpotIntensityChange={handleSpotIntensityChange}
        onSpotAngleChange={handleSpotAngleChange}
        onSpotColorChange={handleSpotColorChange}
        onSpotXChange={handleSpotXChange}
        onSpotYChange={handleSpotYChange}
        onSpotZChange={handleSpotZChange}
        pointEnabled={pointEnabled}
        pointIntensity={pointIntensity}
        onPointToggle={handlePointToggle}
        onPointIntensityChange={handlePointIntensityChange}
        ambientIntensity={ambient.intensity}
        ambientColor={ambient.color}
        onAmbientIntensityChange={handleAmbientIntensityChange}
        onAmbientColorChange={handleAmbientColorChange}
      />
      <div className="app-title">
        <h1>三维室内房间布局与光照模拟</h1>
        <p>使用鼠标左键旋转视角 · 滚轮缩放 · 右键平移 · 拖拽家具移动</p>
      </div>
    </div>
  );
};

export default App;
