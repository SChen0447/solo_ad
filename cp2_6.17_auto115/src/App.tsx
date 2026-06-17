import React, { useState, useRef, useEffect, useCallback } from 'react';
import { WaveformRenderer, decodeAudioFile, formatTime, Marker as WaveformMarker } from './Waveform';
import { MarkerManager, Marker } from './MarkerManager';

interface UploadedFile {
  id: string;
  filename: string;
  size: number;
  url: string;
}

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const waveformRef = useRef<WaveformRenderer | null>(null);
  const markerManagerRef = useRef<MarkerManager>(new MarkerManager());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [selectedMarkerId, setSelectedMarkerId] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  const [editNote, setEditNote] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [highlightMarkerId, setHighlightMarkerId] = useState<string | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (canvasRef.current && !waveformRef.current) {
      waveformRef.current = new WaveformRenderer(canvasRef.current);
      waveformRef.current.setOnTimeUpdate((time) => {
        setCurrentTime(time);
      });
      waveformRef.current.setOnPlayEnd(() => {
        setIsPlaying(false);
        setCurrentTime(0);
      });
    }

    return () => {
      if (waveformRef.current) {
        waveformRef.current.destroy();
      }
    };
  }, []);

  useEffect(() => {
    const manager = markerManagerRef.current;
    const unsubscribe = manager.addChangeListener((newMarkers) => {
      setMarkers(newMarkers);
      if (waveformRef.current) {
        waveformRef.current.setMarkers(newMarkers as WaveformMarker[]);
      }
    });

    const unsubscribeSelect = manager.addSelectListener((id) => {
      setSelectedMarkerId(id);
    });

    return () => {
      unsubscribe();
      unsubscribeSelect();
    };
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (waveformRef.current && containerRef.current) {
        const container = containerRef.current;
        const width = container.clientWidth;
        const dpr = window.devicePixelRatio || 1;
        if (canvasRef.current) {
          canvasRef.current.style.width = `${width}px`;
          canvasRef.current.style.height = '300px';
          waveformRef.current.resize(width * dpr, 300 * dpr);
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [uploadedFile]);

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;

    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/x-wav'];
    const validExtensions = ['.mp3', '.wav'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!validTypes.includes(file.type) && !validExtensions.includes(fileExt)) {
      alert('只支持 MP3 和 WAV 格式的音频文件');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      alert('文件大小不能超过 50MB');
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('audio', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('上传失败');
      }

      const result = await response.json();
      setUploadedFile(result);

      const audioBuffer = await decodeAudioFile(file);
      
      if (waveformRef.current) {
        waveformRef.current.setAudioBuffer(audioBuffer);
        setDuration(audioBuffer.duration);
        setCurrentTime(0);
        setIsPlaying(false);
      }

      markerManagerRef.current.clearAll();

      if (isMobile) {
        setSidebarOpen(false);
      }
    } catch (error) {
      console.error('文件处理失败:', error);
      alert('文件处理失败，请重试');
    } finally {
      setIsLoading(false);
    }
  }, [isMobile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingOver(false);
  }, []);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleCanvasDoubleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!waveformRef.current || !uploadedFile) return;

    const time = waveformRef.current.getTimeFromPosition(e.clientX);
    const marker = markerManagerRef.current.addMarker(time);
    
    if (marker) {
      setEditingMarkerId(marker.id);
      setEditNote('');
    } else {
      alert(`最多只能添加 ${markerManagerRef.current.getMaxMarkers()} 个标记点`);
    }
  }, [uploadedFile]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!waveformRef.current || !uploadedFile) return;

    const time = waveformRef.current.getTimeFromPosition(e.clientX);
    waveformRef.current.seek(time);
  }, [uploadedFile]);

  const handlePlayPause = useCallback(() => {
    if (!waveformRef.current || !uploadedFile) return;

    if (isPlaying) {
      waveformRef.current.pause();
      setIsPlaying(false);
    } else {
      waveformRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying, uploadedFile]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformRef.current || !uploadedFile) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const time = ratio * duration;
    waveformRef.current.seek(time);
    setCurrentTime(time);
  }, [duration, uploadedFile]);

  const handleDeleteMarker = useCallback((id: string) => {
    markerManagerRef.current.removeMarker(id);
  }, []);

  const handleEditMarker = useCallback((marker: Marker) => {
    setEditingMarkerId(marker.id);
    setEditNote(marker.note);
  }, []);

  const handleSaveNote = useCallback(() => {
    if (editingMarkerId) {
      markerManagerRef.current.updateMarkerNote(editingMarkerId, editNote);
      setEditingMarkerId(null);
      setEditNote('');
    }
  }, [editingMarkerId, editNote]);

  const handleCancelEdit = useCallback(() => {
    setEditingMarkerId(null);
    setEditNote('');
  }, []);

  const handleJumpToMarker = useCallback((id: string) => {
    const time = markerManagerRef.current.jumpToMarker(id);
    if (time !== null && waveformRef.current) {
      waveformRef.current.seek(time);
      setCurrentTime(time);
      setHighlightMarkerId(id);
      setTimeout(() => setHighlightMarkerId(null), 1500);
    }
    if (isMobile) {
      setSidebarOpen(false);
    }
  }, [isMobile]);

  const handleExportPNG = useCallback(() => {
    if (!waveformRef.current) return;

    const dataUrl = waveformRef.current.exportAsPNG(1280, 720);
    const link = document.createElement('a');
    link.download = 'waveform.png';
    link.href = dataUrl;
    link.click();
  }, []);

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={styles.app}>
      {isMobile && (
        <button
          style={styles.mobileMenuButton}
          onClick={() => setSidebarOpen(true)}
        >
          ☰
        </button>
      )}

      {isMobile && sidebarOpen && (
        <div 
          style={styles.overlay}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div style={{
        ...styles.sidebar,
        ...(isMobile ? (sidebarOpen ? styles.sidebarOpen : styles.sidebarClosed) : {})
      }}>
        <div style={styles.sidebarContent}>
          {isMobile && (
            <div style={styles.sidebarHeader}>
              <h2 style={styles.sidebarTitle}>菜单</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setSidebarOpen(false)}
              >
                ✕
              </button>
            </div>
          )}

          <div style={styles.uploadSection}>
            <h3 style={styles.sectionTitle}>上传音频</h3>
            <div
              style={{
                ...styles.uploadArea,
                ...(isDraggingOver ? styles.uploadAreaDrag : {})
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
            >
              <div style={styles.uploadIcon}>📁</div>
              <p style={styles.uploadText}>拖拽文件到此处</p>
              <p style={styles.uploadSubtext}>或点击选择文件</p>
              <p style={styles.uploadHint}>支持 MP3 / WAV，最大 50MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".mp3,.wav,audio/mpeg,audio/wav"
              style={styles.fileInput}
              onChange={handleFileInputChange}
            />
            {uploadedFile && (
              <div style={styles.fileInfo}>
                <p style={styles.fileName}>📄 {uploadedFile.filename}</p>
                <p style={styles.fileSize}>{(uploadedFile.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
            )}
          </div>

          <div style={styles.markersSection}>
            <h3 style={styles.sectionTitle}>
              标记列表 ({markers.length}/{markerManagerRef.current.getMaxMarkers()})
            </h3>
            <div style={styles.markerList}>
              {markers.length === 0 ? (
                <p style={styles.emptyMarkers}>暂无标记点，双击波形图添加</p>
              ) : (
                markers.map((marker) => (
                  <div
                    key={marker.id}
                    style={{
                      ...styles.markerItem,
                      ...(highlightMarkerId === marker.id ? styles.markerItemHighlight : {}),
                      ...(selectedMarkerId === marker.id ? styles.markerItemSelected : {})
                    }}
                    onClick={() => handleJumpToMarker(marker.id)}
                  >
                    <div style={styles.markerTime}>{formatTime(marker.time)}</div>
                    <div style={styles.markerNote}>
                      {marker.note || '点击添加备注'}
                    </div>
                    <div style={styles.markerActions}>
                      <button
                        style={styles.actionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditMarker(marker);
                        }}
                      >
                        ✏️
                      </button>
                      <button
                        style={styles.actionButton}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteMarker(marker.id);
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <div style={styles.mainContent}>
        <div style={styles.waveformSection}>
          <div style={styles.controls}>
            <button
              style={styles.playButton}
              onClick={handlePlayPause}
              disabled={!uploadedFile}
            >
              {isPlaying ? '⏸' : '▶'}
            </button>
            <div style={styles.progressContainer}>
              <div
                style={styles.progressBar}
                onClick={handleProgressClick}
              >
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progressPercent}%`
                  }}
                />
              </div>
              <div style={styles.timeDisplay}>
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>

          <div 
            ref={containerRef}
            style={styles.canvasContainer}
          >
            <canvas
              ref={canvasRef}
              style={styles.canvas}
              onDoubleClick={handleCanvasDoubleClick}
              onClick={handleCanvasClick}
            />
            {!uploadedFile && !isLoading && (
              <div style={styles.placeholderOverlay}>
                <p style={styles.placeholderText}>请先上传音频文件</p>
              </div>
            )}
            {isLoading && (
              <div style={styles.loadingOverlay}>
                <div style={styles.spinner}></div>
                <p style={styles.loadingText}>正在处理音频...</p>
              </div>
            )}
          </div>
        </div>

        <div style={styles.tipSection}>
          <p style={styles.tipText}>💡 双击波形图添加标记点，点击标记点可添加备注</p>
        </div>

        <div style={styles.exportSection}>
          <button
            style={styles.exportButton}
            onClick={handleExportPNG}
            disabled={!uploadedFile}
          >
            导出为 PNG
          </button>
        </div>
      </div>

      {editingMarkerId && (
        <div style={styles.modalOverlay} onClick={handleCancelEdit}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>编辑备注</h3>
            <input
              type="text"
              style={styles.modalInput}
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="输入备注内容..."
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSaveNote();
                }
              }}
            />
            <div style={styles.modalActions}>
              <button style={styles.cancelButton} onClick={handleCancelEdit}>
                取消
              </button>
              <button style={styles.saveButton} onClick={handleSaveNote}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  app: {
    display: 'flex',
    width: '100%',
    height: '100%',
    backgroundColor: '#1e1e2e',
    color: '#ffffff',
    position: 'relative'
  },
  mobileMenuButton: {
    position: 'fixed',
    top: '16px',
    left: '16px',
    zIndex: 100,
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    backgroundColor: '#2a2a3e',
    color: '#ffffff',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s ease'
  },
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 150,
    animation: 'fadeIn 0.3s ease'
  },
  sidebar: {
    width: '240px',
    backgroundColor: '#252536',
    borderRight: '1px solid #3a3a50',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    overflow: 'hidden'
  },
  sidebarOpen: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 200,
    transform: 'translateX(0)',
    transition: 'transform 0.3s ease'
  },
  sidebarClosed: {
    position: 'fixed',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 200,
    transform: 'translateX(-100%)',
    transition: 'transform 0.3s ease'
  },
  sidebarContent: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden'
  },
  sidebarHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    borderBottom: '1px solid #3a3a50'
  },
  sidebarTitle: {
    fontSize: '18px',
    fontWeight: 600
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#ffffff',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'background-color 0.2s ease'
  },
  uploadSection: {
    padding: '16px',
    borderBottom: '1px solid #3a3a50'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '12px',
    color: '#e0e0e0'
  },
  uploadArea: {
    border: '2px dashed #4a4a6a',
    borderRadius: '12px',
    padding: '24px 16px',
    textAlign: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    backgroundColor: 'rgba(59, 130, 246, 0.05)'
  },
  uploadAreaDrag: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)'
  },
  uploadIcon: {
    fontSize: '32px',
    marginBottom: '8px'
  },
  uploadText: {
    fontSize: '14px',
    fontWeight: 500,
    marginBottom: '4px'
  },
  uploadSubtext: {
    fontSize: '12px',
    color: '#8888aa',
    marginBottom: '8px'
  },
  uploadHint: {
    fontSize: '11px',
    color: '#666688'
  },
  fileInput: {
    display: 'none'
  },
  fileInfo: {
    marginTop: '12px',
    padding: '8px 12px',
    backgroundColor: '#2a2a3e',
    borderRadius: '8px'
  },
  fileName: {
    fontSize: '12px',
    fontWeight: 500,
    marginBottom: '4px',
    wordBreak: 'break-all'
  },
  fileSize: {
    fontSize: '11px',
    color: '#8888aa'
  },
  markersSection: {
    flex: 1,
    padding: '16px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  markerList: {
    flex: 1,
    overflowY: 'auto',
    gap: '8px',
    display: 'flex',
    flexDirection: 'column'
  },
  emptyMarkers: {
    fontSize: '12px',
    color: '#666688',
    textAlign: 'center',
    padding: '20px 0'
  },
  markerItem: {
    padding: '10px 12px',
    backgroundColor: '#2a2a3e',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid transparent'
  },
  markerItemHighlight: {
    backgroundColor: 'rgba(59, 130, 246, 0.3)',
    borderColor: '#3b82f6',
    transition: 'all 0.3s ease'
  },
  markerItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: '#3b82f6'
  },
  markerTime: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#3b82f6',
    marginBottom: '4px'
  },
  markerNote: {
    fontSize: '12px',
    color: '#ccccdd',
    marginBottom: '8px',
    wordBreak: 'break-word'
  },
  markerActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end'
  },
  actionButton: {
    background: 'none',
    border: 'none',
    color: '#8888aa',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  },
  mainContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '24px',
    overflow: 'auto',
    position: 'relative'
  },
  waveformSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    maxWidth: '1000px',
    width: '100%',
    margin: '0 auto'
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px'
  },
  playButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    flexShrink: 0
  },
  progressContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  progressBar: {
    width: '100%',
    height: '6px',
    backgroundColor: '#4a4a5e',
    borderRadius: '3px',
    cursor: 'pointer',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
    borderRadius: '3px',
    transition: 'width 0.1s linear'
  },
  timeDisplay: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: '#8888aa'
  },
  canvasContainer: {
    position: 'relative',
    width: '100%',
    height: '300px',
    backgroundColor: '#1e1e2e',
    borderRadius: '12px',
    overflow: 'hidden',
    border: '1px solid #3a3a50'
  },
  canvas: {
    display: 'block',
    width: '100%',
    height: '100%'
  },
  placeholderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 30, 46, 0.9)',
    pointerEvents: 'none'
  },
  placeholderText: {
    fontSize: '16px',
    color: '#666688'
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(30, 30, 46, 0.9)',
    gap: '16px'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #3a3a50',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  },
  loadingText: {
    fontSize: '14px',
    color: '#ccccdd'
  },
  tipSection: {
    textAlign: 'center',
    marginTop: '20px'
  },
  tipText: {
    fontSize: '13px',
    color: '#666688'
  },
  exportSection: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '24px',
    paddingBottom: '24px'
  },
  exportButton: {
    width: '200px',
    height: '44px',
    borderRadius: '12px',
    backgroundColor: '#10b981',
    color: '#ffffff',
    border: 'none',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.2s ease'
  },
  modal: {
    backgroundColor: '#252536',
    borderRadius: '12px',
    padding: '24px',
    width: '360px',
    maxWidth: '90%',
    animation: 'slideUp 0.2s ease',
    border: '1px solid #3a3a50'
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px'
  },
  modalInput: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #4a4a6a',
    backgroundColor: '#1e1e2e',
    color: '#ffffff',
    fontSize: '14px',
    marginBottom: '20px',
    outline: 'none',
    transition: 'border-color 0.2s ease'
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  cancelButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    backgroundColor: 'transparent',
    color: '#8888aa',
    border: '1px solid #4a4a6a',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease'
  },
  saveButton: {
    padding: '8px 20px',
    borderRadius: '8px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease'
  }
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  * {
    scrollbar-width: thin;
    scrollbar-color: #4a4a6a #252536;
  }
  *::-webkit-scrollbar {
    width: 6px;
  }
  *::-webkit-scrollbar-track {
    background: #252536;
  }
  *::-webkit-scrollbar-thumb {
    background: #4a4a6a;
    border-radius: 3px;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  button:hover:not(:disabled) {
    filter: brightness(1.1);
  }
  button:active:not(:disabled) {
    transform: scale(0.98);
  }
`;
document.head.appendChild(styleSheet);

export default App;
