import React, { useEffect, useRef, useState, useCallback } from 'react';
import { DrumRenderer } from './renderer';
import { GestureEngine } from './gestureEngine';
import { AudioEngine } from './audioEngine';
import { useAppStore } from './store';
import { HitRecord } from './types';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gestureEngineRef = useRef<GestureEngine | null>(null);
  const audioEngineRef = useRef<AudioEngine | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraPermission, setCameraPermission] = useState<
    'idle' | 'requesting' | 'granted' | 'denied' | 'error'
  >('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const { hitRecords, clearOldHitRecords, cameraError, setCameraError, gestureState } = useAppStore();

  const initCamera = useCallback(async () => {
    setCameraPermission('requesting');
    setErrorMessage('');
    setCameraError(null);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('您的浏览器不支持摄像头功能');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraPermission('granted');

      if (!audioEngineRef.current) {
        audioEngineRef.current = new AudioEngine();
        await audioEngineRef.current.init();
      }

      if (!gestureEngineRef.current && videoRef.current) {
        gestureEngineRef.current = new GestureEngine({
          videoElement: videoRef.current,
          onError: (error) => {
            console.error('Gesture engine error:', error);
          },
        });
        await gestureEngineRef.current.init();
        await gestureEngineRef.current.start();
      }
    } catch (error) {
      console.error('Camera initialization error:', error);
      const message =
        error instanceof Error
          ? error.message
          : '无法访问摄像头，请确保已授予摄像头权限';
      setErrorMessage(message);
      setCameraPermission('denied');
      setCameraError(message);
    }
  }, [setCameraError]);

  useEffect(() => {
    initCamera();

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (gestureEngineRef.current) {
        gestureEngineRef.current.destroy();
        gestureEngineRef.current = null;
      }
      if (audioEngineRef.current) {
        audioEngineRef.current.destroy();
        audioEngineRef.current = null;
      }
    };
  }, [initCamera]);

  useEffect(() => {
    if (cameraPermission !== 'granted') return;

    const previewCanvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
    if (!previewCanvas) return;

    const ctx = previewCanvas.getContext('2d');
    if (ctx) {
      previewCanvas.width = 160;
      previewCanvas.height = 120;
    }

    let animationId: number;

    const drawPreview = () => {
      if (videoRef.current && ctx && previewCanvas) {
        ctx.drawImage(
          videoRef.current,
          0,
          0,
          previewCanvas.width,
          previewCanvas.height
        );
      }
      animationId = requestAnimationFrame(drawPreview);
    };

    drawPreview();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [cameraPermission]);

  const handleRetry = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraPermission('idle');
    setErrorMessage('');
    setCameraError(null);
    setTimeout(() => initCamera(), 100);
  }, [initCamera, setCameraError]);

  const handleToggleMute = useCallback(() => {
    if (audioEngineRef.current) {
      audioEngineRef.current.toggleMute();
    }
  }, []);

  const handleResetGesture = useCallback(() => {
    // 重置操作已在 renderer 中通过 gestureEngineRef 处理
  }, []);

  const handleExport = useCallback(() => {
    clearOldHitRecords();
    const currentRecords: HitRecord[] = [...hitRecords];
    const thirtySecondsAgo = Date.now() - 30000;
    const recentRecords = currentRecords.filter((r) => r.timestamp > thirtySecondsAgo);

    if (recentRecords.length === 0) {
      alert('最近30秒内没有敲击记录可导出');
      return;
    }

    const baseTime = recentRecords[0].timestamp;
    const content = recentRecords
      .map((record) => {
        const relativeTime = record.timestamp - baseTime;
        return `${record.drumName} ${relativeTime} ${record.velocity}`;
      })
      .join('\n');

    const header = `# 虚拟架子鼓演奏记录\n# 导出时间: ${new Date().toLocaleString()}\n# 记录数: ${recentRecords.length}\n# 格式: [鼓区名称] [时间戳(ms)] [力度]\n\n`;

    const blob = new Blob([header + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `drum_performance_${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [hitRecords, clearOldHitRecords]);

  if (cameraPermission === 'denied' || cameraError) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #12162C 0%, #1E2240 100%)',
        }}
      >
        <div
          style={{
            maxWidth: '500px',
            padding: '40px',
            background: 'rgba(244, 67, 54, 0.1)',
            border: '2px solid #F44336',
            borderRadius: '16px',
            textAlign: 'center',
            boxShadow: '0 8px 32px rgba(244, 67, 54, 0.3)',
          }}
        >
          <div
            style={{
              fontSize: '64px',
              marginBottom: '20px',
            }}
          >
            📷
          </div>
          <h2
            style={{
              color: '#F44336',
              margin: '0 0 16px 0',
              fontSize: '24px',
            }}
          >
            摄像头访问被拒绝
          </h2>
          <p
            style={{
              color: '#E0E0E0',
              margin: '0 0 24px 0',
              fontSize: '14px',
              lineHeight: '1.6',
            }}
          >
            {errorMessage ||
              '无法访问摄像头。请确保您的设备已连接摄像头，并且已在浏览器中授予摄像头权限。'}
          </p>
          <button
            onClick={handleRetry}
            style={{
              padding: '12px 32px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: '#FFFFFF',
              background: '#F44336',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLButtonElement).style.filter = 'brightness(1.1)';
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLButtonElement).style.filter = 'brightness(1)';
            }}
            onMouseDown={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              (e.target as HTMLButtonElement).style.transform = 'scale(1)';
            }}
          >
            🔄 重试
          </button>
        </div>
      </div>
    );
  }

  if (cameraPermission === 'requesting') {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(180deg, #12162C 0%, #1E2240 100%)',
          gap: '24px',
        }}
      >
        <div
          style={{
            width: '60px',
            height: '60px',
            border: '4px solid rgba(100, 180, 255, 0.2)',
            borderTopColor: '#64B4FF',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p
          style={{
            color: '#E0E0E0',
            fontSize: '18px',
            margin: 0,
          }}
        >
          {gestureState.isInitializing ? '正在加载手势检测模型...' : '正在请求摄像头权限...'}
        </p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <video
        ref={videoRef}
        style={{ display: 'none' }}
        playsInline
        muted
      />

      <div
        style={{
          position: 'absolute',
          left: '20px',
          bottom: '100px',
          width: '160px',
          height: '120px',
          borderRadius: '8px',
          overflow: 'hidden',
          border: '2px solid rgba(100, 180, 255, 0.5)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
          zIndex: 100,
          background: '#000',
        }}
      >
        <canvas
          id="preview-canvas"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            transform: 'scaleX(-1)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: '4px',
            padding: '2px 6px',
            background: 'rgba(244, 67, 54, 0.8)',
            color: 'white',
            fontSize: '10px',
            borderRadius: '4px',
            fontWeight: 'bold',
          }}
        >
          ● LIVE
        </div>
      </div>

      <DrumRenderer
        onExport={handleExport}
        onResetGesture={handleResetGesture}
        onToggleMute={handleToggleMute}
        gestureEngineRef={gestureEngineRef}
      />
    </div>
  );
};

export default App;
