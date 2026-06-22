import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameManager } from './core/GameManager';
import { BeatEngine } from './core/BeatEngine';
import { AudioLoader } from './audio/AudioLoader';
import { MapRenderer } from './renderer/MapRenderer';
import { UIOverlay } from './renderer/UIOverlay';
import { GamePhase, MAP_WIDTH, MAP_HEIGHT } from './types';

interface GameState {
  phase: GamePhase;
  player: any;
  stats: any;
  currentRoom: any;
  transitionProgress: number;
  isTransitioning: boolean;
}

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const uiCanvasRef = useRef<HTMLCanvasElement>(null);
  const gameManagerRef = useRef<GameManager | null>(null);
  const audioLoaderRef = useRef<AudioLoader | null>(null);
  const beatEngineRef = useRef<BeatEngine | null>(null);
  const mapRendererRef = useRef<MapRenderer | null>(null);
  const uiOverlayRef = useRef<UIOverlay | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [scale, setScale] = useState(1);

  const initializeGame = useCallback(() => {
    if (!mapCanvasRef.current || !uiCanvasRef.current) return;

    const audioLoader = new AudioLoader();
    const beatEngine = new BeatEngine(audioLoader);
    const gameManager = new GameManager(beatEngine, audioLoader);
    const mapRenderer = new MapRenderer(mapCanvasRef.current);
    const uiOverlay = new UIOverlay(uiCanvasRef.current);

    audioLoaderRef.current = audioLoader;
    beatEngineRef.current = beatEngine;
    gameManagerRef.current = gameManager;
    mapRendererRef.current = mapRenderer;
    uiOverlayRef.current = uiOverlay;

    gameManager.setOnStateChangeCallback((state) => {
      setGameState(state);
    });

    uiOverlay.renderMenu(() => {
      startGame();
    });

    setIsInitialized(true);
  }, []);

  const startGame = useCallback(async () => {
    if (!gameManagerRef.current) return;

    try {
      const musicDataUrl = createDemoMusic();
      await gameManagerRef.current.startNewGame('level1', musicDataUrl, 120);
    } catch (error) {
      console.error('Failed to start game:', error);
      alert('游戏启动失败，请刷新页面重试');
    }
  }, []);

  const createDemoMusic = (): string => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const duration = 60;
    const sampleRate = audioContext.sampleRate;
    const buffer = audioContext.createBuffer(2, sampleRate * duration, sampleRate);

    const bpm = 120;
    const beatInterval = 60 / bpm;
    const beatSamples = Math.floor(beatInterval * sampleRate);

    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      
      for (let i = 0; i < buffer.length; i++) {
        const beatIndex = Math.floor(i / beatSamples);
        const beatProgress = (i % beatSamples) / beatSamples;

        let sample = 0;

        if (beatProgress < 0.1) {
          const kickEnv = Math.exp(-beatProgress * 30);
          sample += Math.sin(2 * Math.PI * 60 * (i / sampleRate)) * kickEnv * 0.5;
        }

        if (beatIndex % 2 === 0 && beatProgress < 0.05) {
          const snareEnv = Math.exp(-beatProgress * 50);
          sample += (Math.random() * 2 - 1) * snareEnv * 0.3;
        }

        const hihatFreq = 800 + Math.sin(beatIndex * 0.5) * 200;
        const hihatEnv = Math.exp(-(beatProgress % 0.25) * 100);
        sample += Math.sin(2 * Math.PI * hihatFreq * (i / sampleRate)) * hihatEnv * 0.1;

        const bassNote = 55 * Math.pow(2, (beatIndex % 4) / 12);
        const bassEnv = Math.exp(-beatProgress * 10);
        sample += Math.sin(2 * Math.PI * bassNote * (i / sampleRate)) * bassEnv * 0.3;

        const melodyNotes = [261.63, 293.66, 329.63, 349.23, 392.00, 440.00, 493.88, 523.25];
        const melodyNote = melodyNotes[beatIndex % melodyNotes.length];
        const melodyEnv = Math.exp(-beatProgress * 8) * 0.5;
        sample += Math.sin(2 * Math.PI * melodyNote * (i / sampleRate)) * melodyEnv * 0.2;

        data[i] = Math.max(-1, Math.min(1, sample));
      }
    }

    const wav = audioBufferToWav(buffer);
    const blob = new Blob([wav], { type: 'audio/wav' });
    return URL.createObjectURL(blob);
  };

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1;
    const bitDepth = 16;

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;

    const dataLength = buffer.length * blockAlign;
    const bufferLength = 44 + dataLength;

    const arrayBuffer = new ArrayBuffer(bufferLength);
    const view = new DataView(arrayBuffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, bufferLength - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    writeString(36, 'data');
    view.setUint32(40, dataLength, true);

    const channels: Float32Array[] = [];
    for (let i = 0; i < numChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    let offset = 44;
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]));
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        view.setInt16(offset, intSample, true);
        offset += 2;
      }
    }

    return arrayBuffer;
  };

  const renderLoop = useCallback(() => {
    if (!gameManagerRef.current || !mapRendererRef.current || !uiOverlayRef.current) return;

    const gameManager = gameManagerRef.current;
    const state = gameManager.getState();
    const beatProgress = gameManager.getBeatProgress();
    const timeUntilNextBeat = gameManager.getTimeUntilNextBeat();

    if (state.currentRoom && state.phase !== GamePhase.MENU) {
      mapRendererRef.current.render(state.currentRoom, state.player, beatProgress);
    }

    if (uiOverlayRef.current && state.phase !== GamePhase.MENU) {
      uiOverlayRef.current.render({
        player: state.player,
        stats: state.stats,
        beatProgress,
        phase: state.phase,
        transitionProgress: state.transitionProgress,
        isTransitioning: state.isTransitioning,
        timeUntilNextBeat
      });
    }

    animationFrameRef.current = requestAnimationFrame(renderLoop);
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!gameManagerRef.current) return;

    const state = gameManagerRef.current.getState();

    if (e.key === 'Escape') {
      if (state.phase === GamePhase.PLAYING) {
        gameManagerRef.current.pause();
      } else if (state.phase === GamePhase.PAUSED) {
        gameManagerRef.current.resume();
      }
      return;
    }

    if (e.key.toLowerCase() === 'r') {
      if (state.phase === GamePhase.GAME_OVER || state.phase === GamePhase.LEVEL_COMPLETE || state.phase === GamePhase.PAUSED) {
        if (uiOverlayRef.current) {
          uiOverlayRef.current.renderMenu(() => {
            startGame();
          });
        }
        return;
      }
    }

    if (state.phase === GamePhase.PLAYING) {
      gameManagerRef.current.handleKeyDown(e.key);
    }
  }, [startGame]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (gameManagerRef.current) {
      gameManagerRef.current.handleKeyUp(e.key);
    }
  }, []);

  const handleResize = useCallback(() => {
    if (!containerRef.current) return;

    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    const minWidth = 1024;
    const minHeight = 768;

    const availableWidth = Math.max(minWidth, containerWidth - 40);
    const availableHeight = Math.max(minHeight, containerHeight - 40);

    const scaleX = availableWidth / MAP_WIDTH;
    const scaleY = availableHeight / MAP_HEIGHT;
    const newScale = Math.min(scaleX, scaleY, 1.5);

    setScale(newScale);
  }, []);

  useEffect(() => {
    initializeGame();
    handleResize();

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (gameManagerRef.current) {
        gameManagerRef.current.destroy();
      }
      if (mapRendererRef.current) {
        mapRendererRef.current.destroy();
      }
      if (uiOverlayRef.current) {
        uiOverlayRef.current.destroy();
      }
    };
  }, [initializeGame, handleKeyDown, handleKeyUp, handleResize]);

  useEffect(() => {
    if (isInitialized) {
      renderLoop();
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitialized, renderLoop]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: MAP_WIDTH * scale,
        height: MAP_HEIGHT * scale,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          position: 'relative',
          width: MAP_WIDTH,
          height: MAP_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          boxShadow: '0 0 50px rgba(233, 69, 96, 0.3)',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      >
        <canvas
          ref={mapCanvasRef}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            imageRendering: 'pixelated'
          }}
        />
        <canvas
          ref={uiCanvasRef}
          width={MAP_WIDTH}
          height={MAP_HEIGHT}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            pointerEvents: 'auto'
          }}
        />
      </div>
    </div>
  );
};

export default App;
