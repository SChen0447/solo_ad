import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StarScene } from './scene';
import { generateStars } from './star-service';
import { ControlPanel, InfoPanel, LoadingOverlay, StatsBar } from './ui-components';
import type { Star, StarGenerationParams, ConstellationLine, PlanetOrbit } from './types';
import './styles.css';

const App: React.FC = () => {
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const starSceneRef = useRef<StarScene | null>(null);
  const isMobileRef = useRef(false);

  const [params, setParams] = useState<StarGenerationParams>({
    count: 500,
    distribution: 'disk',
    seed: 42,
  });

  const [stars, setStars] = useState<Star[]>([]);
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [lines, setLines] = useState<ConstellationLine[]>([]);
  const [planets, setPlanets] = useState<PlanetOrbit[]>([]);
  const [fps, setFps] = useState(60);
  const [leftPanelCollapsed, setLeftPanelCollapsed] = useState(false);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(performance.now());

  const handleGenerate = useCallback(async (customParams?: StarGenerationParams) => {
    const generateParams = customParams || params;
    setIsGenerating(true);
    
    try {
      const newStars = await generateStars(generateParams);
      setStars(newStars);
      setSelectedStar(null);
      setLines([]);
      setPlanets([]);

      if (starSceneRef.current) {
        starSceneRef.current.setStars(newStars);
        starSceneRef.current.setSelectedStar(null);
      }
    } catch (error) {
      console.error('Failed to generate stars:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [params]);

  const generateInitialStars = useCallback(async () => {
    const initialParams: StarGenerationParams = {
      count: 500,
      distribution: 'disk',
      seed: 42,
    };
    setIsGenerating(true);
    
    try {
      const newStars = await generateStars(initialParams);
      setStars(newStars);

      if (starSceneRef.current) {
        starSceneRef.current.setStars(newStars);
      }
    } catch (error) {
      console.error('Failed to generate stars:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 900;
      isMobileRef.current = mobile;
      if (mobile) {
        setLeftPanelCollapsed(true);
        setRightPanelCollapsed(true);
      } else {
        setLeftPanelCollapsed(false);
        setRightPanelCollapsed(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!sceneContainerRef.current) return;

    const scene = new StarScene(sceneContainerRef.current);
    starSceneRef.current = scene;

    scene.onStarClick((starId) => {
      const star = scene.getStarById(starId);
      if (star) {
        setSelectedStar(star);
        scene.setSelectedStar(starId);
        if (isMobileRef.current) {
          setRightPanelCollapsed(false);
        }
      }
    });

    scene.onStarHover((starId) => {
      scene.setHoveredStar(starId);
    });

    scene.onLineRightClick((lineId) => {
      scene.removeConstellationLine(lineId);
      setLines((prev) => prev.filter((l) => l.id !== lineId));
    });

    generateInitialStars();

    return () => {
      scene.dispose();
    };
  }, [generateInitialStars]);

  useEffect(() => {
    const updateFps = () => {
      frameCountRef.current++;
      const now = performance.now();
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      requestAnimationFrame(updateFps);
    };
    const id = requestAnimationFrame(updateFps);
    return () => cancelAnimationFrame(id);
  }, []);

  const handleParamsChange = (newParams: StarGenerationParams) => {
    setParams(newParams);
  };

  const handleGalacticView = () => {
    starSceneRef.current?.moveToGalacticTopView();
  };

  const handleResetView = () => {
    starSceneRef.current?.resetToDefaultView();
  };

  const handleStartConnection = () => {
    if (isConnecting) {
      starSceneRef.current?.cancelConnection();
      setIsConnecting(false);
    } else if (selectedStar) {
      starSceneRef.current?.startConnection(selectedStar.id);
      setIsConnecting(true);
    }
  };

  const handleAddPlanet = (orbitData: Omit<PlanetOrbit, 'id'>) => {
    const newOrbit: PlanetOrbit = {
      ...orbitData,
      id: `planet-${Date.now()}`,
    };
    setPlanets((prev) => [...prev, newOrbit]);
    starSceneRef.current?.addPlanetOrbit(newOrbit);
  };

  const handleRemovePlanet = (id: string) => {
    setPlanets((prev) => prev.filter((p) => p.id !== id));
    starSceneRef.current?.removePlanetOrbit(id);
  };

  return (
    <div className="app-container">
      <div ref={sceneContainerRef} className="scene-container" />
      
      <ControlPanel
        params={params}
        onParamsChange={handleParamsChange}
        onGenerate={() => handleGenerate()}
        onGalacticView={handleGalacticView}
        onResetView={handleResetView}
        onStartConnection={handleStartConnection}
        isGenerating={isGenerating}
        isConnecting={isConnecting}
        selectedStar={selectedStar}
        onAddPlanet={handleAddPlanet}
        planets={planets}
        onRemovePlanet={handleRemovePlanet}
        collapsed={leftPanelCollapsed}
        onToggleCollapse={() => setLeftPanelCollapsed(!leftPanelCollapsed)}
      />

      <InfoPanel
        star={selectedStar}
        collapsed={rightPanelCollapsed}
        onToggleCollapse={() => setRightPanelCollapsed(!rightPanelCollapsed)}
      />

      <LoadingOverlay visible={isGenerating} />

      <StatsBar
        starCount={stars.length}
        fps={fps}
        lineCount={lines.length}
        planetCount={planets.length}
      />
    </div>
  );
};

export default App;
