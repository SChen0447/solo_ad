import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSession } from './App';
import type { HistoryEntry } from './types';

export function VoteHistory() {
  const { history } = useSession();

  const getVoteColor = (type: string): string => {
    switch (type) {
      case 'for': return '#4ade80';
      case 'against': return '#f87171';
      case 'neutral': return '#d1d5db';
      default: return '#9ca3af';
    }
  };

  const getVoteLabel = (type: string): string => {
    switch (type) {
      case 'for': return '赞成';
      case 'against': return '反对';
      case 'neutral': return '中立';
      default: return type;
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h3 style={styles.title}>投票历史</h3>
        <span style={styles.count}>{history.length} 条记录</span>
      </div>

      <div style={styles.timeline}>
        <AnimatePresence initial={false}>
          {history.map((entry) => (
            <motion.div
              key={entry.id}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={styles.timelineItem}
            >
              <div style={styles.timelineLine}>
                <div style={styles.timelineDot} />
              </div>
              <div style={styles.timelineContent}>
                <div style={styles.timestamp}>{entry.timestamp}</div>
                <div style={styles.topicName}>{entry.topic_name}</div>
                <div style={styles.voteInfo}>
                  <span style={{
                    ...styles.voteIcon,
                    background: getVoteColor(entry.vote_type),
                  }} />
                  <span style={styles.voteLabel}>{getVoteLabel(entry.vote_type)}</span>
                  <span style={styles.voteTotal}>共 {entry.total_votes} 票</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {history.length === 0 && (
          <div style={styles.emptyState}>
            <p>暂无投票记录</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: '20px 16px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottom: '1px solid var(--border-color)',
  },
  title: {
    fontSize: 15,
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  count: {
    fontSize: 11,
    color: '#6b7280',
    background: 'var(--bg-card)',
    padding: '2px 8px',
    borderRadius: 8,
  },
  timeline: {
    flex: 1,
    overflow: 'auto',
    position: 'relative',
  },
  timelineItem: {
    display: 'flex',
    gap: 12,
    position: 'relative',
    paddingBottom: 16,
  },
  timelineLine: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: 16,
    flexShrink: 0,
    position: 'relative',
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: '50%',
    background: 'var(--accent)',
    border: '2px solid var(--bg-secondary)',
    flexShrink: 0,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    background: 'var(--bg-card)',
    borderRadius: 12,
    padding: '10px 14px',
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
  },
  timestamp: {
    fontSize: 12,
    fontFamily: 'Montserrat, monospace',
    color: '#6b7280',
    marginBottom: 4,
  },
  topicName: {
    fontSize: 14,
    fontWeight: 600,
    color: 'var(--text-primary)',
    marginBottom: 6,
  },
  voteInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  voteIcon: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  voteLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  voteTotal: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 'auto',
  },
  emptyState: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    color: '#6b7280',
    fontSize: 13,
  },
};
