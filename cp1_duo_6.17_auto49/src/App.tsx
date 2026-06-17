import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioEngine, InputSource, AudioFileInfo, AudioData } from './audio-engine';
import { VisualizationManager, ViewType, ViewConfig } from './visualizations';
import { ControlsPanel } from './controls-panel';
import { InfoBar } from './info-bar';
import './styles.css';

const defaultViewConfigs: Record<ViewType, ViewConfig> = {
  waveform: { scale: 1, refreshRate: 60, colorMap: 'cyan-blue' },
  spectrum: { scale: 1, refreshRate: 60, colorMap: 'purple-red' },
  waterfall: { scale: 1, refreshRate: 60, colorMap: 'purple-red' }
};

function App() {
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const visualizationManagerRef = useRef<VisualizationManager | null>(null);

  const waveformCanvasRef = useRef<HTMLCanvasElement>(null);
  const spectrumCanvasRef = useRef<HTMLCanvasElement>(null);
  const waterfallContainerRef = useRef<HTMLDivElement>(null);

  const [currentSource, setCurrentSource] = useState<InputSource>('none');
  const [fileInfo, setFileInfo] = useState<AudioFileInfo | null>(null);
  const [viewConfigs, setViewConfigs] = useState<Record<ViewType, ViewConfig>>(defaultViewConfigs);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [audioData, setAudioData] = useState<AudioData>({
    timeDomain: new Float32Array(512),
    frequency: new Uint8Array(256),
    peakFrequency: 0,
    peakAmplitude: 0,
    averageLoudness: 0
  });
  const [error, setError] = useState<string | null>(null);
  const [activeSettings, setActiveSettings] = useState<ViewType | null>(null);

  useEffect(() => {
    const engine = new AudioEngine({
      onSourceChange: (source) => {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentSource(source);
          if (source === 'none') {
            setFileInfo(null);
          }
          setIsTransitioning(false);
        }, 250);
      },
      onFileInfo: (info) => {
        setFileInfo(info);
      },
      onData: (data) => {
        setAudioData(data);
        if (visualizationManagerRef.current) {
          visualizationManagerRef.current.updateData(data);
        }
      },
      onError: (err) => {
        setError(err);
        setTimeout(() => setError(null), 3000);
      }
    });
    audioEngineRef.current = engine;

    const vizManager = new VisualizationManager();
    visualizationManagerRef.current = vizManager;

    const initVisualizations = () => {
      if (waveformCanvasRef.current && vizManager) {
        vizManager.setWaveformCanvas(waveformCanvasRef.current);
      }
      if (spectrumCanvasRef.current && vizManager) {
        vizManager.setSpectrumCanvas(spectrumCanvasRef.current);
      }
      if (waterfallContainerRef.current && vizManager) {
        vizManager.setWaterfallContainer(waterfallContainerRef.current);
      }
      vizManager.start();
    };

    setTimeout(initVisualizations, 100);

    const handleResize = () => {
      if (waveformCanvasRef.current && spectrumCanvasRef.current) {
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      engine.destroy();
      vizManager.destroy();
    };
  }, []);

  const handleSelectMicrophone = useCallback(async () => {
    if (!audioEngineRef.current) return;
    try {
      setIsTransitioning(true);
      await audioEngineRef.current.switchToMicrophone();
    } catch (err) {
      setIsTransitioning(false);
    }
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!audioEngineRef.current) return;
    try {
      setIsTransitioning(true);
      await audioEngineRef.current.loadAudioFile(file);
    } catch (err) {
      setIsTransitioning(false);
    }
  }, []);

  const handleStop = useCallback(async () => {
    if (!audioEngineRef.current) return;
    setIsTransitioning(true);
    await audioEngineRef.current.stop();
  }, []);

  const handleConfigChange = useCallback((viewType: ViewType, config: Partial<ViewConfig>) => {
    setViewConfigs(prev => {
      const newConfigs = {
        ...prev,
        [viewType]: { ...prev[viewType], ...config }
      };
      if (visualizationManagerRef.current) {
        visualizationManagerRef.current.setConfig(viewType, newConfigs[viewType]);
      }
      return newConfigs;
    });
  }, []);

  const handleTogglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
  }, []);

  const handleOpenSettings = useCallback((viewType: ViewType | null) => {
    setActiveSettings(viewType);
  }, []);

  const renderSettingsGear = (viewType: ViewType) => (
    <button
      className="view-settings-gear"
      onClick={(e) => {
        e.stopPropagation();
        setActiveSettings(viewType);
      }}
      title="设置"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </button>
  );



  return (
    <div className="app">
      <ControlsPanel
        currentSource={currentSource}
        fileInfo={fileInfo}
        isPanelOpen={isPanelOpen}
        activeSettings={activeSettings}
        onTogglePanel={handleTogglePanel}
        onSelectMicrophone={handleSelectMicrophone}
        onFileUpload={handleFileUpload}
        onStop={handleStop}
        viewConfigs={viewConfigs}
        onConfigChange={handleConfigChange}
        onOpenSettings={handleOpenSettings}
      />

      <main className={`main-content ${isPanelOpen ? 'panel-open' : ''}`}>
        <header className="app-header">
          <h1>音律实验台</h1>
          <p className="app-subtitle">Audio Visualizer Lab</p>
        </header>

        <div className={`visualization-container ${isTransitioning ? 'transitioning' : ''}`}>
          <div className="view-container">
            <div className="view-header">
              <span className="view-title">波形图</span>
              <span className="view-desc">信号幅度随时间变化</span>
              {renderSettingsGear('waveform')}
            </div>
            <div className="view-content">
              <canvas ref={waveformCanvasRef} className="visualization-canvas" />
            </div>
          </div>

          <div className="view-container">
            <div className="view-header">
              <span className="view-title">频谱图</span>
              <span className="view-desc">频率分布 (256条柱)</span>
              {renderSettingsGear('spectrum')}
            </div>
            <div className="view-content">
              <canvas ref={spectrumCanvasRef} className="visualization-canvas" />
            </div>
          </div>

          <div className="view-container">
            <div className="view-header">
              <span className="view-title">3D瀑布图</span>
              <span className="view-desc">频率随时间堆积</span>
              {renderSettingsGear('waterfall')}
            </div>
            <div className="view-content">
              <div ref={waterfallContainerRef} className="waterfall-container" />
            </div>
          </div>
        </div>

        {currentSource === 'none' && !isTransitioning && (
          <div className="empty-state">
            <div className="empty-icon">🎵</div>
            <h2>开始音频可视化</h2>
            <p>请选择麦克风或上传音频文件开始体验</p>
          </div>
        )}

        {error && (
          <div className="error-toast">
            {error}
          </div>
        )}
      </main>

      <InfoBar
        peakFrequency={audioData.peakFrequency}
        peakAmplitude={audioData.peakAmplitude}
        averageLoudness={audioData.averageLoudness}
      />
    </div>
  );
}

export default App;
