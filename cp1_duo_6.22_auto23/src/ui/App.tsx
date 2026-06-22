import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Subtitle, EffectConfig, RenderState, ExportState } from '../types';
import { SubtitleRenderer } from '../engine/subtitleRenderer';
import { SubtitleEditor } from './SubtitleEditor';
import { EffectPanel } from './EffectPanel';
import { eventBus } from '../utils/eventBus';

const STORAGE_KEY = 'subtitle-effects-workshop-state';

const defaultSubtitles: Subtitle[] = [
  {
    id: '1',
    text: '生活不止眼前的苟且',
    startTime: 0,
    duration: 2.5,
    fontSize: 52,
    color: '#ffffff',
    inEffect: 'fadeIn',
    outEffect: 'fadeOut',
  },
  {
    id: '2',
    text: '还有诗和远方的田野',
    startTime: 3,
    duration: 2.5,
    fontSize: 52,
    color: '#e94560',
    inEffect: 'slideUp',
    outEffect: 'slideUpOut',
  },
  {
    id: '3',
    text: '你赤手空拳来到人世间',
    startTime: 6,
    duration: 2.5,
    fontSize: 48,
    color: '#ffffff',
    inEffect: 'scaleIn',
    outEffect: 'scaleOut',
  },
  {
    id: '4',
    text: '为找到那片海不顾一切',
    startTime: 9,
    duration: 3,
    fontSize: 56,
    color: '#ffd700',
    inEffect: 'fadeIn',
    outEffect: 'fadeOut',
  },
  {
    id: '5',
    text: '—— 字幕特效工坊',
    startTime: 12.5,
    duration: 2.5,
    fontSize: 36,
    color: '#b0b0c0',
    inEffect: 'slideUp',
    outEffect: 'slideUpOut',
  },
];

const defaultEffectConfig: EffectConfig = {
  inAnimationDuration: 1,
  outAnimationDuration: 1,
};

interface SavedState {
  subtitles: Subtitle[];
  effectConfig: EffectConfig;
}

