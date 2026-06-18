import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { VideoGrid } from './components/VideoGrid';
import { VideoCard } from './components/VideoCard';
import { ControlPanel } from './components/ControlPanel';
import {
  useWebRTCStore,
  DrawingBox,
  Participant,
  VirtualBackground,
} from './store/webrtcStore';
import { WebRTCService } from './services/webrtcService';
import { videoProcessor } from './services/videoProcessor';

const MAX_FLOATING_THUMBNAILS = 2;
const MIN_WIDTH = 1280;

function App() {
  const {
    isConnected,
    roomName,
    nickname,
    localStream,
    processedLocalStream,
    remoteStreams,
    screenStream,
    isScreenSharing,
    virtualBackground,
    blurIntensity,
    isBlurEnabled,
    drawingBoxes,
    setRoomName,
    setNickname,
    setLocalStream,
    setProcessedLocalStream,
    addRemoteStream,
    removeRemoteStream,
    setScreenStream,
    setIsScreenSharing,
    setVirtualBackground,
    addDrawingBox,
    clearDrawingBoxes,
    leaveRoom,
    setIsConnected,
  } = useWebRTCStore();

  const [formRoom, setFormRoom] = useState('');
  const [formNickname, setFormNickname] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState('');
  const [showMobilePanel, setShowMobilePanel] = useState(false);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : MIN_WIDTH);

  const screenContainerRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const drawStartRef = useRef<{ x: number; y: number } | null>(null);
  const thumbnailsRef = useRef<Array<{ id: string; x: number; y: number }>>([]);
  const floatingOffsetRef = useRef(0);

  const webrtcServiceRef = useRef<WebRTCService | null>(null);

  const isFormValid = useMemo(() => {
    return formRoom.length >= 3 && formRoom.length <= 20 && formNickname.length >= 1 && formNickname.length <= 10;
  }, [formRoom, formNickname]);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleRemoteStream = useCallback((participant: Participant) => {
    addRemoteStream(participant);
  }, [addRemoteStream]);

  const handleRemoteStreamRemoved = useCallback((id: string) => {
    removeRemoteStream(id);
  }, [removeRemoteStream]);

  const handleConnected = useCallback(() => {
    setIsConnected(true);
  }, [setIsConnected]);

  const handleDisconnected = useCallback(() => {
    setIsConnected(false);
  }, [setIsConnected]);

  const handleDrawingBox = useCallback((box: DrawingBox) => {
    addDrawingBox(box);
  }, [addDrawingBox]);

  useEffect(() => {
    if (!webrtcServiceRef.current) {
      webrtcServiceRef.current = new WebRTCService({
        onRemoteStream: handleRemoteStream,
        onRemoteStreamRemoved: handleRemoteStreamRemoved,
        onConnected: handleConnected,
        onDisconnected: handleDisconnected,
        onDrawingBox: handleDrawingBox,
      });
    }
  }, [handleRemoteStream, handleRemoteStreamRemoved, handleConnected, handleDisconnected, handleDrawingBox]);

  const applyVirtualBackground = useCallback(
    async (stream: MediaStream, bg: VirtualBackground) => {
      try {
        let config;
        if (bg.type === 'blur' || isBlurEnabled) {
          config = { mode: 'blur' as const, blurIntensity: bg.blurIntensity || blurIntensity };
        } else if ((bg.type === 'preset' || bg.type === 'custom') && bg.imageUrl) {
          if (bg.imageUrl.startsWith('linear-gradient')) {
            const gradientCanvas = document.createElement('canvas');
            gradientCanvas.width = 1280;
            gradientCanvas.height = 720;
            const ctx = gradientCanvas.getContext('2d');
            if (ctx) {
              const gradient = ctx.createLinearGradient(0, 0, 0, 720);
              if (bg.presetKey === 'beach') {
                gradient.addColorStop(0, '#0077b6');
                gradient.addColorStop(0.4, '#00b4d8');
                gradient.addColorStop(1, '#caf0f8');
              } else if (bg.presetKey === 'office') {
                gradient.addColorStop(0, '#495057');
                gradient.addColorStop(0.5, '#6c757d');
                gradient.addColorStop(1, '#adb5bd');
              } else if (bg.presetKey === 'stars') {
                const g = ctx.createLinearGradient(0, 0, 1280, 720);
                g.addColorStop(0, '#03071e');
                g.addColorStop(0.5, '#14213d');
                g.addColorStop(1, '#3a0ca3');
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, 1280, 720);
                for (let i = 0; i < 150; i++) {
                  ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.8 + 0.2})`;
                  ctx.beginPath();
                  ctx.arc(Math.random() * 1280, Math.random() * 720, Math.random() * 1.5, 0, Math.PI * 2);
                  ctx.fill();
                }
                const dataUrl = gradientCanvas.toDataURL();
                config = { mode: 'image' as const, imageUrl: dataUrl };
                const processed = await videoProcessor.startProcessing(stream, config);
                setProcessedLocalStream(processed);
                return;
              } else if (bg.presetKey === 'blur') {
                const g = ctx.createLinearGradient(0, 0, 1280, 720);
                g.addColorStop(0, '#667eea');
                g.addColorStop(1, '#764ba2');
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(1, '#764ba2');
              }
              ctx.fillStyle = gradient;
              ctx.fillRect(0, 0, 1280, 720);
              const dataUrl = gradientCanvas.toDataURL();
              config = { mode: 'image' as const, imageUrl: dataUrl };
            } else {
              config = { mode: 'none' as const };
            }
          } else {
            config = { mode: 'image' as const, imageUrl: bg.imageUrl };
          }
        } else {
          config = { mode: 'none' as const };
        }

        if (config.mode === 'none' && !videoProcessor.isProcessing()) {
          setProcessedLocalStream(stream);
          return;
        }

        if (videoProcessor.isProcessing()) {
          if (config.mode === 'blur') {
            videoProcessor.setBlurIntensity(config.blurIntensity || 5);
          } else if (config.mode === 'image' && config.imageUrl) {
            await videoProcessor.setBackgroundImage(config.imageUrl);
          } else if (config.mode === 'none') {
            videoProcessor.clearBackground();
            setProcessedLocalStream(stream);
          }
        } else {
          const processed = await videoProcessor.startProcessing(stream, config);
          setProcessedLocalStream(processed);
        }
      } catch (err) {
        console.error('Error applying virtual background:', err);
        setProcessedLocalStream(stream);
      }
    },
    [blurIntensity, isBlurEnabled, setProcessedLocalStream]
  );

  useEffect(() => {
    if (localStream) {
      applyVirtualBackground(localStream, virtualBackground);
    }
  }, [localStream, virtualBackground, applyVirtualBackground]);

  const handleJoinRoom = async () => {
    if (!isFormValid) return;
    setIsJoining(true);
    setJoinError('');

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      setRoomName(formRoom);
      setNickname(formNickname);
      setLocalStream(mediaStream);

      if (webrtcServiceRef.current) {
        await webrtcServiceRef.current.connectToRoom(formRoom, formNickname, mediaStream);
      }
    } catch (err) {
      console.error('Failed to join room:', err);
      setJoinError(err instanceof Error ? err.message : '加入会议失败，请检查摄像头/麦克风权限');
      setLocalStream(null);
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveRoom = () => {
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.disconnect();
    }
    videoProcessor.stopProcessing();
    leaveRoom();
    setFormRoom('');
    setFormNickname('');
  };

  const handleToggleShareScreen = async () => {
    if (isScreenSharing) {
      if (screenStream) {
        screenStream.getTracks().forEach((t) => t.stop());
      }
      setScreenStream(null);
      setIsScreenSharing(false);
      if (webrtcServiceRef.current) {
        await webrtcServiceRef.current.toggleScreenShare(null);
      }
      clearDrawingBoxes();
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: { ideal: 30, max: 60 } },
        audio: false,
      });

      setScreenStream(mediaStream);
      setIsScreenSharing(true);

      mediaStream.getVideoTracks()[0].addEventListener('ended', async () => {
        setScreenStream(null);
        setIsScreenSharing(false);
        clearDrawingBoxes();
        if (webrtcServiceRef.current) {
          await webrtcServiceRef.current.toggleScreenShare(null);
        }
      });

      if (webrtcServiceRef.current) {
        await webrtcServiceRef.current.toggleScreenShare(mediaStream);
      }
    } catch (err) {
      console.error('Failed to start screen share:', err);
    }
  };

  useWebRTCStore.setState({
    joinRoom: handleJoinRoom,
    leaveRoom: handleLeaveRoom,
    toggleShareScreen: handleToggleShareScreen,
  });

  const getDrawCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isScreenSharing) return;
    const coords = getDrawCoords(e);
    if (!coords) return;
    isDrawingRef.current = true;
    drawStartRef.current = coords;
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !drawStartRef.current) return;
    const coords = getDrawCoords(e);
    if (!coords) return;

    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawingBoxes.forEach((box) => {
      ctx.strokeStyle = 'rgba(239, 68, 68, 1)';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    });

    const x = Math.min(drawStartRef.current.x, coords.x);
    const y = Math.min(drawStartRef.current.y, coords.y);
    const width = Math.abs(coords.x - drawStartRef.current.x);
    const height = Math.abs(coords.y - drawStartRef.current.y);

    ctx.strokeStyle = 'rgba(239, 68, 68, 1)';
    ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
    ctx.fillRect(x, y, width, height);
    ctx.strokeRect(x, y, width, height);
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !drawStartRef.current) return;
    const coords = getDrawCoords(e);
    if (!coords) return;

    isDrawingRef.current = false;
    const x = Math.min(drawStartRef.current.x, coords.x);
    const y = Math.min(drawStartRef.current.y, coords.y);
    const width = Math.abs(coords.x - drawStartRef.current.x);
    const height = Math.abs(coords.y - drawStartRef.current.y);

    if (width > 5 && height > 5) {
      const box: DrawingBox = {
        id: Math.random().toString(36).slice(2),
        x,
        y,
        width,
        height,
      };
      addDrawingBox(box);
      webrtcServiceRef.current?.sendDrawingBox(box);
    }

    drawStartRef.current = null;

    const canvas = drawingCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawingBoxes.forEach((box) => {
        ctx.strokeStyle = 'rgba(239, 68, 68, 1)';
        ctx.lineWidth = 3;
        ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
        ctx.fillRect(box.x, box.y, box.width, box.height);
        ctx.strokeRect(box.x, box.y, box.width, box.height);
      });
    }
  };

  useEffect(() => {
    const canvas = drawingCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawingBoxes.forEach((box) => {
      ctx.strokeStyle = 'rgba(239, 68, 68, 1)';
      ctx.lineWidth = 3;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
      ctx.fillRect(box.x, box.y, box.width, box.height);
      ctx.strokeRect(box.x, box.y, box.width, box.height);
    });
  }, [drawingBoxes, isScreenSharing]);

  const visibleFloatingParticipants = useMemo(() => {
    const offset = floatingOffsetRef.current;
    const allParticipants: Participant[] = [];
    if (processedLocalStream) {
      allParticipants.push({ id: 'local', nickname: nickname || '我', stream: processedLocalStream });
    }
    remoteStreams.forEach((p) => allParticipants.push(p));

    const result: Participant[] = [];
    for (let i = 0; i < MAX_FLOATING_THUMBNAILS; i++) {
      const idx = (offset + i) % allParticipants.length;
      if (allParticipants[idx]) {
        result.push(allParticipants[idx]);
      }
    }
    return result;
  }, [remoteStreams, processedLocalStream, nickname]);

  const handleThumbnailPositionChange = (id: string, x: number, y: number) => {
    const existing = thumbnailsRef.current.find((t) => t.id === id);
    if (existing) {
      existing.x = x;
      existing.y = y;
    } else {
      thumbnailsRef.current.push({ id, x, y });
    }
  };

  useEffect(() => {
    if (!isConnected || !isScreenSharing) return;
    const interval = setInterval(() => {
      const total = remoteStreams.length + (processedLocalStream ? 1 : 0);
      if (total > MAX_FLOATING_THUMBNAILS) {
        floatingOffsetRef.current = (floatingOffsetRef.current + 1) % total;
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isConnected, isScreenSharing, remoteStreams.length, processedLocalStream]);

  useEffect(() => {
    return () => {
      videoProcessor.stopProcessing();
      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.disconnect();
      }
    };
  }, []);

  if (!isConnected) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(1.05); }
          }
        `}</style>
        <div
          style={{
            backgroundColor: '#1e293b',
            padding: '48px',
            borderRadius: '16px',
            width: '420px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          }}
        >
          <h1
            style={{
              color: '#ffffff',
              fontSize: '28px',
              fontWeight: 700,
              margin: 0,
              marginBottom: '8px',
              textAlign: 'center',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            实时视频会议
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', marginBottom: '32px' }}>
            虚拟背景 · 屏幕共享 · 实时协作
          </p>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
              房间名称 (3-20字符)
            </label>
            <input
              type="text"
              value={formRoom}
              onChange={(e) => setFormRoom(e.target.value)}
              placeholder="请输入房间名称"
              maxLength={20}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#334155')}
            />
            {formRoom.length > 0 && formRoom.length < 3 && (
              <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>房间名称至少3个字符</p>
            )}
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ color: '#cbd5e1', fontSize: '13px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
              昵称 (1-10字符)
            </label>
            <input
              type="text"
              value={formNickname}
              onChange={(e) => setFormNickname(e.target.value)}
              placeholder="请输入昵称"
              maxLength={10}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #334155',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.2s ease',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = '#6366f1')}
              onBlur={(e) => (e.currentTarget.style.borderColor = '#334155')}
            />
            {formNickname.length === 0 && (
              <p style={{ color: '#94a3b8', fontSize: '12px', marginTop: '4px' }}>请输入昵称</p>
            )}
          </div>

          {joinError && (
            <div
              style={{
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                color: '#ef4444',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              {joinError}
            </div>
          )}

          <button
            onClick={handleJoinRoom}
            disabled={!isFormValid || isJoining}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '10px',
              border: 'none',
              fontSize: '15px',
              fontWeight: 600,
              cursor: isFormValid && !isJoining ? 'pointer' : 'not-allowed',
              color: '#ffffff',
              background: isFormValid
                ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                : '#475569',
              opacity: isJoining ? 0.7 : 1,
              transition: 'all 0.2s ease',
              transform: isFormValid && !isJoining ? 'translateY(0)' : 'none',
            }}
            onMouseEnter={(e) => {
              if (isFormValid && !isJoining) {
                e.currentTarget.style.filter = 'brightness(1.15)';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {isJoining ? '正在加入...' : '加入会议'}
          </button>
        </div>
      </div>
    );
  }

  const showSidePanel = windowWidth >= MIN_WIDTH;

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        overflow: 'hidden',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <div
        style={{
          flex: showSidePanel ? '0 0 70%' : '1',
          backgroundColor: '#0f172a',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #1e293b',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {!showSidePanel && (
              <button
                onClick={() => setShowMobilePanel(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#e2e8f0',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                }}
              >
                ☰
              </button>
            )}
            <div>
              <div style={{ color: '#ffffff', fontSize: '15px', fontWeight: 600 }}>房间: {roomName}</div>
              <div style={{ color: '#94a3b8', fontSize: '12px' }}>参会者: {remoteStreams.length + 1} 人</div>
            </div>
          </div>

          <button
            onClick={handleLeaveRoom}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              color: '#ffffff',
              backgroundColor: '#ef4444',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.filter = 'brightness(1.15)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.filter = 'brightness(1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            离开会议
          </button>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }} ref={screenContainerRef}>
          {isScreenSharing && screenStream ? (
            <div style={{ width: '100%', height: '100%', position: 'relative' }}>
              <video
                srcObject={screenStream}
                autoPlay
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
              />
              <canvas
                ref={drawingCanvasRef}
                width={1920}
                height={1080}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  cursor: 'crosshair',
                  pointerEvents: 'auto',
                }}
              />

              {visibleFloatingParticipants.map((participant, idx) => {
                const saved = thumbnailsRef.current.find((t) => t.id === participant.id);
                const defaultX = window.innerWidth - (showSidePanel ? window.innerWidth * 0.3 : 0) - 200 - idx * 16;
                const defaultY = window.innerHeight - 140 - idx * 16;
                return (
                  <div
                    key={participant.id}
                    style={{
                      position: 'absolute',
                      width: '180px',
                      height: '120px',
                      left: saved?.x ?? defaultX,
                      top: saved?.y ?? defaultY,
                      zIndex: 100 - idx,
                      animation: 'fadeIn 0.3s ease',
                    }}
                  >
                    <VideoCard
                      stream={participant.stream}
                      nickname={participant.nickname}
                      isLocal={participant.id === 'local'}
                      isMirrored={participant.id === 'local'}
                      isDraggable
                      onPositionChange={(x, y) => handleThumbnailPositionChange(participant.id, x, y)}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <VideoGrid />
          )}
        </div>
      </div>

      {showSidePanel && (
        <div style={{ flex: '0 0 30%', minWidth: '320px', borderLeft: '1px solid #334155' }}>
          <ControlPanel />
        </div>
      )}

      {!showSidePanel && showMobilePanel && (
        <>
          <div
            onClick={() => setShowMobilePanel(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 998,
            }}
          />
          <div
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              width: '320px',
              zIndex: 999,
              boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.4)',
            }}
          >
            <div
              onClick={() => setShowMobilePanel(false)}
              style={{
                padding: '12px 16px',
                backgroundColor: '#1e293b',
                borderBottom: '1px solid #334155',
                color: '#e2e8f0',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              ✕ 关闭
            </div>
            <div style={{ height: 'calc(100% - 48px)' }}>
              <ControlPanel />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
