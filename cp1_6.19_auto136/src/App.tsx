import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThreeScene } from './ThreeScene';
import { SensorSimulator, type SensorData, type ControlParams } from './SensorSimulator';
import { PlantGrowthModel, type PlantType, type PlantState, type GrowthHistoryPoint } from './PlantGrowthModel';
import { ControlPanel } from './ControlPanel';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const threeSceneRef = useRef<ThreeScene | null>(null);
  const sensorSimulatorRef = useRef<SensorSimulator | null>(null);
  const plantGrowthModelRef = useRef<PlantGrowthModel | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickRef = useRef<number>(0);

  const [sensorData, setSensorData] = useState<SensorData | null>(null);
  const [prevSensorData, setPrevSensorData] = useState<SensorData | null>(null);
  const [controlParams, setControlParams] = useState<ControlParams>({
    irrigation: 50,
    shading: 30,
    co2Concentration: 60
  });
  const [plantStates, setPlantStates] = useState<Record<PlantType, PlantState> | null>(null);
  const [growthHistory, setGrowthHistory] = useState<Record<PlantType, GrowthHistoryPoint[]>>({
    tomato: [],
    lettuce: [],
    eggplant: [],
    pepper: []
  });

  useEffect(() => {
    if (!containerRef.current) return;

    const threeScene = new ThreeScene(containerRef.current);
    threeSceneRef.current = threeScene;
    threeScene.start();

    const sensorSimulator = new SensorSimulator();
    sensorSimulatorRef.current = sensorSimulator;
    sensorSimulator.setControlParams(controlParams);

    const plantGrowthModel = new PlantGrowthModel();
    plantGrowthModelRef.current = plantGrowthModel;

    const unsubscribe = sensorSimulator.subscribe((data, prevData) => {
      setSensorData(data);
      setPrevSensorData(prevData);
      threeScene.updateSensorData(data);
    });

    sensorSimulator.start();

    const tick = (time: number) => {
      const deltaTime = Math.min((time - lastTickRef.current) / 1000, 0.1);
      lastTickRef.current = time;

      if (deltaTime > 0 && sensorSimulator && plantGrowthModel) {
        const currentSensorData = sensorSimulator.getData();
        const currentControlParams = sensorSimulator.getControlParams();
        plantGrowthModel.update(currentSensorData, currentControlParams, deltaTime);

        const states = plantGrowthModel.getAllPlantStates();
        const history = plantGrowthModel.getAllGrowthHistory();
        setPlantStates(states);
        setGrowthHistory(history);
        threeScene.updatePlantStates(states);
      }

      animationFrameRef.current = requestAnimationFrame(tick);
    };
    lastTickRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      unsubscribe();
      sensorSimulator.stop();
      threeScene.dispose();
    };
  }, []);

  const handleControlChange = (params: Partial<ControlParams>) => {
    setControlParams((prev) => {
      const newParams = { ...prev, ...params };
      sensorSimulatorRef.current?.setControlParams(newParams);
      threeSceneRef.current?.updateControlParams(newParams);
      return newParams;
    });
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      <ControlPanel
        sensorData={sensorData}
        prevSensorData={prevSensorData}
        controlParams={controlParams}
        plantStates={plantStates}
        growthHistory={growthHistory}
        onControlChange={handleControlChange}
      />
      <div
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          background: 'rgba(15, 30, 50, 0.55)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid rgba(100, 200, 180, 0.2)',
          zIndex: 10
        }}
      >
        <h1 style={{
          color: '#88ddcc',
          fontSize: '18px',
          fontWeight: 700,
          marginBottom: '6px',
          letterSpacing: '0.5px'
        }}>
          🌿 多层式生态温室模拟器
        </h1>
        <p style={{
          color: '#7090a0',
          fontSize: '12px',
          lineHeight: 1.5
        }}>
          拖动鼠标旋转视角 · 滚轮缩放 · 底部滑块调节环境参数
        </p>
      </div>
    </div>
  );
};

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);
