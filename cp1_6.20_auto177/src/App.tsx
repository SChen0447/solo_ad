import React, { useState, useEffect, useRef, useCallback } from 'react';
import { EarthComponent } from './modules/earth/EarthComponent';
import { EarthRenderer, MarkerData } from './modules/earth/EarthRenderer';
import { DataLoader, EarthquakeData } from './modules/data/DataLoader';
import { EarthquakeVisualizer } from './modules/visualization/EarthquakeVisualizer';
import { TimeSliderControl } from './modules/interaction/TimeSliderControl';
import { MagnitudeFilter } from './modules/interaction/MagnitudeFilter';
import { StatsPanel } from './modules/interaction/StatsPanel';
import { Tooltip } from './modules/interaction/Tooltip';
import { Toast } from './modules/interaction/Toast';
import './App.css';

const App: React.FC = () => {
  const [earthquakeData, setEarthquakeData] = useState<EarthquakeData[]>([]);
  const [earthRenderer, setEarthRenderer] = useState<EarthRenderer | null>(null);
  const [visualizer, setVisualizer] = useState<EarthquakeVisualizer | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [minTime, setMinTime] = useState<number>(0);
  const [maxTime, setMaxTime] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [activeMagnitudeRanges, setActiveMagnitudeRanges] = useState<Array<{ min: number; max: number }>>([
    { min: 3, max: 4 },
    { min: 4, max: 5 },
    { min: 5, max: 6 },
    { min: 6, max: 7 }
  ]);
  const [tooltipData, setTooltipData] = useState<EarthquakeData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState<boolean>(false);
  const [stats, setStats] = useState({
    eventCount: 0,
    maxMagnitude: 0,
    averageDepth: 0
  });

  const dataLoaderRef = useRef<DataLoader | null>(null);
  const statsUpdateIntervalRef = useRef<number | null>(null);

  const handleRendererReady = useCallback((renderer: EarthRenderer) => {
    setEarthRenderer(renderer);
  }, []);

  const handleDataLoaded = useCallback((data: EarthquakeData[]) => {
    setEarthquakeData(data);
    
    if (dataLoaderRef.current) {
      const timeRange = dataLoaderRef.current.getTimeRange();
      setMinTime(timeRange.min);
      setMaxTime(timeRange.max);
      setCurrentTime(timeRange.min);
    }
  }, []);

  const handleDataError = useCallback((error: Error) => {
    setToastMessage(`数据加载失败: ${error.message}`);
    setShowToast(true);
  }, []);

  useEffect(() => {
    dataLoaderRef.current = new DataLoader({
      onLoad: handleDataLoaded,
      onError: handleDataError
    });

    dataLoaderRef.current.loadData();

    return () => {
      if (statsUpdateIntervalRef.current) {
        clearInterval(statsUpdateIntervalRef.current);
      }
    };
  }, [handleDataLoaded, handleDataError]);

  useEffect(() => {
    if (earthRenderer && earthquakeData.length > 0) {
      const viz = new EarthquakeVisualizer(earthRenderer);
      viz.createAllVisuals(earthquakeData);
      
      viz.setTooltipCallback((data, position) => {
        setTooltipData(data);
        setTooltipPosition(position);
      });
      
      setVisualizer(viz);

      return () => {
        viz.dispose();
      };
    }
  }, [earthRenderer, earthquakeData]);

  useEffect(() => {
    if (visualizer) {
      visualizer.updateTimeFilter(currentTime);
    }
  }, [visualizer, currentTime]);

  useEffect(() => {
    if (visualizer) {
      visualizer.updateMagnitudeFilter(activeMagnitudeRanges);
    }
  }, [visualizer, activeMagnitudeRanges]);

  useEffect(() => {
    if (visualizer) {
      statsUpdateIntervalRef.current = window.setInterval(() => {
        setStats({
          eventCount: visualizer.getVisibleCount(),
          maxMagnitude: visualizer.getMaxMagnitude(),
          averageDepth: visualizer.getAverageDepth()
        });
      }, 100);

      return () => {
        if (statsUpdateIntervalRef.current) {
          clearInterval(statsUpdateIntervalRef.current);
        }
      };
    }
  }, [visualizer]);

  const handleTimeChange = useCallback((updater: number | ((prev: number) => number)) => {
    if (typeof updater === 'function') {
      setCurrentTime(prev => {
        const next = updater(prev);
        return next;
      });
    } else {
      setCurrentTime(updater);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    setIsPlaying(prev => !prev);
  }, []);

  const handleSpeedChange = useCallback((speed: number) => {
    setPlaybackSpeed(speed);
  }, []);

  const handleMagnitudeFilterChange = useCallback((ranges: Array<{ min: number; max: number }>) => {
    setActiveMagnitudeRanges(ranges);
  }, []);

  const handleToastClose = useCallback(() => {
    setShowToast(false);
  }, []);

  const markerData: MarkerData[] = earthquakeData.map(d => ({
    id: d.id,
    latitude: d.latitude,
    longitude: d.longitude,
    depth: d.depth,
    magnitude: d.magnitude,
    timestamp: d.timestamp
  }));

  return (
    <div className="app-container">
      <div className="scene-container">
        <EarthComponent
          earthquakeData={markerData}
          onRendererReady={handleRendererReady}
        />
      </div>

      <div className="ui-overlay">
        <div className="app-header">
          <h1 className="app-title">三维地震数据动态可视化</h1>
          <p className="app-subtitle">实时观测全球地震活动的时空分布</p>
        </div>

        <StatsPanel
          eventCount={stats.eventCount}
          maxMagnitude={stats.maxMagnitude}
          averageDepth={stats.averageDepth}
        />

        <MagnitudeFilter
          onFilterChange={handleMagnitudeFilterChange}
        />

        <TimeSliderControl
          minTime={minTime}
          maxTime={maxTime}
          currentTime={currentTime}
          onTimeChange={handleTimeChange}
          isPlaying={isPlaying}
          onPlayPause={handlePlayPause}
          playbackSpeed={playbackSpeed}
          onSpeedChange={handleSpeedChange}
        />

        <Tooltip
          data={tooltipData}
          position={tooltipPosition}
        />

        <Toast
          message={toastMessage}
          isVisible={showToast}
          onClose={handleToastClose}
        />
      </div>
    </div>
  );
};

export default App;
