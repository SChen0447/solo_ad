import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Review, Note, Track, Theme } from './types';
import { formatTime } from './utils';

interface ReviewPageProps {
  reviews: Review[];
  notes: Note[];
  tracks: Track[];
  theme: Theme;
  onSeek: (time: number) => void;
  onSelectTrack: (trackId: string | null) => void;
  onTogglePlay: (playing?: boolean) => void;
  currentTrackId: string | null;
}

const ReviewPage: React.FC<ReviewPageProps> = ({
  reviews,
  notes,
  tracks,
  theme,
  onSeek,
  onSelectTrack,
  onTogglePlay,
  currentTrackId,
}) => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const review = useMemo(
    () => reviews.find((r) => r.id === id),
    [reviews, id]
  );

  const reviewNotes = useMemo(() => {
    if (!review) return [];
    return review.noteIds
      .map((nid) => notes.find((n) => n.id === nid))
      .filter(Boolean) as Note[];
  }, [review, notes]);

  const reviewTrack = useMemo(() => {
    if (!review?.trackId) return null;
    return tracks.find((t) => t.id === review.trackId) || null;
  }, [review, tracks]);

  const handleTimestampClick = useMemo(
    () => (time: number) => {
      if (reviewTrack && currentTrackId !== reviewTrack.id) {
        onSelectTrack(reviewTrack.id);
      }
      onSeek(time);
      onTogglePlay(true);
      navigate('/');
    },
    [reviewTrack, currentTrackId, onSelectTrack, onSeek, onTogglePlay, navigate]
  );

  const contentWithTimestamps = useMemo(() => {
    if (!review) return null;
    return renderContentWithTimestamps(review.content, handleTimestampClick);
  }, [review, handleTimestampClick]);

  if (!review) {
    return (
      <div style={styles.notFound}>
        <h2>乐评不存在</h2>
        <button onClick={() => navigate('/')} style={styles.backBtn}>
          ← 返回首页
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button onClick={() => navigate('/')} style={styles.backBtn}>
          ← 返回编辑器
        </button>
        <h1 style={styles.title}>{review.title}</h1>
        <div style={styles.meta}>
          <span>发布于 {new Date(review.createdAt).toLocaleString()}</span>
          {reviewTrack && (
            <span style={styles.trackInfo}>
              🎵 {reviewTrack.name}
            </span>
          )}
        </div>
      </div>

      <div style={styles.content}>
        <div
          style={styles.article}
          ref={(el) => {
            if (el && contentWithTimestamps) {
              el.innerHTML = '';
              el.appendChild(contentWithTimestamps);
            }
          }}
        />
      </div>

      {reviewNotes.length > 0 && (
        <div style={styles.notesSection}>
          <h3 style={styles.notesTitle}>相关笔记</h3>
          <div style={styles.notesGrid}>
            {reviewNotes.map((note, index) => (
              <div
                key={note.id}
                onClick={() => handleTimestampClick(note.time)}
                style={styles.noteCard}
              >
                <div style={styles.noteNumber}>{index + 1}</div>
                <div style={styles.noteInfo}>
                  <div style={styles.noteTime}>
                    {formatTime(note.time)}
                  </div>
                  <div style={styles.noteText}>{note.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function renderContentWithTimestamps(
  content: string,
  onTimestampClick: (time: number) => void
): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const lines = content.split('\n');

  lines.forEach((line, lineIndex) => {
    const lineDiv = document.createElement('div');
    lineDiv.style.marginBottom = '8px';

    const regex = /#(\d+:\d+(?:\.\d+)?)#/g;
    let lastIndex = 0;
    let match;

    let processedLine = line;
    processedLine = processedLine
      .replace(/^### (.*$)/, '<strong style="font-size: 1.17em;">$1</strong>')
      .replace(/^## (.*$)/, '<strong style="font-size: 1.25em;">$1</strong>')
      .replace(/^# (.*$)/, '<strong style="font-size: 1.5em;">$1</strong>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code style="background: rgba(167, 139, 250, 0.2); padding: 2px 6px; border-radius: 4px; font-family: monospace;">$1</code>');

    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processedLine;

    const processChildNodes = (parent: Node) => {
      const childNodes = Array.from(parent.childNodes);
      childNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent || '';
          const regex = /#(\d+:\d+(?:\.\d+)?)#/g;
          let lastIdx = 0;
          let m;

          while ((m = regex.exec(text)) !== null) {
            if (m.index > lastIdx) {
              lineDiv.appendChild(
                document.createTextNode(text.slice(lastIdx, m.index))
              );
            }

            const timeStr = m[1];
            const parts = timeStr.split(':');
            const mins = parseInt(parts[0], 10);
            const secs = parseFloat(parts[1]);
            const totalSeconds = mins * 60 + secs;

            const link = document.createElement('a');
            link.href = '#';
            link.textContent = m[0];
            link.style.color = '#4A90D9';
            link.style.textDecoration = 'none';
            link.style.cursor = 'pointer';
            link.style.borderBottom = '1px dashed #4A90D9';
            link.style.fontFamily = 'monospace';
            link.addEventListener('click', (e) => {
              e.preventDefault();
              onTimestampClick(totalSeconds);
            });

            lineDiv.appendChild(link);
            lastIdx = m.index + m[0].length;
          }

          if (lastIdx < text.length) {
            lineDiv.appendChild(document.createTextNode(text.slice(lastIdx)));
          }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          const cloned = node.cloneNode(true);
          processChildNodes(cloned);
          lineDiv.appendChild(cloned);
        }
      });
    };

    processChildNodes(tempDiv);

    if (lineDiv.children.length === 0 && line === '') {
      lineDiv.innerHTML = '<br>';
    }

    fragment.appendChild(lineDiv);
  });

  return fragment;
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: '100%',
    minHeight: '100%',
    backgroundColor: 'var(--bg-primary)',
    color: 'var(--text-primary)',
    padding: '40px 20px',
    animation: 'slideUp 0.3s ease',
  },
  header: {
    maxWidth: '800px',
    margin: '0 auto 32px',
    textAlign: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    padding: '8px 16px',
    backgroundColor: 'var(--bg-secondary)',
    color: 'var(--text-primary)',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    marginBottom: '12px',
    background: 'linear-gradient(135deg, #4A90D9, #A78BFA)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  meta: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    fontSize: '13px',
    color: 'var(--text-secondary)',
    flexWrap: 'wrap',
  },
  trackInfo: {
    color: 'var(--accent-blue)',
  },
  content: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '32px',
    backgroundColor: 'var(--bg-secondary)',
    borderRadius: '12px',
    boxShadow: 'var(--shadow-md)',
    backdropFilter: 'blur(12px)',
    minHeight: '400px',
  },
  article: {
    fontSize: '16px',
    lineHeight: 1.8,
    color: 'var(--text-primary)',
  },
  notesSection: {
    maxWidth: '800px',
    margin: '32px auto 0',
  },
  notesTitle: {
    fontSize: '18px',
    fontWeight: 600,
    marginBottom: '16px',
    color: 'var(--text-primary)',
  },
  notesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '12px',
  },
  noteCard: {
    display: 'flex',
    gap: '12px',
    padding: '14px',
    backgroundColor: 'var(--bg-card)',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  noteNumber: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--accent-blue)',
    color: 'white',
    fontSize: '12px',
    fontWeight: 600,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  noteInfo: {
    flex: 1,
    minWidth: 0,
  },
  noteTime: {
    fontSize: '12px',
    color: 'var(--accent-blue)',
    fontFamily: 'monospace',
    marginBottom: '4px',
  },
  noteText: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  notFound: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    color: 'var(--text-primary)',
    backgroundColor: 'var(--bg-primary)',
  },
};

export default ReviewPage;
