import React, { useState, useRef, useEffect, useCallback } from 'react';
import { AudioAnalyzer, BPMResult, BeatInfo } from './audio/AudioAnalyzer';
import { SceneManager } from './renderer/SceneManager';
import { ControlPanel, ControlPanelParams } from './components/ControlPanel';
import { PlayerControls } from './components/PlayerControls';

const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const audioAnalyzerRef = useRef<AudioAnalyzer | null>(null);
  const audioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const startTimeRef = useRef<number>(0);
  const pauseTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const beatIndexRef = useRef<number>(0);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bpm, setBpm] = useState<number | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [beatIntensity, setBeatIntensity] = useState(0);
  const [beats, setBeats] = useState<BeatInfo[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [controlParams, setControlParams] = useState<ControlPanelParams>({
    particleCount: 2000,
    intensity: 1.0,
    sizeMin: 0.5,
    sizeMax: 2.5,
    bgColor: '#0a0a1a',
    speed: 1.0,
  });

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const sceneManager = new SceneManager(canvasContainerRef.current, {
      count: controlParams.particleCount,
      intensity: controlParams.intensity,
      sizeMin: controlParams.sizeMin,
      sizeMax: controlParams.sizeMax,
      bgColor: controlParams.bgColor,
      speed: controlParams.speed,
    });

    sceneManagerRef.current = sceneManager;

    return () => {
      sceneManager.dispose();
      sceneManagerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (sceneManagerRef.current) {
      sceneManagerRef.current.setParams({
        count: controlParams.particleCount,
        intensity: controlParams.intensity,
        sizeMin: controlParams.sizeMin,
        sizeMax: controlParams.sizeMax,
        bgColor: controlParams.bgColor,
        speed: controlParams.speed,
      });
    }
  }, [controlParams]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 800 && !panelCollapsed) {
        setPanelCollapsed(true);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [panelCollapsed]);

  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 10 * 1024 * 1024) {
        setError('文件大小不能超过 10MB');
        return;
      }

      const validTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3'];
      const validExtensions = ['.mp3', '.wav'];
      const fileExt = file.name.toLowerCase().slice(-4);
      if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
        setError('仅支持 MP3 和 WAV 格式');
        return;
      }

      setError(null);
      setFileName(file.name);
      setIsAnalyzing(true);
      setAnalysisProgress(0);
      setBpm(null);
      setBeats([]);
      setCurrentTime(0);
      setDuration(0);
      setIsPlaying(false);

      if (audioSourceRef.current) {
        audioSourceRef.current.stop();
        audioSourceRef.current = null;
      }

      if (audioAnalyzerRef.current) {
        audioAnalyzerRef.current.dispose();
      }

      try {
        const arrayBuffer = await file.arrayBuffer();

        const analyzer = new AudioAnalyzer({
          onProgress: (percent) => {
            setAnalysisProgress(percent);
          },
          onComplete: (result: BPMResult) => {
            setBpm(result.bpm);
            setBeats(result.beats);
            setDuration(result.duration);
            setIsAnalyzing(false);
          },
          onError: (err: Error) => {
            setError(err.message || '音频分析失败');
            setIsAnalyzing(false);
          },
        });

        audioAnalyzerRef.current = analyzer;
        await analyzer.analyze(arrayBuffer);
      } catch (err) {
        setError(err instanceof Error ? err.message : '文件读取失败');
        setIsAnalyzing(false);
      }
    },
    []
  );

  const startPlayback = useCallback(() => {
    if (!audioAnalyzerRef.current) return;

    const audioBuffer = audioAnalyzerRef.current.getAudioBuffer();
    const audioCtx = audioAnalyzerRef.current.getAudioContext();

    if (!audioBuffer || !audioCtx) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const source = audioCtx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioCtx.destination);

    const offset = pauseTimeRef.current;
    source.start(0, offset);
    startTimeRef.current = audioCtx.currentTime - offset;

    source.onended = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      pauseTimeRef.current = 0;
      beatIndexRef.current = 0;
    };

    audioSourceRef.current = source;
    audioContextRef.current = audioCtx;
    beatIndexRef.current = 0;

    setIsPlaying(true);
    updatePlayback();
  }, []);

  const updatePlayback = useCallback(() => {
    if (!audioContextRef.current || !audioSourceRef.current) return;

    const audioCtx = audioContextRef.current;
    const elapsed = audioCtx.currentTime - startTimeRef.current;

    setCurrentTime(elapsed);

    while (
      beatIndexRef.current < beats.length &&
      beats[beatIndexRef.current].time <= elapsed
    ) {
      const beat = beats[beatIndexRef.current];
      if (sceneManagerRef.current) {
        sceneManagerRef.current.triggerBeat(beat.intensity);
      }
      setBeatIntensity(beat.intensity);
      beatIndexRef.current++;
    }

    setBeatIntensity((prev) => Math.max(0, prev - 0.02));

    animationFrameRef.current = requestAnimationFrame(updatePlayback);
  }, [beats]);

  const stopPlayback = useCallback(() => {
    if (audioSourceRef.current) {
      audioSourceRef.current.stop();
      audioSourceRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      pauseTimeRef.current =
        audioContextRef.current.currentTime - startTimeRef.current;
    }

    setIsPlaying(false);
  }, []);

  const handlePlayPause = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, startPlayback, stopPlayback]);

  const handleReset = useCallback(() => {
    stopPlayback();
    pauseTimeRef.current = 0;
    beatIndexRef.current = 0;
    setCurrentTime(0);
    setBeatIntensity(0);
  }, [stopPlayback]);

  const handleSeek = useCallback(
    (time: number) => {
      const wasPlaying = isPlaying;
      if (wasPlaying) {
        stopPlayback();
      }

      pauseTimeRef.current = time;
      setCurrentTime(time);

      beatIndexRef.current = 0;
      for (let i = 0; i < beats.length; i++) {
        if (beats[i].time >= time) {
          beatIndexRef.current = i;
          break;
        }
      }

      if (wasPlaying) {
        startPlayback();
      }
    },
    [beats, isPlaying, startPlayback, stopPlayback]
  );

  const handleParamsChange = useCallback((params: Partial<ControlPanelParams>) => {
    setControlParams((prev) => ({ ...prev, ...params }));
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const input = document.createElement('input');
    input.type = 'file';
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    input.files = dataTransfer.files;

    const event = { target: input } as React.ChangeEvent<HTMLInputElement>;
    await handleFileUpload(event);
  };

  const progressPercent = Math.round(analysisProgress * 100);
  const bpmDisplay = bpm !== null ? bpm.toFixed(2) : '--';
  const hasAudio = beats.length > 0 && duration > 0;

  return (
    <div className="app">
      <div
        ref={canvasContainerRef}
        className="canvas-container"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />

      <div className="bpm-display">
        <div className="bpm-ring-container">
          <svg className="bpm-ring" viewBox="0 0 100 100">
            <circle
              className="bpm-ring-bg"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="4"
            />
            <circle
              className="bpm-ring-progress"
              cx="50"
              cy="50"
              r="45"
              fill="none"
              strokeWidth="4"
              strokeDasharray={`${beatIntensity * 283} 283`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <div className="bpm-value">
            <span className="bpm-number">{bpmDisplay}</span>
            <span className="bpm-unit">BPM</span>
          </div>
        </div>
        {fileName && (
          <div className="file-name" title={fileName}>
            {fileName}
          </div>
        )}
      </div>

      {!hasAudio && !isAnalyzing && (
        <div className="upload-overlay">
          <div className="upload-card">
            <div className="upload-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <h2 className="upload-title">上传音频文件</h2>
            <p className="upload-desc">支持 MP3 和 WAV 格式，不超过 10MB</p>
            <label className="upload-btn">
              选择文件
              <input
                type="file"
                accept=".mp3,.wav,audio/mpeg,audio/wav"
                onChange={handleFileUpload}
                hidden
              />
            </label>
          </div>
        </div>
      )}

      {isAnalyzing && (
        <div className="upload-overlay">
          <div className="upload-card analyzing">
            <div className="analyzing-icon">
              <svg className="spinner" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="32" />
              </svg>
            </div>
            <h2 className="upload-title">正在分析音频...</h2>
            <div className="progress-bar-container">
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="progress-text">{progressPercent}%</span>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="error-toast">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
        </div>
      )}

      <ControlPanel
        params={controlParams}
        isCollapsed={panelCollapsed}
        onParamsChange={handleParamsChange}
        onToggleCollapse={() => setPanelCollapsed(!panelCollapsed)}
      />

      <PlayerControls
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={handlePlayPause}
        onReset={handleReset}
        onSeek={handleSeek}
        disabled={!hasAudio}
      />
    </div>
  );
};

export default App;
