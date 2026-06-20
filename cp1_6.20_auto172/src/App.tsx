import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { processImage, type ProcessedImageData } from './imageProcessor';
import DrawingCanvas, { type DrawingCanvasHandle } from './drawingCanvas';
import AccuracyMeter from './accuracyMeter';
import type { RecordingData } from './recorder';

const BRUSH_SIZES = [1, 2, 4, 6];
const BRUSH_COLORS = [
  { name: '黑色', value: '#000000' },
  { name: '蓝色', value: '#3B82F6' },
  { name: '红色', value: '#EF4444' },
  { name: '绿色', value: '#10B981' },
  { name: '橙色', value: '#F59E0B' },
  { name: '紫色', value: '#8B5CF6' },
];

export default function App() {
  const [processedImage, setProcessedImage] = useState<ProcessedImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [brushSize, setBrushSize] = useState(2);
  const [brushColor, setBrushColor] = useState('#000000');
  const [currentTool, setCurrentTool] = useState<'brush' | 'eraser'>('brush');
  
  const [accuracy, setAccuracy] = useState(0);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedData, setRecordedData] = useState<RecordingData | null>(null);
  const [isPlaybackMode, setIsPlaybackMode] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<0.5 | 1 | 2>(1);
  const [playbackTime, setPlaybackTime] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  
  const canvasRef = useRef<DrawingCanvasHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setPanelCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (!isPlaybackMode || !canvasRef.current) return;
    
    const interval = setInterval(() => {
      if (canvasRef.current) {
        setPlaybackTime(canvasRef.current.getCurrentTime());
        setPlaybackDuration(canvasRef.current.getDuration());
        setIsPlaying(canvasRef.current.isPlaying());
      }
    }, 50);
    
    return () => clearInterval(interval);
  }, [isPlaybackMode]);

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setIsProcessing(true);
    setProcessingProgress(0);
    setRecordedData(null);
    setIsPlaybackMode(false);
    
    try {
      const result = await processImage(file, async (progress) => {
        setProcessingProgress(progress);
        await new Promise(r => setTimeout(r, 0));
      });
      setProcessedImage(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '处理图片时出错');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleStartRecording = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.clear();
      canvasRef.current.startRecording();
      setIsRecording(true);
      setRecordedData(null);
      setIsPlaybackMode(false);
    }
  }, []);

  const handleStopRecording = useCallback(() => {
    if (canvasRef.current) {
      const data = canvasRef.current.stopRecording();
      setIsRecording(false);
      if (data) {
        setRecordedData(data);
      }
    }
  }, []);

  const handlePlayRecording = useCallback(() => {
    if (canvasRef.current && recordedData) {
      setIsPlaybackMode(true);
      canvasRef.current.clear();
      canvasRef.current.setPlaybackSpeed(playbackSpeed);
      canvasRef.current.playRecording(recordedData);
    }
  }, [recordedData, playbackSpeed]);

  const handlePausePlayback = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.pausePlayback();
    }
  }, []);

  const handleResumePlayback = useCallback(() => {
    if (canvasRef.current && recordedData) {
      canvasRef.current.playRecording(recordedData);
    }
  }, [recordedData]);

  const handleStopPlayback = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.stopPlayback();
      setIsPlaybackMode(false);
    }
  }, []);

  const handleSpeedChange = useCallback((speed: 0.5 | 1 | 2) => {
    setPlaybackSpeed(speed);
    if (canvasRef.current) {
      canvasRef.current.setPlaybackSpeed(speed);
    }
  }, []);

  const handleSeek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setPlaybackTime(time);
    if (canvasRef.current) {
      canvasRef.current.seekPlayback(time);
    }
  }, []);

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const renderUploadArea = () => (
    <div
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F9FAFB',
        position: 'relative'
      }}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(255,255,255,0.9)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10
            }}
          >
            <div style={{ width: 200, marginBottom: 16 }}>
              <div style={{
                width: '100%',
                height: 8,
                backgroundColor: '#E5E7EB',
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: `${processingProgress}%` }}
                  transition={{ duration: 0.6, ease: 'easeInOut' }}
                  style={{
                    height: '100%',
                    backgroundColor: '#3B82F6',
                    borderRadius: 4
                  }}
                />
              </div>
            </div>
            <p style={{ color: '#6B7280', fontSize: 14, margin: 0 }}>
              正在处理图片... {Math.round(processingProgress)}%
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      
      <motion.div
        animate={{
          scale: isDragOver ? 1.02 : 1,
          borderColor: isDragOver ? '#3B82F6' : '#D1D5DB',
          backgroundColor: isDragOver ? '#EFF6FF' : 'transparent'
        }}
        transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 20 }}
        onClick={handleUploadClick}
        style={{
          width: 480,
          maxWidth: '90%',
          height: 320,
          border: '2px dashed #D1D5DB',
          borderRadius: 12,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.3s ease'
        }}
      >
        <div style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: '#EFF6FF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 20
        }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
        <h3 style={{ color: '#1F2937', fontSize: 18, fontWeight: 600, margin: '0 0 8px 0' }}>
          上传建筑照片
        </h3>
        <p style={{ color: '#6B7280', fontSize: 14, margin: '0 0 16px 0', textAlign: 'center' }}>
          拖放图片到此处，或点击选择文件
        </p>
        <p style={{ color: '#9CA3AF', fontSize: 12, margin: 0 }}>
          支持 JPG、PNG 格式，最大 5MB
        </p>
        
        {error && (
          <p style={{ color: '#EF4444', fontSize: 13, marginTop: 16 }}>{error}</p>
        )}
      </motion.div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png"
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />
    </div>
  );

  const renderToolbar = () => {
    const isVertical = !isMobile;
    
    return (
      <motion.div
        initial={false}
        animate={{
          width: isVertical ? 60 : '100%',
          height: isVertical ? '100%' : 50,
          flexDirection: isVertical ? 'column' : 'row'
        }}
        style={{
          backgroundColor: '#FFFFFF',
          borderRight: isVertical ? '1px solid #E5E7EB' : 'none',
          borderTop: isVertical ? 'none' : '1px solid #E5E7EB',
          display: 'flex',
          alignItems: 'center',
          padding: isVertical ? '12px 0' : '0 12px',
          gap: 8,
          overflowX: isMobile ? 'auto' : 'visible'
        }}
      >
        <ToolButton
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              <path d="M2 2l7.586 7.586"/>
              <circle cx="11" cy="11" r="2"/>
            </svg>
          }
          label="画笔"
          active={currentTool === 'brush'}
          onClick={() => setCurrentTool('brush')}
          isMobile={isMobile}
        />
        
        <ToolButton
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 20H7L3 16l13-13 4 4z"/>
            </svg>
          }
          label="橡皮擦"
          active={currentTool === 'eraser'}
          onClick={() => setCurrentTool('eraser')}
          isMobile={isMobile}
        />
        
        {isVertical && <div style={{ width: 32, height: 1, backgroundColor: '#E5E7EB', margin: '8px 0' }} />}
        
        {!isMobile && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '0 8px'
          }}>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>粗细</span>
            {BRUSH_SIZES.map(size => (
              <motion.button
                key={size}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  scale: brushSize === size ? 1.2 : 1,
                  borderColor: brushSize === size ? '#3B82F6' : 'transparent'
                }}
                transition={{ duration: 0.2 }}
                onClick={() => setBrushSize(size)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '2px solid transparent',
                  backgroundColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  padding: 0
                }}
                title={`${size}px`}
              >
                <div
                  style={{
                    width: size * 2,
                    height: size * 2,
                    borderRadius: '50%',
                    backgroundColor: currentTool === 'eraser' ? '#E5E7EB' : brushColor
                  }}
                />
              </motion.button>
            ))}
          </div>
        )}
        
        {isVertical && <div style={{ width: 32, height: 1, backgroundColor: '#E5E7EB', margin: '8px 0' }} />}
        
        {!isMobile && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            padding: '0 8px'
          }}>
            <span style={{ fontSize: 10, color: '#9CA3AF' }}>颜色</span>
            {BRUSH_COLORS.map(color => (
              <motion.button
                key={color.value}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                animate={{
                  scale: brushColor === color.value ? 1.2 : 1,
                  borderColor: brushColor === color.value ? '#3B82F6' : '#E5E7EB'
                }}
                transition={{ duration: 0.2 }}
                onClick={() => { setBrushColor(color.value); setCurrentTool('brush'); }}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  border: `2px solid ${brushColor === color.value ? '#3B82F6' : '#E5E7EB'}`,
                  backgroundColor: color.value,
                  cursor: 'pointer',
                  padding: 0
                }}
                title={color.name}
              />
            ))}
          </div>
        )}
      </motion.div>
    );
  };

  const renderPanel = () => (
    <motion.div
      initial={false}
      animate={{
        width: panelCollapsed ? 0 : 260,
        opacity: panelCollapsed ? 0 : 1
      }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        backgroundColor: '#FFFFFF',
        borderLeft: panelCollapsed ? 'none' : '1px solid #E5E7EB',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <motion.button
        whileHover={{ backgroundColor: '#F3F4F6' }}
        onClick={() => {
          if (isMobile) {
            setMobilePanelOpen(false);
          } else {
            setPanelCollapsed(true);
          }
        }}
        style={{
          position: 'absolute',
          left: -14,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 14,
          height: 28,
          backgroundColor: 'rgba(255,255,255,0.8)',
          border: 'none',
          borderRadius: '4px 0 0 4px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          padding: 0
        }}
      >
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 18 15 12 9 6"/>
        </svg>
      </motion.button>
      
      {!panelCollapsed && (
        <div style={{ padding: 20, overflowY: 'auto', flex: 1, minWidth: 260 }}>
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1F2937',
            margin: '0 0 16px 0'
          }}>
            准确率
          </h3>
          
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <AccuracyMeter accuracy={accuracy} size={120} />
          </div>
          
          <div style={{
            height: 1,
            backgroundColor: '#E5E7EB',
            marginBottom: 20
          }} />
          
          <h3 style={{
            fontSize: 16,
            fontWeight: 600,
            color: '#1F2937',
            margin: '0 0 16px 0'
          }}>
            录制回放
          </h3>
          
          {!isRecording && !isPlaybackMode && !recordedData && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartRecording}
              disabled={!processedImage}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: processedImage ? '#EF4444' : '#E5E7EB',
                color: processedImage ? '#FFFFFF' : '#9CA3AF',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: processedImage ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'currentColor'
              }} />
              开始录制
            </motion.button>
          )}
          
          {isRecording && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStopRecording}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#6B7280',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <div style={{ width: 10, height: 10, backgroundColor: 'currentColor' }} />
              停止录制
            </motion.button>
          )}
          
          {recordedData && !isPlaybackMode && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handlePlayRecording}
              style={{
                width: '100%',
                padding: '10px 16px',
                backgroundColor: '#10B981',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              播放回放
            </motion.button>
          )}
          
          {isPlaybackMode && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{
                width: '100%',
                height: 8,
                backgroundColor: '#E5E7EB',
                borderRadius: 4,
                overflow: 'hidden',
                position: 'relative',
                cursor: 'pointer'
              }}>
                <div style={{
                  width: `${playbackDuration > 0 ? (playbackTime / playbackDuration) * 100 : 0}%`,
                  height: '100%',
                  backgroundColor: '#3B82F6',
                  borderRadius: 4,
                  transition: 'width 0.05s linear'
                }} />
                <input
                  type="range"
                  min={0}
                  max={playbackDuration || 100}
                  value={playbackTime}
                  onChange={handleSeek}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    opacity: 0,
                    cursor: 'pointer',
                    margin: 0,
                    WebkitAppearance: 'none',
                    appearance: 'none'
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: `${playbackDuration > 0 ? (playbackTime / playbackDuration) * 100 : 0}%`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: '#FFFFFF',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                    pointerEvents: 'none'
                  }}
                />
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: 12,
                color: '#6B7280'
              }}>
                <span>{formatTime(playbackTime)}</span>
                <span>{formatTime(playbackDuration)}</span>
              </div>
              
              <div style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleStopPlayback}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#F3F4F6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#6B7280">
                    <rect x="6" y="6" width="12" height="12"/>
                  </svg>
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={isPlaying ? handlePausePlayback : handleResumePlayback}
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#3B82F6',
                    color: '#FFFFFF',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                >
                  {isPlaying ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="4" width="4" height="16"/>
                      <rect x="14" y="4" width="4" height="16"/>
                    </svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="5 3 19 12 5 21 5 3"/>
                    </svg>
                  )}
                </motion.button>
                
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={handleStopPlayback}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: '#F3F4F6',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
                    <path d="M3 12h18"/>
                  </svg>
                </motion.button>
              </div>
              
              <div style={{
                display: 'flex',
                gap: 4,
                justifyContent: 'center',
                marginTop: 4
              }}>
                {([0.5, 1, 2] as const).map(speed => (
                  <motion.button
                    key={speed}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSpeedChange(speed)}
                    style={{
                      padding: '4px 10px',
                      fontSize: 12,
                      fontWeight: 500,
                      border: 'none',
                      borderRadius: 4,
                      backgroundColor: playbackSpeed === speed ? '#3B82F6' : '#F3F4F6',
                      color: playbackSpeed === speed ? '#FFFFFF' : '#6B7280',
                      cursor: 'pointer'
                    }}
                  >
                    {speed}x
                  </motion.button>
                ))}
              </div>
            </div>
          )}
          
          {isMobile && recordedData && !isPlaybackMode && (
            <p style={{
              fontSize: 12,
              color: '#6B7280',
              marginTop: 12,
              textAlign: 'center'
            }}>
              已录制，时长: {formatTime(recordedData.totalDuration)}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );

  const renderStatusBar = () => (
    <div style={{
      height: 40,
      backgroundColor: '#FFFFFF',
      borderTop: '1px solid #E5E7EB',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 24,
      fontSize: 12,
      color: '#6B7280'
    }}>
      <span>缩放: {Math.round(zoom * 100)}%</span>
      <span>光标: ({Math.round(cursorPos.x)}, {Math.round(cursorPos.y)})</span>
      <span>工具: {currentTool === 'brush' ? '画笔' : '橡皮擦'}</span>
      {isRecording && (
        <span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            backgroundColor: '#EF4444',
            animation: 'pulse 1s infinite'
          }} />
          录制中
        </span>
      )}
    </div>
  );

  const renderMobilePanelToggle = () => (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setMobilePanelOpen(true)}
      style={{
        position: 'fixed',
        right: 0,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 28,
        height: 48,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E5E7EB',
        borderRight: 'none',
        borderRadius: '8px 0 0 8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
        boxShadow: '-2px 0 8px rgba(0,0,0,0.05)',
        padding: 0
      }}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6"/>
      </svg>
    </motion.button>
  );

  const renderMobilePanelModal = () => (
    <AnimatePresence>
      {mobilePanelOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobilePanelOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 30
            }}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              width: 280,
              backgroundColor: '#FFFFFF',
              zIndex: 40,
              overflowY: 'auto'
            }}
          >
            <div style={{ padding: 16, borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>设置</h3>
              <button
                onClick={() => setMobilePanelOpen(false)}
                style={{
                  width: 32,
                  height: 32,
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
            <div style={{ padding: 16 }}>
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>画笔粗细</h4>
              <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                {BRUSH_SIZES.map(size => (
                  <motion.button
                    key={size}
                    whileTap={{ scale: 0.9 }}
                    animate={{
                      scale: brushSize === size ? 1.2 : 1,
                      borderColor: brushSize === size ? '#3B82F6' : '#E5E7EB'
                    }}
                    transition={{ duration: 0.2 }}
                    onClick={() => setBrushSize(size)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: '2px solid #E5E7EB',
                      backgroundColor: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      padding: 0
                    }}
                  >
                    <div
                      style={{
                        width: size * 2,
                        height: size * 2,
                        borderRadius: '50%',
                        backgroundColor: currentTool === 'eraser' ? '#E5E7EB' : brushColor
                      }}
                    />
                  </motion.button>
                ))}
              </div>
              
              <h4 style={{ fontSize: 14, fontWeight: 600, margin: '0 0 12px 0' }}>画笔颜色</h4>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {BRUSH_COLORS.map(color => (
                  <motion.button
                    key={color.value}
                    whileTap={{ scale: 0.9 }}
                    animate={{
                      scale: brushColor === color.value ? 1.15 : 1,
                      borderColor: brushColor === color.value ? '#3B82F6' : '#E5E7EB'
                    }}
                    transition={{ duration: 0.2 }}
                    onClick={() => { setBrushColor(color.value); setCurrentTool('brush'); }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      border: `2px solid ${brushColor === color.value ? '#3B82F6' : '#E5E7EB'}`,
                      backgroundColor: color.value,
                      cursor: 'pointer',
                      padding: 0
                    }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#F9FAFB',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      overflow: 'hidden'
    }}>
      <header style={{
        height: 56,
        backgroundColor: '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12
      }}>
        <div style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: '#3B82F6',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 21h18"/>
            <path d="M5 21V7l8-4v18"/>
            <path d="M19 21V11l-6-4"/>
            <path d="M9 9v.01"/>
            <path d="M9 12v.01"/>
            <path d="M9 15v.01"/>
            <path d="M9 18v.01"/>
          </svg>
        </div>
        <h1 style={{
          fontSize: 16,
          fontWeight: 600,
          color: '#1F2937',
          margin: 0,
          flex: 1
        }}>
          建筑线条描摹学习工具
        </h1>
        
        {processedImage && !isMobile && (
          <button
            onClick={handleUploadClick}
            style={{
              padding: '6px 14px',
              fontSize: 13,
              border: '1px solid #D1D5DB',
              borderRadius: 6,
              backgroundColor: '#FFFFFF',
              color: '#374151',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            更换图片
          </button>
        )}
      </header>
      
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {!isMobile && processedImage && renderToolbar()}
        
        {processedImage ? (
          <DrawingCanvas
            ref={canvasRef}
            processedImage={processedImage}
            brushColor={brushColor}
            brushSize={brushSize}
            tool={currentTool}
            onAccuracyChange={setAccuracy}
            onCursorMove={(x, y) => setCursorPos({ x, y })}
            onZoomChange={setZoom}
            isPlaybackMode={isPlaybackMode}
          />
        ) : (
          renderUploadArea()
        )}
        
        {!isMobile && processedImage && renderPanel()}
        
        {isMobile && processedImage && !panelCollapsed && renderMobilePanelToggle()}
        {isMobile && renderMobilePanelModal()}
      </div>
      
      {processedImage && !isMobile && renderStatusBar()}
      
      {isMobile && processedImage && (
        <div style={{ position: 'fixed', bottom: 60, left: 16, zIndex: 15 }}>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.95)',
            borderRadius: 8,
            padding: '8px 12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            fontSize: 12,
            color: '#6B7280'
          }}>
            {Math.round(zoom * 100)}% · ({Math.round(cursorPos.x)}, {Math.round(cursorPos.y)})
          </div>
        </div>
      )}
      
      {isMobile && processedImage && renderToolbar()}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          margin: 0;
          padding: 0;
        }
      `}</style>
    </div>
  );
}

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  isMobile?: boolean;
}

function ToolButton({ icon, label, active, onClick, isMobile = false }: ToolButtonProps) {
  return (
    <motion.button
      whileHover={{ backgroundColor: '#EFF6FF' }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      title={label}
      style={{
        width: isMobile ? 44 : 44,
        height: isMobile ? 44 : 44,
        borderRadius: 8,
        border: 'none',
        backgroundColor: active ? '#EFF6FF' : 'transparent',
        color: active ? '#3B82F6' : '#6B7280',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: isMobile ? 'column' : 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background-color 0.15s ease-in-out',
        padding: 0
      }}
    >
      {icon}
    </motion.button>
  );
}
