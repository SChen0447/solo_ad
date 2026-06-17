import { useState, useRef, useEffect, useCallback } from 'react';
import type { EmotionType, SceneType } from './types';
import { EMOTION_COLORS, EMOTION_NAMES, SCENE_NAMES } from './types';

interface SoundRecorderProps {
  onClose: () => void;
  onSubmit: (data: {
    name: string;
    audioData: string;
    duration: number;
    emotion: string;
    scene: string;
    latitude: number;
    longitude: number;
    recorderNickname: string;
  }) => void;
  initialLocation: { lat: number; lng: number } | null;
}

function SoundRecorder({ onClose, onSubmit, initialLocation }: SoundRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioData, setAudioData] = useState<string>('');
  const [duration, setDuration] = useState(0);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [emotion, setEmotion] = useState<EmotionType>('calm');
  const [scene, setScene] = useState<SceneType>('street');
  const [recordingTime, setRecordingTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const latitude = initialLocation?.lat || 39.9042;
  const longitude = initialLocation?.lng || 116.4074;

  const drawWaveform = useCallback(() => {
    if (!canvasRef.current || !analyserRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const analyser = analyserRef.current;
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteTimeDomainData(dataArray);

      ctx.fillStyle = 'rgba(26, 26, 46, 0.3)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.lineWidth = 2;
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
      gradient.addColorStop(0, '#06b6d4');
      gradient.addColorStop(0.5, '#8b5cf6');
      gradient.addColorStop(1, '#ec4899');
      ctx.strokeStyle = gradient;
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();

      ctx.shadowBlur = 15;
      ctx.shadowColor = '#06b6d4';
    };

    draw();
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      const analyser = audioContext.createAnalyser();
      analyserRef.current = analyser;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          setAudioData(base64);
        };
        reader.readAsDataURL(audioBlob);

        setDuration(recordingTime);

        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      drawWaveform();

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('无法访问麦克风，请确保已授权麦克风权限');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const playAudio = () => {
    if (audioUrl && audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSubmit = () => {
    if (!audioData) {
      alert('请先录制一段声音');
      return;
    }
    if (!name.trim()) {
      alert('请输入地点名称');
      return;
    }

    onSubmit({
      name: name.trim(),
      audioData,
      duration,
      emotion,
      scene,
      latitude,
      longitude,
      recorderNickname: nickname.trim() || '匿名用户',
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [isRecording, audioUrl]);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>录制城市声音</h2>
          <button style={styles.closeButton} onClick={onClose}>✕</button>
        </div>

        <div style={styles.content}>
          <div style={styles.recordingSection}>
            <canvas
              ref={canvasRef}
              width={400}
              height={120}
              style={styles.waveformCanvas}
            />

            {isRecording ? (
              <div style={styles.recordingIndicator}>
                <div style={styles.recordingDot}></div>
                <span style={styles.recordingTime}>{formatTime(recordingTime)}</span>
              </div>
            ) : audioUrl ? (
              <div style={styles.playbackSection}>
                <audio
                  ref={audioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlaying(false)}
                  style={{ display: 'none' }}
                />
                <button style={styles.playButton} onClick={playAudio}>
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <span style={styles.durationText}>时长: {formatTime(duration)}</span>
              </div>
            ) : (
              <div style={styles.instructionText}>
                点击下方按钮开始录制环境音
              </div>
            )}

            {!isRecording && (
              <button
                style={{
                  ...styles.recordButton,
                  ...(audioUrl ? styles.reRecordButton : {}),
                }}
                onClick={audioUrl ? startRecording : startRecording}
              >
                {audioUrl ? '🔄 重新录制' : '🎤 开始录制'}
              </button>
            )}

            {isRecording && (
              <button style={styles.stopButton} onClick={stopRecording}>
                ⏹ 停止录制
              </button>
            )}
          </div>

          <div style={styles.formSection}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>地点名称</label>
              <input
                type="text"
                style={styles.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：故宫角楼的清晨"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>你的昵称</label>
              <input
                type="text"
                style={styles.input}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="选填，默认为匿名用户"
              />
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>情绪标签</label>
              <div style={styles.emotionButtons}>
                {(Object.keys(EMOTION_COLORS) as EmotionType[]).map((em) => (
                  <button
                    key={em}
                    style={{
                      ...styles.emotionButton,
                      ...(emotion === em
                        ? {
                            ...styles.emotionButtonActive,
                            background: `linear-gradient(135deg, ${EMOTION_COLORS[em]}66, ${EMOTION_COLORS[em]}33)`,
                            borderColor: EMOTION_COLORS[em],
                            boxShadow: `0 0 20px ${EMOTION_COLORS[em]}44`,
                          }
                        : {}),
                    }}
                    onClick={() => setEmotion(em)}
                  >
                    <span style={{ ...styles.emotionDot, backgroundColor: EMOTION_COLORS[em] }}></span>
                    <span style={styles.emotionButtonText}>{EMOTION_NAMES[em]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.inputGroup}>
              <label style={styles.label}>场景类型</label>
              <div style={styles.sceneButtons}>
                {(Object.keys(SCENE_NAMES) as SceneType[]).map((sc) => (
                  <button
                    key={sc}
                    style={{
                      ...styles.sceneButton,
                      ...(scene === sc ? styles.sceneButtonActive : {}),
                    }}
                    onClick={() => setScene(sc)}
                  >
                    {SCENE_NAMES[sc]}
                  </button>
                ))}
              </div>
            </div>

            <div style={styles.locationInfo}>
              <span style={styles.locationText}>
                📍 坐标: {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </span>
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <button style={styles.cancelButton} onClick={onClose}>
            取消
          </button>
          <button
            style={{
              ...styles.submitButton,
              ...(!audioData || !name.trim() ? styles.submitButtonDisabled : {}),
            }}
            onClick={handleSubmit}
            disabled={!audioData || !name.trim()}
          >
            提交声音
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(4px)',
    zIndex: 2000,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    animation: 'fadeIn 0.3s ease',
  },
  modal: {
    width: '100%',
    maxWidth: '900px',
    height: '85vh',
    background: 'rgba(26, 26, 46, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px 24px 0 0',
    border: '1px solid rgba(6, 182, 212, 0.2)',
    borderBottom: 'none',
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px 32px',
    borderBottom: '1px solid rgba(6, 182, 212, 0.1)',
  },
  title: {
    fontSize: '24px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  closeButton: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: '#e0e0e0',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  content: {
    flex: 1,
    display: 'flex',
    gap: '32px',
    padding: '32px',
    overflowY: 'auto',
  },
  recordingSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '20px',
    padding: '24px',
    background: 'rgba(15, 15, 26, 0.5)',
    borderRadius: '16px',
    border: '1px solid rgba(6, 182, 212, 0.1)',
  },
  waveformCanvas: {
    width: '100%',
    maxWidth: '400px',
    height: '120px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '12px',
    border: '1px solid rgba(6, 182, 212, 0.2)',
  },
  recordingIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  recordingDot: {
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    background: '#ff6b6b',
    animation: 'pulse 1s ease-in-out infinite',
    boxShadow: '0 0 20px #ff6b6b',
  },
  recordingTime: {
    fontSize: '24px',
    fontWeight: '600',
    color: '#e0e0e0',
    fontFamily: 'monospace',
  },
  instructionText: {
    fontSize: '14px',
    color: '#888',
    textAlign: 'center',
  },
  playbackSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  playButton: {
    width: '56px',
    height: '56px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    border: 'none',
    color: '#fff',
    fontSize: '20px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)',
    transition: 'transform 0.2s ease',
  },
  durationText: {
    fontSize: '14px',
    color: '#a0a0b0',
  },
  recordButton: {
    padding: '14px 32px',
    borderRadius: '30px',
    background: 'linear-gradient(135deg, #ff6b6b, #ee5a6f)',
    border: 'none',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(255, 107, 107, 0.4)',
    transition: 'all 0.3s ease',
  },
  reRecordButton: {
    background: 'linear-gradient(135deg, #6b7280, #4b5563)',
    boxShadow: '0 4px 20px rgba(107, 114, 128, 0.3)',
  },
  stopButton: {
    padding: '14px 32px',
    borderRadius: '30px',
    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
    border: 'none',
    color: '#fff',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(239, 68, 68, 0.4)',
    animation: 'pulse 1.5s ease-in-out infinite',
  },
  formSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#a0a0b0',
  },
  input: {
    padding: '12px 16px',
    borderRadius: '10px',
    background: 'rgba(15, 15, 26, 0.8)',
    border: '1px solid rgba(6, 182, 212, 0.2)',
    color: '#e0e0e0',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.3s ease, box-shadow 0.3s ease',
  },
  emotionButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '8px',
  },
  emotionButton: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '6px',
    padding: '12px 8px',
    borderRadius: '12px',
    background: 'rgba(15, 15, 26, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  emotionButtonActive: {
    borderWidth: '2px',
  },
  emotionDot: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
  },
  emotionButtonText: {
    fontSize: '11px',
    color: '#c0c0d0',
  },
  sceneButtons: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
  },
  sceneButton: {
    padding: '10px 12px',
    borderRadius: '8px',
    background: 'rgba(15, 15, 26, 0.6)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#c0c0d0',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  sceneButtonActive: {
    background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2), rgba(139, 92, 246, 0.2))',
    borderColor: 'rgba(6, 182, 212, 0.5)',
    color: '#06b6d4',
    boxShadow: '0 0 15px rgba(6, 182, 212, 0.2)',
  },
  locationInfo: {
    padding: '12px 16px',
    background: 'rgba(6, 182, 212, 0.1)',
    borderRadius: '10px',
    border: '1px solid rgba(6, 182, 212, 0.2)',
  },
  locationText: {
    fontSize: '13px',
    color: '#06b6d4',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '16px',
    padding: '24px 32px',
    borderTop: '1px solid rgba(6, 182, 212, 0.1)',
    background: 'rgba(15, 15, 26, 0.5)',
  },
  cancelButton: {
    padding: '12px 28px',
    borderRadius: '25px',
    background: 'transparent',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    color: '#a0a0b0',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
  },
  submitButton: {
    padding: '12px 32px',
    borderRadius: '25px',
    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    border: 'none',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)',
    transition: 'all 0.3s ease',
  },
  submitButtonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
};

export default SoundRecorder;