export const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<SubtitleRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [subtitles, setSubtitles] = useState<Subtitle[]>(defaultSubtitles);
  const [effectConfig, setEffectConfig] = useState<EffectConfig>(defaultEffectConfig);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(defaultSubtitles[0]?.id || null);
  const [renderState, setRenderState] = useState<RenderState>({
    isPlaying: false,
    currentTime: 0,
    totalDuration: 0,
    progress: 0,
  });
  const [exportState, setExportState] = useState<ExportState>({
    isExporting: false,
    progress: 0,
    downloadUrl: null,
  });

  const selectedSubtitle = subtitles.find(s => s.id === selectedSubtitleId) || null;

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: SavedState & { effectConfig?: EffectConfig & { animationDuration?: number } } = JSON.parse(saved);
        if (parsed.subtitles && parsed.subtitles.length > 0) {
          setSubtitles(parsed.subtitles);
          setSelectedSubtitleId(parsed.subtitles[0]?.id || null);
        }
        if (parsed.effectConfig) {
          const config = parsed.effectConfig;
          const migratedConfig: EffectConfig = {
            inAnimationDuration: config.inAnimationDuration ?? config.animationDuration ?? 1,
            outAnimationDuration: config.outAnimationDuration ?? config.animationDuration ?? 1,
          };
          setEffectConfig(migratedConfig);
        }
      } catch (e) {
        console.error('Failed to load saved state:', e);
      }
    }
  }, []);

  useEffect(() => {
    const state: SavedState = { subtitles, effectConfig };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [subtitles, effectConfig]);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
    }

    rendererRef.current = new SubtitleRenderer(canvas, effectConfig);
    rendererRef.current.setSubtitles(subtitles);
    rendererRef.current.seek(0);

    const handleResize = () => {
      if (!canvasRef.current || !rendererRef.current) return;
      const container = canvasRef.current.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        canvasRef.current.width = rect.width * window.devicePixelRatio;
        canvasRef.current.height = rect.height * window.devicePixelRatio;
        rendererRef.current.seek(renderState.currentTime);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current) {
        rendererRef.current.destroy();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setSubtitles(subtitles);
    }
  }, [subtitles]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.seek(0);
    }
  }, [effectConfig]);

  useEffect(() => {
    eventBus.on('export:progress', (progress) => {
      setExportState(prev => ({ ...prev, progress }));
    });

    eventBus.on('export:complete', (url) => {
      setExportState({
        isExporting: false,
        progress: 100,
        downloadUrl: url,
      });
    });

    eventBus.on('player:pause', () => {
      setRenderState(prev => ({ ...prev, isPlaying: false }));
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    });

    return () => {
      eventBus.clear();
    };
  }, []);

  const updateProgress = useCallback(() => {
    if (!rendererRef.current) return;
    
    const state = rendererRef.current.getRenderState();
    setRenderState(state);
    
    if (state.isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateProgress);
    }
  }, []);

  const handlePreview = useCallback(() => {
    if (!rendererRef.current || subtitles.length === 0) return;
    
    if (exportState.downloadUrl) {
      URL.revokeObjectURL(exportState.downloadUrl);
      setExportState({ isExporting: false, progress: 0, downloadUrl: null });
    }
    
    rendererRef.current.setSubtitles(subtitles);
    rendererRef.current.start();
    setRenderState(prev => ({ ...prev, isPlaying: true }));
    eventBus.emit('player:play', undefined);
    animationFrameRef.current = requestAnimationFrame(updateProgress);
  }, [subtitles, exportState.downloadUrl, updateProgress]);

  const handlePause = useCallback(() => {
    if (!rendererRef.current) return;
    
    rendererRef.current.pause();
    setRenderState(prev => ({ ...prev, isPlaying: false }));
    eventBus.emit('player:pause', undefined);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!rendererRef.current || exportState.isExporting) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const totalDuration = rendererRef.current.getTotalDuration();
    const seekTime = percentage * totalDuration;
    
    rendererRef.current.seek(seekTime);
    setRenderState(prev => ({
      ...prev,
      currentTime: seekTime,
      progress: percentage,
    }));
    eventBus.emit('player:seek', seekTime);
  }, [exportState.isExporting]);

  const handleExport = useCallback(async () => {
    if (!rendererRef.current || subtitles.length === 0 || exportState.isExporting) return;
    
    if (exportState.downloadUrl) {
      URL.revokeObjectURL(exportState.downloadUrl);
    }
    
    setExportState({ isExporting: true, progress: 0, downloadUrl: null });
    eventBus.emit('export:start', undefined);
    
    rendererRef.current.setSubtitles(subtitles);
    
    try {
      const url = await rendererRef.current.startExport();
      setExportState({
        isExporting: false,
        progress: 100,
        downloadUrl: url,
      });
    } catch (error) {
      console.error('Export failed:', error);
      setExportState({
        isExporting: false,
        progress: 0,
        downloadUrl: null,
      });
    }
  }, [subtitles, exportState.isExporting, exportState.downloadUrl]);

  const handleSubtitlesChange = useCallback((newSubtitles: Subtitle[]) => {
    setSubtitles(newSubtitles);
    if (rendererRef.current) {
      rendererRef.current.setSubtitles(newSubtitles);
    }
  }, []);

  const handleSelectedSubtitleChange = useCallback((updated: Subtitle) => {
    setSubtitles(prev => prev.map(s => s.id === updated.id ? updated : s));
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  return (
    <div className="app">
      <div className="left-panel">
        <div className="panel-header">
          <h1>🎬 字幕特效工坊</h1>
          <p>创建电影级字幕特效，一键导出视频</p>
        </div>
        
        <div className="panel-content">
          <SubtitleEditor
            subtitles={subtitles}
            onSubtitlesChange={handleSubtitlesChange}
            selectedSubtitleId={selectedSubtitleId}
            onSelectSubtitle={setSelectedSubtitleId}
            currentPlayTime={renderState.currentTime}
          />
          
          <EffectPanel
            effectConfig={effectConfig}
            onEffectConfigChange={setEffectConfig}
            selectedSubtitle={selectedSubtitle}
            onSelectedSubtitleChange={handleSelectedSubtitleChange}
            isPlaying={renderState.isPlaying}
            onPreview={handlePreview}
            onPause={handlePause}
          />
        </div>
      </div>
      
      <div className="right-panel">
        <div className="preview-container">
          <div className="canvas-container">
            <canvas ref={canvasRef} />
          </div>
          
          <div className="progress-bar-container" onClick={handleSeek}>
            <div
              className="progress-bar"
              style={{ width: `${renderState.progress * 100}%` }}
            />
          </div>
          
          <div className="controls-row">
            <button
              className="play-btn"
              onClick={renderState.isPlaying ? handlePause : handlePreview}
              disabled={subtitles.length === 0 || exportState.isExporting}
              title={renderState.isPlaying ? '暂停' : '播放'}
            >
              {renderState.isPlaying ? '⏸' : '▶'}
            </button>
            <span className="time-display">
              {formatTime(renderState.currentTime)} / {formatTime(renderState.totalDuration)}
            </span>
          </div>
        </div>
        
        <div className="export-container">
          <button
            className="btn btn-primary btn-large"
            onClick={handleExport}
            disabled={subtitles.length === 0 || exportState.isExporting}
          >
            {exportState.isExporting ? (
              <>
                <span className="spinner" />
                导出中 {exportState.progress}%
              </>
            ) : (
              <>📥 导出 WebM 视频</>
            )}
          </button>
          
          {exportState.downloadUrl && !exportState.isExporting && (
            <a
              className="download-link"
              href={exportState.downloadUrl}
              download="subtitle-effects.webm"
            >
              ⬇ 点击下载视频
            </a>
          )}
        </div>
      </div>
    </div>
  );
};
