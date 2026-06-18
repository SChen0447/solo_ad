import React, { useState, useCallback, useEffect } from 'react';
import { PIANO_KEYS, NotePitch, generateId } from '@/types';
import { useScoreStore, getNextStartTime } from '@/store/useScoreStore';
import { audioEngine } from '@/utils/audioEngine';

interface PianoKeyboardProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = ({ collapsed, onToggleCollapse }) => {
  const [activeKeys, setActiveKeys] = useState<Set<string>>(new Set());
  const [currentDuration, setCurrentDuration] = useState<number>(1);
  const addNote = useScoreStore((s) => s.addNote);
  const userColor = useScoreStore((s) => s.userColor);

  const handleKeyPress = useCallback(
    (pitch: NotePitch, e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const noteId = generateId();
      audioEngine.startNote(pitch, noteId);
      setActiveKeys((prev) => new Set(prev).add(pitch));

      setTimeout(() => {
        audioEngine.stopNote(noteId);
        setActiveKeys((prev) => {
          const next = new Set(prev);
          next.delete(pitch);
          return next;
        });
      }, 300);

      addNote({
        id: generateId(),
        pitch,
        duration: currentDuration as any,
        startTime: getNextStartTime(),
        velocity: 0.75,
        color: userColor,
      });
    },
    [addNote, currentDuration, userColor]
  );

  const handleKeyDown = useCallback((pitch: NotePitch) => {
    const noteId = `hold_${pitch}`;
    audioEngine.startNote(pitch, noteId);
    setActiveKeys((prev) => new Set(prev).add(pitch));
  }, []);

  const handleKeyUp = useCallback((pitch: NotePitch) => {
    const noteId = `hold_${pitch}`;
    audioEngine.stopNote(noteId);
    setActiveKeys((prev) => {
      const next = new Set(prev);
      next.delete(pitch);
      return next;
    });
  }, []);

  const whiteKeys = PIANO_KEYS.filter((k) => !k.isBlack);
  const blackKeys = PIANO_KEYS.filter((k) => k.isBlack);

  const getBlackKeyPosition = (pitch: NotePitch): number => {
    const whiteBefore = PIANO_KEYS.slice(0, PIANO_KEYS.findIndex((k) => k.pitch === pitch)).filter(
      (k) => !k.isBlack
    ).length;
    return whiteBefore - 1;
  };

