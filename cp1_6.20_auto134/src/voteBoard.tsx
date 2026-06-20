import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession, useSocket } from './App';
import type { VoteType } from './types';

export function VoteBoard() {
  const { currentTopic, isSpeaker, voterId, roomCode, session, topics } = useSession();
  const socket = useSocket();
  const [selectedVote, setSelectedVote] = useState<VoteType | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [prevMinutes, setPrevMinutes] = useState<number>(0);
  const [prevSeconds, setPrevSeconds] = useState<number>(0);
  const [flipMinutes, setFlipMinutes] = useState(false);
  const [flipSeconds, setFlipSeconds] = useState(false);

  useEffect(() => {
    if (!currentTopic) return;
    setCountdown(Math.floor(currentTopic.suggested_duration * 60));
    setSelectedVote(null);
  }, [currentTopic?.id]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;

  useEffect(() => {
    if (minutes !== prevMinutes) {
      setFlipMinutes(true);
      setTimeout(() => setFlipMinutes(false), 300);
      setPrevMinutes(minutes);
    }
  }, [minutes, prevMinutes]);

  useEffect(() => {
    if (seconds !== prevSeconds) {
      setFlipSeconds(true);
      setTimeout(() => setFlipSeconds(false), 300);
      setPrevSeconds(seconds);
    }
  }, [seconds, prevSeconds]);

  const handleVote = useCallback((type: VoteType) => {
    if (!socket || !currentTopic) return;

    if (selectedVote === type) return;

    socket.emit('vote', {
      room_code: roomCode,
      topic_id: currentTopic.id,
      vote_type: type,
      voter_id: voterId,
    });

    setSelectedVote(type);
  }, [socket, currentTopic, roomCode, voterId, selectedVote]);

  if (!currentTopic) {
    return (
      <div style={styles.emptyState}>
        <p>等待话题...</p>
      </div>
    );
  }

  const totalVotes = currentTopic.votes.for + currentTopic.votes.against + currentTopic.votes.neutral;
  const forPct = totalVotes > 0 ? (currentTopic.votes.for / totalVotes) * 100 : 0;
  const againstPct = totalVotes > 0 ? (currentTopic.votes.against / totalVotes) * 100 : 0;
  const neutralPct = totalVotes > 0 ? (currentTopic.votes.neutral / totalVotes) * 100 : 0;

  const radius = 70;
  const circumference = 2 * Math.PI * radius;

  const forOffset = circumference - (forPct / 100) * circumference;
  const againstOffset = circumference - (againstPct / 100) * circumference;
  const neutralOffset = circumference - (neutralPct / 100) * circumference;

  const currentTopicIndex = topics.findIndex(t => t.id === currentTopic.id);

  return (
    <div style={styles.container}>
      <div style={styles.topicHeader}>
        <span style={styles.topicBadge}>话题 {currentTopicIndex + 1}/{topics.length}</span>
        <h3 style={styles.topicName}>{currentTopic.name}</h3>
      </div>

      <div style={styles.boardGrid}>
        <div style={styles.progressSection}>
          <h4 style={styles.sectionTitle}>实时投票</h4>

          <div style={styles.barRow}>
            <span style={{ ...styles.barLabel, color: '#4ade80' }}>赞成</span>
            <div style={styles.barTrack}>
              <motion.div
                style={{ ...styles.barFill, background: '#4ade80' }}
                initial={{ width: 0 }}
                animate={{ width: `${forPct}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </div>
            <span style={styles.barValue}>{currentTopic.votes.for}</span>
          </div>

          <div style={styles.barRow}>
            <span style={{ ...styles.barLabel, color: '#f87171' }}>反对</span>
            <div style={styles.barTrack}>
              <motion.div
                style={{ ...styles.barFill, background: '#f87171' }}
                initial={{ width: 0 }}
                animate={{ width: `${againstPct}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </div>
            <span style={styles.barValue}>{currentTopic.votes.against}</span>
          </div>

          <div style={styles.barRow}>
            <span style={{ ...styles.barLabel, color: '#d1d5db' }}>中立</span>
            <div style={styles.barTrack}>
              <motion.div
                style={{ ...styles.barFill, background: '#d1d5db' }}
                initial={{ width: 0 }}
                animate={{ width: `${neutralPct}%` }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              />
            </div>
            <span style={styles.barValue}>{currentTopic.votes.neutral}</span>
          </div>

          <div style={styles.totalRow}>
            总投票人数: <strong>{totalVotes}</strong>
          </div>
        </div>

        <div style={styles.ringSection}>
          <svg width="180" height="180" viewBox="0 0 180 180">
            <circle cx="90" cy="90" r={radius} fill="none" stroke="#2a2a4e" strokeWidth="14" />
            <motion.circle
              cx="90" cy="90" r={radius}
              fill="none"
              stroke="#4ade80"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: forOffset }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              transform="rotate(-90 90 90)"
            />
            <motion.circle
              cx="90" cy="90" r={radius - 18}
              fill="none"
              stroke="#f87171"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * (radius - 18)}
              initial={{ strokeDashoffset: 2 * Math.PI * (radius - 18) }}
              animate={{ strokeDashoffset: 2 * Math.PI * (radius - 18) - (againstPct / 100) * 2 * Math.PI * (radius - 18) }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              transform="rotate(-90 90 90)"
            />
            <motion.circle
              cx="90" cy="90" r={radius - 36}
              fill="none"
              stroke="#d1d5db"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * (radius - 36)}
              initial={{ strokeDashoffset: 2 * Math.PI * (radius - 36) }}
              animate={{ strokeDashoffset: 2 * Math.PI * (radius - 36) - (neutralPct / 100) * 2 * Math.PI * (radius - 36) }}
              transition={{ duration: 1.2, ease: 'easeOut' }}
              transform="rotate(-90 90 90)"
            />
            <text x="90" y="85" textAnchor="middle" fill="#e0e0e0" fontSize="20" fontWeight="700">
              {totalVotes}
            </text>
            <text x="90" y="105" textAnchor="middle" fill="#9ca3af" fontSize="11">
              票
            </text>
          </svg>
        </div>

        <div style={styles.countdownSection}>
          <h4 style={styles.sectionTitle}>剩余时间</h4>
          <div style={styles.countdownDisplay}>
            <motion.span
              key={`min-${minutes}`}
              style={styles.countdownDigit}
              initial={{ rotateX: flipMinutes ? -90 : 0 }}
              animate={{ rotateX: 0 }}
              transition={{ duration: 0.3 }}
            >
              {String(minutes).padStart(2, '0')}
            </motion.span>
            <span style={styles.countdownColon}>:</span>
            <motion.span
              key={`sec-${seconds}`}
              style={styles.countdownDigit}
              initial={{ rotateX: flipSeconds ? -90 : 0 }}
              animate={{ rotateX: 0 }}
              transition={{ duration: 0.3 }}
            >
              {String(seconds).padStart(2, '0')}
            </motion.span>
          </div>
        </div>
      </div>

      {!isSpeaker && (
        <div style={styles.voteButtons}>
          {(['for', 'against', 'neutral'] as VoteType[]).map(type => {
            const colors: Record<VoteType, { bg: string; border: string; label: string }> = {
              for: { bg: '#4ade80', border: '#22c55e', label: '赞成' },
              against: { bg: '#f87171', border: '#ef4444', label: '反对' },
              neutral: { bg: '#d1d5db', border: '#9ca3af', label: '中立' },
            };
            const c = colors[type];
            const isSelected = selectedVote === type;

            return (
              <motion.button
                key={type}
                onClick={() => handleVote(type)}
                animate={isSelected ? {
                  boxShadow: [
                    `0 0 0px ${c.bg}`,
                    `0 0 20px ${c.bg}`,
                    `0 0 0px ${c.bg}`,
                  ],
                } : {}}
                transition={isSelected ? {
                  duration: 1.5,
                  repeat: Infinity,
                } : {}}
                style={{
                  ...styles.voteBtn,
                  background: isSelected ? c.bg : 'var(--bg-card)',
                  color: isSelected ? '#1a1a2e' : c.bg,
                  border: isSelected ? `1.5px solid ${c.border}` : '1.5px solid var(--border-color)',
                  fontWeight: isSelected ? 700 : 500,
                }}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
              >
                {c.label}
              </motion.button>
            );
          })}
        </div>
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
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
    color: '#9ca3af',
  },
  topicHeader: {
    marginBottom: 20,
  },
  topicBadge: {
    display: 'inline-block',
    background: 'var(--accent)',
    color: '#fff',
    fontSize: 11,
    padding: '2px 10px',
    borderRadius: 8,
    marginBottom: 8,
  },
  topicName: {
    fontSize: 22,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  boardGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto',
    gap: 24,
    alignItems: 'center',
  },
  progressSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 13,
    color: '#9ca3af',
    marginBottom: 4,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    width: 40,
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'right' as const,
  },
  barTrack: {
    flex: 1,
    height: 24,
    background: '#2a2a4e',
    borderRadius: 12,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 12,
    minWidth: 2,
  },
  barValue: {
    width: 30,
    fontSize: 13,
    fontWeight: 600,
    textAlign: 'right' as const,
    color: 'var(--text-primary)',
  },
  totalRow: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center' as const,
  },
  ringSection: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },
  countdownSection: {
    textAlign: 'center' as const,
  },
  countdownDisplay: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    perspective: 200,
  },
  countdownDigit: {
    display: 'inline-block',
    fontSize: 36,
    fontWeight: 700,
    fontFamily: 'Montserrat, monospace',
    color: 'var(--text-primary)',
    background: 'var(--bg-secondary)',
    padding: '6px 12px',
    borderRadius: 8,
    border: '1px solid var(--border-color)',
  },
  countdownColon: {
    fontSize: 36,
    fontWeight: 700,
    color: 'var(--accent)',
    margin: '0 2px',
  },
  voteButtons: {
    display: 'flex',
    gap: 16,
    marginTop: 24,
    justifyContent: 'center',
  },
  voteBtn: {
    padding: '14px 36px',
    borderRadius: 12,
    fontSize: 16,
    transition: 'all 0.2s ease',
  },
};
