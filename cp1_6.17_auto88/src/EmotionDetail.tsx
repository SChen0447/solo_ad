import { useState, useRef, useEffect, useCallback } from 'react';
import type { SoundRecord, EmotionType, EmotionStats, EmotionReaction } from './types';
import { EMOTION_COLORS, EMOTION_NAMES, EMOTION_EMOJIS, SCENE_NAMES } from './types';

interface EmotionDetailProps {
  record: SoundRecord;
  onClose: () => void;
  onEmotionSubmit: (recordId: string, emotion: string) => void;
}

function EmotionDetail({ record, onClose, onEmotionSubmit }: EmotionDetailProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showReactionPanel, setShowReactionPanel] = useState(false);
  const [hoveredEmotion, setHoveredEmotion] = useState<EmotionType | null>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  const pieCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const waveformCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationRef = useRef<number | null>(null);

  const emotionStats: EmotionStats = {
    happy: 0,
    calm: 0,
    sad: 0,
    angry: 0,
    anxious: 0,
  };

  emotionStats[record.emotion]++;
  record.reactions.forEach((reaction) => {
    emotionStats[reaction.emotion]++;
  });

  const totalEmotions = Object.values(emotionStats).reduce((a, b) => a + b, 0);

  const sortedReactions = [...record.reactions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 5);

  const formatRelativeTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return '刚刚';
    if (minutes < 60) return `${minutes}分钟前`;
    if (hours < 24) return `${hours}小时前`;
    return `${days}天前`;
  };

  useEffect(() => {
    const data: number[] = [];
    for (let i = 0; i < 100; i++) {
      data.push(Math.random() * 0.6 + 0.2);
    }
    setWaveformData(data);
  }, [record.id]);

  const drawPieChart = useCallback(() => {
    const canvas = pieCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const outerRadius = 45;
    const innerRadius = 30;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let startAngle = -Math.PI / 2;
    const emotions = Object.keys(emotionStats) as EmotionType[];

    emotions.forEach((emotion) => {
      const count = emotionStats[emotion];
      if (count === 0) return;

      const percentage = count / totalEmotions;
      const endAngle = startAngle + percentage * 2 * Math.PI;

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = EMOTION_COLORS[emotion];
      ctx.fill();

      ctx.strokeStyle = 'rgba(26, 26, 46, 0.8)';
      ctx.lineWidth = 2;
      ctx.stroke();

      if (percentage >= 0.1) {
        const midAngle = startAngle + percentage * Math.PI;
        const textX = centerX + Math.cos(midAngle) * (innerRadius + (outerRadius - innerRadius) / 2);
        const textY = centerY + Math.sin(midAngle) * (innerRadius + (outerRadius - innerRadius) / 2);

        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(percentage * 100)}%`, textX, textY);
      }

      startAngle = endAngle;
    });

    ctx.beginPath();
    ctx.arc(centerX, centerY, innerRadius - 2, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(26, 26, 46, 0.95)';
    ctx.fill();

    ctx.fillStyle = '#e0e0e0';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${totalEmotions}`, centerX, centerY - 6);
    ctx.fillStyle = '#888';
    ctx.font = '9px sans-serif';
    ctx.fillText('反应', centerX, centerY + 8);
  }, [emotionStats, totalEmotions]);

  const drawWaveform = useCallback((progress: number = 0) => {
    const canvas = waveformCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barCount = waveformData.length;
    const barWidth = width / barCount;
    const gap = 2;

    ctx.clearRect(0, 0, width, height);

    const playedIndex = Math.floor(progress * barCount);

    waveformData.forEach((value, index) => {
      const barHeight = value * height * 0.8;
      const x = index * barWidth;
      const y = (height - barHeight) / 2;

      const gradient = ctx.createLinearGradient(x, y, x, y + barHeight);
      if (index <= playedIndex) {
        gradient.addColorStop(0, '#06b6d4');
        gradient.addColorStop(1, '#8b5cf6');
      } else {
        gradient.addColorStop(0, '#4b5563');
        gradient.addColorStop(1, '#374151');
      }

      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, barWidth - gap, barHeight);

      if (index <= playedIndex) {
        ctx.shadowBlur = 6;
        ctx.shadowColor = '#06b6d4';
        ctx.fillRect(x, y, barWidth - gap, barHeight);
        ctx.shadowBlur = 0;
      }
    });
  }, [waveformData]);

  useEffect(() => {
    drawPieChart();
    drawWaveform(0);
  }, [drawPieChart, drawWaveform]);

  const animateWaveform = useCallback(() => {
    if (!audioRef.current || audioRef.current.paused) {
      setIsPlaying(false);
      return;
    }

    const progress = audioRef.current.currentTime / audioRef.current.duration;
    drawWaveform(progress);

    if (!isNaN(progress) && progress < 1) {
      animationRef.current = requestAnimationFrame(animateWaveform);
    }
  }, [drawWaveform]);

  const playAudio = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    } else {
      try {
        const audioData = record.audioData;
        let src = audioData;
        if (!audioData.startsWith('data:audio')) {
          const byteCharacters = atob(audioData);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'audio/wav' });
          src = URL.createObjectURL(blob);
        }

        if (audioRef.current.src !== src) {
          audioRef.current.src = src;
        }

        audioRef.current.play();
        setIsPlaying(true);
        animateWaveform();
      } catch (error) {
        console.error('Failed to play audio:', error);
        alert('音频播放失败');
      }
    }
  };

  const handleEmotionClick = (emotion: EmotionType) => {
    onEmotionSubmit(record.id, emotion);
  };

  const handleListenClick = () => {
    setShowReactionPanel(true);
    if (!isPlaying) {
      playAudio();
    }
  };

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.card} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeButton} onClick={onClose}>✕</button>

        <div style={styles.header}>
          <h2 style={styles.title}>{record.name}</h2>
          <p style={styles.recorder}>
            <span style={styles.recorderIcon}>🎙</span>
            {record.recorderNickname}
            <span style={styles.sceneTag}>{SCENE_NAMES[record.scene]}</span>
          </p>
        </div>

        <div style={styles.content}>
          <div style={styles.leftSection}>
            <div style={styles.chartContainer}>
              <canvas ref={pieCanvasRef} width={120} height={120} style={styles.pieCanvas} />
              <div style={styles.legend}>
                {(Object.keys(EMOTION_COLORS) as EmotionType[]).map((emotion) => {
                  const count = emotionStats[emotion];
                  if (count === 0) return null;
                  const percentage = Math.round((count / totalEmotions) * 100);
                  return (
                    <div key={emotion} style={styles.legendItem}>
                      <div
                        style={{
                          ...styles.legendDot,
                          backgroundColor: EMOTION_COLORS[emotion],
                          boxShadow: `0 0 6px ${EMOTION_COLORS[emotion]}`,
                        }}
                      />
                      <span style={styles.legendText}>{EMOTION_NAMES[emotion]}</span>
                      <span style={styles.legendPercent}>{percentage}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div style={styles.rightSection}>
            <div style={styles.waveformContainer}>
              <canvas
                ref={waveformCanvasRef}
                width={400}
                height={80}
                style={styles.waveformCanvas}
              />
            </div>

            <div style={styles.actionButtons}>
              <button style={styles.playButton} onClick={playAudio}>
                <span style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</span>
                <span style={styles.playText}>{isPlaying ? '暂停' : '播放'}</span>
              </button>
              <button
                style={{
                  ...styles.listenButton,
                  ...(showReactionPanel ? styles.listenButtonActive : {}),
                }}
                onClick={handleListenClick}
              >
                <span style={styles.listenIcon}>👂</span>
                <span style={styles.listenText}>我也听一下</span>
              </button>
            </div>

            {showReactionPanel && (
              <div style={styles.reactionPanel}>
                <p style={styles.reactionTitle}>这段声音让你感觉：</p>
                <div style={styles.emotionButtons}>
                  {(Object.keys(EMOTION_COLORS) as EmotionType[]).map((emotion) => (
                    <div
                      key={emotion}
                      style={styles.emotionButtonWrapper}
                      onMouseEnter={() => setHoveredEmotion(emotion)}
                      onMouseLeave={() => setHoveredEmotion(null)}
                    >
                      <button
                        style={{
                          ...styles.emotionButton,
                          backgroundColor: EMOTION_COLORS[emotion],
                          boxShadow: `0 4px 15px ${EMOTION_COLORS[emotion]}66`,
                          ...(hoveredEmotion === emotion ? styles.emotionButtonHover : {}),
                        }}
                        onClick={() => handleEmotionClick(emotion)}
                      >
                        <span style={styles.emotionEmoji}>{EMOTION_EMOJIS[emotion]}</span>
                      </button>
                      {hoveredEmotion === emotion && (
                        <div style={styles.emotionTooltip}>
                          {EMOTION_NAMES[emotion]}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {sortedReactions.length > 0 && (
          <div style={styles.timelineSection}>
            <h3 style={styles.timelineTitle}>💬 最新情绪反应</h3>
            <div style={styles.timeline}>
              {sortedReactions.map((reaction: EmotionReaction) => (
                <div key={reaction.id} style={styles.timelineItem}>
                  <img src={reaction.userAvatar} alt="" style={styles.avatar} />
                  <div style={styles.timelineContent}>
                    <div style={styles.timelineHeader}>
                      <span style={styles.username}>{reaction.userNickname}</span>
                      <span style={styles.emotionBadge}>
                        {EMOTION_EMOJIS[reaction.emotion]} {EMOTION_NAMES[reaction.emotion]}
                      </span>
                    </div>
                    <span style={styles.timeText}>{formatRelativeTime(reaction.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <audio
          ref={audioRef}
          onEnded={() => {
            setIsPlaying(false);
            if (animationRef.current) {
              cancelAnimationFrame(animationRef.current);
            }
            drawWaveform(0);
          }}
          style={{ display: 'none' }}
        />
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
    zIndex: 1500,
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    animation: 'fadeIn 0.3s ease',
  },
  card: {
    width: '100%',
    maxWidth: '800px',
    background: 'rgba(26, 26, 46, 0.95)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px 24px 0 0',
    border: '1px solid rgba(6, 182, 212, 0.2)',
    borderBottom: 'none',
    padding: '32px',
    paddingBottom: '40px',
    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
    maxHeight: '85vh',
    overflowY: 'auto',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    border: 'none',
    color: '#e0e0e0',
    fontSize: '16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
    zIndex: 10,
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
    marginBottom: '8px',
  },
  recorder: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#a0a0b0',
  },
  recorderIcon: {
    fontSize: '16px',
  },
  sceneTag: {
    marginLeft: '12px',
    padding: '4px 12px',
    background: 'rgba(6, 182, 212, 0.15)',
    border: '1px solid rgba(6, 182, 212, 0.3)',
    borderRadius: '12px',
    fontSize: '12px',
    color: '#06b6d4',
  },
  content: {
    display: 'flex',
    gap: '32px',
    marginBottom: '24px',
  },
  leftSection: {
    flex: '0 0 200px',
  },
  rightSection: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  chartContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    background: 'rgba(15, 15, 26, 0.5)',
    borderRadius: '16px',
    border: '1px solid rgba(6, 182, 212, 0.1)',
  },
  pieCanvas: {
    display: 'block',
  },
  legend: {
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  legendText: {
    color: '#a0a0b0',
    flex: 1,
  },
  legendPercent: {
    color: '#e0e0e0',
    fontWeight: '600',
  },
  waveformContainer: {
    padding: '16px',
    background: 'rgba(15, 15, 26, 0.5)',
    borderRadius: '12px',
    border: '1px solid rgba(6, 182, 212, 0.1)',
  },
  waveformCanvas: {
    width: '100%',
    height: '80px',
    display: 'block',
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
  },
  playButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 24px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #06b6d4, #0891b2)',
    border: 'none',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(6, 182, 212, 0.4)',
    transition: 'all 0.3s ease',
  },
  playIcon: {
    fontSize: '18px',
  },
  playText: {},
  listenButton: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '14px 24px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
    border: 'none',
    color: '#fff',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.4)',
    transition: 'all 0.3s ease',
  },
  listenButtonActive: {
    background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)',
    boxShadow: '0 4px 25px rgba(139, 92, 246, 0.6)',
  },
  listenIcon: {
    fontSize: '18px',
  },
  listenText: {},
  reactionPanel: {
    padding: '20px',
    background: 'rgba(15, 15, 26, 0.6)',
    borderRadius: '12px',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    animation: 'fadeIn 0.3s ease',
  },
  reactionTitle: {
    fontSize: '14px',
    color: '#a0a0b0',
    marginBottom: '16px',
    textAlign: 'center',
  },
  emotionButtons: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
  },
  emotionButtonWrapper: {
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  emotionButton: {
    width: '48px',
    height: '48px',
    borderRadius: '50%',
    border: '3px solid rgba(255, 255, 255, 0.9)',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  emotionButtonHover: {
    transform: 'scale(1.25)',
    borderWidth: '4px',
  },
  emotionEmoji: {
    fontSize: '20px',
  },
  emotionTooltip: {
    position: 'absolute',
    top: '-32px',
    padding: '4px 12px',
    background: 'rgba(0, 0, 0, 0.8)',
    borderRadius: '6px',
    fontSize: '12px',
    color: '#fff',
    whiteSpace: 'nowrap',
    animation: 'fadeIn 0.2s ease',
  },
  timelineSection: {
    paddingTop: '20px',
    borderTop: '1px solid rgba(6, 182, 212, 0.1)',
  },
  timelineTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#e0e0e0',
    marginBottom: '16px',
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  timelineItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: 'rgba(15, 15, 26, 0.4)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.05)',
    animation: 'fadeIn 0.3s ease',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: 'rgba(6, 182, 212, 0.2)',
    border: '2px solid rgba(6, 182, 212, 0.3)',
  },
  timelineContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  timelineHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  username: {
    fontSize: '14px',
    fontWeight: '500',
    color: '#e0e0e0',
  },
  emotionBadge: {
    padding: '2px 8px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    fontSize: '12px',
  },
  timeText: {
    fontSize: '12px',
    color: '#6b7280',
  },
};

export default EmotionDetail;
