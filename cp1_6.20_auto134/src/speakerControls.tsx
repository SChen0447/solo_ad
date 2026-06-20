import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useSession, useSocket } from './App';
import type { PaceChange } from './types';

export function SpeakerControls() {
  const { session, currentTopic, roomCode, topics } = useSession();
  const socket = useSocket();
  const [duration, setDuration] = useState(currentTopic?.suggested_duration || 5);
  const [isDragging, setIsDragging] = useState(false);
  const [paceBanner, setPaceBanner] = useState<PaceChange | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (currentTopic) {
      setDuration(currentTopic.suggested_duration);
    }
  }, [currentTopic?.id]);

  useEffect(() => {
    if (!socket) return;
    const handler = (data: PaceChange) => {
      setPaceBanner(data);
      setTimeout(() => setPaceBanner(null), 3000);
    };
    socket.on('pace_change', handler);
    return () => {
      socket.off('pace_change', handler);
    };
  }, [socket]);

  const emitAdjustTime = useCallback((newDuration: number) => {
    if (!socket || !currentTopic) return;
    socket.emit('adjust_time', {
      room_code: roomCode,
      speaker_id: session?.speaker_id,
      topic_id: currentTopic.id,
      duration: newDuration,
    });
  }, [socket, roomCode, session, currentTopic]);

  const handleSliderInteraction = useCallback((clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const padding = 10;
    const trackWidth = rect.width - padding * 2;
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left - padding) / trackWidth));
    const newDuration = Math.round(ratio * 40) / 2;
    const clamped = Math.max(0.5, Math.min(20, newDuration));
    setDuration(clamped);
    emitAdjustTime(clamped);
  }, [emitAdjustTime]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    handleSliderInteraction(e.clientX);
  }, [handleSliderInteraction]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleSliderInteraction(e.clientX);
    };
    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleSliderInteraction]);

  const handleSpeedUp = useCallback(() => {
    if (!socket) return;
    socket.emit('speed_up', {
      room_code: roomCode,
      speaker_id: session?.speaker_id,
    });
  }, [socket, roomCode, session]);

  const handleSlowDown = useCallback(() => {
    if (!socket) return;
    socket.emit('slow_down', {
      room_code: roomCode,
      speaker_id: session?.speaker_id,
    });
  }, [socket, roomCode, session]);

  const handleNextTopic = useCallback(() => {
    if (!socket) return;
    socket.emit('next_topic', {
      room_code: roomCode,
      speaker_id: session?.speaker_id,
    });
  }, [socket, roomCode, session]);

  const handlePrevTopic = useCallback(() => {
    if (!socket) return;
    socket.emit('prev_topic', {
      room_code: roomCode,
      speaker_id: session?.speaker_id,
    });
  }, [socket, roomCode, session]);

  if (!currentTopic) return null;

  const totalVotes = currentTopic.votes.for + currentTopic.votes.against + currentTopic.votes.neutral;
  const forPct = totalVotes > 0 ? Math.round((currentTopic.votes.for / totalVotes) * 100) : 0;
  const againstPct = totalVotes > 0 ? Math.round((currentTopic.votes.against / totalVotes) * 100) : 0;
  const neutralPct = totalVotes > 0 ? Math.round((currentTopic.votes.neutral / totalVotes) * 100) : 0;

  const sliderRatio = (duration - 0.5) / 19.5;
  const currentTopicIndex = topics.findIndex(t => t.id === currentTopic.id);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h4 style={styles.title}>演讲者控制面板</h4>
        <div style={styles.topicNav}>
          <motion.button
            style={styles.navBtn}
            whileTap={{ scale: 0.9 }}
            onClick={handlePrevTopic}
            disabled={currentTopicIndex === 0}
          >
            ← 上一话题
          </motion.button>
          <span style={styles.topicIndicator}>
            {currentTopicIndex + 1} / {topics.length}
          </span>
          <motion.button
            style={styles.navBtn}
            whileTap={{ scale: 0.9 }}
            onClick={handleNextTopic}
            disabled={currentTopicIndex === topics.length - 1}
          >
            下一话题 →
          </motion.button>
        </div>
      </div>

      <div style={styles.statsRow}>
        <div style={styles.statItem}>
          <span style={{ ...styles.statDot, background: '#4ade80' }} />
          <span style={styles.statLabel}>赞成</span>
          <span style={styles.statValue}>{forPct}%</span>
        </div>
        <div style={styles.statItem}>
          <span style={{ ...styles.statDot, background: '#f87171' }} />
          <span style={styles.statLabel}>反对</span>
          <span style={styles.statValue}>{againstPct}%</span>
        </div>
        <div style={styles.statItem}>
          <span style={{ ...styles.statDot, background: '#d1d5db' }} />
          <span style={styles.statLabel}>中立</span>
          <span style={styles.statValue}>{neutralPct}%</span>
        </div>
      </div>

      <div style={styles.sliderSection}>
        <div style={styles.sliderLabel}>
          <span>建议演讲时长</span>
          <span style={styles.sliderValue}>{duration} 分钟</span>
        </div>
        <div
          ref={sliderRef}
          style={styles.sliderTrack}
          onMouseDown={handleMouseDown}
        >
          <div style={{
            ...styles.sliderFill,
            width: `${sliderRatio * 100}%`,
          }} />
          <motion.div
            style={{
              ...styles.sliderThumb,
              left: `${sliderRatio * 100}%`,
            }}
            animate={{ scale: isDragging ? 1.2 : 1 }}
            transition={{ duration: 0.15 }}
          />
        </div>
        <div style={styles.sliderRange}>
          <span>0.5 min</span>
          <span>20 min</span>
        </div>
      </div>

      <div style={styles.paceButtons}>
        <motion.button
          style={{ ...styles.paceBtn, background: '#22c55e' }}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.04 }}
          transition={{ duration: 0.15 }}
          onClick={handleSpeedUp}
        >
          ⚡ 加速
        </motion.button>
        <motion.button
          style={{ ...styles.paceBtn, background: '#ef4444' }}
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.04 }}
          transition={{ duration: 0.15 }}
          onClick={handleSlowDown}
        >
          🐢 减速
        </motion.button>
      </div>

      {paceBanner && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          style={{
            ...styles.paceBanner,
            borderLeft: `4px solid ${paceBanner.type === 'speed_up' ? '#22c55e' : '#ef4444'}`,
          }}
        >
          {paceBanner.message}
        </motion.div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    background: 'var(--bg-card)',
    borderRadius: 16,
    padding: 24,
    boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 700,
    color: 'var(--accent)',
  },
  topicNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  navBtn: {
    padding: '6px 14px',
    borderRadius: 12,
    background: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    fontSize: 12,
    border: '1px solid var(--border-color)',
    fontWeight: 500,
  },
  topicIndicator: {
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: 600,
  },
  statsRow: {
    display: 'flex',
    gap: 20,
    marginBottom: 20,
    padding: '12px 16px',
    background: 'var(--bg-secondary)',
    borderRadius: 12,
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statValue: {
    fontSize: 14,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  sliderSection: {
    marginBottom: 20,
  },
  sliderLabel: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 8,
  },
  sliderValue: {
    color: 'var(--accent)',
    fontWeight: 700,
  },
  sliderTrack: {
    position: 'relative',
    height: 8,
    background: '#2a2a4e',
    borderRadius: 4,
    cursor: 'pointer',
    padding: '0 10px',
    margin: '0 10px',
  },
  sliderFill: {
    position: 'absolute',
    top: 0,
    left: 10,
    height: '100%',
    background: 'var(--indigo)',
    borderRadius: 4,
    transition: 'width 0.1s ease',
  },
  sliderThumb: {
    position: 'absolute',
    top: '50%',
    width: 20,
    height: 20,
    borderRadius: '50%',
    background: '#6366f1',
    transform: 'translate(-50%, -50%)',
    boxShadow: '0 0 8px rgba(99,102,241,0.5)',
    cursor: 'grab',
    zIndex: 2,
  },
  sliderRange: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
    padding: '0 10px',
  },
  paceButtons: {
    display: 'flex',
    gap: 16,
  },
  paceBtn: {
    flex: 1,
    padding: '12px 24px',
    borderRadius: 12,
    color: '#fff',
    fontSize: 15,
    fontWeight: 700,
    border: 'none',
  },
  paceBanner: {
    marginTop: 12,
    padding: '10px 16px',
    background: 'var(--bg-secondary)',
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
};
