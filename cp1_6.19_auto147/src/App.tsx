import { useState, useCallback } from 'react';
import Scene from './Scene';
import ControlPanel from './ControlPanel';
import { MarineCreature, EnvironmentData } from './MarineData';
import * as THREE from 'three';

export default function App() {
  const [depth, setDepth] = useState(0);
  const [targetDepth, setTargetDepth] = useState(0);
  const [selectedCreature, setSelectedCreature] = useState<MarineCreature | null>(null);
  const [environmentData, setEnvironmentData] = useState<EnvironmentData>({
    temperature: 28,
    lightIntensity: 1,
    pressure: 1,
    visibility: 50
  });
  const [cameraAngle, setCameraAngle] = useState(0);
  const [creaturePositions, setCreaturePositions] = useState<{ id: string; position: THREE.Vector3 }[]>([]);

  const handleDepthChange = useCallback((newDepth: number) => {
    setTargetDepth(newDepth);
  }, []);

  const handleCreatureSelect = useCallback((creature: MarineCreature | null) => {
    setSelectedCreature(creature);
  }, []);

  const handleEnvironmentUpdate = useCallback((data: EnvironmentData) => {
    setEnvironmentData(data);
    setDepth(data.pressure * 10 - 10);
  }, []);

  const handleCameraDirection = useCallback((angle: number) => {
    setCameraAngle(angle);
  }, []);

  const handleCreaturePositionsUpdate = useCallback((positions: { id: string; position: THREE.Vector3 }[]) => {
    setCreaturePositions(positions);
  }, []);

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%'
      }}>
        <Scene
          targetDepth={targetDepth}
          selectedCreature={selectedCreature}
          onCreatureSelect={handleCreatureSelect}
          onEnvironmentUpdate={handleEnvironmentUpdate}
          onCameraDirection={handleCameraDirection}
          onCreaturePositionsUpdate={handleCreaturePositionsUpdate}
        />
      </div>
      
      <ControlPanel
        targetDepth={targetDepth}
        onDepthChange={handleDepthChange}
        selectedCreature={selectedCreature}
        onCreatureSelect={handleCreatureSelect}
        environmentData={environmentData}
        cameraAngle={cameraAngle}
        creaturePositions={creaturePositions}
      />

      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 22, 40, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        padding: '10px 20px',
        borderRadius: '20px',
        border: '1px solid rgba(0, 229, 255, 0.2)',
        color: '#88ccff',
        fontSize: '12px',
        zIndex: 100,
        textAlign: 'center'
      }}>
        <span style={{ color: '#00e5ff', fontWeight: 'bold' }}>提示：</span>
        拖动鼠标旋转视角 · 点击生物查看详情 · 使用右侧滑块调整深度
      </div>
    </div>
  );
}
