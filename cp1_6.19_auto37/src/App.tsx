import React, { useCallback, useEffect, useState } from 'react';
import SceneRenderer from './modules/scene/SceneRenderer';
import ControlPanel from './modules/control/ControlPanel';
import { useSimulationStore } from './modules/control/store';

const App: React.FC = () => {
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isPlaying = useSimulationStore(s => s.isPlaying);
  const time = useSimulationStore(s => s.time);
  const addUserMeasurementPoint = useSimulationStore(s => s.addUserMeasurementPoint);
  const removeUserMeasurementPoint = useSimulationStore(s => s.removeUserMeasurementPoint);
  const userMeasurementPoints = useSimulationStore(s => s.userMeasurementPoints);
  const simulator = useSimulationStore(s => s.simulator);
  const panelCollapsed = useSimulationStore(s => s.panelCollapsed);

  const canAddPoints = !isPlaying || time === 0;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (userMeasurementPoints.length === 0) return;
    const now = Date.now();
    const expired = userMeasurementPoints.filter(p => now - p.createdAt > 30000);
    for (const p of expired) {
      removeUserMeasurementPoint(p.id);
    }
    const timer = setInterval(() => {
      const now2 = Date.now();
      const expired2 = useSimulationStore.getState().userMeasurementPoints.filter(p => now2 - p.createdAt > 30000);
      for (const p of expired2) {
        useSimulationStore.getState().removeUserMeasurementPoint(p.id);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [userMeasurementPoints, removeUserMeasurementPoint]);

  const handleSurfaceClick = useCallback((point: [number, number, number]) => {
    if (!canAddPoints) return;
    const totalPoints = useSimulationStore.getState().measurementPoints.length +
      useSimulationStore.getState().userMeasurementPoints.length;
    if (totalPoints >= 20) return;

    const [px, py, pz] = point;
    const displacement = simulator.computePointDisplacement(px, py, pz, time);
    const stress = simulator.computePointStress(px, py, pz, time);
    const energy = simulator.computePointEnergy(px, py, pz, time);

    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    addUserMeasurementPoint({
      id,
      position: [px, py + 0.5, pz],
      displacement,
      stress,
      energy,
      isUserAdded: true,
      createdAt: Date.now(),
      side: simulator.isOnHangingWall(px, py, pz) ? 'hanging' : 'footwall',
    });
  }, [canAddPoints, simulator, time, addUserMeasurementPoint]);

  const isSmallScreen = windowWidth < 1024;

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: isSmallScreen ? 'column' : 'row',
      background: '#0d0d1a',
      overflow: 'hidden',
    }}>
      <ControlPanel />
      <div style={{
        flex: 1,
        position: 'relative',
        marginTop: isSmallScreen && !panelCollapsed ? '0' : '0',
        overflow: 'hidden',
      }}>
        <SceneRenderer
          onSurfaceClick={handleSurfaceClick}
          canAddPoints={canAddPoints}
        />
        <div style={{
          position: 'absolute',
          bottom: '12px',
          right: '16px',
          background: 'rgba(28,28,42,0.8)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderRadius: '8px',
          padding: '8px 14px',
          color: '#888',
          fontSize: '11px',
          fontFamily: "'Courier New', monospace",
          border: '1px solid #3a3a4a',
          pointerEvents: 'none',
        }}>
          <div>时间: {time.toFixed(1)} | 速度: {useSimulationStore.getState().playbackSpeed}x</div>
          <div>测量点: {useSimulationStore.getState().measurementPoints.length + useSimulationStore.getState().userMeasurementPoints.length}/20</div>
          <div>裂缝段: {useSimulationStore.getState().cracks.length}</div>
        </div>
      </div>
    </div>
  );
};

export default App;
