import React, { useState, useRef, useEffect, useCallback } from "react";
import { createScene, updateOrbitalSystem, setSpeedMultiplier, highlightPlanet, resetCamera, dispose } from "./3dRenderer";
import { calculateOrbitalSystem } from "./orbitCalculator";
import type { StarType, OrbitalSystemParams } from "./orbitCalculator";
import UIController from "./uiController";

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneHandleRef = useRef<ReturnType<typeof createScene> | null>(null);

  const [currentStarType, setCurrentStarType] = useState<StarType>("main-sequence");
  const [orbitalSystem, setOrbitalSystem] = useState<OrbitalSystemParams | null>(null);
  const [speedMultiplier, setSpeedMultiplierState] = useState(1.0);
  const [selectedPlanetIndex, setSelectedPlanetIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const handle = createScene(containerRef.current);
    sceneHandleRef.current = handle;

    const params = calculateOrbitalSystem("main-sequence");
    setOrbitalSystem(params);
    updateOrbitalSystem(handle, params, false);

    handle.onPlanetClick = (index: number) => {
      setSelectedPlanetIndex(index);
    };

    return () => {
      dispose(handle);
      sceneHandleRef.current = null;
    };
  }, []);

  const handleStarTypeChange = useCallback((starType: StarType) => {
    setCurrentStarType(starType);
    setSelectedPlanetIndex(null);

    const params = calculateOrbitalSystem(starType);
    setOrbitalSystem(params);

    if (sceneHandleRef.current) {
      updateOrbitalSystem(sceneHandleRef.current, params, true);
    }
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setSpeedMultiplierState(speed);
    if (sceneHandleRef.current) {
      setSpeedMultiplier(sceneHandleRef.current, speed);
    }
  }, []);

  const handleResetCamera = useCallback(() => {
    if (sceneHandleRef.current) {
      resetCamera(sceneHandleRef.current);
    }
  }, []);

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      />

      <UIController
        currentStarType={currentStarType}
        orbitalSystem={orbitalSystem}
        speedMultiplier={speedMultiplier}
        selectedPlanetIndex={selectedPlanetIndex}
        onStarTypeChange={handleStarTypeChange}
        onSpeedChange={handleSpeedChange}
        onResetCamera={handleResetCamera}
      />

      <div
        style={{
          position: "absolute",
          top: 20,
          right: 20,
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "13px",
          fontWeight: 600,
          color: "rgba(255, 215, 0, 0.6)",
          letterSpacing: "2px",
          textTransform: "uppercase",
          pointerEvents: "none",
          zIndex: 50,
        }}
      >
        PLANETARY ORBIT SIMULATOR
      </div>
    </div>
  );
}
