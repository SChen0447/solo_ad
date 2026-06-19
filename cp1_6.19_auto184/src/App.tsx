import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ControlPanel } from 'src/components/ControlPanel';
import { AudioEngine } from 'src/audio/AudioEngine';
import { SceneManager } from 'src/scene/SceneManager';
import { GeometryGroup } from 'src/scene/GeometryGroup';
import { SceneUpdater } from 'src/scene/SceneUpdater';
import { VisualizerMode, ColorTheme } from 'src/scene/GeometryGroup';

const App: React.FC = () => {
  const sceneContainerRef = useRef<HTMLDivElement>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const geometryGroupRef = useRef<GeometryGroup | null>(null);
  const sceneUpdaterRef = useRef<SceneUpdater | null>(null);
  const initializedRef = useRef(false);

  const [fileName, setFileName] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [currentMode, setCurrentMode] = useState<VisualizerMode>('bars');
  const [currentTheme, setCurrentTheme] = useState<ColorTheme>('cyberpunk');

  useEffect(() => {
    if (!sceneContainerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    const audioEngine = new AudioEngine();
    audioEngineRef.current = audioEngine;

    const sceneManager = new SceneManager(sceneContainerRef.current);
    sceneManagerRef.current = sceneManager;

    const geometryGroup = new GeometryGroup('bars', 'cyberpunk');
    geometryGroupRef.current = geometryGroup;

    const sceneUpdater = new SceneUpdater(audioEngine, sceneManager, geometryGroup);
    sceneUpdaterRef.current = sceneUpdater;

    sceneUpdater.start();

    return () => {
      sceneUpdater.dispose();
      sceneManager.dispose();
      audioEngine.dispose();
    };
  }, []);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!audioEngineRef.current) return;

    setFileName(file.name);
    setIsPlaying(false);

    try {
      await audioEngineRef.current.loadAudio(file);
      setHasAudio(true);
    } catch (error) {
      console.error('Failed to load audio:', error);
      setHasAudio(false);
      setFileName(null);
    }
  }, []);

  const handlePlayPause = useCallback(() => {
    if (!audioEngineRef.current || !hasAudio) return;

    if (isPlaying) {
      audioEngineRef.current.pause();
      setIsPlaying(false);
    } else {
      audioEngineRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, hasAudio]);

  const handleModeChange = useCallback((mode: VisualizerMode) => {
    if (sceneUpdaterRef.current) {
      sceneUpdaterRef.current.setMode(mode);
      setCurrentMode(mode);
    }
  }, []);

  const handleThemeChange = useCallback((theme: ColorTheme) => {
    if (sceneUpdaterRef.current) {
      sceneUpdaterRef.current.setColorTheme(theme);
      setCurrentTheme(theme);
    }
  }, []);

  return (
    <div className="app-container">
      <div className="left-panel">
        <ControlPanel
          fileName={fileName}
          isPlaying={isPlaying}
          hasAudio={hasAudio}
          currentMode={currentMode}
          currentTheme={currentTheme}
          onFileUpload={handleFileUpload}
          onPlayPause={handlePlayPause}
          onModeChange={handleModeChange}
          onThemeChange={handleThemeChange}
        />
      </div>
      <div className="scene-container" ref={sceneContainerRef}>
        <div className="scene-overlay">
          {!hasAudio && (
            <div className="welcome-text">
              <h1>3D 音频可视化</h1>
              <p>上传音频文件开始体验</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        html, body, #root {
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        body {
          font-size: 16px;
        }

        .app-container {
          display: flex;
          width: 100vw;
          height: 100vh;
          background: linear-gradient(135deg, #0a0a1a 0%, #1a1a3a 50%, #0d0d2a 100%);
          overflow: hidden;
        }

        .left-panel {
          flex-shrink: 0;
          padding: 1rem;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .scene-container {
          flex: 1;
          position: relative;
          min-width: 0;
        }

        .scene-overlay {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          pointer-events: none;
          z-index: 5;
        }

        .welcome-text {
          text-align: center;
          color: rgba(200, 200, 255, 0.6);
        }

        .welcome-text h1 {
          font-size: 2.5rem;
          font-weight: 300;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #668cff, #aa66ff);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .welcome-text p {
          font-size: 1rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        @media (max-width: 1366px) {
          body {
            font-size: 14px;
          }

          .welcome-text h1 {
            font-size: 2rem;
          }
        }

        @media (min-width: 1920px) {
          body {
            font-size: 18px;
          }
        }
      `}</style>
    </div>
  );
};

export default App;
