import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AudioAnalyzer } from './analyzer';
import { VisualizerRenderer, type VisualizerMode, type RenderParams } from './renderer';
import { Controls } from './Controls';
import styles from './App.module.css';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyzerRef = useRef<AudioAnalyzer | null>(null);
  const rendererRef = useRef<VisualizerRenderer | null>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [mode, setMode] = useState<VisualizerMode>('wave');
  const [params, setParams] = useState<RenderParams>({
    colorSensitivity: 50,
    particleDensity: 50,
    waveThickness: 50,
  });
  const [isRecordingScreen, setIsRecordingScreen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;

    const analyzer = new AudioAnalyzer();
    const renderer = new VisualizerRenderer();

    renderer.setCanvas(canvasRef.current);
    renderer.setMode(mode);
    renderer.setParams(params);

    analyzerRef.current = analyzer;
    rendererRef.current = renderer;

    const handleResize = () => {
      if (!canvasRef.current || !rendererRef.current) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvasRef.current.getBoundingClientRect();
      rendererRef.current.resize(rect.width, rect.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    setIsInitialized(true);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
      analyzer.destroy();
    };
  }, []);

  useEffect(() => {
    if (!rendererRef.current || !isInitialized) return;

    const animate = (currentTime: number) => {
      const deltaTime = lastTimeRef.current ? currentTime - lastTimeRef.current : 16;
      lastTimeRef.current = currentTime;

      if (analyzerRef.current && rendererRef.current) {
        const waveform = analyzerRef.current.getWaveform();
        const frequency = analyzerRef.current.getFrequency();
        rendererRef.current.renderFrame(waveform, frequency, deltaTime);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isInitialized]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setMode(mode);
    }
  }, [mode]);

  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setParams(params);
    }
  }, [params]);

  const handleToggleRecording = useCallback(async () => {
    if (!analyzerRef.current) return;

    if (isRecording) {
      analyzerRef.current.stop();
      setIsRecording(false);
    } else {
      try {
        if (!analyzerRef.current.isInitialized) {
          await analyzerRef.current.init();
        }
        analyzerRef.current.start();
        setIsRecording(true);
        setError(null);
      } catch (err) {
        console.error('Failed to start recording:', err);
        setError('无法访问麦克风，请检查权限设置');
        setTimeout(() => setError(null), 3000);
      }
    }
  }, [isRecording]);

  const handleModeChange = useCallback((newMode: VisualizerMode) => {
    setMode(newMode);
  }, []);

  const handleParamsChange = useCallback((newParams: Partial<RenderParams>) => {
    setParams(prev => ({ ...prev, ...newParams }));
  }, []);

  const handleScreenshot = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = new Date();
    const timestamp = now.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    tempCtx.drawImage(canvas, 0, 0);

    tempCtx.font = '16px JetBrains Mono, monospace';
    tempCtx.fillStyle = 'rgba(0, 255, 157, 0.8)';
    tempCtx.textAlign = 'right';
    tempCtx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    tempCtx.shadowBlur = 4;
    tempCtx.fillText(timestamp, canvas.width / (window.devicePixelRatio || 1) - 20, canvas.height / (window.devicePixelRatio || 1) - 20);

    const link = document.createElement('a');
    link.download = `声纹可视化_${now.getTime()}.png`;
    link.href = tempCanvas.toDataURL('image/png');
    link.click();
  }, []);

  const handleRecordScreen = useCallback(() => {
    if (!canvasRef.current) return;

    if (isRecordingScreen) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      setIsRecordingScreen(false);
      return;
    }

    try {
      const stream = canvasRef.current.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      recordedChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `声纹可视化_${Date.now()}.webm`;
        link.click();
        URL.revokeObjectURL(url);
        recordedChunksRef.current = [];
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecordingScreen(true);

      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
          mediaRecorderRef.current.stop();
          setIsRecordingScreen(false);
        }
      }, 10000);
    } catch (err) {
      console.error('Failed to start screen recording:', err);
      setError('录屏功能不可用');
      setTimeout(() => setError(null), 3000);
    }
  }, [isRecordingScreen]);

  return (
    <div className={styles.app}>
      <canvas ref={canvasRef} className={styles.canvas} />

      {!isRecording && (
        <div className={styles.welcome}>
          <h1 className={styles.welcomeTitle}>声纹可视化器</h1>
          <p className={styles.welcomeSubtitle}>VOICE VISUALIZER</p>
          <p className={styles.welcomeHint}>点击右侧按钮开始录制</p>
        </div>
      )}

      {error && <div className={styles.error}>{error}</div>}

      <Controls
        isRecording={isRecording}
        mode={mode}
        params={params}
        isRecordingScreen={isRecordingScreen}
        onToggleRecording={handleToggleRecording}
        onModeChange={handleModeChange}
        onParamsChange={handleParamsChange}
        onScreenshot={handleScreenshot}
        onRecordScreen={handleRecordScreen}
      />

      <div className={styles.footer}>
        © 2024 Voice Visualizer • Cyberpunk Edition
      </div>
    </div>
  );
};

export default App;
