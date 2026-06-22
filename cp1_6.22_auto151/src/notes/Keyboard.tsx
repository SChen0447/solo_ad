import { useState, useEffect, useCallback, useRef } from 'react';
import { eventBus } from '@/events/EventBus';
import { audioEngine, TimbreId } from '@/audio/AudioEngine';
import './Keyboard.css';

interface PianoKey {
  note: string;
  isBlack: boolean;
  x: number;
}

const WHITE_NOTES = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const BLACK_NOTE_MAP: Record<string, string> = {
  C: 'C#',
  D: 'D#',
  F: 'F#',
  G: 'G#',
  A: 'A#',
};

const WHITE_KEY_WIDTH = 50;
const WHITE_KEY_HEIGHT = 180;
const BLACK_KEY_WIDTH = 30;
const BLACK_KEY_HEIGHT = 110;

function generateKeys(startOctave: number, octaveCount: number): PianoKey[] {
  const keys: PianoKey[] = [];
  let whiteIndex = 0;

  for (let octave = startOctave; octave < startOctave + octaveCount; octave++) {
    for (const note of WHITE_NOTES) {
      keys.push({
        note: `${note}${octave}`,
        isBlack: false,
        x: whiteIndex * WHITE_KEY_WIDTH,
      });

      if (BLACK_NOTE_MAP[note]) {
        keys.push({
          note: `${BLACK_NOTE_MAP[note]}${octave}`,
          isBlack: true,
          x: whiteIndex * WHITE_KEY_WIDTH + WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2,
        });
      }

      whiteIndex++;
    }
  }

  return keys;
}

const KEYBOARD_KEY_MAP: Record<string, string> = {
  a: 'C3', w: 'C#3', s: 'D3', e: 'D#3', d: 'E3',
  f: 'F3', t: 'F#3', g: 'G3', y: 'G#3', h: 'A3',
  u: 'A#3', j: 'B3', k: 'C4', o: 'C#4', l: 'D4',
  p: 'D#4', ';': 'E4', "'": 'F4',
};

export function Keyboard() {
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [currentTimbre, setCurrentTimbre] = useState<TimbreId>('piano');
  const pressedKeysRef = useRef<Set<string>>(new Set());

  const keys = generateKeys(3, 2);
  const whiteKeys = keys.filter((k) => !k.isBlack);
  const blackKeys = keys.filter((k) => k.isBlack);
  const totalWidth = whiteKeys.length * WHITE_KEY_WIDTH;

  useEffect(() => {
    const unsubscribe = eventBus.on('timbre:change', (timbre: TimbreId) => {
      setCurrentTimbre(timbre);
    });
    return unsubscribe;
  }, []);

  const playNote = useCallback(
    (note: string) => {
      if (pressedKeysRef.current.has(note)) return;
      pressedKeysRef.current.add(note);
      setActiveNotes((prev) => new Set([...prev, note]));
      audioEngine.playNote(currentTimbre, note);
      eventBus.emit('note:on', {
        note,
        timbre: currentTimbre,
        timestamp: performance.now(),
      });
    },
    [currentTimbre]
  );

  const stopNote = useCallback(
    (note: string) => {
      if (!pressedKeysRef.current.has(note)) return;
      pressedKeysRef.current.delete(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      audioEngine.stopNote(currentTimbre, note);
      eventBus.emit('note:off', {
        note,
        timbre: currentTimbre,
        timestamp: performance.now(),
      });
    },
    [currentTimbre]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const note = KEYBOARD_KEY_MAP[e.key.toLowerCase()];
      if (note) {
        e.preventDefault();
        playNote(note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const note = KEYBOARD_KEY_MAP[e.key.toLowerCase()];
      if (note) {
        e.preventDefault();
        stopNote(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playNote, stopNote]);

  const handleMouseDown = (e: React.MouseEvent, note: string) => {
    e.preventDefault();
    playNote(note);
  };

  const handleMouseUp = (e: React.MouseEvent, note: string) => {
    e.preventDefault();
    stopNote(note);
  };

  const handleMouseLeave = (note: string) => {
    stopNote(note);
  };

  return (
    <div className="keyboard-wrapper">
      <div className="keyboard" style={{ width: totalWidth }}>
        {whiteKeys.map((key) => (
          <div
            key={key.note}
            className={`piano-key piano-key--white ${activeNotes.has(key.note) ? 'piano-key--active' : ''}`}
            style={{
              left: key.x,
              width: WHITE_KEY_WIDTH,
              height: WHITE_KEY_HEIGHT,
            }}
            onMouseDown={(e) => handleMouseDown(e, key.note)}
            onMouseUp={(e) => handleMouseUp(e, key.note)}
            onMouseLeave={() => handleMouseLeave(key.note)}
          >
            <span className="piano-key__label">{key.note}</span>
          </div>
        ))}
        {blackKeys.map((key) => (
          <div
            key={key.note}
            className={`piano-key piano-key--black ${activeNotes.has(key.note) ? 'piano-key--active' : ''}`}
            style={{
              left: key.x,
              width: BLACK_KEY_WIDTH,
              height: BLACK_KEY_HEIGHT,
            }}
            onMouseDown={(e) => handleMouseDown(e, key.note)}
            onMouseUp={(e) => handleMouseUp(e, key.note)}
            onMouseLeave={() => handleMouseLeave(key.note)}
          />
        ))}
      </div>
    </div>
  );
}
