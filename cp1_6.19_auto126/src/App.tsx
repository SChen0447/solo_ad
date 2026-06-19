import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from '@/scene/sceneManager';
import { DataProcessor } from '@/data/dataProcessor';
import { UIPanel } from '@/components/UIPanel';
import { ComparePanel } from '@/components/ComparePanel';
import { LegendPanel } from '@/components/LegendPanel';
import { useAppStore } from '@/hooks/useStore';
import { calculateSunPosition, calculateSunshineDuration } from '@/utils/sunCalc';
import type { SeasonType, Building } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const dataProcessorRef = useRef<DataProcessor | null>(null);
  const [showCompare, setShowCompare] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const {
    currentScheme,
    schemeA,
    schemeB,
    sunPosition,
    windRose,
    showWindParticles,
    sectionPlane,
    selectedBuildingId,
    setCurrentScheme,
    updateBuilding,
    addBuilding,
    removeBuilding,
    setSunPosition,
    setWindRose,
    setShowWindParticles,
    setSectionPlane,
    setSelectedBuildingId,
    setTransitionProgress,
  } = useAppStore();

  const currentSchemeData = currentScheme === 'A' ? schemeA : schemeB;
  const selectedBuilding = currentSchemeData.buildings.find((b) => b.id === selectedBuildingId) || null;

  useEffect(() => {
    if (!containerRef.current) return;

    const sceneManager = new SceneManager(containerRef.current);
    const dataProcessor = new DataProcessor();

    sceneManagerRef.current = sceneManager;
    dataProcessorRef.current = dataProcessor;

    sceneManager.setBuildings(currentSchemeData.buildings);
    sceneManager.updateSunPosition(sunPosition);
    sceneManager.setWindParticles(showWindParticles);
    sceneManager.setSectionPlane(sectionPlane);

    dataProcessor.calculateWindField(windRose, currentSchemeData.buildings);
    sceneManager.updateWindData(windRose, currentSchemeData.buildings);

    sceneManager.setOnBuildingClick((id) => {
      setSelectedBuildingId(id);
    });

    sceneManager.setOnBuildingDrag((id, x, z) => {
      updateBuilding(currentScheme, id, { x, z });
      sceneManager.updateBuilding(id, { x, z });
    });

    return () => {
      sceneManager.dispose();
    };
  }, []);

  useEffect(() => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.updateSunPosition(sunPosition);
  }, [sunPosition]);

  useEffect(() => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.setWindParticles(showWindParticles);
  }, [showWindParticles]);

  useEffect(() => {
    if (!sceneManagerRef.current || !dataProcessorRef.current) return;

    dataProcessorRef.current.calculateWindField(windRose, currentSchemeData.buildings);
    sceneManagerRef.current.updateWindData(windRose, currentSchemeData.buildings);
  }, [windRose, currentSchemeData.buildings]);

  useEffect(() => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.setSectionPlane(sectionPlane);
  }, [sectionPlane]);

  useEffect(() => {
    if (!sceneManagerRef.current) return;
    sceneManagerRef.current.setSelectedBuilding(selectedBuildingId);
  }, [selectedBuildingId]);

  const handleSchemeChange = useCallback(
    (scheme: 'A' | 'B') => {
      if (scheme === currentScheme || isTransitioning) return;

      setIsTransitioning(true);
      const sceneManager = sceneManagerRef.current;
      if (!sceneManager) return;

      let progress = 1;
      const fadeOutDuration = 500;
      const fadeInDuration = 500;
      const startTime = performance.now();

      const animateFadeOut = (time: number) => {
        const elapsed = time - startTime;
        progress = Math.max(0, 1 - elapsed / fadeOutDuration);
        sceneManager.setTransitionProgress(progress);
        setTransitionProgress(progress);

        if (progress > 0) {
          requestAnimationFrame(animateFadeOut);
        } else {
          const targetScheme = scheme === 'A' ? schemeA : schemeB;
          sceneManager.setBuildings(targetScheme.buildings);
          setCurrentScheme(scheme);

          const fadeInStartTime = performance.now();
          const animateFadeIn = (time: number) => {
            const elapsed = time - fadeInStartTime;
            const fadeInProgress = Math.min(1, elapsed / fadeInDuration);
            sceneManager.setTransitionProgress(fadeInProgress);
            setTransitionProgress(fadeInProgress);

            if (fadeInProgress < 1) {
              requestAnimationFrame(animateFadeIn);
            } else {
              setIsTransitioning(false);
              sceneManager.setSelectedBuilding(selectedBuildingId);
            }
          };
          requestAnimationFrame(animateFadeIn);
        }
      };

      requestAnimationFrame(animateFadeOut);
    },
    [currentScheme, isTransitioning, schemeA, schemeB, setCurrentScheme, setTransitionProgress, selectedBuildingId]
  );

  const handleSeasonChange = useCallback(
    (season: SeasonType) => {
      setSunPosition(season, sunPosition.time);
    },
    [sunPosition.time, setSunPosition]
  );

  const handleTimeChange = useCallback(
    (time: number) => {
      setSunPosition(sunPosition.season, time);
    },
    [sunPosition.season, setSunPosition]
  );

  const handleWindDirectionChange = useCallback(
    (direction: number) => {
      setWindRose({ ...windRose, direction });
    },
    [windRose, setWindRose]
  );

  const handleWindSpeedChange = useCallback(
    (speed: number) => {
      setWindRose({ ...windRose, speed });
    },
    [windRose, setWindRose]
  );

  const handleSectionToggle = useCallback(() => {
    setSectionPlane({
      ...sectionPlane,
      active: !sectionPlane.active,
    });
  }, [sectionPlane, setSectionPlane]);

  const handleSectionAxisChange = useCallback(
    (axis: 'x' | 'z') => {
      setSectionPlane({ ...sectionPlane, axis });
    },
    [sectionPlane, setSectionPlane]
  );

  const handleSectionPositionChange = useCallback(
    (position: number) => {
      setSectionPlane({ ...sectionPlane, position });
    },
    [sectionPlane, setSectionPlane]
  );

  const handleBuildingUpdate = useCallback(
    (updates: Partial<Building>) => {
      if (!selectedBuildingId || !sceneManagerRef.current) return;
      updateBuilding(currentScheme, selectedBuildingId, updates);
      sceneManagerRef.current.updateBuilding(selectedBuildingId, updates);
    },
    [selectedBuildingId, currentScheme, updateBuilding]
  );

  const handleAddBuilding = useCallback(() => {
    if (!sceneManagerRef.current) return;

    const newBuilding: Omit<Building, 'id'> = {
      name: `建筑 ${currentSchemeData.buildings.length + 1}`,
      x: (Math.random() - 0.5) * 40,
      z: (Math.random() - 0.5) * 40,
      width: 8 + Math.random() * 6,
      depth: 8 + Math.random() * 6,
      height: 15 + Math.random() * 25,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      opacity: 0.9,
    };

    const id = uuidv4();
    addBuilding(currentScheme, newBuilding);
    sceneManagerRef.current.addBuilding({ ...newBuilding, id });
    setSelectedBuildingId(id);
  }, [currentScheme, currentSchemeData.buildings.length, addBuilding, setSelectedBuildingId]);

  const handleDeleteBuilding = useCallback(() => {
    if (!selectedBuildingId || !sceneManagerRef.current) return;
    removeBuilding(currentScheme, selectedBuildingId);
    sceneManagerRef.current.removeBuilding(selectedBuildingId);
    setSelectedBuildingId(null);
  }, [selectedBuildingId, currentScheme, removeBuilding, setSelectedBuildingId]);

  useEffect(() => {
    if (!dataProcessorRef.current) return;

    const avgSunshineA = calculateAvgSunshine(schemeA.buildings);
    const avgWindA = dataProcessorRef.current.getAvgWindSpeed(schemeA.buildings, windRose);

    const avgSunshineB = calculateAvgSunshine(schemeB.buildings);
    const avgWindB = dataProcessorRef.current.getAvgWindSpeed(schemeB.buildings, windRose);

    useAppStore.setState((state) => ({
      schemeA: {
        ...state.schemeA,
        metrics: {
          avgSunshineHours: avgSunshineA,
          avgWindSpeed: avgWindA,
        },
      },
      schemeB: {
        ...state.schemeB,
        metrics: {
          avgSunshineHours: avgSunshineB,
          avgWindSpeed: avgWindB,
        },
      },
    }));
  }, [schemeA.buildings, schemeB.buildings, windRose]);

  const calculateAvgSunshine = (buildings: Building[]): number => {
    if (buildings.length === 0) return 0;

    let total = 0;
    for (const building of buildings) {
      total += calculateSunshineDuration(
        sunPosition.season,
        building.x,
        building.z,
        building.height,
        buildings
      );
    }
    return total / buildings.length;
  };

  return (
    <div className="app-container">
      <div ref={containerRef} className="scene-container" />

      <UIPanel
        season={sunPosition.season}
        time={sunPosition.time}
        onSeasonChange={handleSeasonChange}
        onTimeChange={handleTimeChange}
        showWindParticles={showWindParticles}
        onToggleWind={() => setShowWindParticles(!showWindParticles)}
        currentScheme={currentScheme}
        onSchemeChange={handleSchemeChange}
        sectionPlane={sectionPlane}
        onSectionToggle={handleSectionToggle}
        onSectionAxisChange={handleSectionAxisChange}
        onSectionPositionChange={handleSectionPositionChange}
        selectedBuilding={selectedBuilding}
        onBuildingUpdate={handleBuildingUpdate}
        onAddBuilding={handleAddBuilding}
        onDeleteBuilding={handleDeleteBuilding}
        windRose={windRose}
        onWindDirectionChange={handleWindDirectionChange}
        onWindSpeedChange={handleWindSpeedChange}
      />

      <button
        className="compare-toggle-btn"
        onClick={() => setShowCompare(!showCompare)}
      >
        {showCompare ? '关闭对比' : '方案对比'}
      </button>

      <ComparePanel
        schemeA={schemeA}
        schemeB={schemeB}
        isOpen={showCompare}
        onClose={() => setShowCompare(false)}
      />

      <LegendPanel />

      <div className="app-title">
        <h1>街区日照与风环境分析仪</h1>
        <p>Urban Sunlight & Wind Environment Analyzer</p>
      </div>
    </div>
  );
};

export default App;
