import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type RecordingState = 'idle' | 'recording' | 'stopped';

interface RecorderPanelProps {
  recordingState: RecordingState;
  onRecordingComplete: (blob: Blob) => void;
  onStateChange: (state: RecordingState) => void;
}

const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const RecorderPanel = ({
  recordingState,
  onRecordingComplete,
  onStateChange,
}: RecorderPanelProps) => {
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      cleanupStream();
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: 30,
        },
        audio: true,
      } as DisplayMediaStreamOptions);

      streamRef.current = stream;

      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        mimeType = 'video/webm;codecs=vp9,opus';
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        onRecordingComplete(blob);
        cleanupStream();
      };

      recorder.start(1000);
      onStateChange('recording');
      startTimeRef.current = Date.now();
      setElapsed(0);

      timerRef.current = window.setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 250);

      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };
    } catch (err) {
      console.error('录制失败:', err);
      onStateChange('idle');
      cleanupStream();
    }
  }, [cleanupStream, onRecordingComplete, onStateChange]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }

    onStateChange('stopped');
  }, [onStateChange]);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      cleanupStream();
    };
  }, [cleanupStream]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 20,
        padding: '20px 24px',
        background: 'var(--bg-secondary)',
        borderRadius: 12,
        marginBottom: 24,
        border: '1px solid var(--divider)',
      }}
    >
      <motion.button
        onClick={
          recordingState === 'recording' ? stopRecording : startRecording
        }
        whileHover={recordingState !== 'recording' ? { scale: 1.05 } : {}}
        whileTap={{ scale: 0.98 }}
        style={{
          padding: '12px 32px',
          backgroundColor:
            recordingState === 'recording'
              ? 'var(--danger-hover)'
              : 'var(--danger)',
          color: 'white',
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          transition: 'background-color 0.2s ease, transform 0.2s ease',
          boxShadow:
            recordingState === 'recording'
              ? '0 0 20px rgba(230, 57, 70, 0.4)'
              : 'none',
        }}
        onMouseEnter={(e) => {
          if (recordingState !== 'recording') {
            e.currentTarget.style.backgroundColor = 'var(--danger-hover)';
          }
        }}
        onMouseLeave={(e) => {
          if (recordingState !== 'recording') {
            e.currentTarget.style.backgroundColor = 'var(--danger)';
          }
        }}
      >
        <span
          style={{
            width: 12,
            height: 12,
            borderRadius: recordingState === 'recording' ? 2 : '50%',
            backgroundColor: 'white',
            transition: 'border-radius 0.2s ease',
          }}
        />
        {recordingState === 'recording' ? '停止录制' : '开始录制'}
      </motion.button>

      <AnimatePresence>
        {recordingState === 'recording' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 12px',
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              borderRadius: 8,
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              fontSize: 16,
              color: 'white',
              fontWeight: 500,
            }}
          >
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1, repeat: Infinity }}
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: 'var(--danger)',
              }}
            />
            {formatTime(elapsed)}
          </motion.div>
        )}
      </AnimatePresence>

      {recordingState === 'stopped' && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          style={{
            color: 'var(--success)',
            fontSize: 14,
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          录制完成，共 {formatTime(elapsed)}
        </motion.div>
      )}

      {recordingState === 'idle' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            color: 'var(--text-secondary)',
            fontSize: 13,
          }}
        >
          点击按钮开始录制屏幕，支持录制整个屏幕或指定窗口
        </motion.div>
      )}
    </div>
  );
};

export default RecorderPanel;
