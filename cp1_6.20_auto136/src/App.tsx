import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import RecorderPanel, { RecordingState } from './components/RecorderPanel';
import VideoPlayer, { VideoPlayerRef } from './components/VideoPlayer';
import SubtitleEditor, { Subtitle } from './components/SubtitleEditor';

interface ToastItem {
  id: string;
  message: string;
}

const generateId = (): string => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function App() {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [videoBlobUrl, setVideoBlobUrl] = useState<string | null>(null);
  const [videoBlob, setVideoBlob] = useState<Blob | null>(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [selectedSubtitleId, setSelectedSubtitleId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const oldBlobUrlRef = useRef<string | null>(null);

  const showToast = useCallback((message: string) => {
    const id = generateId();
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2000);
  }, []);

  useEffect(() => {
    return () => {
      if (oldBlobUrlRef.current) {
        URL.revokeObjectURL(oldBlobUrlRef.current);
      }
      if (videoBlobUrl) {
        URL.revokeObjectURL(videoBlobUrl);
      }
    };
  }, [videoBlobUrl]);

  const handleRecordingComplete = useCallback((blob: Blob) => {
    setVideoBlob(blob);
    if (oldBlobUrlRef.current) {
      URL.revokeObjectURL(oldBlobUrlRef.current);
    }
    const url = URL.createObjectURL(blob);
    oldBlobUrlRef.current = url;
    setVideoBlobUrl(url);
    setSubtitles([]);
    setSelectedSubtitleId(null);
    setCurrentTime(0);
    setVideoDuration(0);
    showToast('录制完成');
  }, [showToast]);

  const handleTimeUpdate = useCallback((time: number) => {
    setCurrentTime(time);
  }, []);

  const handleDurationChange = useCallback((duration: number) => {
    setVideoDuration(duration);
  }, []);

  const handlePlayingChange = useCallback(
    (isPlaying: boolean, toastFn?: (msg: string) => void) => {
      const doToast = toastFn || showToast;
      doToast(isPlaying ? '播放中' : '已暂停');
    },
    [showToast]
  );

  const handleAddSubtitle = useCallback(
    (subtitle: Subtitle, toastFn?: (msg: string) => void) => {
      setSubtitles((prev) => [...prev, subtitle]);
      const doToast = toastFn || showToast;
      doToast('已添加字幕');
    },
    [showToast]
  );

  const handleDeleteSubtitle = useCallback(
    (id: string, toastFn?: (msg: string) => void) => {
      setSubtitles((prev) => prev.filter((s) => s.id !== id));
      setSelectedSubtitleId((prev) => (prev === id ? null : prev));
      const doToast = toastFn || showToast;
      doToast('已删除字幕');
    },
    [showToast]
  );

  const handleUpdateSubtitle = useCallback(
    (id: string, updates: Partial<Subtitle>) => {
      setSubtitles((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
      );
    },
    []
  );

  const handleSelectSubtitle = useCallback((id: string | null) => {
    setSelectedSubtitleId(id);
  }, []);

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        background: 'var(--bg-primary)',
        padding: '32px 24px',
        position: 'relative',
        overflowX: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80vw',
          height: '60vh',
          background:
            'radial-gradient(ellipse at top, rgba(124, 58, 237, 0.12), transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{
            textAlign: 'center',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background:
                  'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(124, 58, 237, 0.35)',
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" fill="white" />
              </svg>
            </div>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                background:
                  'linear-gradient(135deg, var(--text-primary), var(--accent-primary))',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: -0.5,
              }}
            >
              屏幕录制与字幕编辑器
            </h1>
          </div>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: 14,
              maxWidth: 520,
              margin: '0 auto',
            }}
          >
            在浏览器中录制屏幕，实时编辑字幕，一键导出标准 SRT 格式文件。
            无需安装，即开即用。
          </p>
        </motion.header>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <RecorderPanel
            recordingState={recordingState}
            onRecordingComplete={handleRecordingComplete}
            onStateChange={setRecordingState}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ position: 'relative' }}
        >
          <AnimatePresence>
            {toasts.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  pointerEvents: 'none',
                }}
              >
                {toasts.map((toast) => (
                  <motion.div
                    key={toast.id}
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#333333',
                      color: 'white',
                      borderRadius: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
                      backdropFilter: 'blur(8px)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {toast.message}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>

          <VideoPlayer
            ref={videoPlayerRef}
            videoBlobUrl={videoBlobUrl}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onPlayingChange={handlePlayingChange}
            showToast={showToast}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--divider)' }} />
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: 1.5,
              fontWeight: 600,
            }}
          >
            字幕编辑
          </span>
          <div style={{ flex: 1, height: 1, backgroundColor: 'var(--divider)' }} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          <SubtitleEditor
            subtitles={subtitles}
            currentTime={currentTime}
            videoDuration={videoDuration}
            selectedSubtitleId={selectedSubtitleId}
            onAddSubtitle={handleAddSubtitle}
            onDeleteSubtitle={handleDeleteSubtitle}
            onUpdateSubtitle={handleUpdateSubtitle}
            onSelectSubtitle={handleSelectSubtitle}
            showToast={showToast}
          />
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          style={{
            marginTop: 40,
            paddingTop: 20,
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: 12,
            borderTop: '1px solid var(--divider)',
          }}
        >
          提示：请确保使用支持 getDisplayMedia 的现代浏览器（Chrome/Edge 72+, Firefox 66+, Safari 13+）。
          视频以 WebM 格式保存在内存中，关闭页面后将丢失。
          {videoBlob && (
            <div style={{ marginTop: 8, opacity: 0.7 }}>
              当前视频大小：{(videoBlob.size / (1024 * 1024)).toFixed(2)} MB
            </div>
          )}
        </motion.footer>
      </div>
    </div>
  );
}

export default App;
