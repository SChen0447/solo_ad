import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MIDI_NOTES, isBlackKey, midiToNoteName } from '../types.js';
import { audioEngine } from '../audioEngine.js';
import { useStore } from '../store.js';
import { v4 as uuidv4 } from 'uuid';
import type { Note } from '../types.js';
import { quantizeValue } from '../types.js';

interface Props {
  onNotePress?: (midi: number) => void;
}

const PianoRoll: React.FC<Props> = () => {
  const currentTrackId = useStore((s) => s.currentTrackId);
  const tracks = useStore((s) => s.tracks);
  const highlightedPitches = useStore((s) => s.highlightedPitches);
  const playbackHead = useStore((s) => s.playbackHead);
  const quantize = useStore((s) => s.quantize);
  const addNote = useStore((s) => s.addNote);
  const isPlaying = useStore((s) => s.isPlaying);
  const markNoteJustUpdated = useStore((s) => s.markNoteJustUpdated);
  const currentTrack = useMemo(
    () => tracks.find((t) => t.id === currentTrackId),
    [tracks, currentTrackId]
  );

  const [pressedKeys, setPressedKeys] = useState<Set<number>>(new Set());
  const [glowKeys, setGlowKeys] = useState<Set<number>>(new Set());
  const [isTablet, setIsTablet] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    const check = () => setIsTablet(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const MIN_MIDI = isTablet ? 48 : MIDI_NOTES.MIN_MIDI;
  const MAX_MIDI = MIDI_NOTES.MAX_MIDI;
  const KEY_COUNT = MAX_MIDI - MIN_MIDI + 1;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    const ro = new ResizeObserver(updateWidth);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', updateWidth);
      ro.disconnect();
    };
  }, []);

  const whiteKeys = useMemo(() => {
    const arr: number[] = [];
    for (let m = MIN_MIDI; m <= MAX_MIDI; m++) {
      if (!isBlackKey(m)) arr.push(m);
    }
    return arr;
  }, [MIN_MIDI, MAX_MIDI]);

  const whiteKeyWidth = containerWidth > 0
    ? Math.max(12, Math.floor(containerWidth / whiteKeys.length))
    : 28;
  const blackKeyWidth = Math.floor(whiteKeyWidth * 0.65);
  const keyHeight = 160;
  const blackKeyHeight = Math.floor(keyHeight * 0.62);

  const handleKeyDown = (midi: number, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (isPlaying) return;
    setPressedKeys((prev) => new Set(prev).add(midi));
    setGlowKeys((prev) => new Set(prev).add(midi));
    setTimeout(() => {
      setGlowKeys((prev) => {
        const s = new Set(prev);
        s.delete(midi);
        return s;
      });
    }, 400);

    const trackType = currentTrack?.type || 'piano';
    audioEngine.playNote(midi, 0.3, trackType);

    const state = useStore.getState();
    const t = state.tracks.find((tr) => tr.id === state.currentTrackId);
    if (!t) return;
    const allNotes = t.notes;
    const maxEnd = allNotes.reduce((m, n) => Math.max(m, n.start + n.duration), 0);
    const rawStart = Math.max(maxEnd, playbackHead);
    const start = quantizeValue(rawStart, quantize);
    const note: Note = {
      id: uuidv4(),
      pitch: midi,
      start,
      duration: 1,
      trackId: currentTrackId,
    };
    addNote(note);
    markNoteJustUpdated(note.id);
  };

  const handleKeyUp = (midi: number) => {
    setPressedKeys((prev) => {
      const s = new Set(prev);
      s.delete(midi);
      return s;
    });
  };

  const glowStyle = (midi: number): React.CSSProperties => {
    if (!glowKeys.has(midi)) return {};
    return {
      animation: 'keyGlow 0.4s ease-out forwards',
    };
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: keyHeight + 12,
        background: 'rgba(15, 20, 35, 0.8)',
        borderRadius: 12,
        padding: '6px 4px',
        border: '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        userSelect: 'none',
        touchAction: 'none',
      }}
    >
      <style>{`
        @keyframes keyGlow {
          0% { box-shadow: 0 0 0 rgba(100, 180, 255, 0), inset 0 0 0 rgba(100,180,255,0); }
          40% { box-shadow: 0 6px 24px rgba(100, 180, 255, 0.5), inset 0 0 20px rgba(100, 180, 255, 0.2); }
          100% { box-shadow: 0 0 0 rgba(100, 180, 255, 0), inset 0 0 0 rgba(100,180,255,0); }
        }
        @keyframes keyPress {
          0% { transform: translateY(0); }
          100% { transform: translateY(0); }
        }
      `}</style>

      <div style={{ position: 'relative', width: '100%', height: keyHeight, display: 'flex' }}>
        {whiteKeys.map((midi, idx) => {
          const pressed = pressedKeys.has(midi);
          const highlight = highlightedPitches.has(midi);
          return (
            <div
              key={midi}
              onMouseDown={(e) => handleKeyDown(midi, e)}
              onMouseUp={() => handleKeyUp(midi)}
              onMouseLeave={() => handleKeyUp(midi)}
              onTouchStart={(e) => handleKeyDown(midi, e)}
              onTouchEnd={() => handleKeyUp(midi)}
              style={{
                position: 'relative',
                width: whiteKeyWidth,
                height: keyHeight,
                marginRight: idx < whiteKeys.length - 1 ? 1 : 0,
                background: highlight ? '#ffdd57' : '#e0e5ec',
                borderRadius: '0 0 5px 5px',
                border: '1px solid rgba(0,0,0,0.15)',
                borderTop: 'none',
                cursor: 'pointer',
                transform: pressed ? 'translateY(3px)' : 'translateY(0)',
                filter: pressed ? 'brightness(0.85)' : highlight ? 'brightness(1.15)' : 'brightness(1)',
                transition: 'transform 0.08s ease, filter 0.12s ease, background 0.15s ease',
                boxShadow: pressed
                  ? 'inset 0 -2px 4px rgba(0,0,0,0.2)'
                  : '0 2px 4px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.7)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                alignItems: 'center',
                ...glowStyle(midi),
              }}
            >
              {(midi % 12 === 0) && (
                <span style={{
                  fontSize: 9,
                  color: '#444',
                  paddingBottom: 4,
                  pointerEvents: 'none',
                }}>
                  {midiToNoteName(midi)}
                </span>
              )}
            </div>
          );
        })}

        {Array.from({ length: KEY_COUNT }, (_, i) => MIN_MIDI + i)
          .filter((m) => isBlackKey(m))
          .map((midi) => {
            const whiteIdxBefore = whiteKeys.findIndex((w) => w > midi) - 1;
            if (whiteIdxBefore < 0) return null;
            const left = (whiteIdxBefore + 1) * (whiteKeyWidth + 1) - blackKeyWidth / 2 - 1;
            const pressed = pressedKeys.has(midi);
            const highlight = highlightedPitches.has(midi);
            return (
              <div
                key={`b-${midi}`}
                onMouseDown={(e) => handleKeyDown(midi, e)}
                onMouseUp={() => handleKeyUp(midi)}
                onMouseLeave={() => handleKeyUp(midi)}
                onTouchStart={(e) => handleKeyDown(midi, e)}
                onTouchEnd={() => handleKeyUp(midi)}
                style={{
                  position: 'absolute',
                  top: 0,
                  left,
                  width: blackKeyWidth,
                  height: blackKeyHeight,
                  background: highlight ? '#ffdd57' : '#1a1a2e',
                  borderRadius: '0 0 4px 4px',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderTop: 'none',
                  cursor: 'pointer',
                  zIndex: 2,
                  transform: pressed ? 'translateY(3px)' : 'translateY(0)',
                  filter: pressed ? 'brightness(0.8)' : highlight ? 'brightness(1.2)' : 'brightness(1)',
                  transition: 'transform 0.08s ease, filter 0.12s ease, background 0.15s ease',
                  boxShadow: pressed
                    ? 'inset 0 -2px 3px rgba(0,0,0,0.4)'
                    : '0 3px 6px rgba(0,0,0,0.5), inset 0 -2px 4px rgba(0,0,0,0.6)',
                  ...glowStyle(midi),
                }}
              />
            );
          })}
      </div>
    </div>
  );
};

export default PianoRoll;
