import { useState, useRef, useEffect, useCallback } from 'react';
import SolarSystem, { SolarSystemHandle } from './components/SolarSystem';
import ControlPanel from './components/ControlPanel';
import { BASE_PLANETS, calculateUpdatedOrbit, PlanetData } from './utils/orbitPhysics';
import './App.css';

function App() {
  const [selectedPlanet, setSelectedPlanet] = useState('earth');
  const [massMultipliers, setMassMultipliers] = useState<Record<string, number>>({
    mercury: 1.0,
    venus: 1.0,
    earth: 1.0,
    mars: 1.0
  });
  const [radiusMultipliers, setRadiusMultipliers] = useState<Record<string, number>>({
    mercury: 1.0,
    venus: 1.0,
    earth: 1.0,
    mars: 1.0
  });
  const [planetData, setPlanetData] = useState<PlanetData | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [currentAngle, setCurrentAngle] = useState(0);
  
  const solarSystemRef = useRef<SolarSystemHandle>(null);
  const animationFrameRef = useRef<number>(0);

  useEffect(() => {
    const updated = calculateUpdatedOrbit(
      selectedPlanet,
      massMultipliers[selectedPlanet],
      radiusMultipliers[selectedPlanet]
    );
    setPlanetData(updated);
  }, [selectedPlanet, massMultipliers, radiusMultipliers]);

  useEffect(() => {
    const updateData = () => {
      if (solarSystemRef.current) {
        const data = solarSystemRef.current.getPlanetData(selectedPlanet);
        if (data) {
          setCurrentAngle(data.currentAngle);
          setIsPaused(solarSystemRef.current.isPaused());
        }
      }
      animationFrameRef.current = requestAnimationFrame(updateData);
    };
    
    animationFrameRef.current = requestAnimationFrame(updateData);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [selectedPlanet]);

  const handleSelectPlanet = useCallback((planet: string) => {
    setSelectedPlanet(planet);
  }, []);

  const handleMassChange = useCallback((value: number) => {
    setMassMultipliers(prev => {
      const newMultipliers = { ...prev, [selectedPlanet]: value };
      return newMultipliers;
    });
    
    if (solarSystemRef.current) {
      solarSystemRef.current.updatePlanetParams(
        selectedPlanet,
        value,
        radiusMultipliers[selectedPlanet]
      );
    }
  }, [selectedPlanet, radiusMultipliers]);

  const handleRadiusChange = useCallback((value: number) => {
    setRadiusMultipliers(prev => {
      const newMultipliers = { ...prev, [selectedPlanet]: value };
      return newMultipliers;
    });
    
    if (solarSystemRef.current) {
      solarSystemRef.current.updatePlanetParams(
        selectedPlanet,
        massMultipliers[selectedPlanet],
        value
      );
    }
  }, [selectedPlanet, massMultipliers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (solarSystemRef.current) {
          solarSystemRef.current.togglePause();
          setIsPaused(solarSystemRef.current.isPaused());
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="app-container">
      <div className="scene-container">
        <SolarSystem ref={solarSystemRef} />
        <div className="title-overlay">
          <h1>太阳系轨道模拟器</h1>
          <p>拖拽旋转视角 · 滚轮缩放 · 空格暂停</p>
        </div>
      </div>
      <div className="panel-container">
        <ControlPanel
          selectedPlanet={selectedPlanet}
          onSelectPlanet={handleSelectPlanet}
          planetData={planetData}
          massMultiplier={massMultipliers[selectedPlanet]}
          radiusMultiplier={radiusMultipliers[selectedPlanet]}
          onMassChange={handleMassChange}
          onRadiusChange={handleRadiusChange}
          isPaused={isPaused}
          currentAngle={currentAngle}
        />
      </div>
    </div>
  );
}

export default App;