  if (collapsed) {
    return (
      <button
        onClick={onToggleCollapse}
        style={styles.collapsedButton}
      >
        🎹 展开钢琴键盘
      </button>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <span style={styles.title}>🎹 虚拟键盘</span>
        <div style={styles.durationSelector}>
          {[
            { v: 0.25, l: '1/16' },
            { v: 0.5, l: '1/8' },
            { v: 1, l: '1/4' },
            { v: 2, l: '1/2' },
            { v: 4, l: '1/1' },
          ].map((d) => (
            <button
              key={d.v}
              onClick={() => setCurrentDuration(d.v)}
              style={{
                ...styles.durationBtn,
                ...(currentDuration === d.v ? styles.durationBtnActive : {}),
              }}
            >
              {d.l}
            </button>
          ))}
        </div>
        <button onClick={onToggleCollapse} style={styles.collapseBtn}>
          ▼
        </button>
      </div>

      <div style={styles.keyboard}>
        <div style={styles.whiteKeysRow}>
          {whiteKeys.map((key) => (
            <div
              key={key.pitch}
              onMouseDown={(e) => {
                handleKeyDown(key.pitch);
                handleKeyPress(key.pitch, e);
              }}
              onMouseUp={() => handleKeyUp(key.pitch)}
              onMouseLeave={() => handleKeyUp(key.pitch)}
              onTouchStart={(e) => {
                handleKeyDown(key.pitch);
                handleKeyPress(key.pitch, e);
              }}
              onTouchEnd={() => handleKeyUp(key.pitch)}
              style={{
                ...styles.whiteKey,
                ...(activeKeys.has(key.pitch) ? styles.whiteKeyActive : {}),
                width: `${100 / whiteKeys.length}%`,
              }}
            >
              <span style={styles.keyLabel}>{key.pitch}</span>
            </div>
          ))}
        </div>

        <div style={styles.blackKeysRow}>
          {blackKeys.map((key) => {
            const pos = getBlackKeyPosition(key.pitch);
            const whiteKeyWidth = 100 / whiteKeys.length;
            return (
              <div
                key={key.pitch}
                onMouseDown={(e) => {
                  handleKeyDown(key.pitch);
                  handleKeyPress(key.pitch, e);
                }}
                onMouseUp={() => handleKeyUp(key.pitch)}
                onMouseLeave={() => handleKeyUp(key.pitch)}
                onTouchStart={(e) => {
                  handleKeyDown(key.pitch);
                  handleKeyPress(key.pitch, e);
                }}
                onTouchEnd={() => handleKeyUp(key.pitch)}
                style={{
                  ...styles.blackKey,
                  ...(activeKeys.has(key.pitch) ? styles.blackKeyActive : {}),
                  left: `calc(${pos * whiteKeyWidth + whiteKeyWidth * 0.65}%)`,
                  width: `${whiteKeyWidth * 0.6}%`,
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    background: 'linear-gradient(180deg, #2d2d44 0%, #1a1a2e 100%)',
    padding: '12px',
    borderRadius: '12px',
    boxShadow: 'inset 0 2px 20px rgba(0,0,0,0.5), 0 4px 15px rgba(0,0,0,0.3)',
    userSelect: 'none',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
    padding: '0 4px',
    flexWrap: 'wrap',
    gap: '8px',
  },
  title: {
    color: '#e0e0e0',
    fontSize: '14px',
    fontWeight: '600',
  },
  durationSelector: {
    display: 'flex',
    gap: '4px',
  },
  durationBtn: {
    padding: '4px 10px',
    border: 'none',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.08)',
    color: '#aaa',
    fontSize: '11px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  durationBtnActive: {
    background: 'linear-gradient(135deg, #ff6b6b, #48dbfb)',
    color: '#fff',
    boxShadow: '0 2px 10px rgba(72, 219, 251, 0.3)',
  },
  collapseBtn: {
    width: '28px',
    height: '28px',
    border: 'none',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.08)',
    color: '#aaa',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboard: {
    position: 'relative',
    height: '180px',
    width: '100%',
  },
  whiteKeysRow: {
    display: 'flex',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
  },
  whiteKey: {
    position: 'relative',
    background: 'linear-gradient(180deg, #fefefe 0%, #e8e8e8 100%)',
    border: '1px solid #ccc',
    borderRadius: '0 0 6px 6px',
    margin: '0 1px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingBottom: '8px',
    boxShadow: 'inset 0 -4px 12px rgba(0,0,0,0.08), 0 2px 8px rgba(0,0,0,0.2)',
    transition: 'all 0.08s',
  },
  whiteKeyActive: {
    background: 'linear-gradient(180deg, #48dbfb 0%, #2ec4e0 100%)',
    boxShadow: 'inset 0 0 25px rgba(72, 219, 251, 0.6), 0 0 20px rgba(72, 219, 251, 0.5)',
    transform: 'translateY(2px)',
  },
  blackKeysRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '60%',
    pointerEvents: 'none',
  },
  blackKey: {
    position: 'absolute',
    top: 0,
    height: '100%',
    background: 'linear-gradient(180deg, #2a2a2a 0%, #111 100%)',
    borderRadius: '0 0 4px 4px',
    cursor: 'pointer',
    pointerEvents: 'auto',
    boxShadow: 'inset 0 -3px 8px rgba(255,255,255,0.1), 0 3px 10px rgba(0,0,0,0.5)',
    zIndex: 2,
    transition: 'all 0.08s',
  },
  blackKeyActive: {
    background: 'linear-gradient(180deg, #ff6b6b 0%, #d94848 100%)',
    boxShadow: 'inset 0 0 20px rgba(255, 107, 107, 0.7), 0 0 18px rgba(255, 107, 107, 0.6)',
    transform: 'translateY(2px)',
  },
  keyLabel: {
    fontSize: '10px',
    color: '#888',
    pointerEvents: 'none',
  },
  collapsedButton: {
    background: 'linear-gradient(135deg, #ff6b6b, #48dbfb)',
    color: '#fff',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
  },
};

export default PianoKeyboard;
