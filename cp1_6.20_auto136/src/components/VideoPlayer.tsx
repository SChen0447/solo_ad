import { useRef, useEffect, useImperativeHandle, forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VideoPlayerProps {
  videoBlobUrl: string | null;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayingChange?: (isPlaying: boolean, showToast?: (msg: string) => void) => void;
  showToast?: (msg: string) => void;
}

export interface VideoPlayerRef {
  getCurrentTime: () => number;
  isPlaying: () => boolean;
  togglePlay: () => void;
  getVideoElement: () => HTMLVideoElement | null;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  ({ videoBlobUrl, onTimeUpdate, onDurationChange, onPlayingChange, showToast }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const currentTimeRef = useRef(0);
    const isPlayingRef = useRef(false);
    const [, forceRender] = useState(0);

    useImperativeHandle(ref, () => ({
      getCurrentTime: () => currentTimeRef.current,
      isPlaying: () => isPlayingRef.current,
      togglePlay: () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
      },
      getVideoElement: () => videoRef.current,
    }));

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      const handleTimeUpdate = () => {
        currentTimeRef.current = video.currentTime;
        onTimeUpdate(video.currentTime);
      };

      const handleLoadedMetadata = () => {
        onDurationChange(video.duration || 0);
      };

      const handlePlay = () => {
        isPlayingRef.current = true;
        forceRender((n) => n + 1);
        onPlayingChange?.(true, showToast);
      };

      const handlePause = () => {
        isPlayingRef.current = false;
        forceRender((n) => n + 1);
        onPlayingChange?.(false, showToast);
      };

      video.addEventListener('timeupdate', handleTimeUpdate);
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('durationchange', handleLoadedMetadata);
      video.addEventListener('play', handlePlay);
      video.addEventListener('pause', handlePause);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('durationchange', handleLoadedMetadata);
        video.removeEventListener('play', handlePlay);
        video.removeEventListener('pause', handlePause);
      };
    }, [onTimeUpdate, onDurationChange, onPlayingChange, showToast]);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (!videoBlobUrl) return;
        const activeEl = document.activeElement;
        const isInputActive =
          activeEl instanceof HTMLInputElement ||
          activeEl instanceof HTMLTextAreaElement;

        if (e.code === 'Space' && !isInputActive) {
          e.preventDefault();
          const video = videoRef.current;
          if (!video) return;
          if (video.paused) {
            video.play();
          } else {
            video.pause();
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [videoBlobUrl]);

    return (
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 900,
          margin: '0 auto 24px',
          borderRadius: 12,
          overflow: 'hidden',
          background: '#000',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
          aspectRatio: videoBlobUrl ? undefined : '16 / 9',
        }}
      >
        {videoBlobUrl ? (
          <video
            ref={videoRef}
            src={videoBlobUrl}
            controls
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
              maxHeight: '70vh',
              objectFit: 'contain',
              background: '#000',
            }}
          />
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 300,
              height: '100%',
              color: 'var(--text-secondary)',
              gap: 16,
              padding: 40,
              textAlign: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background:
                  'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 24px rgba(124, 58, 237, 0.3)',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            </motion.div>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
            >
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
                等待视频加载
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                完成屏幕录制后，视频将自动在此处显示
              </div>
            </motion.div>
          </div>
        )}

        <AnimatePresence>
          {videoBlobUrl && !isPlayingRef.current && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              onClick={() => videoRef.current?.play()}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'rgba(124, 58, 237, 0.85)',
                backdropFilter: 'blur(8px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 4px 24px rgba(124, 58, 237, 0.5)',
              }}
            >
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="white"
                style={{ marginLeft: 4 }}
              >
                <polygon points="6 4 20 12 6 20 6 4" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer;
